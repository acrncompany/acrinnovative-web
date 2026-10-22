import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Logger, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Res, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { paths } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { MarkReadDto, PurgeDto } from './dto';

const paging = (page: string, limit: string) => {
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  return { take: l, skip: (Math.max(1, parseInt(page, 10) || 1) - 1) * l, page: Math.max(1, parseInt(page, 10) || 1), limit: l };
};
const purgePipe = new ValidationPipe({ whitelist: true, transform: true, expectedType: PurgeDto });

/** Items older than this many months (calendar months back from now). */
function cutoff(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}
function monthsParam(raw: string | undefined): number {
  // Whole numbers only ("1.5", "3 months" and "" are refused).
  const n = /^\d{1,3}$/.test(raw ?? '') ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 120) throw new BadRequestException('Choose between 1 and 120 months.');
  return n;
}

/** Remove one CV from PRIVATE_DIR. Only a bare file name from the database is used (no path tricks); a missing file is fine. */
export function removeCvFile(cvFile: string, log?: Logger) {
  try {
    fs.rmSync(path.join(paths.privateDir, path.basename(cvFile)), { force: true });
  } catch (e) {
    log?.warn(`Could not delete CV file ${cvFile}: ${(e as Error).message}`);
  }
}

const readPipe = new ValidationPipe({ whitelist: true, transform: true, expectedType: MarkReadDto });

/** Inbox for the contact form: list, open, mark read/unread, delete (one or old ones in bulk). Messages are created by the public form. */
@Controller('api/admin/contact-messages')
export class ContactMessagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('unread') unread?: string, @Query('page') page = '1', @Query('limit') limit = '25') {
    const where = unread === 'true' ? { isRead: false } : {};
    const p = paging(page, limit);
    const [total, unreadCount, items] = await Promise.all([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.count({ where: { isRead: false } }),
      this.prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take }),
    ]);
    return { total, unread: unreadCount, page: p.page, limit: p.limit, items };
  }

  /** How many messages a clean-up would delete (shown to the founder before they confirm). */
  @Get('purge/count')
  async purgeCount(@Query('months') months?: string) {
    return { count: await this.prisma.contactMessage.count({ where: { createdAt: { lt: cutoff(monthsParam(months)) } } }) };
  }

  @Post('purge')
  @HttpCode(200)
  async purge(@Body(purgePipe) dto: PurgeDto) {
    const r = await this.prisma.contactMessage.deleteMany({ where: { createdAt: { lt: cutoff(dto.months) } } });
    return { deleted: r.count };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    return m;
  }

  @Patch(':id')
  async mark(@Param('id', ParseIntPipe) id: number, @Body(readPipe) dto: MarkReadDto) {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    return this.prisma.contactMessage.update({ where: { id }, data: { isRead: dto.isRead } });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    await this.prisma.contactMessage.delete({ where: { id } });
  }
}

/** Inbox for job applications. CVs sit in PRIVATE_DIR (never served publicly) and are downloaded here. Deleting an application also deletes its CV file. */
@Controller('api/admin/applications')
export class ApplicationsController {
  private readonly log = new Logger('Applications');
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('unread') unread?: string, @Query('jobId') jobId?: string, @Query('page') page = '1', @Query('limit') limit = '25') {
    const where: any = { ...(unread === 'true' ? { isRead: false } : {}), ...(jobId ? { jobId: parseInt(jobId, 10) || -1 } : {}) };
    const p = paging(page, limit);
    const [total, unreadCount, items] = await Promise.all([
      this.prisma.jobApplication.count({ where }),
      this.prisma.jobApplication.count({ where: { isRead: false } }),
      this.prisma.jobApplication.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: p.skip, take: p.take,
        include: { job: { select: { id: true, title: true } } },
      }),
    ]);
    return { total, unread: unreadCount, page: p.page, limit: p.limit, items };
  }

  @Get('purge/count')
  async purgeCount(@Query('months') months?: string) {
    return { count: await this.prisma.jobApplication.count({ where: { createdAt: { lt: cutoff(monthsParam(months)) } } }) };
  }

  /** Deletes old applications AND their CV files. */
  @Post('purge')
  @HttpCode(200)
  async purge(@Body(purgePipe) dto: PurgeDto) {
    const old = await this.prisma.jobApplication.findMany({ where: { createdAt: { lt: cutoff(dto.months) } }, select: { id: true, cvFile: true } });
    // Database first: if it fails nothing is lost. A leftover file can only happen if a delete below fails (it is logged).
    const r = await this.prisma.jobApplication.deleteMany({ where: { id: { in: old.map((a) => a.id) } } });
    for (const a of old) removeCvFile(a.cvFile, this.log);
    return { deleted: r.count };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    const a = await this.prisma.jobApplication.findUnique({ where: { id }, include: { job: { select: { id: true, title: true } } } });
    if (!a) throw new NotFoundException();
    return a;
  }

  @Patch(':id')
  async mark(@Param('id', ParseIntPipe) id: number, @Body(readPipe) dto: MarkReadDto) {
    const a = await this.prisma.jobApplication.findUnique({ where: { id } });
    if (!a) throw new NotFoundException();
    return this.prisma.jobApplication.update({ where: { id }, data: { isRead: dto.isRead } });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const a = await this.prisma.jobApplication.findUnique({ where: { id } });
    if (!a) throw new NotFoundException();
    await this.prisma.jobApplication.delete({ where: { id } });
    removeCvFile(a.cvFile, this.log);
  }

  /** Authenticated download (the global admin guard covers this route). Only a bare file name from the DB is ever used. */
  @Get(':id/cv')
  async cv(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const a = await this.prisma.jobApplication.findUnique({ where: { id } });
    if (!a) throw new NotFoundException();
    const file = path.join(paths.privateDir, path.basename(a.cvFile)); // basename: no path traversal
    if (!fs.existsSync(file)) throw new NotFoundException('The CV file is missing from the server.');
    res.set({ 'Content-Type': a.cvMimeType, 'Cache-Control': 'private, no-store' });
    res.download(file, a.cvOriginalName);
  }
}
