import assert from 'node:assert/strict';
import test from 'node:test';
import { unzipSync, strFromU8 } from 'fflate';
import { addCalendarMonths } from '../lib/dates';
import { makeCsv, makeXlsx, csvCell } from '../lib/export';
import { assertStripeConfiguration, appEnv } from '../lib/config';
import { recipientAllowed } from '../lib/mail';
import { readJson } from '../lib/http';

test('12 calendar months clamp end-of-month and leap years, preserving time', () => {
  for (const [from, months, expected] of [
    ['2023-12-31T13:25:32Z', 2, '2024-02-29T13:25:32.000Z'],
    ['2024-12-31T13:25:32Z', 2, '2025-02-28T13:25:32.000Z'],
    ['2024-02-29T00:00:00Z', 12, '2025-02-28T00:00:00.000Z'],
    ['2026-10-10T12:00:00Z', 2, '2026-12-10T12:00:00.000Z']
  ] as const) assert.equal(addCalendarMonths(new Date(from), months).toISOString(), expected);
});
test('18 CSV neutralizes formulas including whitespace and quotes', () => {
  assert.equal(csvCell(' =HYPERLINK("https://evil")'), '"\' =HYPERLINK(""https://evil"")"');
  for (const value of ['+1', '-1', '@cmd', '\t=cmd', '\r\n=cmd']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('Test "Buyer"'), '"Test ""Buyer"""');
  assert.ok(makeCsv([['Taglia', 'Pezzi'], ['M', 5]]).startsWith('\uFEFF'));
});
test('18 XLSX is a ZIP workbook with distinct producer sheet and safe string cells', () => {
  const file = makeXlsx([{ name: 'Ordini', rows: [['Nome', 'Quantità'], ['=HYPERLINK("evil")', 2]] }, { name: 'Produttore', rows: [['M', 2]] }]);
  const zip = unzipSync(file); const sheet = strFromU8(zip['xl/worksheets/sheet1.xml']);
  assert.ok(zip['[Content_Types].xml']); assert.ok(zip['xl/_rels/workbook.xml.rels']);
  assert.ok(strFromU8(zip['xl/workbook.xml']).includes('Produttore'));
  assert.ok(sheet.includes('t="inlineStr"')); assert.ok(sheet.includes('=HYPERLINK(&quot;evil&quot;)')); assert.ok(!sheet.includes('<f>'));
});
test('staging and production refuse live keys even when legacy opt-in is true', () => {
  const old = { APP_ENV: process.env.APP_ENV, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, ALLOW_LIVE_PAYMENTS: process.env.ALLOW_LIVE_PAYMENTS, STAGING_DATABASE_CONFIRMED: process.env.STAGING_DATABASE_CONFIRMED };
  try {
    process.env.ALLOW_LIVE_PAYMENTS = 'true'; process.env.STRIPE_SECRET_KEY = 'sk_live_test_placeholder';
    for (const value of ['development', 'staging', 'production']) { process.env.APP_ENV = value; assert.throws(assertStripeConfiguration, /TEST/); }
    process.env.APP_ENV = 'staging'; process.env.STRIPE_SECRET_KEY = 'sk_test_unit_placeholder'; process.env.STAGING_DATABASE_CONFIRMED = 'true'; assert.doesNotThrow(assertStripeConfiguration);
  } finally { for (const [k, v] of Object.entries(old)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
});
test('nonproduction mail requires an exact explicitly allowlisted recipient', () => {
  const oldEnv = process.env.APP_ENV, oldList = process.env.EMAIL_ALLOWLIST;
  try { process.env.APP_ENV = 'staging'; process.env.EMAIL_ALLOWLIST = 'admin@example.com'; assert.equal(recipientAllowed('Admin@example.com'), true); assert.equal(recipientAllowed('other@example.com'), false); assert.equal(recipientAllowed('admin@example.com.evil'), false); }
  finally { if (oldEnv === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = oldEnv; if (oldList === undefined) delete process.env.EMAIL_ALLOWLIST; else process.env.EMAIL_ALLOWLIST = oldList; }
});
test('bounded JSON rejects malformed and oversized bodies without parsing them', async () => {
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: '{' })), /JSON/);
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: 'x'.repeat(33000) })), /troppo grande/);
});
test('Vercel Preview defaults to protected staging and rejects an explicit production override', () => {
  const old = { APP_ENV: process.env.APP_ENV, VERCEL_ENV: process.env.VERCEL_ENV };
  try {
    process.env.VERCEL_ENV = 'preview'; delete process.env.APP_ENV; assert.equal(appEnv(), 'staging');
    process.env.APP_ENV = 'production'; assert.throws(appEnv, /Preview/);
  } finally { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});
