/**
 * Makes the ready-to-upload release for the server (Hostinger):
 *
 *   npm run package             builds everything, then creates  release/acr-site-<date>.zip
 *   npm run package -- --skip-build   re-zip without rebuilding (when the build is already fresh)
 *
 * The zip holds only what the server needs (no node_modules: the server installs those itself with
 * `npm install --omit=dev`, so sharp and Prisma get the right build for the server's operating system).
 * No secrets are included: settings go into the hosting panel's environment variables (see DEPLOY.md).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const skipBuild = process.argv.includes('--skip-build');

function run(label, cmd, args, cwd = root) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(r.status || 1);
  }
}

if (!skipBuild) run('Build (admin + backend)', 'node', ['scripts/build.js']);

for (const need of ['backend/dist/main.js', 'backend/dist-admin/index.html']) {
  if (!fs.existsSync(path.join(root, need))) {
    console.error(`Missing ${need}. Run without --skip-build.`);
    process.exit(1);
  }
}

// ---- assemble release/acr-site
const releaseRoot = path.join(root, 'release');
const dir = path.join(releaseRoot, 'acr-site');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const copy = (rel, filter) => fs.cpSync(path.join(backend, rel), path.join(dir, rel), { recursive: true, filter });
const noMaps = (src) => !src.endsWith('.map');
copy('dist', noMaps);
copy('dist-admin', noMaps);
copy('views');
copy('public');
copy('prisma'); // schema, migrations, seed scripts and the starter pictures
copy('src'); // the maintenance commands (seed, doctor, reset password, mail test) are TypeScript run with tsx
copy('scripts/backup.js');
copy('scripts/prisma-env.js');
copy('package.json');
copy('package-lock.json');
copy('tsconfig.json');
copy('.env.example');
fs.copyFileSync(path.join(root, 'DEPLOY.md'), path.join(dir, 'DEPLOY.md'));

// Safety: a release must never contain secrets or local data.
const forbidden = ['.env', 'node_modules'];
for (const f of forbidden) if (fs.existsSync(path.join(dir, f))) throw new Error(`${f} must not be in the release`);

// ---- build info (helps to know which version is on the server)
let commit = 'unknown';
try {
  commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim() || commit;
  if (spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout.trim()) commit += ' (with uncommitted changes)';
} catch {
  /* git not available */
}
const pkg = JSON.parse(fs.readFileSync(path.join(backend, 'package.json'), 'utf8'));
const now = new Date();
fs.writeFileSync(
  path.join(dir, 'BUILD-INFO.txt'),
  `ACR Innovative website\nBuilt: ${now.toISOString()}\nGit commit: ${commit}\nBuilt with Node ${process.version}\nNeeds Node >= ${pkg.engines.node.replace('>=', '')} on the server\nStart command: npm start   (runs: node dist/main.js)\n`,
);

// ---- zip: built in Node (no zip/tar program needed, works the same on Windows, Mac and Linux, always with "/" in paths)
// Entries sit at the top level of the zip, so extracting it into the app folder just works.
const JSZip = require('jszip');
const pad = (n) => String(n).padStart(2, '0');
const name = `acr-site-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.zip`;
const zipPath = path.join(releaseRoot, name);
const zip = new JSZip();
let count = 0;
(function add(folder, prefix) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    const rel = prefix + entry.name;
    if (entry.isDirectory()) add(full, rel + '/');
    else {
      zip.file(rel, fs.readFileSync(full), { date: fs.statSync(full).mtime });
      count++;
    }
  }
})(dir, '');
zip
  .generateNodeStream({ type: 'nodebuffer', streamFiles: true, compression: 'DEFLATE', compressionOptions: { level: 9 } })
  .pipe(fs.createWriteStream(zipPath))
  .on('finish', () => {
    const mb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
    console.log(`
Release ready: ${zipPath} (${count} files, ${mb} MB)
Folder (unzipped): ${dir}
Next: follow DEPLOY.md ("Update the website" or the first-time steps).`);
  });
