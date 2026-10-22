/**
 * Admin user seed. Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD, but ONLY if no admin
 * exists yet, so it can never overwrite a changed password. To change a password later, use
 * `npm run admin:reset-password`.
 */
import '../../src/config/load-env';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if ((await prisma.adminUser.count()) > 0) {
    console.log('An admin user already exists. Nothing to do.');
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment first.');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters.');

  await prisma.adminUser.create({
    data: { email, name: 'Administrator', passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Admin user created: ${email}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exit(1); })
  .finally(() => prisma.$disconnect());
