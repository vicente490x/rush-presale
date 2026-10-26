import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';

async function main() {
  const value = process.env.RUSH_TEST_DATABASE_URL;
  if (!value) throw new Error('RUSH_TEST_DATABASE_URL richiesto.');
  const base = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(base.protocol) || !['localhost', '127.0.0.1'].includes(base.hostname) || !base.pathname.startsWith('/rush_audit') || base.searchParams.has('host') || base.searchParams.has('hostaddr')) throw new Error('Solo database locali temporanei rush_audit*.');
  const suffix = randomBytes(8).toString('hex');
  const sourceName = `rush_audit_backup_${suffix}`, targetName = `rush_audit_restore_${suffix}`;
  const source = new URL(base), target = new URL(base);
  source.pathname = '/' + sourceName; target.pathname = '/' + targetName;
  source.search = ''; target.search = '';
  const control = new PrismaClient({ datasourceUrl: base.toString(), log: [] });
  const original = new PrismaClient({ datasourceUrl: source.toString(), log: [] });
  const restored = new PrismaClient({ datasourceUrl: target.toString(), log: [] });
  const folder = mkdtempSync(join(tmpdir(), 'rush-backup-check-'));
  chmodSync(folder, 0o700);
  const file = join(folder, 'database.dump');
  function tool(name: string, args: string[], dbName: string) {
    // Credentials travel only via child environment; never command arguments/logs.
    const env: NodeJS.ProcessEnv = { ...process.env, PGHOST: base.hostname, PGHOSTADDR: '127.0.0.1', PGPORT: base.port || '5432', PGUSER: decodeURIComponent(base.username), PGPASSWORD: decodeURIComponent(base.password), PGDATABASE: dbName, PGOPTIONS: '', PGSSLMODE: 'disable' };
    delete env.PGSERVICE; delete env.PGSERVICEFILE; delete env.PGPASSFILE;
    const program = process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, name) : name;
    const result = spawnSync(program, args, { env, stdio: 'pipe', timeout: 60000 });
    if (result.status !== 0) throw new Error(`Strumento ${name} non riuscito; nessun dettaglio di connessione mostrato.`);
  }
  let createdSource = false, createdTarget = false;
  try {
    // Generated identifiers, local host only, never a caller-selected restore target.
    await control.$executeRawUnsafe(`CREATE DATABASE "${sourceName}" TEMPLATE template0`); createdSource = true;
    await control.$executeRawUnsafe(`CREATE DATABASE "${targetName}" TEMPLATE template0`); createdTarget = true;
    const migrated = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: source.toString(), DIRECT_URL: source.toString() }, stdio: 'pipe', timeout: 60000 });
    assert.equal(migrated.status, 0, 'Migrazioni del database sorgente temporaneo');
    const now = new Date('2026-10-26T09:00:00Z');
    const terms = await original.termsVersion.create({ data: { version: 1, text: 'Condizioni di collaudo backup', createdBy: 'backup-validation', createdAt: now } });
    await original.settings.create({ data: { id: 'global' } });
    await original.order.create({ data: { id: 'backup-validation', orderNumber: 'RUSH-BACKUP-VALIDATION', firstName: 'Backup', lastName: 'Validation', email: 'backup@example.invalid', size: 'M', quantity: 2, amountCents: 5000, unitPriceCents: 2500, paymentStatus: 'PAID', paidAt: now, expiresAt: new Date('2026-12-26T09:00:00Z'), termsVersionId: terms.id, termsSnapshot: terms.text, termsAcceptedAt: now } });
    await original.emailOutbox.create({ data: { dedupeKey: 'backup-validation', to: 'backup@example.invalid', subject: 'Backup validation', text: 'Local backup validation only.' } });
    const empty = await restored.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    assert.equal(empty[0].count, 0n, 'La destinazione di ripristino deve essere vuota');
    const dumpStart = performance.now();
    tool('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', file], sourceName);
    chmodSync(file, 0o600);
    const dumpMs = Math.round(performance.now() - dumpStart);
    const restoreStart = performance.now();
    tool('pg_restore', ['--dbname', targetName, '--single-transaction', '--exit-on-error', '--no-owner', '--no-privileges', file], targetName);
    const restoreMs = Math.round(performance.now() - restoreStart);
    for (const [left, right] of [
      [await original.order.findMany(), await restored.order.findMany()],
      [await original.settings.findMany(), await restored.settings.findMany()],
      [await original.termsVersion.findMany(), await restored.termsVersion.findMany()],
      [await original.emailOutbox.findMany(), await restored.emailOutbox.findMany()],
      [await original.$queryRaw`SELECT migration_name, checksum, finished_at FROM "_prisma_migrations" ORDER BY migration_name`, await restored.$queryRaw`SELECT migration_name, checksum, finished_at FROM "_prisma_migrations" ORDER BY migration_name`]
    ]) assert.deepEqual(right, left, 'Dati e migrazioni conservati');
    const order = await restored.order.findUniqueOrThrow({ where: { id: 'backup-validation' } });
    assert.equal(order.amountCents, 5000); assert.equal(order.quantity, 2); assert.equal(order.paidAt?.toISOString(), now.toISOString());
    assert.equal((await restored.termsVersion.findUniqueOrThrow({ where: { id: order.termsVersionId! } })).text, order.termsSnapshot);
    await restored.order.update({ where: { id: order.id }, data: { firstName: 'Restored' } });
    assert.equal((await original.order.findUniqueOrThrow({ where: { id: order.id } })).firstName, 'Backup', 'Sorgente indipendente dal ripristino');
    console.log(JSON.stringify({ check: 'backup-restore-local', outcome: 'PASS', format: 'custom', bytes: statSync(file).size, dumpMs, restoreMs, preserved: ['orders', 'amounts', 'dates', 'terms-relations', 'outbox', 'migration-checksums'], sourceUnaffected: true, commercialDatabaseTested: false }));
  } finally {
    await original.$disconnect(); await restored.$disconnect();
    if (createdTarget) await control.$executeRawUnsafe(`DROP DATABASE "${targetName}" WITH (FORCE)`);
    if (createdSource) await control.$executeRawUnsafe(`DROP DATABASE "${sourceName}" WITH (FORCE)`);
    await control.$disconnect();
  }
}

void main().catch(error => {
  console.error(error instanceof assert.AssertionError ? 'Prova backup fallita: dati ripristinati non conformi.' : 'Prova backup non completata. Verificare PostgreSQL locale, permesso CREATEDB e client pg_dump/pg_restore compatibili.');
  process.exitCode = 1;
});
