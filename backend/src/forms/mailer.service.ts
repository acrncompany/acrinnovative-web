import { Injectable, Logger } from '@nestjs/common';
import { ContactMessage, JobApplication } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { env, smtp } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** One line only: names/subjects go into the email subject, so line breaks are removed (prevents header injection). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

/**
 * Sends the "new message" / "new application" alerts to SiteSettings.notificationEmail through SMTP.
 * IMPORTANT: sending never breaks a submission. Every failure is caught and logged; the visitor's data is already saved.
 */
@Injectable()
export class MailerService {
  private readonly log = new Logger('Mailer');
  private transport?: nodemailer.Transporter;

  constructor(private readonly prisma: PrismaService) {}

  get configured() {
    return !!smtp.host;
  }

  private getTransport() {
    this.transport ??= nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: !smtp.secure, // port 587: insist on STARTTLS, never send the password in clear text
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      // A slow mail server must not hang the website.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    return this.transport;
  }

  /** @returns true if the server accepted the message. Never throws. */
  async send(opts: { to: string; subject: string; text: string; html: string; replyTo?: string }): Promise<boolean> {
    if (!this.configured) {
      this.log.warn(`SMTP is not configured (SMTP_HOST is empty): email "${opts.subject}" was not sent.`);
      return false;
    }
    try {
      const info = await this.getTransport().sendMail({ from: smtp.from, ...opts });
      const preview = nodemailer.getTestMessageUrl(info); // only set for Ethereal test accounts
      this.log.log(`Email sent to ${opts.to}: "${opts.subject}"${preview ? ` — preview: ${preview}` : ''}`);
      return true;
    } catch (e) {
      this.log.error(`Email "${opts.subject}" could not be sent: ${(e as Error).message}`);
      return false;
    }
  }

  private async recipient(): Promise<{ to: string; site: string } | null> {
    const s = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!s?.notificationEmail) {
      this.log.warn('No notification email is set in the website settings: alert not sent.');
      return null;
    }
    return { to: s.notificationEmail, site: s.brandName };
  }

  private row(label: string, value?: string | null) {
    return value ? { text: `${label}: ${value}\n`, html: `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${esc(label)}</td><td style="padding:4px 0">${esc(value).replace(/\n/g, '<br>')}</td></tr>` } : { text: '', html: '' };
  }

  /** Fire-and-forget friendly: callers do not need to await it. */
  async notifyContact(m: ContactMessage): Promise<void> {
    const r = await this.recipient().catch(() => null);
    if (!r) return;
    const rows = [this.row('Name', m.name), this.row('Email', m.email), this.row('Phone', m.phone), this.row('Company', m.company), this.row('Subject', m.subject)];
    const link = `${env.siteUrl}/admin/inbox/messages/${m.id}`;
    await this.send({
      to: r.to,
      replyTo: m.email,
      subject: `[${r.site}] New message: ${oneLine(m.subject)}`.slice(0, 200),
      text: `New message from the website contact form\n\n${rows.map((x) => x.text).join('')}\nMessage:\n${m.message}\n\nOpen in the admin: ${link}\n`,
      html: `<p><strong>New message from the website contact form</strong></p><table>${rows.map((x) => x.html).join('')}</table><p style="white-space:pre-wrap;background:#f6f6f2;padding:12px;border-radius:6px">${esc(m.message)}</p><p><a href="${esc(link)}">Open in the admin</a> · you can reply to this email to answer ${esc(m.name)}.</p>`,
    });
  }

  /** The CV is NOT attached (it contains personal data): it is available in the admin. */
  async notifyApplication(a: JobApplication, jobTitle?: string | null): Promise<void> {
    const r = await this.recipient().catch(() => null);
    if (!r) return;
    const what = jobTitle ? `Job: ${jobTitle}` : 'Open application (no specific job)';
    const rows = [this.row('Applied for', jobTitle ?? 'Open application'), this.row('Name', a.name), this.row('Email', a.email), this.row('Phone', a.phone), this.row('CV file', a.cvOriginalName)];
    const link = `${env.siteUrl}/admin/inbox/applications/${a.id}`;
    await this.send({
      to: r.to,
      replyTo: a.email,
      subject: `[${r.site}] New job application: ${oneLine(a.name)}${jobTitle ? ` (${oneLine(jobTitle)})` : ''}`.slice(0, 200),
      text: `New job application\n${what}\n\n${rows.map((x) => x.text).join('')}${a.message ? `\nNote from the applicant:\n${a.message}\n` : ''}\nThe CV is kept securely on the server. Download it in the admin (login required):\n${link}\n`,
      html: `<p><strong>New job application</strong></p><table>${rows.map((x) => x.html).join('')}</table>${a.message ? `<p style="white-space:pre-wrap;background:#f6f6f2;padding:12px;border-radius:6px">${esc(a.message)}</p>` : ''}<p>The CV is kept securely on the server. <a href="${esc(link)}">Open in the admin to download it</a> (login required).</p>`,
    });
  }

  /** Used by `npm run mail:test`. Throws a readable error so the problem can be shown. */
  async sendTest(to: string): Promise<void> {
    if (!this.configured) throw new Error('SMTP_HOST is not set.');
    await this.getTransport().verify();
    const info = await this.getTransport().sendMail({
      from: smtp.from, to, subject: 'Test email from your website', text: 'If you can read this, email alerts from the website work.',
    });
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`Accepted by the mail server (${info.messageId}).${preview ? ` Preview: ${preview}` : ''}`);
  }
}
