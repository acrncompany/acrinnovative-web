/**
 * Sends one test email with the SMTP settings from the environment (.env), to the "send form alerts to" address
 * saved in the website settings (or to an address you pass). Use it after setting up SMTP, locally or on the server.
 *
 *   npm run mail:test
 *   npm run mail:test -- --to someone@example.com
 */
import '../config/load-env';
import { PrismaClient } from '@prisma/client';
import { smtp } from '../config/env';
import { MailerService } from '../forms/mailer.service';

async function main() {
  const prisma = new PrismaClient();
  try {
    const i = process.argv.indexOf('--to');
    const to = (i >= 0 && process.argv[i + 1]) || (await prisma.siteSettings.findUnique({ where: { id: 1 } }))?.notificationEmail;
    if (!to) throw new Error('No recipient: pass --to address, or set "Send form alerts to" in the website settings.');
    console.log(`SMTP: ${smtp.host || '(not set)'}:${smtp.port} secure=${smtp.secure} user=${smtp.user || '(none)'} from=${smtp.from || '(none)'}`);
    console.log(`Sending a test email to ${to} ...`);
    await new MailerService(prisma as never).sendTest(to);
    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message || e);
  process.exitCode = 1;
});
