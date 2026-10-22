/**
 * Reset an admin's password from the command line (no web server needed). Use it when the password is forgotten.
 *
 *   npm run admin:reset-password                                   (asks for the email and a new password)
 *   npm run admin:reset-password -- --email a@b.com --password 'NewLongPassword1'   (non-interactive)
 *
 * Existing login cookies stop working after a reset (they are tied to the old password).
 */
import '../config/load-env';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';
import { Writable } from 'stream';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// One shared reader for all prompts (separate readers can lose lines that arrive early, e.g. when input is piped).
let muted = false;
const out = new Writable({
  write(chunk, _enc, cb) {
    if (!muted) process.stdout.write(chunk);
    cb();
  },
});
const rl = readline.createInterface({ input: process.stdin, output: out, terminal: Boolean(process.stdin.isTTY) });
const lines = rl[Symbol.asyncIterator]();

/** Prompt on the terminal; when `hidden`, the typed characters are not echoed. */
async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  muted = hidden;
  const { value } = await lines.next();
  muted = false;
  if (hidden) process.stdout.write('\n');
  return value ?? '';
}

async function main() {
  const admins = await prisma.adminUser.findMany({ orderBy: { id: 'asc' } });
  if (admins.length === 0) throw new Error('No admin user exists yet. Run: npm run seed:admin');

  let email = arg('email')?.trim().toLowerCase();
  if (!email) {
    if (admins.length === 1) {
      email = admins[0].email;
      console.log(`Resetting the password for ${email}`);
    } else {
      console.log('Admins: ' + admins.map((a) => a.email).join(', '));
      email = (await ask('Email: ')).trim().toLowerCase();
    }
  }
  const user = admins.find((a) => a.email === email);
  if (!user) throw new Error(`No admin with email ${email}`);

  let password = arg('password');
  if (!password) {
    password = await ask('New password (min 10 characters): ', true);
    if (password !== (await ask('Repeat new password: ', true))) throw new Error('The passwords do not match.');
  }
  if (password.length < 10) throw new Error('The password must be at least 10 characters.');

  await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  console.log(`Password updated for ${user.email}. Existing sessions are now logged out.`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
