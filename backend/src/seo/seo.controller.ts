import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

@Controller()
export class SeoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots() {
    // On a test/staging address (NOINDEX_SITE=true) everything is closed to search engines.
    if (env.noindexSite) return ['User-agent: *', 'Disallow: /', ''].join('\n');
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api',
      '',
      `Sitemap: ${env.siteUrl}/sitemap.xml`,
      '',
    ].join('\n');
  }

  /** Built on request from published DB content, so it is always current. */
  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const now = new Date();
    const [pages, services, posts, jobs] = await Promise.all([
      this.prisma.page.findMany(),
      this.prisma.service.findMany({ where: { status: Status.PUBLISHED }, select: { slug: true, updatedAt: true } }),
      this.prisma.post.findMany({
        where: { status: Status.PUBLISHED, publishedAt: { lte: now } },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.job.findMany({
        where: { status: Status.PUBLISHED, OR: [{ closingDate: null }, { closingDate: { gte: now } }] },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const urls: { loc: string; lastmod?: Date; priority?: string }[] = [
      ...pages.map((p) => ({ loc: p.slug ? `/${p.slug}` : '/', lastmod: p.updatedAt, priority: p.slug ? '0.8' : '1.0' })),
      ...services.map((s) => ({ loc: `/services/${s.slug}`, lastmod: s.updatedAt, priority: '0.7' })),
      ...posts.map((p) => ({ loc: `/insights/${p.slug}`, lastmod: p.updatedAt, priority: '0.6' })),
      ...jobs.map((j) => ({ loc: `/careers/${j.slug}`, lastmod: j.updatedAt, priority: '0.6' })),
    ];
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls
        .map(
          (u) =>
            `  <url><loc>${esc(env.siteUrl + u.loc)}</loc>` +
            (u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : '') +
            (u.priority ? `<priority>${u.priority}</priority>` : '') +
            '</url>',
        )
        .join('\n') +
      '\n</urlset>\n';
    res.set({ 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }).send(xml);
  }
}
