#!/usr/bin/env node
/**
 * Runs the Prisma command line with the website's settings loaded (ENV_FILE and backend/.env), so that
 * DATABASE_URL is found on the server without exporting variables by hand.
 *   node scripts/prisma-env.js migrate deploy
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, '..');
const dotenv = require('dotenv');
if (process.env.ENV_FILE && fs.existsSync(process.env.ENV_FILE)) dotenv.config({ path: process.env.ENV_FILE, quiet: true });
dotenv.config({ path: path.join(appDir, '.env'), quiet: true });

const cli = require.resolve('prisma/build/index.js');
const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { cwd: appDir, stdio: 'inherit', env: process.env });
process.exit(r.status === null ? 1 : r.status);
