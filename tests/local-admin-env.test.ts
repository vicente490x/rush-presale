import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import { setEnvValue } from '../scripts/setup-local-admin';

test('local admin hash survives Next dotenv expansion and still verifies the password', async () => {
  const password = 'Synthetic-local-admin-$-test';
  const hash = await bcrypt.hash(password, 12);
  const directory = mkdtempSync(join(tmpdir(), 'rush-admin-env-'));
  try {
    const require = createRequire(import.meta.url);
    const contents = setEnvValue('OTHER_SETTING=retained\nADMIN_PASSWORD_HASH=old\n', 'ADMIN_PASSWORD_HASH', hash);
    assert.equal(contents.split('\n').filter(line => line.startsWith('ADMIN_PASSWORD_HASH=')).length, 1);
    assert.ok(contents.includes('OTHER_SETTING=retained'));
    writeFileSync(join(directory, '.env.local'), contents);
    const env = { ...process.env };
    delete env.ADMIN_PASSWORD_HASH;
    delete env.__NEXT_PROCESSED_ENV;
    const loadedHash = execFileSync(process.execPath, ['-e', `
      require(${JSON.stringify(require.resolve('@next/env'))}).loadEnvConfig(process.argv[1], true, {info(){}, error(){}});
      process.stdout.write(process.env.ADMIN_PASSWORD_HASH || '');
    `, directory], { env, encoding: 'utf8' });
    assert.equal(loadedHash, hash);
    assert.equal(await bcrypt.compare(password, loadedHash), true);
  } finally {
    const file = join(directory, '.env.local');
    if (existsSync(file)) unlinkSync(file);
    rmdirSync(directory);
  }
});
