/**
 * Health check for a deployment: `npm run doctor` (add `-- --mail` to also test the SMTP login).
 * It checks the settings, the data folders, the database + migrations, the built files, sharp and email, and says
 * in plain words what is wrong and how to fix it. Run it after every deployment. Exit code 1 = something must be fixed.
 */
import '../config/load-env';
import * as fs from 'fs';
import * as path from 'path';

const appDir = path.resolve(__dirname, '..', '..'); // src/cli (or dist/cli) -> the app folder

type Level = 'ok' | 'warn' | 'fail' | 'info';
const results: { level: Level; text: string }[] = [];
const add = (level: Level, text: string) => results.push({ level, text });
const mark: Record<Level, string> = { ok: '  OK    ', warn: '  WARN  ', fail: '  FAIL  ', info: '  info  ' };
const section = (name: string) => results.push({ level: 'info', text: `\n${name}` });

const isProd = process.env.NODE_ENV === 'production';
const inside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

function checkNode() {
  section('Node.js');
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major >= 20) add('ok', `Node.js ${process.versions.node}`);
  else add('fail', `Node.js ${process.versions.node} is too old. Choose Node.js 20 or 22 in the Hostinger app settings.`);
  if (isProd) add('ok', 'NODE_ENV=production');
  else add('warn', 'NODE_ENV is not "production" (fine on your own computer; on the server set NODE_ENV=production).');
}

function checkSettings() {
  section('Settings (environment variables)');
  const need = (name: string, hint: string) => {
    if (process.env[name]?.trim()) return true;
    add('fail', `${name} is not set. ${hint}`);
    return false;
  };
  need('DATABASE_URL', 'Format: mysql://USER:PASSWORD@localhost:3306/DATABASE_NAME');
  if (need('JWT_SECRET', 'A long random text, at least 32 characters.')) {
    const len = process.env.JWT_SECRET!.length;
    if (len < 32) add(isProd ? 'fail' : 'warn', `JWT_SECRET is only ${len} characters; use at least 32.`);
    else add('ok', `JWT_SECRET is set (${len} characters)`);
  }
  const site = process.env.SITE_URL?.trim() ?? '';
  if (!site) add('fail', 'SITE_URL is not set. Example: https://acrinnovative.com (no slash at the end).');
  else if (isProd && !site.startsWith('https://')) add('fail', `SITE_URL is ${site}: it must start with https:// (otherwise the admin login cannot work).`);
  else if (isProd && /localhost|127\.0\.0\.1/.test(site)) add('fail', `SITE_URL is ${site}: use the real address of the website.`);
  else add('ok', `SITE_URL=${site}`);
  if (/\/$/.test(site)) add('warn', 'SITE_URL ends with a slash; remove it.');
  if (process.env.TRUST_PROXY === undefined && isProd) add('warn', 'TRUST_PROXY is not set (default 1 is right for Hostinger).');
  if ((process.env.NOINDEX_SITE ?? '').toLowerCase() === 'true') {
    add(/acrinnovative\.com/.test(site) ? 'warn' : 'info', `NOINDEX_SITE=true: Google is told to IGNORE this site.${/acrinnovative\.com/.test(site) ? ' Remove it when you go live!' : ' Correct for a test address; remove it when you go live.'}`);
  }
  if (isProd && process.env.ADMIN_PASSWORD) add('warn', 'ADMIN_PASSWORD is still set. It is only needed for the first "seed:admin"; delete it from the environment now.');
}

function checkFolders() {
  section('Data folders (uploads and CVs)');
  for (const [name, hint] of [['UPLOAD_DIR', 'uploads'], ['PRIVATE_DIR', 'private']] as const) {
    const raw = process.env[name]?.trim();
    if (!raw) {
      add(isProd ? 'fail' : 'info', `${name} is not set${isProd ? '. Example: /home/<user>/acr-data/' + hint : ' (a local default is used while developing)'}.`);
      continue;
    }
    const dir = path.resolve(appDir, raw);
    if (isProd && inside(dir, appDir)) {
      add('fail', `${name}=${dir} is INSIDE the app folder (${appDir}). A redeploy would delete it. Use a folder outside, e.g. /home/<user>/acr-data/${hint}.`);
      continue; // do not create anything there
    }
    try {
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, `.doctor-${process.pid}`);
      fs.writeFileSync(probe, 'ok');
      fs.rmSync(probe);
      add('ok', `${name} ${dir} exists and is writable`);
    } catch (e) {
      add('fail', `${name} ${dir} cannot be written to: ${(e as Error).message}`);
    }
  }
  const up = process.env.UPLOAD_DIR && path.resolve(appDir, process.env.UPLOAD_DIR);
  const pr = process.env.PRIVATE_DIR && path.resolve(appDir, process.env.PRIVATE_DIR);
  if (up && pr && (inside(up, pr) || inside(pr, up))) add('fail', 'UPLOAD_DIR and PRIVATE_DIR overlap. They must be two separate folders: uploads are public, CVs must not be.');
  if (pr && (inside(pr, path.join(appDir, 'public')) || inside(pr, path.join(appDir, 'dist-admin')))) add('fail', 'PRIVATE_DIR is inside the website files: CVs would be exposed.');
}

function checkFiles() {
  section('Application files');
  for (const [rel, what] of [['dist/main.js', 'the built server (run the build / upload the release package)'], ['dist-admin/index.html', 'the built admin app'], ['views/layouts/main.hbs', 'the page templates'], ['public/css/style.css', 'the website styles'], ['prisma/schema.prisma', 'the database description'], ['prisma/seed-assets', 'the starter pictures']]) {
    if (fs.existsSync(path.join(appDir, rel))) add('ok', rel);
    else add('fail', `${rel} is missing (${what}).`);
  }
}

async function checkDatabase() {
  section('Database');
  if (!process.env.DATABASE_URL) return add('fail', 'Skipped: DATABASE_URL is not set.');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client');
  let prisma: any;
  try {
    prisma = new PrismaClient();
  } catch {
    return add('fail', 'The database client has not been generated. Run:  npx prisma generate   (it normally runs by itself at the end of "npm install"; if it did not, check that install finished without errors).');
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    add('ok', 'Connected to MySQL');
  } catch (e) {
    await prisma.$disconnect().catch(() => undefined);
    return add('fail', `Cannot connect to the database: ${(e as Error).message.split('\n').slice(-2).join(' ').trim()}  Check the user name, password (special characters must be URL-encoded, e.g. @ = %40), host and database name in DATABASE_URL.`);
  }
  try {
    const dir = path.join(appDir, 'prisma', 'migrations');
    const shipped = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()) : [];
    const done: { migration_name: string }[] = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`.catch(() => []);
    const applied = new Set(done.map((m) => m.migration_name));
    const pending = shipped.filter((m) => !applied.has(m));
    if (done.length === 0) add('fail', 'The database is empty (no tables). Run:  npx prisma migrate deploy');
    else if (pending.length) add('fail', `${pending.length} database update(s) not applied yet (${pending.join(', ')}). Run:  npx prisma migrate deploy`);
    else add('ok', `All ${shipped.length} database migration(s) applied`);

    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } }).catch(() => null);
    if (!settings) add('fail', 'The website content has not been loaded yet. Run once:  npm run seed:content');
    else add('ok', `Website content present (${settings.siteName})`);
    const admins = await prisma.adminUser.count().catch(() => 0);
    if (admins === 0) add('fail', 'There is no admin user yet. Run once:  npm run seed:admin   (needs ADMIN_EMAIL and ADMIN_PASSWORD in the environment)');
    else add('ok', `${admins} admin user(s)`);
    if (settings && !settings.notificationEmail) add('warn', 'No "Send form alerts to" email in the website settings: form alerts will not be sent.');
  } catch (e) {
    add('fail', `Database check failed: ${(e as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkSharp() {
  section('Image processing (sharp)');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('sharp');
    const sharp = m.default ?? m;
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#ff0000' } }).png().toBuffer();
    const webp = await sharp(png).resize(4).webp().toBuffer();
    add('ok', `sharp works (made a ${webp.length}-byte WebP)`);
  } catch (e) {
    add('warn', `sharp could not be loaded: ${(e as Error).message.split('\n')[0]}  The website still works, but uploaded pictures are stored as they are (not resized or converted to WebP) and the favicon cannot be regenerated. Fix: run "npm install --omit=dev" on the server itself so the matching sharp build is installed.`);
  }
}

async function checkMail(verify: boolean) {
  section('Email alerts (SMTP)');
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return add('warn', 'SMTP_HOST is not set: form alerts will NOT be emailed (submissions are still saved in the Inbox). See DEPLOY.md, step "Email".');
  add('ok', `SMTP ${host}:${process.env.SMTP_PORT || 465} (secure=${process.env.SMTP_SECURE ?? 'true'}) user=${process.env.SMTP_USER || '(none)'}`);
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) add('warn', 'SMTP_USER / SMTP_PASS are not both set.');
  if (!verify) return add('info', 'Not logged in to the mail server in this check. Run  npm run mail:test  to send a real test email.');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({
      host, port: parseInt(process.env.SMTP_PORT || '465', 10), secure: (process.env.SMTP_SECURE ?? 'true').toLowerCase() !== 'false',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined, connectionTimeout: 10000, greetingTimeout: 10000,
    });
    await t.verify();
    add('ok', 'Logged in to the mail server successfully');
  } catch (e) {
    add('fail', `Could not log in to the mail server: ${(e as Error).message}`);
  }
}

function checkBackups() {
  section('Backups');
  const upload = process.env.UPLOAD_DIR?.trim();
  const dir = process.env.BACKUP_DIR?.trim() ? path.resolve(appDir, process.env.BACKUP_DIR) : upload ? path.join(path.dirname(path.resolve(appDir, upload)), 'backups') : '';
  if (!dir) return add('info', 'Backup folder unknown (UPLOAD_DIR not set).');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^acr-backup-.*\.tar\.gz$/.test(f)) : [];
  if (files.length === 0) return add(isProd ? 'warn' : 'info', `No backup found in ${dir}. Set up the daily backup (DEPLOY.md, "Backups") and run  npm run backup  once now.`);
  const newest = Math.max(...files.map((f) => fs.statSync(path.join(dir, f)).mtimeMs));
  const days = (Date.now() - newest) / 86_400_000;
  add(days > 2 ? 'warn' : 'ok', `${files.length} backup(s) in ${dir}; the newest is ${days < 1 ? 'less than a day' : Math.floor(days) + ' day(s)'} old${days > 2 ? ': the daily backup does not seem to be running' : ''}`);
}

async function main() {
  console.log(`\nACR website check (${appDir})`);
  checkNode();
  checkSettings();
  checkFolders();
  checkFiles();
  await checkDatabase();
  await checkSharp();
  await checkMail(process.argv.includes('--mail'));
  checkBackups();

  for (const r of results) console.log(r.level === 'info' && r.text.startsWith('\n') ? r.text : `${mark[r.level]}${r.text}`);
  const fails = results.filter((r) => r.level === 'fail').length;
  const warns = results.filter((r) => r.level === 'warn').length;
  console.log(`\n${fails ? `${fails} problem(s) to fix` : 'No problems found'}${warns ? `, ${warns} warning(s)` : ''}.\n`);
  process.exitCode = fails ? 1 : 0;
}

main().catch((e) => {
  console.error('The check itself crashed:', e);
  process.exitCode = 2;
});
