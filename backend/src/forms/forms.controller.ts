import { Body, Controller, Logger, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { detectDocumentType } from '../common/document-type';
import { paths } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { PagesService } from '../public/pages.service';
import { ApplicationDto, ContactDto, FormErrors, validateForm } from './form-dto';
import { MailerService } from './mailer.service';

const MAX_CV_BYTES = 5 * 1024 * 1024;
const CV_HELP = 'Please attach your CV as a PDF, DOC or DOCX file (up to 5 MB).';
const GENERIC_PROBLEM = 'Please check the highlighted fields and try again.';

/**
 * The public forms: contact message and job application (with CV).
 *
 * Every form works in two ways:
 *   - WITHOUT JavaScript: a normal browser form post. Success redirects (303) back to the page with ?sent=1 / ?applied=1;
 *     problems re-render the same page with the visitor's text kept and the errors shown next to the fields.
 *   - WITH JavaScript (public/js/forms.js): the page sends the form with `Accept: application/json` and we answer with
 *     JSON ({ ok, message, errors }), so the page can show the result without reloading.
 *
 * Protection: rate limit per IP (429), honeypot field "website" (bots get a fake success and nothing is saved),
 * strict validation, CV type checked from the file's content, CVs stored in PRIVATE_DIR (never served publicly).
 */
@Controller('api/public')
@UseGuards(ThrottlerGuard)
export class FormsController {
  private readonly log = new Logger('Forms');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly pages: PagesService,
  ) {}

  private wantsJson(req: Request) {
    return req.accepts(['html', 'json']) === 'json';
  }

  // ------------------------------------------------------------------ contact
  @Post('contact')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async contact(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const { values, errors } = await validateForm(ContactDto, body);
    const blocks = await this.pages.blocks('contact');
    const thanks = blocks['form_success'] || 'Thank you! Your message has been sent. We will respond within one business day.';

    if (values.website) return this.fakeSuccess(req, res, '/contact?sent=1', thanks, 'contact');
    if (Object.keys(errors).length) {
      return this.invalid(req, res, errors, values, async () => ({ template: 'pages/contact', ctx: await this.pages.contactPage() }));
    }

    const saved = await this.prisma.contactMessage.create({
      data: { name: values.name, email: values.email, phone: values.phone || null, company: values.company || null, subject: values.subject, message: values.message },
    });
    void this.mailer.notifyContact(saved); // not awaited: a slow mail server must not slow the visitor down; failures are logged
    return this.success(req, res, '/contact?sent=1', thanks);
  }

  // ------------------------------------------------------------------ job application
  @Post('applications')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('cv', { storage: memoryStorage(), limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 20, fieldSize: 20_000 } }))
  async apply(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const { values, errors } = await validateForm(ApplicationDto, body);
    const blocks = await this.pages.blocks('careers');
    const thanks = blocks['form_success'] || 'Thank you! Your application has been received. We will contact you if your profile matches a current or upcoming requirement.';

    // The job (if any) must exist and still be open.
    let job: { id: number; title: string; slug: string } | null = null;
    if (values.jobId && !errors['jobId']) {
      const open = (await this.pages.openJobs()).find((j) => j.id === values.jobId);
      if (open) job = { id: open.id, title: open.title, slug: open.slug };
      else errors['jobId'] = 'This position is no longer open. You can still send an open application from the Careers page.';
    }
    const back = job ? `/careers/${job.slug}` : '/careers';
    if (values.website) return this.fakeSuccess(req, res, `${back}?applied=1`, thanks, 'application');

    // CV: required, checked by CONTENT (not by name or the browser's claim).
    const doc = file ? detectDocumentType(file.buffer) : null;
    if (!file || file.size === 0) errors['cv'] = CV_HELP;
    else if (!doc) errors['cv'] = `This file type is not supported. ${CV_HELP}`;

    if (Object.keys(errors).length || !file || !doc) {
      return this.invalid(req, res, errors, values, async () => {
        const jobCtx = job ? await this.pages.jobPage(job.slug) : null;
        return jobCtx ? { template: 'pages/job', ctx: jobCtx } : { template: 'pages/careers', ctx: await this.pages.careersPage() };
      });
    }

    // Store the CV outside the web root, under a random name (the visitor's name is kept only as text in the database).
    fs.mkdirSync(paths.privateDir, { recursive: true });
    const stored = `${Date.now()}-${randomBytes(12).toString('hex')}${doc.ext}`;
    const target = path.join(paths.privateDir, stored);
    fs.writeFileSync(target, file.buffer, { flag: 'wx', mode: 0o600 });

    let saved;
    try {
      saved = await this.prisma.jobApplication.create({
        data: {
          jobId: job?.id ?? null, name: values.name, email: values.email, phone: values.phone || null, message: values.message || null,
          cvFile: stored, cvOriginalName: this.displayName(file.originalname, doc.ext), cvMimeType: doc.mime,
        },
      });
    } catch (e) {
      fs.rmSync(target, { force: true }); // don't leave an orphan file behind
      throw e;
    }
    void this.mailer.notifyApplication(saved, job?.title);
    return this.success(req, res, `${back}?applied=1`, thanks);
  }

  // ------------------------------------------------------------------ helpers
  /** The file name as the applicant knew it, made safe for display / download headers. */
  private displayName(original: string, ext: string): string {
    // multer reads names as latin1; browsers send UTF-8
    const decoded = Buffer.from(original || '', 'latin1').toString('utf8');
    // eslint-disable-next-line no-control-regex
    const base = path.basename(decoded.replace(/\\/g, '/')).replace(/[\u0000-\u001F\u007F"<>|:*?]/g, '').trim();
    const stem = base.replace(/\.[^.]*$/, '').slice(0, 120);
    return `${stem || 'cv'}${ext}`;
  }

  private success(req: Request, res: Response, redirectTo: string, message: string) {
    if (this.wantsJson(req)) return res.status(200).json({ ok: true, message });
    return res.redirect(303, redirectTo);
  }

  /** Bots filled the hidden field: answer exactly like a success, save nothing. */
  private fakeSuccess(req: Request, res: Response, redirectTo: string, message: string, what: string) {
    this.log.warn(`Honeypot triggered on the ${what} form (ip ${req.ip}): submission ignored.`);
    return this.success(req, res, redirectTo, message);
  }

  /** Validation problems: JSON for the script, or the page again (status 400) with the visitor's text and the errors. */
  private async invalid(
    req: Request, res: Response, errors: FormErrors, values: Record<string, any>,
    page: () => Promise<{ template: string; ctx: Record<string, any> }>,
  ) {
    const message = errors['jobId'] ?? GENERIC_PROBLEM;
    if (this.wantsJson(req)) return res.status(400).json({ ok: false, message, errors });
    const { template, ctx } = await page();
    const shown = { name: values.name, email: values.email, phone: values.phone, company: values.company, subject: values.subject, message: values.message };
    return res.status(400).render(template, { ...ctx, form: { sent: false, values: shown, errors, message } });
  }
}
