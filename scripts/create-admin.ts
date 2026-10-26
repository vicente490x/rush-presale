import bcrypt from 'bcryptjs';
import { z } from 'zod';

const credentials = z.object({
  ADMIN_EMAIL: z.string().trim().email(),
  ADMIN_PASSWORD: z.string().min(16).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Massimo 72 byte UTF-8.')
});

async function main() {
  const parsed = credentials.safeParse(process.env);
  if (!parsed.success) {
    console.error(`Credenziali admin non valide: ${parsed.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join('; ')}`);
    process.exitCode = 1;
    return;
  }
  const hash = await bcrypt.hash(parsed.data.ADMIN_PASSWORD, 12);
  console.log(`ADMIN_EMAIL=${parsed.data.ADMIN_EMAIL}`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('Imposta questi valori come variabili d’ambiente Vercel. La password non è stata stampata.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Creazione credenziali admin non riuscita.');
  process.exitCode = 1;
});
