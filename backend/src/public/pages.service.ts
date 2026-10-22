import { Injectable } from '@nestjs/common';
import { Media, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';
import { sanitizeRichText, stripHtml, truncate } from '../common/sanitize';
import { buildTitle } from '../seo/seo-rules';

export type ImageView = { src: string; alt: string; width?: number | null; height?: number | null };

/** Convert a Media row to what templates need. */
export function imageView(m: Media | null | undefined): ImageView | null {
  if (!m) return null;
  return { src: `/uploads/${m.path}`, alt: m.alt, width: m.width, height: m.height };
}

export type SeoInput = {
  title?: string | null; // custom meta title; if empty see seo/seo-rules.ts
  fallbackTitle?: string;
  description?: string | null;
  path: string; // canonical path, e.g. "/about"
  image?: ImageView | null;
  ogType?: 'website' | 'article';
  publishedTime?: Date | null; // for article pages
};

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Data every page needs: settings, menus, offices, socials. */
  async site() {
    const [settings, menu, offices, socials] = await Promise.all([
      this.prisma.siteSettings.findUniqueOrThrow({
        where: { id: 1 },
        include: { logo: true, footerLogo: true, favicon: true, defaultOg: true },
      }),
      this.prisma.menuItem.findMany({ where: { visible: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.office.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.socialLink.findMany({ where: { visible: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    const year = new Date().getFullYear();
    return {
      ...settings,
      siteUrl: env.siteUrl,
      host: new URL(env.siteUrl).host,
      logoImg: imageView(settings.logo),
      footerLogoImg: imageView(settings.footerLogo),
      // Favicon files are generated from settings.faviconId (see common/favicon.ts); the id busts browser caches when it changes.
      faviconVersion: settings.faviconId,
      copyright: settings.footerText.replace('{year}', String(year)),
      headerMenu: menu.filter((m) => m.location === 'HEADER'),
      footerMenu: menu.filter((m) => m.location === 'FOOTER'),
      offices: offices.map((o) => ({
        ...o,
        contactAddress: o.contactAddressLines || o.addressLines,
      })),
      socials,
    };
  }

  /** Content blocks of one page as a flat map: text, sanitised HTML, or an image view. */
  async blocks(pageKey: string): Promise<Record<string, any>> {
    const rows = await this.prisma.contentBlock.findMany({ where: { pageKey }, include: { media: true } });
    const out: Record<string, any> = {};
    for (const r of rows) {
      if (r.type === 'IMAGE') out[r.blockKey] = imageView(r.media);
      else if (r.type === 'RICHTEXT') out[r.blockKey] = sanitizeRichText(r.value);
      else out[r.blockKey] = r.value;
    }
    return out;
  }

  /** Build the SEO object for the layout's <head>. Everything has a sensible fallback. */
  seo(site: Awaited<ReturnType<PagesService['site']>>, input: SeoInput) {
    const title = buildTitle({
      metaTitle: input.title, pageTitle: input.fallbackTitle, isHome: input.path === '/',
      siteName: site.siteName, suffix: site.defaultMetaTitleSuffix,
    });
    const description = input.description?.trim() || site.defaultMetaDescription;
    const image = input.image || imageView(site.defaultOg);
    const abs = (p: string) => (/^https?:/.test(p) ? p : `${env.siteUrl}${p}`);
    return {
      title,
      description,
      canonical: abs(input.path === '/' ? '/' : input.path),
      ogType: input.ogType || 'website',
      publishedTime: input.publishedTime ? input.publishedTime.toISOString() : null,
      image: image ? { ...image, abs: abs(image.src) } : null,
    };
  }

  /** Published page record (title + SEO overrides). */
  async pageRecord(key: string) {
    return this.prisma.page.findUniqueOrThrow({ where: { key }, include: { ogImage: true } });
  }

  /** Common render context for a fixed page (home, about, ...). */
  async fixedPage(key: string, path: string) {
    const [site, page, b] = await Promise.all([this.site(), this.pageRecord(key), this.blocks(key)]);
    const seo = this.seo(site, {
      title: page.metaTitle,
      fallbackTitle: page.title,
      description: page.metaDescription,
      path,
      image: imageView(page.ogImage),
    });
    return { site, page, b, seo, activePath: path };
  }

  // ---- pages that contain a form (also re-rendered by the form handlers when a submission has problems)
  contactPage() {
    return this.fixedPage('contact', '/contact');
  }

  async careersPage() {
    const ctx = await this.fixedPage('careers', '/careers');
    const [perks, areas, jobs] = await Promise.all([
      this.prisma.featureItem.findMany({ where: { group: 'CAREER_PERK', status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.featureItem.findMany({ where: { group: 'CAREER_AREA', status: Status.PUBLISHED }, orderBy: { sortOrder: 'asc' } }),
      this.openJobs(),
    ]);
    return { ...ctx, perks, areas, jobs };
  }

  /** Published jobs whose closing date has not passed. */
  openJobs() {
    return this.prisma.job.findMany({
      where: { status: Status.PUBLISHED, OR: [{ closingDate: null }, { closingDate: { gte: new Date() } }] },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** @returns null when the job does not exist, is a draft or has closed. */
  async jobPage(slug: string) {
    const j = await this.prisma.job.findFirst({
      where: { slug, status: Status.PUBLISHED, OR: [{ closingDate: null }, { closingDate: { gte: new Date() } }] },
      include: { ogImage: true },
    });
    if (!j) return null;
    const [site, b] = await Promise.all([this.site(), this.blocks('careers')]);
    const seo = this.seo(site, {
      title: j.metaTitle, fallbackTitle: j.title,
      description: j.metaDescription || truncate(stripHtml(j.description), 160),
      path: `/careers/${j.slug}`, image: imageView(j.ogImage),
    });
    return { site, b, seo, activePath: '/careers', job: { ...j, descriptionHtml: sanitizeRichText(j.description) } };
  }

  // ---- reusable queries
  publishedPostWhere() {
    return { status: Status.PUBLISHED, publishedAt: { lte: new Date() } };
  }

  postCard(p: any) {
    return {
      ...p,
      cover: imageView(p.cover),
      dateText: p.publishedAt,
      paragraphsText: p.excerpt,
      homeText: p.homeSummary || truncate(stripHtml(p.excerpt), 160),
    };
  }
}
