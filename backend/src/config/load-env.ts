import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads settings from files into process.env. Import this FIRST in anything that reads settings.
 *   1. ENV_FILE: a settings file kept OUTSIDE the app folder (e.g. /home/<user>/acr-data/.env), so redeploys never touch it.
 *   2. backend/.env: for development on your own computer.
 * Real environment variables (e.g. entered in the hosting panel) always win over both files.
 */
const appDir = path.resolve(__dirname, '..', '..'); // src/config (or dist/config) -> the app folder

const envFile = process.env.ENV_FILE?.trim();
if (envFile) {
  if (fs.existsSync(envFile)) dotenv.config({ path: envFile, quiet: true });
  else console.warn(`[config] ENV_FILE points to ${envFile}, but that file does not exist.`);
}
dotenv.config({ path: path.join(appDir, '.env'), quiet: true });
