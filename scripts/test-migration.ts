import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
async function main() {
  const value = process.env.RUSH_TEST_DATABASE_URL;
  if (!value) throw new Error('RUSH_TEST_DATABASE_URL richiesto.');
  const db = new URL(value);
  if (!['localhost', '127.0.0.1'].includes(db.hostname) || !db.pathname.startsWith('/rush_audit')) throw new Error('Serve un database temporaneo locale rush_audit*.');
  db.searchParams.set('schema', 'migration_' + randomBytes(8).toString('hex'));
  const env = { ...process.env, DATABASE_URL: db.toString(), DIRECT_URL: db.toString() };
  const folder = mkdtempSync(join(tmpdir(), 'rush-migration-test-'));
  cpSync('prisma/schema.prisma', join(folder, 'schema.prisma'));
  mkdirSync(join(folder, 'migrations'));
  cpSync('prisma/migrations/migration_lock.toml', join(folder, 'migrations/migration_lock.toml'));
  cpSync('prisma/migrations/20261013000100_initial', join(folder, 'migrations/20261013000100_initial'), { recursive: true });
  function migrate(schema: string) {
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', schema], { env, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Migrazione temporanea fallita.');
  }
  migrate(join(folder, 'schema.prisma'));
  const client = new PrismaClient({ datasourceUrl: db.toString() });
  const timestamp = new Date('2026-10-01T12:00:00Z');
  try {
    // Explicit timestamp casts keep fixtures independent of the PostgreSQL host timezone.
    await client.$executeRaw`INSERT INTO "Settings" (id, "productionStatus", "updatedAt") VALUES ('global', 'PRODUZIONE_AVVIATA', ${timestamp.toISOString()}::timestamp)`;
    await client.$executeRaw`INSERT INTO "Order" (id, "orderNumber", "firstName", "lastName", email, size, quantity, "amountCents", "paymentStatus", "paidAt", "expiresAt", "termsAcceptedAt", "updatedAt") VALUES ('legacy-paid', 'RUSH-LEGACY-TEST-1', 'Migration', 'Validation', 'fixture@example.com', 'M', 2, 5000, 'PAID', ${timestamp.toISOString()}::timestamp, ${'2026-12-01T12:00:00.000Z'}::timestamp, ${timestamp.toISOString()}::timestamp, ${timestamp.toISOString()}::timestamp)`;
    await client.$executeRaw`INSERT INTO "Order" (id, "orderNumber", "firstName", "lastName", email, size, quantity, "amountCents", "paymentStatus", "refundStatus", "orderStatus", "termsAcceptedAt", "updatedAt") VALUES ('legacy-refunded', 'RUSH-LEGACY-TEST-2', 'Migration', 'Validation', 'fixture@example.com', 'L', 1, 2500, 'PAID', 'REFUNDED', 'REFUNDED', ${timestamp.toISOString()}::timestamp, ${timestamp.toISOString()}::timestamp)`;
    migrate('prisma/schema.prisma');
    const [paid, refunded, config] = await Promise.all([
      client.order.findUniqueOrThrow({ where: { id: 'legacy-paid' } }), client.order.findUniqueOrThrow({ where: { id: 'legacy-refunded' } }), client.settings.findUniqueOrThrow({ where: { id: 'global' } })
    ]);
    assert.equal(await client.order.count(), 2); assert.equal(paid.quantity, 2); assert.equal(paid.amountCents, 5000); assert.equal(paid.unitPriceCents, 2500);
    assert.equal(paid.paidAt?.toISOString(), timestamp.toISOString()); assert.equal(paid.expiresAt?.toISOString(), '2026-12-01T12:00:00.000Z');
    assert.equal(paid.termsVersionId, null); assert.equal(paid.termsSnapshot, null); assert.equal(refunded.refundedAmountCents, 2500);
    assert.equal(config.productionStartedAt?.toISOString(), timestamp.toISOString());
    await assert.rejects(client.settings.update({ where: { id: 'global' }, data: { productionStatus: 'IN_RACCOLTA' } }));
    console.log('PASS upgrade iniziale → staging: ordini, importi e date preservati; backfill prudenziale; termini storici non inventati; produzione irreversibile.');
  } finally { await client.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration test failed'); process.exitCode = 1; });
