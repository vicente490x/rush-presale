import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, devices, type Browser, type Route } from '@playwright/test';
import { checkConfirmation } from './confirmation-browser-checks';

async function main() {
  const db = new URL(process.env.RUSH_TEST_DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1'].includes(db.hostname) || !db.pathname.startsWith('/rush_audit')) throw new Error('Serve un database locale temporaneo rush_audit*.');
  db.searchParams.set('schema', 'browser_' + randomBytes(8).toString('hex'));
  const env: NodeJS.ProcessEnv = { ...process.env, __NEXT_PROCESSED_ENV: 'true', NODE_ENV: 'production', APP_ENV: 'staging',
    STAGING_DATABASE_CONFIRMED: 'true', DATABASE_URL: db.href, DIRECT_URL: db.href,
    NEXT_PUBLIC_SITE_URL: 'https://rush-staging.example.invalid', STRIPE_MODE: 'test', ALLOW_LIVE_PAYMENTS: 'false',
    SESSION_SECRET: randomBytes(32).toString('hex'), ADMIN_ID: 'browser-admin', ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD_HASH: '', STRIPE_SECRET_KEY: '', RESEND_API_KEY: '', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '', TURNSTILE_SECRET_KEY: '',
    UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', ENABLE_AUTOMATIC_JOBS: 'false' };
  const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'inherit' });
  if (migration.status !== 0) throw new Error('Migrazione browser fallita.');
  Object.assign(process.env, env);
  const { prisma } = await import('../lib/prisma');
  const { initializeAdmin } = await import('../lib/admin-account');
  const { createAdminSession } = await import('../lib/admin-auth');
  await initializeAdmin({ id: env.ADMIN_ID!, email: env.ADMIN_EMAIL!, password: randomBytes(32).toString('hex') });
  mkdirSync('.test-results/browser', { recursive: true });
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3200'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stdout.on('data', value => { logs += value; }); server.stderr.on('data', value => { logs += value; });
  const base = 'http://localhost:3200';
  const checks: string[] = [];
  const pass = (name: string) => { checks.push(name); console.log('PASS ' + name); };
  let browser: Browser | undefined;
  try {
    for (let attempt = 0; ; attempt++) {
      try { if ((await fetch(base + '/api/status')).ok) break; } catch { /* Await server startup. */ }
      if (attempt >= 100 || server.exitCode !== null) throw new Error('Server browser non disponibile.');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ executablePath: process.env.RUSH_BROWSER_EXECUTABLE || undefined, args: ['--enable-unsafe-swiftshader'] });
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await desktop.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
      if (message.type() === 'error' || message.type() === 'warning') logs += '\nBROWSER: ' + message.text();
    });
    let glbRequests = 0;
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('.glb')) glbRequests++; });
    await page.goto(base);
    await page.getByRole('link', { name: 'PRE-SALE', exact: true }).waitFor();
    await page.screenshot({ path: '.test-results/browser/home.png', fullPage: true });
    await page.getByRole('link', { name: 'PRE-SALE', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.price')?.textContent === '25€');
    assert.equal(glbRequests, 0); pass('3D non scaricato prima della selezione');
    await page.screenshot({ path: '.test-results/browser/presale.png', fullPage: true });
    await page.getByRole('button', { name: 'Mostra vista posteriore', exact: true }).click();
    await page.getByRole('button', { name: 'Ingrandisci immagine posteriore' }).click();
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0); pass('Foto originali e zoom con chiusura da tastiera');
    const modelResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('.glb'));
    let resolveModel!: (route: Route) => void;
    const pendingModel = new Promise<Route>(resolve => { resolveModel = resolve; });
    await page.route(/\.glb(?:\?|$)/, route => resolveModel(route), { times: 1 });
    await page.getByRole('button', { name: 'Mostra modello 3D' }).click();
    const pendingRoute = await pendingModel;
    await page.getByText(/Caricamento 3D…/).waitFor();
    assert.equal(await page.getByRole('button', { name: 'FRONTE', exact: true }).isDisabled(), true);
    assert.equal(await page.getByAltText('Anteprima fotografica della maglietta RUSH').isVisible(), true);
    await page.screenshot({ path: '.test-results/browser/viewer-loading.png' });
    await pendingRoute.continue();
    pass('Rete lenta: anteprima visibile, avanzamento e controlli disabilitati durante il caricamento');
    await page.waitForFunction(() => (document.querySelector('model-viewer') as HTMLElement & { loaded: boolean })?.loaded, undefined, { timeout: 45000 });
    const response = await modelResponse;
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /model\/gltf-binary/);
    assert.equal(createHash('sha256').update(await response.body()).digest('hex'), 'f32fdbc136cc4d1c049e9ec22950e98df3a35043365fcfd350a9fd4dbb8c8aa6');
    assert.equal(glbRequests, 1); pass('GLB reale caricato con CSP di produzione');
    await page.getByRole('button', { name: 'RETRO', exact: true }).click();
    assert.match(await page.locator('model-viewer').evaluate(element => (element as HTMLElement & { cameraOrbit: string }).cameraOrbit), /^180deg/);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: '.test-results/browser/viewer-retro.png', fullPage: true });
    await page.getByRole('button', { name: 'AVVIA ROTAZIONE' }).click();
    assert.equal(await page.locator('model-viewer').evaluate(element => (element as HTMLElement & { autoRotate: boolean }).autoRotate), true);
    await page.getByRole('button', { name: 'FERMA ROTAZIONE' }).click();
    await page.getByRole('button', { name: 'RIPRISTINA' }).click();
    assert.match(await page.locator('model-viewer').evaluate(element => (element as HTMLElement & { cameraOrbit: string }).cameraOrbit), /^0deg/);
    const homeRadius = await page.locator('model-viewer').evaluate(element => (element as HTMLElement & { getCameraOrbit: () => { radius: number } }).getCameraOrbit().radius);
    const box = (await page.locator('model-viewer').boundingBox())!;
    const before = await page.locator('model-viewer').evaluate(element => (element as HTMLElement & { getCameraOrbit: () => { theta: number } }).getCameraOrbit().theta);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 12 }); await page.mouse.up();
    await page.waitForFunction(previous => (document.querySelector('model-viewer') as HTMLElement & { getCameraOrbit: () => { theta: number } }).getCameraOrbit().theta !== previous, before);
    await page.mouse.wheel(0, -10000);
    await page.waitForFunction(home => {
      const radius = (document.querySelector('model-viewer') as HTMLElement & { getCameraOrbit: () => { radius: number } }).getCameraOrbit().radius;
      return radius > 0 && radius < home * 0.9;
    }, homeRadius);
    await page.mouse.wheel(0, 10000);
    await page.waitForFunction(home => {
      const radius = (document.querySelector('model-viewer') as HTMLElement & { getCameraOrbit: () => { radius: number } }).getCameraOrbit().radius;
      return radius > home && radius < home * 2;
    }, homeRadius);
    pass('Fronte/retro, rotazione, ripristino, drag e zoom limitato');
    await page.getByRole('button', { name: 'RIPRISTINA' }).click();
    await page.waitForFunction(home => Math.abs((document.querySelector('model-viewer') as HTMLElement & { getCameraOrbit: () => { radius: number } }).getCameraOrbit().radius - home) < 0.01, homeRadius);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: '.test-results/browser/viewer-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'L', exact: true }).click();
    await page.getByRole('button', { name: 'Aumenta quantità' }).click();
    assert.equal(await page.locator('.total-row strong').textContent(), '50€');
    await page.getByRole('button', { name: 'Mostra vista frontale', exact: true }).click();
    assert.equal(await page.locator('model-viewer').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'L', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.qty-control output').textContent(), '2'); pass('Ritorno alle foto conserva taglia, quantità e totale');
    await page.goto(base + '/admin');
    await page.waitForURL('**/admin/login');
    assert.equal(await page.getByLabel('Email', { exact: true }).getAttribute('autocomplete'), 'username');
    await page.screenshot({ path: '.test-results/browser/admin-login.png', fullPage: true });
    await desktop.addCookies([{ name: 'rush_admin_session', value: await createAdminSession(), url: base, httpOnly: true, sameSite: 'Strict' }]);
    await page.goto(base + '/admin');
    await page.getByRole('region', { name: 'Statistiche PRE-SALE' }).waitFor();
    await page.screenshot({ path: '.test-results/browser/admin-dashboard.png', fullPage: true });
    await page.getByRole('link', { name: 'IMPOSTAZIONI', exact: true }).click();
    await page.getByRole('button', { name: /SALVA IMPOSTAZIONI/ }).waitFor();
    await page.screenshot({ path: '.test-results/browser/admin-settings.png', fullPage: true });
    pass('Admin anonimo rediretto; dashboard e impostazioni renderizzate con sessione DB valida');
    const personalId = 'personal-browser-' + randomBytes(8).toString('hex');
    await initializeAdmin({ id: personalId, email: personalId + '@example.com', password: randomBytes(32).toString('hex') });
    const personalContext = await browser.newContext();
    await personalContext.addCookies([{ name: 'rush_admin_session', value: await createAdminSession(undefined, personalId), url: base, httpOnly: true, sameSite: 'Strict' }]);
    const personalPage = await personalContext.newPage();
    await personalPage.goto(base + '/admin');
    await personalPage.getByRole('region', { name: 'Statistiche PRE-SALE' }).waitFor();
    await personalPage.getByRole('heading', { name: 'ORDINI', exact: true }).waitFor();
    assert.equal((await personalPage.request.get(base + '/api/admin/orders')).status(), 200);
    await personalContext.close();
    pass('Secondo ADMIN: dashboard e ordini renderizzati con sessione distinta (fixture locale)');

    const mobile = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
    const phone = await mobile.newPage();
    await phone.goto(base + '/presale');
    await phone.getByRole('button', { name: 'Mostra modello 3D' }).click();
    await phone.waitForFunction(() => (document.querySelector('model-viewer') as HTMLElement & { loaded: boolean })?.loaded);
    assert.equal(await phone.locator('model-viewer').evaluate(element => (element as HTMLElement & { autoRotate: boolean }).autoRotate), false);
    const phoneBox = (await phone.locator('model-viewer').boundingBox())!;
    const cdp = await mobile.newCDPSession(phone);
    const x = phoneBox.x + phoneBox.width / 2, y = phoneBox.y + phoneBox.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 80, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await phone.getByRole('button', { name: 'Mostra modello 3D' }).getAttribute('aria-current'), 'true');
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await phone.getByRole('button', { name: 'RETRO', exact: true }).click();
    await phone.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await phone.screenshot({ path: '.test-results/browser/viewer-mobile.png' });
    pass('Mobile 390px: touch non cambia slide, nessun overflow, reduced motion rispettato');
    for (const width of [320, 768]) {
      await phone.setViewportSize({ width, height: 900 });
      assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      for (const button of await phone.getByRole('group', { name: 'Controlli modello 3D' }).getByRole('button').all()) {
        const bounds = (await button.boundingBox())!;
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.height >= 44);
      }
    }
    await phone.setViewportSize({ width: 390, height: 844 });
    pass('Responsive 320/768px: nessun overflow e controlli touch di almeno 44px');
    await phone.getByRole('button', { name: 'Mostra vista frontale', exact: true }).click();
    await phone.route(/\.glb(?:\?|$)/, route => route.abort());
    // Clear model-viewer's in-memory cache with a fresh document.
    await phone.reload();
    await phone.getByRole('button', { name: 'Mostra modello 3D' }).click();
    await phone.getByRole('button', { name: 'TORNA ALLE FOTO' }).waitFor({ timeout: 50000 });
    await phone.screenshot({ path: '.test-results/browser/viewer-fallback.png' });
    await phone.unroute(/\.glb(?:\?|$)/);
    await phone.getByRole('button', { name: 'RIPROVA VISTA 3D' }).click();
    await phone.waitForFunction(() => (document.querySelector('model-viewer') as HTMLElement & { loaded: boolean })?.loaded);
    pass('Riprova recupera il GLB dopo un errore di rete');
    await phone.route(/\.glb(?:\?|$)/, route => route.abort());
    await phone.reload();
    await phone.getByRole('button', { name: 'Mostra modello 3D' }).click();
    await phone.getByRole('button', { name: 'TORNA ALLE FOTO' }).waitFor({ timeout: 50000 });
    await phone.getByRole('button', { name: 'TORNA ALLE FOTO' }).click();
    assert.equal(await phone.getByRole('button', { name: 'Ingrandisci immagine frontale' }).isVisible(), true);
    pass('Errore rete GLB: fallback fotografico e recupero senza ricaricare');
    const motion = await browser.newContext({ reducedMotion: 'no-preference' });
    const spinning = await motion.newPage();
    await spinning.goto(base + '/presale');
    await spinning.getByRole('button', { name: 'Mostra modello 3D' }).click();
    await spinning.getByRole('button', { name: 'FERMA ROTAZIONE' }).waitFor();
    assert.equal(await spinning.locator('model-viewer').evaluate(element => (element as HTMLElement & { autoRotate: boolean }).autoRotate), true);
    await spinning.emulateMedia({ reducedMotion: 'reduce' });
    await spinning.getByRole('button', { name: 'AVVIA ROTAZIONE' }).waitFor();
    assert.equal(await spinning.locator('model-viewer').evaluate(element => (element as HTMLElement & { autoRotate: boolean }).autoRotate), false);
    await motion.close();
    pass('Rotazione automatica attiva e arresto al cambio della preferenza movimento ridotto');
    assert.deepEqual(errors, []); pass('Nessun errore JavaScript, texture o CSP nel percorso desktop');
    for (const result of await checkConfirmation(browser, base)) pass(result);
    const noWebgl = await chromium.launch({ executablePath: process.env.RUSH_BROWSER_EXECUTABLE || undefined, args: ['--disable-webgl'] });
    try {
      const unsupported = await noWebgl.newPage();
      await unsupported.goto(base + '/presale');
      await unsupported.getByRole('button', { name: 'Mostra modello 3D' }).click();
      await unsupported.getByRole('button', { name: 'TORNA ALLE FOTO' }).waitFor({ timeout: 50000 });
      pass('WebGL disabilitato: fallback fotografico disponibile');
    } finally { await noWebgl.close(); }
    writeFileSync('.test-results/browser/report.json', JSON.stringify({ date: new Date().toISOString(), result: 'PASS', checks,
      scope: 'Chromium desktop e mobile emulato; Next compilato e PostgreSQL isolato reali; nessun pagamento o invio email esterno.', browser: browser.version() }, null, 2));
  } finally {
    await browser?.close(); server.kill(); await prisma.$disconnect();
    writeFileSync('.test-results/browser/server.log', logs);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
