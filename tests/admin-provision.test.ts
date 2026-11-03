import assert from 'node:assert/strict';
import test from 'node:test';
import { personalAdminIdentity, provisioningEnvironment } from '../scripts/admin-provision-config';

const host = 'ep-fixture.us-east-2.aws.neon.tech';
const url = `postgresql://owner:synthetic-password@${host}/rush?sslmode=require&sslaccept=strict`;
const contents = `APP_ENV=staging\nSTAGING_DATABASE_CONFIRMED=true\nDATABASE_URL=${url.replace(host, host.replace('.', '-pooler.'))}\nDIRECT_URL=${url}\n`;

test('personal provisioning has a stable identity and never reuses the legacy admin ID', () => {
  const first = personalAdminIdentity('  Personal@Example.com ');
  assert.deepEqual(first, personalAdminIdentity('personal@example.com'));
  assert.notEqual(first.id, 'rush-admin');
  assert.notEqual(first.id, personalAdminIdentity('second@example.com').id);
  assert.throws(() => personalAdminIdentity('invalid'));
});

test('provisioning requires an explicit matching environment, Neon endpoint and strict TLS', () => {
  const env = provisioningEnvironment(contents, 'staging', host);
  assert.equal(env.DATABASE_URL, url);
  assert.equal(env.DIRECT_URL, url);
  assert.equal(env.ADMIN_PASSWORD_HASH, undefined);
  for (const changed of [
    contents.replace('CONFIRMED=true', 'CONFIRMED=false'),
    contents.replace('APP_ENV=staging', 'APP_ENV=production'),
    contents.replace('DIRECT_URL=', 'UNUSED_URL='),
    contents.replaceAll('sslaccept=strict', 'sslaccept=accept_invalid_certs'),
    contents.replaceAll('sslmode=require', 'sslmode=disable'),
    contents.replace('DIRECT_URL=' + url, 'DIRECT_URL=' + url + '&host=other.example'),
    contents.replace('DIRECT_URL=' + url, 'DIRECT_URL=' + url + '&sslmode=require'),
    contents.replace('DIRECT_URL=' + url, 'DIRECT_URL=' + url.replace('/rush?', '/another?')),
    contents.replace('DIRECT_URL=' + url, 'DIRECT_URL=' + url + '&schema=other'),
  ]) assert.throws(() => provisioningEnvironment(changed, 'staging', host));
  assert.throws(() => provisioningEnvironment(contents, 'staging', 'ep-other.us-east-2.aws.neon.tech'));
  assert.throws(() => provisioningEnvironment(contents, 'staging', 'localhost'));
  assert.throws(() => provisioningEnvironment(contents, 'production', host));
});
