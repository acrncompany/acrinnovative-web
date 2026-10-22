/**
 * Creates a free FAKE mailbox on https://ethereal.email for local testing: nothing is ever delivered to a real person.
 * Mails sent to it can be read in the browser (a "preview" link is printed in the server log for every email).
 *
 *   npm run mail:ethereal            prints the SMTP_* lines to paste into backend/.env
 *   npm run mail:ethereal -- --write  also writes/updates those lines in backend/.env for you
 */
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import * as path from 'path';

async function main() {
  const account = await nodemailer.createTestAccount();
  const lines = {
    SMTP_HOST: account.smtp.host,
    SMTP_PORT: String(account.smtp.port),
    SMTP_SECURE: String(account.smtp.secure),
    SMTP_USER: account.user,
    SMTP_PASS: account.pass,
    SMTP_FROM: account.user,
  };
  console.log('\nEthereal test mailbox created:\n');
  for (const [k, v] of Object.entries(lines)) console.log(`${k}=${v}`);
  console.log(`\nView received mail: https://ethereal.email/login  (user: ${account.user}, password: ${account.pass})`);

  if (process.argv.includes('--write')) {
    const envFile = path.resolve(__dirname, '..', '..', '.env');
    let text = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    for (const [k, v] of Object.entries(lines)) {
      const line = `${k}=${v}`;
      text = new RegExp(`^${k}=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${k}=.*$`, 'm'), line) : `${text.replace(/\n*$/, '\n')}${line}\n`;
    }
    fs.writeFileSync(envFile, text);
    console.log(`\nWritten to ${envFile}. Restart the server to use it.`);
  }
}

main().catch((e) => {
  console.error('Could not create an Ethereal account (are you online?):', e.message || e);
  process.exitCode = 1;
});
