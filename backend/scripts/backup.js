#!/usr/bin/env node
/**
 * Backup: one file containing the whole database + all uploaded pictures + all CVs.
 *
 *   npm run backup            (or:  node scripts/backup.js)
 *
 * Creates  <BACKUP_DIR>/acr-backup-YYYY-MM-DD_HHMM.tar.gz  with inside:
 *     database.sql        every table (MySQL dump)
 *     <uploads folder>/   the pictures uploaded in the admin
 *     <private folder>/   the CVs (personal data: treat the backup file as confidential)
 * and deletes backups older than BACKUP_KEEP_DAYS (default 14), always keeping the newest 3.
 *
 * Settings come from the same environment as the website (DATABASE_URL, UPLOAD_DIR, PRIVATE_DIR) plus optional:
 *   BACKUP_DIR         where to put the files (default: a "backups" folder next to the uploads folder)
 *   BACKUP_KEEP_DAYS   how long to keep them (default 14)
 *   MYSQLDUMP_PATH     full path of the mysqldump program if it is not found automatically
 * Needs the `mysqldump` and `tar` programs (both are available on Hostinger's SSH and in cron jobs).
 * Exit code 0 = success; anything else = failure (a cron job will then email you the message).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');

const appDir = path.resolve(__dirname, '..');
try {
  const dotenv = require('dotenv');
  // Same order as the website: ENV_FILE (outside the app folder), then backend/.env. Real environment variables win.
  if (process.env.ENV_FILE && fs.existsSync(process.env.ENV_FILE)) dotenv.config({ path: process.env.ENV_FILE, quiet: true });
  dotenv.config({ path: path.join(appDir, '.env'), quiet: true });
} catch {
  /* dotenv is optional here: on the server the real environment is used */
}

/** Stops the backup with a readable message. (Throws, so the temporary folder is still cleaned up.) */
function fail(message) {
  throw new Error(message);
}

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;

async function main() {
  // ---- settings
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set.');
  if (!process.env.UPLOAD_DIR || !process.env.PRIVATE_DIR) fail('UPLOAD_DIR and PRIVATE_DIR must be set (the same values the website uses).');
  const uploadDir = path.resolve(appDir, process.env.UPLOAD_DIR);
  const privateDir = path.resolve(appDir, process.env.PRIVATE_DIR);
  const backupDir = path.resolve(appDir, process.env.BACKUP_DIR || path.join(path.dirname(uploadDir), 'backups'));
  const keepDays = Math.max(1, parseInt(process.env.BACKUP_KEEP_DAYS || '14', 10) || 14);
  if (path.basename(uploadDir) === path.basename(privateDir) || ['database.sql'].includes(path.basename(uploadDir)) || ['database.sql'].includes(path.basename(privateDir))) {
    fail(`The uploads and private folders need different names (now "${path.basename(uploadDir)}" and "${path.basename(privateDir)}").`);
  }
  let db;
  try {
    db = new URL(process.env.DATABASE_URL);
  } catch {
    fail('DATABASE_URL is not a valid address (mysql://user:password@host:3306/database).');
  }
  const dbName = decodeURIComponent(db.pathname.replace(/^\//, ''));

  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const work = fs.mkdtempSync(path.join(backupDir, '.work-'));
  const base = `acr-backup-${stamp(new Date())}`;
  const tarFile = path.join(work, `${base}.tar`);
  const finalFile = path.join(backupDir, `${base}.tar.gz`);

  try {
    // ---- 1. database dump (password passed through the environment, never on the command line)
    const sqlFile = path.join(work, 'database.sql');
    const out = fs.openSync(sqlFile, 'w');
    const dump = spawnSync(
      process.env.MYSQLDUMP_PATH || 'mysqldump',
      ['--single-transaction', '--no-tablespaces', '--default-character-set=utf8mb4', '-h', db.hostname || 'localhost', '-P', db.port || '3306', '-u', decodeURIComponent(db.username), dbName],
      { stdio: ['ignore', out, 'pipe'], env: { ...process.env, MYSQL_PWD: decodeURIComponent(db.password) }, encoding: 'utf8' },
    );
    fs.closeSync(out);
    if (dump.error) fail(`could not run mysqldump (${dump.error.message}). If it is installed elsewhere set MYSQLDUMP_PATH to its full path.`);
    if (dump.status !== 0) fail(`mysqldump reported: ${(dump.stderr || '').trim() || 'exit code ' + dump.status}`);
    if (fs.statSync(sqlFile).size < 200) fail('the database dump is empty; check DATABASE_URL.');

    // ---- 2. archive: database + uploads + CVs (uncompressed tar first, then gzip with Node, so no extra program is needed)
    for (const d of [uploadDir, privateDir]) fs.mkdirSync(d, { recursive: true });
    const run = (args) => {
      // Run inside the work folder with a RELATIVE archive name: GNU tar on Windows reads "C:" in -f paths as a remote host.
      const r = spawnSync('tar', args, { cwd: work, encoding: 'utf8' });
      if (r.error) fail(`could not run tar (${r.error.message}).`);
      if (r.status !== 0) fail(`tar reported: ${(r.stderr || '').trim() || 'exit code ' + r.status}`);
    };
    const tarName = path.basename(tarFile);
    const fwd = (p) => p.split(path.sep).join('/'); // tar on Windows wants forward slashes (no effect on Linux)
    run(['-cf', tarName, 'database.sql']);
    run(['-rf', tarName, '-C', fwd(path.dirname(uploadDir)), path.basename(uploadDir)]);
    run(['-rf', tarName, '-C', fwd(path.dirname(privateDir)), path.basename(privateDir)]);
    await pipeline(fs.createReadStream(tarFile), zlib.createGzip({ level: 9 }), fs.createWriteStream(finalFile, { mode: 0o600 }));
    const mb = (fs.statSync(finalFile).size / 1024 / 1024).toFixed(1);
    console.log(`Backup created: ${finalFile} (${mb} MB)`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }

  // ---- 3. delete old backups (but always keep the newest 3)
  const all = fs.readdirSync(backupDir).filter((f) => /^acr-backup-.*\.tar\.gz$/.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(backupDir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  const limit = Date.now() - keepDays * 86_400_000;
  for (const { f, t } of all.slice(3)) {
    if (t < limit) {
      fs.rmSync(path.join(backupDir, f), { force: true });
      console.log(`Deleted old backup ${f}`);
    }
  }
  const kept = fs.readdirSync(backupDir).filter((x) => /^acr-backup-.*.tar.gz$/.test(x)).length;
  console.log(`${kept} backup(s) kept in ${backupDir} (older than ${keepDays} days are removed).`);
  console.log(`Remember: copy backups OFF this server regularly (download them), and treat them as confidential: they contain CVs. Host: ${os.hostname()}`);
}

main().catch((e) => {
  console.error(`BACKUP FAILED: ${e && e.message ? e.message : e}`);
  process.exit(1);
});
