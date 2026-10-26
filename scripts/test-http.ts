import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { unzipSync, strFromU8 } from 'fflate';

async function main() {
  const value = process.env.RUSH_TEST_DATABASE_URL;
  if (!value) throw new Error('RUSH_TEST_DATABASE_URL richiesto (PostgreSQL temporaneo locale rush_audit*).');
  const db = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(db.hostname) || !db.pathname.startsWith('/rush_audit')) throw new Error('Database non autorizzato per i test.');
  db.searchParams.set('schema', 'http_' + randomBytes(8).toString('hex'));
  const password = randomBytes(24).toString('hex');
  const origin = process.env.RUSH_HTTP_EXPECTED_ORIGIN ?? 'https://rush-staging.example.invalid';
  // Fully specified fixtures: prevent Next's dotenv expansion of local ADMIN_PASSWORD_HASH
  // from rewriting the child's bcrypt hash (or loading unrelated local provider keys).
  const env: NodeJS.ProcessEnv = { ...process.env, __NEXT_PROCESSED_ENV: 'true', NODE_ENV: 'production', APP_ENV: 'staging',
    DATABASE_URL: db.toString(), DIRECT_URL: db.toString(), NEXT_PUBLIC_SITE_URL: origin,
    STAGING_DATABASE_CONFIRMED: 'true', SESSION_SECRET: randomBytes(32).toString('hex'),
    ADMIN_PASSWORD_HASH: await bcrypt.hash(randomBytes(24).toString('hex'), 12),
    ADMIN_ID: 'http-test-admin', ADMIN_EMAIL: 'admin@example.com', STRIPE_SECRET_KEY: 'sk_test_http_fixture',
    STRIPE_WEBHOOK_SECRET: randomBytes(32).toString('hex'), CRON_SECRET: randomBytes(32).toString('hex'),
    RESEND_API_KEY: '', MAIL_FROM: '', EMAIL_ALLOWLIST: 'buyer@example.com,admin@example.com', FAL_KEY: '',
    UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', TURNSTILE_SECRET_KEY: '',
    SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', ENABLE_AUTOMATIC_JOBS: 'false' };
  const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'inherit' });
  if (migration.status !== 0) throw new Error('Migrazione test fallita.');
  Object.assign(process.env, env);
  const { prisma } = await import('../lib/prisma');
  const { settings } = await import('../lib/settings');
  const { reserveOrder } = await import('../lib/checkout');
  const { initialTerms } = await import('../lib/operational-schema');
  const { createAdminSession, isAdminSession } = await import('../lib/admin-auth');
  mkdirSync('.test-results', { recursive: true });
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3100'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stdout.on('data', d => { logs += d.toString(); }); server.stderr.on('data', d => { logs += d.toString(); });
  let checks = 0;
  const base = 'http://127.0.0.1:3100';
  const check = (label: string, fn: () => void) => { fn(); checks++; console.log('PASS ' + label); };
  async function get(path: string, cookie = '') { return fetch(base + path, { redirect: 'manual', headers: { cookie } }); }
  async function post(path: string, body: object, cookie = '', requestOrigin = origin) {
    return fetch(base + path, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', origin: requestOrigin, cookie }, body: JSON.stringify(body) });
  }
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error('Server terminato prima dell’avvio.');
      try { await get('/robots.txt'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    if (!ready) throw new Error('Avvio server locale non riuscito.');
    const publicStatus = await get('/api/status'); check('public API accessible without gate cookie', () => assert.equal(publicStatus.status, 200));
    const robots = await get('/robots.txt'); const robotText = await robots.text(); check('robots noindex', () => assert.ok(robotText.includes('Disallow: /')));
    const webhookNoSignature = await post('/api/stripe/webhook', {}); check('webhook bypasses gate and requires signature', () => assert.equal(webhookNoSignature.status, 400));
    assert.equal((await get('/api/cron/daily')).status, 401);
    const retiredLogin = await post('/api/staging/login', { password });
    check('retired login issues no cookie', () => { assert.equal(retiredLogin.status, 410); assert.equal(retiredLogin.headers.get('set-cookie'), null); });
    const gate = ''; const home = await get('/'); const html = await home.text();
    const legacy = await get('/anteprima');
    check('old preview bookmark redirects home', () => { assert.equal(legacy.status, 307); assert.equal(new URL(legacy.headers.get('location')!, base).pathname, '/'); });
    const adminLoginHtml = await (await get('/admin/login', gate)).text();
    check('SEC-15 login forms use POST and disclose JavaScript requirement before hydration', () => {
      for (const [markup, action] of [[adminLoginHtml, '/api/admin/login']]) {
        const form = markup.match(/<form\b[^>]*>/)?.[0] ?? '';
        assert.ok(form.includes('method="post"')); assert.ok(form.includes(`action="${action}"`));
        assert.ok(markup.includes('<noscript>')); assert.ok(markup.includes('JavaScript'));
      }
    });
    check('public home branding, noindex and banner without a password', () => { assert.equal(home.status, 200); assert.ok(html.includes('PRE-SALE')); assert.ok(html.includes('PAGAMENTI DI TEST')); assert.ok(home.headers.get('x-robots-tag')?.includes('noindex')); assert.ok(home.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")); });
    const presale = await get('/presale', gate); check('presale SSR responds', () => assert.equal(presale.status, 200));
    check('SEC-04 fresh CSP nonce matches every inline script and responses cannot be cached', () => {
      const csp = home.headers.get('content-security-policy') ?? '';
      const nonce = csp.match(/'nonce-([^']+)'/)?.[1]; assert.ok(nonce);
      const scriptPolicy = csp.split(';').find(value => value.trim().startsWith('script-src '))!;
      assert.ok(!scriptPolicy.includes('unsafe-inline')); assert.ok(!scriptPolicy.includes('unsafe-eval'));
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (match[2].trim()) assert.ok(match[1].includes(`nonce="${nonce}"`), 'inline script must have matching nonce');
      }
      assert.notEqual(presale.headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1], nonce);
      assert.ok(home.headers.get('cache-control')?.includes('no-store'));
      assert.equal(home.headers.get('referrer-policy'), 'no-referrer');
    });
    for (const path of ['/privacy', '/cookie', '/termini', '/rimborsi']) assert.equal((await get(path, gate)).status, 200, path);
    const logo = await get('/_next/image?url=%2Fassets%2Flogo.png&w=640&q=75', gate); check('Next image optimizer serves brand asset without a gate', () => { assert.equal(logo.status, 200); assert.ok(logo.headers.get('content-type')?.startsWith('image/')); });
    for (const url of ['/api/admin/orders', 'https://untrusted.supabase.co/storage/v1/object/sign/test.png']) {
      assert.equal((await get('/_next/image?url=' + encodeURIComponent(url) + '&w=640&q=75')).status, 400);
    }
    check('SEC-07 optimizer rejects internal API and remote storage URLs', () => {});
    for (const path of ['/admin', '/api/admin/export']) {
      const attempt = await fetch(base + path, { redirect: 'manual', headers: { 'x-middleware-subrequest': 'proxy:proxy:proxy:proxy:proxy' } });
      assert.ok([307, 401].includes(attempt.status));
    }
    check('framework subrequest header cannot bypass admin protection', () => {});
    assert.equal((await get('/api/admin/settings', gate)).status, 401);
    assert.equal((await get('/admin', gate)).status, 307);
    const adminToken = await createAdminSession();
    assert.equal(await isAdminSession(adminToken), true, 'fixture session is valid in test process');
    const cookie = gate + '; rush_admin_session=' + adminToken;
    const adminPage = await get('/admin', cookie); check('server-protected admin renders', () => assert.equal(adminPage.status, 200, 'admin redirect: ' + adminPage.headers.get('location')));
    assert.equal((await get('/admin/impostazioni', cookie)).status, 200);
    const response = await get('/api/admin/settings', cookie); const data = await response.json();
    const keys = ['revision', 'threshold', 'unitPriceCents', 'currency', 'maintenance', 'closedMessage', 'maxQuantity', 'maxPerCustomer', 'sizes', 'refundMonths', 'warningDays', 'adminRecipients', 'emailTemplates', 'deliveryText'];
    const values = { ...Object.fromEntries(keys.map(k => [k, data.settings[k]])), termsText: initialTerms(2, 2, data.settings.deliveryText), threshold: 2 };
    const csrf = await post('/api/admin/settings', values, cookie, 'https://evil.example'); check('CSRF rejects foreign origin', () => assert.equal(csrf.status, 403));
    const saved = await post('/api/admin/settings', values, cookie); check('settings persisted through real HTTP API', () => assert.equal(saved.status, 200));
    const current = await settings();
    const order = await reserveOrder({ firstName: '=HYPERLINK("evil")', lastName: 'HTTP test', email: 'buyer@example.com', size: 'M', quantity: 2, terms: true,
      termsVersionId: current.currentTermsId!, settingsRevision: current.revision, checkoutKey: randomUUID(), turnstileToken: 'not-a-real-captcha' });
    const event = { id: 'evt_http_' + randomUUID(), type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), livemode: false,
      data: { object: { id: 'cs_http_' + order.id, mode: 'payment', payment_status: 'paid', amount_total: order.amountCents, currency: 'eur', payment_intent: 'pi_http_' + order.id, metadata: { orderId: order.id } } } };
    const stripe = new Stripe('sk_test_http_fixture'); const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET! });
    for (let i = 0; i < 2; i++) { const result = await fetch(base + '/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload }); assert.equal(result.status, 200); }
    const status = await (await get('/api/status', gate)).json(); check('signed webhook, duplicate, paid count and sale remains open', () => { assert.equal(status.total, 2); assert.equal(status.thresholdReached, true); assert.equal(status.open, true); });
    const dashboard = await (await get('/api/admin/dashboard', cookie)).json(); check('dashboard counts and gross/refunded/net totals', () => { assert.equal(dashboard.total, 2); assert.equal(dashboard.paidOrders, 1); assert.equal(dashboard.grossCents, 5000); assert.equal(dashboard.refundedCents, 0); assert.equal(dashboard.revenueCents, 5000); assert.equal(dashboard.bySize.M, 2); });
    const delivery = await post('/api/admin/orders/' + order.id + '/delivery', { status: 'CONSEGNATA' }, cookie); check('delivery update persisted and audited', () => assert.equal(delivery.status, 200));
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).deliveryStatus, 'CONSEGNATA');
    const lookup = await (await get('/api/orders/' + order.orderNumber, gate)).json(); check('confirmation contains state and no customer PII', () => { assert.equal(lookup.paymentStatus, 'PAID'); assert.equal(lookup.email, undefined); });
    const csv = await (await get('/api/admin/export?format=csv', cookie)).text(); check('CSV endpoint escapes formulas and quotes', () => assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"')));
    const xlsxResponse = await get('/api/admin/export?format=xlsx', cookie); const zip = unzipSync(new Uint8Array(await xlsxResponse.arrayBuffer()));
    check('XLSX endpoint has safe cells and manufacturer summary', () => { assert.equal(xlsxResponse.status, 200); assert.ok(strFromU8(zip['xl/workbook.xml']).includes('Produttore')); assert.ok(!strFromU8(zip['xl/worksheets/sheet1.xml']).includes('<f>')); });
    const orders = await (await get('/api/admin/orders?q=HTTP&payment=PAID&sort=amountCents', cookie)).json(); check('search/filter/pagination', () => { assert.equal(orders.total, 1); assert.equal(orders.pageSize, 25); assert.equal(orders.orders.length, 1); });
    const dry = await get('/api/admin/expiry', cookie); assert.equal(dry.status, 200);
    assert.equal((await post('/api/admin/expiry', { confirm: false }, cookie)).status, 400);
    const cron = await fetch(base + '/api/cron/daily', { headers: { authorization: 'Bearer ' + env.CRON_SECRET } }); const cronData = await cron.json(); check('staging cron authenticated and dry-run only', () => { assert.equal(cron.status, 200); assert.equal(cronData.dryRun, true); });
    assert.equal((await post('/api/admin/production', { status: 'PRODUZIONE_AVVIATA', confirm: true }, cookie)).status, 200);
    const afterStart = await settings(); check('production timestamp persists without closing sale', () => { assert.ok(afterStart.productionStartedAt); assert.equal(afterStart.presaleOpen, true); });
    const close = await post('/api/admin/presale', { open: false, confirm: true }, cookie); check('manual closure independent of production', () => assert.equal(close.status, 200));
    assert.equal((await (await get('/api/status', gate)).json()).open, false);
    const diag = await (await get('/api/admin/diagnostics', cookie)).json(); check('diagnostics has DB/webhook status without secrets', () => { assert.equal(diag.database, 'CONNECTED'); assert.equal(diag.lastWebhook.id, event.id); assert.equal(diag.lastReceipt.status, 'DUPLICATE'); assert.ok(!JSON.stringify(diag).includes(env.STRIPE_WEBHOOK_SECRET!)); });
    const logout = await post('/api/admin/logout', {}, cookie); check('logout clears session cookie', () => { assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/i); });
    assert.equal((await get('/api/admin/export', cookie)).status, 401);
    assert.equal((await get('/admin', cookie)).status, 307);
    check('SEC-02 copied session rejected after logout', () => {});
    const report = { checks, result: 'PASS', scope: 'Production Next server over local HTTP; generated signed Stripe fixtures; no external API calls; no browser rendering', visualBrowser: 'NOT EXECUTED — no connected browser', createdAt: new Date().toISOString() };
    writeFileSync('.test-results/http-report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } finally { server.kill(); writeFileSync('.test-results/http-server.log', logs); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'HTTP tests failed'); process.exitCode = 1; });
