import assert from 'node:assert/strict';
import type { Browser } from '@playwright/test';

// UI contract fixtures only: these checks do not represent a Stripe transaction.
export async function checkConfirmation(browser: Browser, base: string) {
  const checks: string[] = [];
  const paid = { orderNumber: 'RUSH-0123456789ABCDEF0123456789ABCDEF', size: 'L', quantity: 2,
    paymentStatus: 'PAID', amountCents: 5000, amountPaidCents: 5000, currency: 'eur',
    method: 'Carta', cardBrand: 'visa', cardLast4: '4242', paidAt: '2026-10-28T12:00:00.000Z',
    expiresAt: '2026-12-28T12:00:00.000Z', refundStatus: 'NONE', productionStartedAt: null };
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      let body: object = paid;
      let status = 200;
      await page.route('**/api/orders/*', route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));
      const visit = () => page.goto(base + '/conferma?code=' + paid.orderNumber);
      await visit();
      await page.getByRole('heading', { name: 'ORDINE CONFERMATO', exact: true }).waitFor();
      assert.match(await page.locator('.payment-summary').innerText(), /50,00/);
      assert.match(await page.locator('.payment-summary').innerText(), /VISA.*4242/);
      assert.match(await page.locator('.payment-summary').innerText(), /28\/10\/2026/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `.test-results/browser/confirmation-${width}.png`, fullPage: true });
      await page.reload();
      await page.getByRole('heading', { name: 'ORDINE CONFERMATO', exact: true }).waitFor();
      for (const method of ['Apple Pay', 'Google Pay']) {
        body = { ...paid, method };
        await visit();
        await page.getByText(method, { exact: true }).waitFor();
      }
      body = { ...paid, paymentStatus: 'PENDING', amountPaidCents: null, method: null, cardLast4: null, paidAt: null };
      await visit();
      await page.getByRole('heading', { name: 'PAGAMENTO IN ELABORAZIONE' }).waitFor();
      assert.equal(await page.getByText('Totale pagato', { exact: true }).count(), 0);
      assert.equal(await page.getByText('Metodo di pagamento', { exact: true }).count(), 0);
      body = paid;
      await page.getByRole('heading', { name: 'ORDINE CONFERMATO', exact: true }).waitFor({ timeout: 10000 });
      body = { ...paid, paymentStatus: 'FAILED', amountPaidCents: null, method: null, cardLast4: null, paidAt: null };
      await visit();
      await page.getByRole('heading', { name: 'PAGAMENTO NON COMPLETATO' }).waitFor();
      assert.equal(await page.getByText('Totale pagato', { exact: true }).count(), 0);
      for (const code of [403, 503]) {
        status = code; body = { error: 'Verifica non disponibile per questo ordine.' };
        await visit();
        await page.getByRole('heading', { name: 'VERIFICA NON DISPONIBILE' }).waitFor();
        assert.equal(await page.locator('.payment-summary').count(), 0);
        status = 200; body = paid;
        await page.getByRole('button', { name: 'RICONTROLLA PAGAMENTO' }).click();
        await page.getByRole('heading', { name: 'ORDINE CONFERMATO', exact: true }).waitFor();
      }
      await page.getByRole('link', { name: 'TORNA ALLA HOME', exact: true }).click();
      await page.waitForURL(base + '/');
      checks.push(`Conferma ${width}px (API simulata): dettagli, wallet, reload, attesa→pagato, fallimento, 403/503, riprova e home`);
    } finally { await context.close(); }
  }
  return checks;
}
