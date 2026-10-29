import { readFile } from 'node:fs/promises';
import { personalAdminIdentity, provisioningEnvironment } from './admin-provision-config';
import { readHidden } from './setup-local-admin';

async function main() {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  const allowed = ['--env-file', '--environment', '--expected-host', '--email'];
  for (let index = 0; index < args.length; index += 2) {
    if (!allowed.includes(args[index]) || values.has(args[index]) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('INVALID_ARGUMENTS');
    values.set(args[index], args[index + 1]);
  }
  if (values.size !== allowed.length || !process.stdin.isTTY) throw new Error('INTERACTIVE_TERMINAL_REQUIRED');
  const identity = personalAdminIdentity(values.get('--email')!);
  const contents = await readFile(values.get('--env-file')!, 'utf8');
  const env = provisioningEnvironment(contents, values.get('--environment')!, values.get('--expected-host')!);
  Object.assign(process.env, env);
  // Personal provisioning never uses the legacy admin's password or hash.
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD_HASH;
  const { prisma } = await import('../lib/prisma');
  try {
    const { initializeAdmin, adminPassword } = await import('../lib/admin-account');
    const existing = await prisma.adminUser.findUnique({ where: { email: identity.email }, select: { id: true, role: true, active: true } });
    if (existing) {
      if (existing.id !== identity.id || existing.role !== 'ADMIN' || !existing.active) throw new Error('ADMIN_IDENTITY_CONFLICT');
      console.log('Amministratore personale già presente: nessuna modifica.');
      return;
    }
    console.log(`Destinazione verificata: ${values.get('--environment')} / ${values.get('--expected-host')}.`);
    console.log('Creazione di un nuovo amministratore personale; gli account esistenti restano invariati.');
    let password = await readHidden('Nuova password (minimo 16 caratteri, massimo 72 byte UTF-8): ');
    let confirmation = await readHidden('Ripeti la password: ');
    try {
      if (password !== confirmation || !adminPassword.safeParse(password).success) throw new Error('INVALID_PASSWORD');
      const result = await initializeAdmin({ ...identity, password });
      console.log(result.created ? 'Amministratore personale ADMIN creato. Nessuna credenziale mostrata o salvata su file.' : 'Amministratore personale già presente: nessuna modifica.');
    } finally { password = ''; confirmation = ''; }
  } finally { await prisma.$disconnect(); }
}

main().catch(() => {
  // Do not print exception objects: validators and Prisma can include submitted values.
  console.error('Provisioning non riuscito. Verifica argomenti, ambiente, host Neon, TLS, permessi INSERT, email e password. Nessun account esistente è stato modificato.');
  process.exitCode = 1;
});
