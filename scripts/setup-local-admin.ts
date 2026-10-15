import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { loadEnvConfig } from '@next/env';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

loadEnvConfig(process.cwd());

function setEnvValue(content: string, name: string, value: string) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  return pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.trimEnd()}\n${line}\n`;
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password || password.length < 12 || password.toLowerCase() === 'admin' ||
    Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Imposta ADMIN_EMAIL valido e ADMIN_PASSWORD di 12-72 byte, diversa da "admin", in .env.local.');
  }

  const envPath = '.env.local';
  const content = await readFile(envPath, 'utf8');
  const passwordHash = await bcrypt.hash(password, 12);
  const sessionSecret = process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32
    ? process.env.SESSION_SECRET
    : randomBytes(48).toString('base64url');
  const prisma = new PrismaClient();
  try {
    await prisma.adminUser.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash }
    });
    await writeFile(envPath, setEnvValue(content, 'SESSION_SECRET', sessionSecret), {
      encoding: 'utf8',
      mode: 0o600
    });
  } finally {
    await prisma.$disconnect();
  }
  console.info(`Account admin configurato per ${email}. La password non è stata stampata.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Configurazione admin non riuscita.');
  process.exitCode = 1;
});
