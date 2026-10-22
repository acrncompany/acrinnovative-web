import './load-env'; // must be first: fills process.env from ENV_FILE / backend/.env
import * as path from 'path';

/**
 * Central place for environment settings and filesystem locations.
 *
 * Where settings come from:
 *   - real environment variables (e.g. entered in the hosting panel), which always win, then
 *   - the file named by ENV_FILE (on the server: /home/<user>/acr-data/.env, outside the app folder), then
 *   - for local development, the file backend/.env (never committed; copy .env.example).
 * Relative paths (e.g. UPLOAD_DIR=../../acr-data/uploads) are resolved from the backend/ (app) folder.
 */
const backendRoot = path.resolve(__dirname, '..', '..'); // dist/config -> the app folder

const isProd = process.env.NODE_ENV === 'production';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  return v;
}

/** True when `child` is the same folder as `parent` or lies inside it. */
const isInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

/** A data folder (uploads / CVs). In production it must be set explicitly: guessing could put files where a redeploy deletes them. */
function dataDir(name: string, devDefault: string): string {
  const v = process.env[name]?.trim();
  if (!v && isProd) {
    throw new Error(`${name} is not set. In production it must be an absolute path OUTSIDE the app folder, e.g. /home/<user>/acr-data/${name === 'UPLOAD_DIR' ? 'uploads' : 'private'}. See DEPLOY.md.`);
  }
  return path.resolve(backendRoot, v || devDefault);
}

export const env = {
  isProd,
  port: parseInt(process.env.PORT || '3000', 10),
  /** Public base URL without trailing slash, used for canonical/OG/sitemap. */
  siteUrl: (process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, ''),
  trustProxy: process.env.TRUST_PROXY ?? '1',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  /** Admin login cookie lifetime. */
  sessionHours: 12,
  /** Cookie "Secure" flag: on in production (HTTPS). Set COOKIE_SECURE=true to force it locally. */
  cookieSecure: isProd || process.env.COOKIE_SECURE === 'true',
  /** NOINDEX_SITE=true: ask search engines to ignore the whole site (use on a test/staging address, remove for the real site). */
  noindexSite: (process.env.NOINDEX_SITE ?? '').toLowerCase() === 'true',
};

if (isProd && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
if (isProd && !env.siteUrl.startsWith('https://')) {
  // The admin login cookie is "Secure" in production, so over plain http nobody could log in.
  console.warn(`[config] SITE_URL (${env.siteUrl}) does not start with https:// : the admin login will not work over plain http.`);
}

/**
 * Outgoing email (new message / new application alerts). Works with any SMTP server, for example:
 *   Hostinger mailbox: SMTP_HOST=smtp.hostinger.com  SMTP_PORT=465  SMTP_SECURE=true   (user = the full mailbox address)
 *   Gmail:             SMTP_HOST=smtp.gmail.com      SMTP_PORT=465  SMTP_SECURE=true   (password = a Google "App Password")
 *   Ethereal (fake, for local testing): see `npm run mail:ethereal`
 * If SMTP_HOST is empty, emails are skipped (submissions are still saved).
 */
export const smtp = {
  host: process.env.SMTP_HOST?.trim() || '',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  /** true = connect with TLS straight away (port 465). false = plain connection upgraded with STARTTLS (port 587). */
  secure: (process.env.SMTP_SECURE ?? 'true').toLowerCase() !== 'false',
  user: process.env.SMTP_USER?.trim() || '',
  pass: process.env.SMTP_PASS || '',
  /** Sender shown in the inbox. Must be (or be allowed by) the mailbox you log in with. Default: SMTP_USER. */
  from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || '',
};

export const paths = {
  backendRoot,
  views: path.join(backendRoot, 'views'),
  publicDir: path.join(backendRoot, 'public'),
  /** The built Angular admin (copied here by scripts/build.js). */
  adminDir: path.join(backendRoot, 'dist-admin'),
  /** Admin-uploaded images, served at /uploads. Must live outside the app folder in production. */
  uploadDir: dataDir('UPLOAD_DIR', '../../acr-data/uploads'),
  /** Private files (CVs). Never served statically. */
  privateDir: dataDir('PRIVATE_DIR', '../../acr-data/private'),
};

// Safety checks on the two data folders (they would otherwise fail silently and expose CVs or lose uploads).
if (isInside(paths.privateDir, paths.uploadDir) || isInside(paths.uploadDir, paths.privateDir)) {
  throw new Error('PRIVATE_DIR and UPLOAD_DIR must be two separate folders (neither inside the other): the uploads folder is public, CVs must not be.');
}
if (isInside(paths.privateDir, paths.publicDir) || isInside(paths.privateDir, paths.adminDir)) {
  throw new Error('PRIVATE_DIR must not be inside the website files (public/ or dist-admin/): CVs would be exposed.');
}
if (isProd && (isInside(paths.uploadDir, backendRoot) || isInside(paths.privateDir, backendRoot))) {
  throw new Error(`UPLOAD_DIR and PRIVATE_DIR must be OUTSIDE the app folder (${backendRoot}): a redeploy replaces that folder and would delete every upload and CV. See DEPLOY.md.`);
}
