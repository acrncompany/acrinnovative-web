/**
 * Initial content seed: fills the DB with the content of the old static site and copies its
 * images into UPLOAD_DIR.
 *
 * Run once:   npm run seed:content      (from backend/, or `npm run seed:content` at the repo root)
 *
 * SAFE TO RE-RUN: it only creates what is missing and never overwrites anything the founder has
 * edited. SiteSettings is written LAST and doubles as the "already seeded" marker: if it exists,
 * the script exits immediately.
 */
import '../../src/config/load-env';
import { PrismaClient, Status } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { loadSharp, mimeFromExt, processImage } from '../../src/common/image-processor';
import { generateFaviconSet } from '../../src/common/favicon';
import * as data from './data/content';

const prisma = new PrismaClient();
const backendRoot = path.resolve(__dirname, '..', '..');
const uploadDir = path.resolve(backendRoot, process.env.UPLOAD_DIR || '../../acr-data/uploads');

/**
 * Seed images live in backend/prisma/seed-assets/ (already optimized WebP/SVG, committed to git), so a fresh
 * clone or the server can seed without the git-ignored reference/ folder.
 * Optional override: SEED_ASSETS_DIR (may contain raw JPG/PNG; those are run through the image pipeline).
 * Regenerate the folder from reference/ with `npm run seed:build-assets`.
 */
const assetsDir = path.resolve(backendRoot, process.env.SEED_ASSETS_DIR || 'prisma/seed-assets');
const faviconDir = path.join(uploadDir, '_favicon');

/** Find the source file; tolerate a different extension (e.g. override folder holds .png instead of .webp). */
function findSource(file: string): string {
  const exact = path.join(assetsDir, file);
  if (fs.existsSync(exact)) return exact;
  const base = path.basename(file, path.extname(file));
  for (const ext of ['.webp', '.png', '.jpg', '.jpeg', '.svg']) {
    const alt = path.join(assetsDir, base + ext);
    if (fs.existsSync(alt)) return alt;
  }
  throw new Error(`Seed image not found: ${exact} (set SEED_ASSETS_DIR)`);
}

/** Copy a seed image into UPLOAD_DIR/seed/ and register it as Media (once per file). */
async function ensureMedia(file: string, alt: string): Promise<number> {
  const src = findSource(file);
  const ext = path.extname(src).toLowerCase();
  const raw = fs.readFileSync(src);

  // WebP/SVG are already optimized: copy as-is. Anything else goes through the shared pipeline.
  let buffer = raw, outExt = ext, mimeType = mimeFromExt(ext), width: number | null = null, height: number | null = null;
  if (ext !== '.webp' && ext !== '.svg') {
    const img = await processImage(raw, src);
    ({ buffer, ext: outExt, mimeType, width, height } = img);
  } else if (ext === '.webp') {
    const sharp = loadSharp();
    if (sharp) {
      const meta = await sharp(raw).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    }
  }

  const rel = `seed/${path.basename(src, ext)}${outExt}`;
  const existing = await prisma.media.findUnique({ where: { path: rel } });
  if (existing) return existing.id;

  const dest = path.join(uploadDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  const media = await prisma.media.create({
    data: { path: rel, alt, width, height, mimeType, sizeBytes: buffer.length },
  });
  return media.id;
}

async function main() {
  if (await prisma.siteSettings.findUnique({ where: { id: 1 } })) {
    console.log('Content already seeded (SiteSettings exists). Nothing to do.');
    return;
  }
  console.log(`Seeding initial content. Images go to ${uploadDir}`);

  // ---- pages (SEO records)
  for (const p of data.pages) {
    await prisma.page.upsert({ where: { key: p.key }, update: {}, create: p });
  }

  // ---- content blocks
  let order = 0;
  for (const bl of data.blocks) {
    const exists = await prisma.contentBlock.findUnique({
      where: { pageKey_blockKey: { pageKey: bl.pageKey, blockKey: bl.blockKey } },
    });
    if (exists) continue;
    const mediaId = bl.image ? await ensureMedia(bl.image.file, bl.image.alt) : undefined;
    await prisma.contentBlock.create({
      data: {
        pageKey: bl.pageKey, blockKey: bl.blockKey, label: bl.label, type: bl.type,
        value: bl.value ?? '', mediaId, sortOrder: ++order,
      },
    });
  }

  // ---- hero slides
  if ((await prisma.heroSlide.count()) === 0) {
    let i = 0;
    for (const s of data.heroSlides) {
      const { image, ...rest } = s;
      await prisma.heroSlide.create({
        data: { ...rest, imageId: await ensureMedia(image.file, image.alt), sortOrder: ++i },
      });
    }
  }

  // ---- stats (per group)
  for (const group of ['HOME', 'ABOUT'] as const) {
    if ((await prisma.stat.count({ where: { group } })) > 0) continue;
    let i = 0;
    for (const s of data.stats.filter((x) => x.group === group)) {
      const iconId = 'icon' in s && s.icon ? await ensureMedia(s.icon.file, s.icon.alt) : undefined;
      await prisma.stat.create({
        data: {
          group, label: s.label, value: s.value ?? null, suffix: s.suffix,
          textValue: 'textValue' in s ? (s.textValue as string) : null,
          description: 'description' in s ? (s.description as string) : null,
          iconId, sortOrder: ++i,
        },
      });
    }
  }

  // ---- feature items (per group)
  const groups = [...new Set(data.featureItems.map((f) => f.group))];
  for (const group of groups) {
    if ((await prisma.featureItem.count({ where: { group: group as any } })) > 0) continue;
    let i = 0;
    for (const f of data.featureItems.filter((x) => x.group === group)) {
      await prisma.featureItem.create({ data: { ...(f as any), sortOrder: ++i } });
    }
  }

  // ---- team
  if ((await prisma.teamMember.count()) === 0) {
    let i = 0;
    for (const t of data.teamMembers) await prisma.teamMember.create({ data: { ...t, sortOrder: ++i } });
  }

  // ---- services
  let catOrder = 0;
  for (const c of data.serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: ++catOrder },
    });
  }
  let svcOrder = 0;
  for (const s of data.services) {
    svcOrder++;
    if (await prisma.service.findUnique({ where: { slug: s.slug } })) continue;
    const category = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: s.cat } });
    await prisma.service.create({
      data: {
        categoryId: category.id, title: s.title, slug: s.slug, icon: s.icon, summary: s.summary,
        homeSummary: s.home?.text ?? null, showOnHome: !!s.home, homeSortOrder: s.home?.order ?? 0,
        body: `<p>${s.summary}</p>`, status: Status.PUBLISHED, sortOrder: svcOrder,
      },
    });
  }

  // ---- insights
  let pcOrder = 0;
  for (const c of data.postCategories) {
    await prisma.postCategory.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: ++pcOrder } });
  }
  let postOrder = 0;
  for (const p of data.posts) {
    postOrder++;
    if (await prisma.post.findUnique({ where: { slug: p.slug } })) continue;
    const category = await prisma.postCategory.findUniqueOrThrow({ where: { slug: p.cat } });
    await prisma.post.create({
      data: {
        categoryId: category.id, title: p.title, slug: p.slug,
        excerpt: `${p.p1}\n\n${p.p2}`, homeSummary: p.home, body: `<p>${p.p1}</p><p>${p.p2}</p>`,
        coverId: await ensureMedia(p.cover.file, p.cover.alt),
        authorName: p.author, status: Status.PUBLISHED, publishedAt: new Date(p.date),
        showOnHome: true, sortOrder: postOrder,
      },
    });
  }

  // ---- offices, menu
  if ((await prisma.office.count()) === 0) await prisma.office.createMany({ data: data.offices });
  for (const location of ['HEADER', 'FOOTER'] as const) {
    if ((await prisma.menuItem.count({ where: { location } })) === 0) {
      await prisma.menuItem.createMany({ data: data.menuItems.filter((m) => m.location === location) });
    }
  }

  // ---- favicon set generated from the logo (square 512 source), also registered as Media so settings can reference it
  const faviconMediaId = await ensureMedia('ACR-Logo-icon.webp', 'ACR logo icon');
  const ok = await generateFaviconSet(fs.readFileSync(findSource('ACR-Logo-icon.webp')), faviconDir);
  if (!ok) console.warn('sharp unavailable: favicon files were not generated. Re-save the favicon in admin settings later.');

  // ---- settings LAST (marker that seeding finished)
  await prisma.siteSettings.create({
    data: {
      id: 1, ...data.settings,
      logoId: await ensureMedia('ACR-Logo.webp', 'ACR logo'),
      faviconId: faviconMediaId,
      footerLogoId: await ensureMedia('footer-logo-3WIDIh.svg', 'ACR Innovative Management Services'),
      defaultOgImageId: await ensureMedia('in-acr-about.webp', 'ACR Innovative — professional advisory office'),
    },
  });

  console.log('Done. Next: npm run seed:admin (creates the admin user if none exists).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
