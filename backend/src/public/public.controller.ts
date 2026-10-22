import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeRichText, stripHtml, truncate } from '../common/sanitize';
import { imageView, PagesService } from './pages.service';
import { articleJsonLd, businessJsonLd, toJsonLdScript } from '../seo/jsonld';
import { env } from '../config/env';

const POSTS_PER_PAGE = 12;

/**
 * Server-rendered public pages. Each handler builds a view model and renders a Handlebars template
 * from backend/views/pages. Draft/unpublished content is never selected here.
 */
@Controller()
export class PublicController {
  constructor(private readonly prisma: PrismaService, private readonly pages: PagesService) {}

  @Get()
  async home(@Res() res: Response) {
    const ctx = await this.pages.fixedPage('home', '/');
    const [slides, stats, services, process, trust, why, posts] = await Promise.all([
      this.prisma.heroSlide.findMany({ where: { status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' }, include: { image: true } }),
      this.prisma.stat.findMany({ where: { group: 'HOME', status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' }, include: { icon: true } }),
      this.prisma.service.findMany({ where: { status: Status.PUBLISHED, showOnHome: true }, orderBy: { homeSortOrder: 'asc' } }),
      this.features('HOME_PROCESS'),
      this.features('HOME_TRUST'),
      this.features('WHY_CHOOSE'),
      this.prisma.post.findMany({
        where: { ...this.pages.publishedPostWhere(), showOnHome: true },
        orderBy: { publishedAt: 'desc' }, take: 3, include: { category: true },
      }),
    ]);
    const offices = await this.prisma.office.findMany({ orderBy: { sortOrder: 'asc' } });
    return res.render('pages/home', {
      ...ctx,
      jsonld: toJsonLdScript(businessJsonLd(env.siteUrl, ctx.site as any, offices)),
      slides: slides.map((s) => ({ ...s, img: imageView(s.image) })),
      stats: stats.map((s) => ({ ...s, iconImg: imageView(s.icon) })),
      services: services.map((s, i) => ({ ...s, text: s.homeSummary || s.summary, bg: (i % 4) + 1 })),
      process, trust, why,
      posts: posts.map((p) => ({ ...p, text: p.homeSummary || truncate(stripHtml(p.excerpt), 160) })),
    });
  }

  @Get('services')
  async services(@Res() res: Response) {
    const ctx = await this.pages.fixedPage('services', '/services');
    const cats = await this.prisma.serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { services: { where: { status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' } } },
    });
    let n = 0; // card backgrounds cycle through 4 images across the whole page
    const clusters = cats
      .filter((c) => c.services.length)
      .map((c) => ({
        title: c.title,
        colClass: c.services.length === 4 ? 'uk-width-1-2@s uk-width-1-4@m' : 'uk-width-1-2@s uk-width-1-3@m',
        services: c.services.map((s) => ({ ...s, bg: (n++ % 4) + 1 })),
      }));
    return res.render('pages/services', { ...ctx, clusters });
  }

  @Get('services/:slug')
  async service(@Param('slug') slug: string, @Res() res: Response) {
    const s = await this.prisma.service.findFirst({
      where: { slug, status: Status.PUBLISHED }, include: { category: true, ogImage: true },
    });
    if (!s) throw new NotFoundException();
    const [site, b] = await Promise.all([this.pages.site(), this.pages.blocks('services')]);
    const seo = this.pages.seo(site, {
      title: s.metaTitle, fallbackTitle: s.title,
      description: s.metaDescription || truncate(stripHtml(s.summary), 160),
      path: `/services/${s.slug}`, image: imageView(s.ogImage),
    });
    return res.render('pages/service', {
      site, b, seo, activePath: '/services',
      service: { ...s, bodyHtml: sanitizeRichText(s.body) },
    });
  }

  @Get('about')
  async about(@Res() res: Response) {
    const ctx = await this.pages.fixedPage('about', '/about');
    const [pillars, disciplines, team, stats] = await Promise.all([
      this.features('ABOUT_PILLAR'),
      this.features('TEAM_DISCIPLINE'),
      this.prisma.teamMember.findMany({ where: { status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' }, include: { photo: true } }),
      this.prisma.stat.findMany({ where: { group: 'ABOUT', status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return res.render('pages/about', {
      ...ctx, pillars, disciplines, stats,
      team: team.map((t) => ({ ...t, photoImg: imageView(t.photo) })),
    });
  }

  @Get('how-we-work')
  async howWeWork(@Res() res: Response) {
    const ctx = await this.pages.fixedPage('how-we-work', '/how-we-work');
    const steps = await this.features('ENGAGEMENT_STEP');
    return res.render('pages/how-we-work', { ...ctx, steps });
  }

  @Get('insights')
  async insights(@Query('page') pageParam: string, @Query('category') categorySlug: string, @Res() res: Response) {
    const ctx = await this.pages.fixedPage('insights', '/insights');
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const where = {
      ...this.pages.publishedPostWhere(),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    };
    const [total, posts, categories] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * POSTS_PER_PAGE, take: POSTS_PER_PAGE,
        include: { category: true, cover: true },
      }),
      this.prisma.postCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    const pages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
    // Canonical points at this exact listing (category / page), so filtered pages aren't treated as duplicates of /insights.
    const q = new URLSearchParams();
    if (categorySlug) q.set('category', categorySlug);
    if (page > 1) q.set('page', String(page));
    if (q.toString()) ctx.seo.canonical += '?' + q.toString();
    return res.render('pages/insights', {
      ...ctx, categories, activeCategory: categorySlug || '',
      posts: posts.map((p) => this.pages.postCard(p)),
      pagination: pages > 1 ? {
        page, pages, prev: page > 1 ? page - 1 : 0, next: page < pages ? page + 1 : 0,
        base: categorySlug ? `/insights?category=${encodeURIComponent(categorySlug)}&page=` : '/insights?page=',
      } : null,
    });
  }

  @Get('insights/:slug')
  async post(@Param('slug') slug: string, @Res() res: Response) {
    const p = await this.prisma.post.findFirst({
      where: { slug, ...this.pages.publishedPostWhere() }, include: { category: true, cover: true, ogImage: true },
    });
    if (!p) throw new NotFoundException();
    const site = await this.pages.site();
    const cover = imageView(p.cover);
    const seo = this.pages.seo(site, {
      title: p.metaTitle, fallbackTitle: p.title,
      description: p.metaDescription || truncate(stripHtml(p.excerpt), 160),
      path: `/insights/${p.slug}`, image: imageView(p.ogImage) || cover, ogType: 'article', publishedTime: p.publishedAt,
    });
    const jsonld = toJsonLdScript(articleJsonLd({
      url: seo.canonical, title: p.title, description: seo.description, image: seo.image?.abs,
      authorName: p.authorName, publishedAt: p.publishedAt, updatedAt: p.updatedAt,
      publisherName: site.legalName, logo: site.logoImg ? env.siteUrl + site.logoImg.src : null,
    }));
    return res.render('pages/post', {
      site, seo, jsonld, activePath: '/insights',
      post: { ...p, cover, bodyHtml: sanitizeRichText(p.body) },
    });
  }

  // The three form pages accept ?sent=1 / ?applied=1 (set after a successful no-JavaScript submission) to show the thank-you message.
  @Get('careers')
  async careers(@Query('applied') applied: string, @Res() res: Response) {
    return res.render('pages/careers', { ...(await this.pages.careersPage()), form: { sent: applied === '1' } });
  }

  @Get('careers/:slug')
  async job(@Param('slug') slug: string, @Query('applied') applied: string, @Res() res: Response) {
    const ctx = await this.pages.jobPage(slug);
    if (!ctx) throw new NotFoundException();
    return res.render('pages/job', { ...ctx, form: { sent: applied === '1' } });
  }

  @Get('contact')
  async contact(@Query('sent') sent: string, @Res() res: Response) {
    return res.render('pages/contact', { ...(await this.pages.contactPage()), form: { sent: sent === '1' } });
  }

  private features(group: any) {
    return this.prisma.featureItem.findMany({
      where: { group, status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' },
    });
  }
}
