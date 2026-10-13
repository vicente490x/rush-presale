import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Imposta ADMIN_EMAIL con un indirizzo valido.');
  if (!password || password.length < 12 || password.toLowerCase() === 'admin') {
    throw new Error('ADMIN_PASSWORD deve contenere almeno 12 caratteri e non può essere "admin".');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) throw new Error('ADMIN_PASSWORD supera il limite supportato dall’hash bcrypt (72 byte).');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, username: email, passwordHash },
    update: { username: email, passwordHash }
  });
  console.info(JSON.stringify({ level: 'info', event: 'admin.created_or_updated' }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Creazione admin non riuscita.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
