/**
 * Builds everything for deployment:
 *   1. the Angular admin       (frontend/  ->  frontend/dist/browser)
 *   2. copies it into the backend as backend/dist-admin  (served by Nest at /admin)
 *   3. the NestJS backend      (backend/   ->  backend/dist)
 *
 *   npm run build            everything
 *   npm run build:admin      only steps 1 and 2 (quick, when only the admin changed)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const onlyAdmin = process.argv.includes('admin');

function run(label, cmd, args, cwd) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(r.status || 1);
  }
}

run('Build admin (Angular)', 'npm', ['run', 'build'], path.join(root, 'frontend'));

const from = path.join(root, 'frontend', 'dist', 'browser');
const to = path.join(root, 'backend', 'dist-admin');
if (!fs.existsSync(path.join(from, 'index.html'))) {
  console.error(`Admin build output not found at ${from}`);
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`\nCopied admin build to ${path.relative(root, to)}`);

if (!onlyAdmin) {
  // On Windows, stop any running backend first: `prisma generate` cannot replace the engine file while it is in use.
  run('Build backend (NestJS)', 'npm', ['run', 'build'], path.join(root, 'backend'));
}
console.log('\nBuild finished.');
