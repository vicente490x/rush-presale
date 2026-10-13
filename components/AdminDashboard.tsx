'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Dashboard = {
  total: number;
  threshold: number;
  percent: number;
  ordersCount: number;
  revenueCents: number;
  bySize: Record<string, number>;
  open: boolean;
  production: string;
  thresholdReached: boolean;
  nearExpiry: number;
  toRefund: number;
  tryOnEnabled: boolean;
  tryOnDailyLimit: number;
  tryOnGenerations: number;
  tryOnFailures: number;
  tryOnCostUsd: number;
};

type Order = {
  id: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  size: string;
  quantity: number;
  amountCents: number;
  paymentStatus: string;
  paidAt: string | null;
  expiresAt: string | null;
  refundStatus: string;
  deliveryStatus: string;
  createdAt: string;
};

const money = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')}€`;
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('it-IT') : '—';
const deliveryStates = ['DA_CONSEGNARE', 'SERATA_RUSH', 'PR', 'CONSEGNATA'];
const productionLabels: Record<string, string> = {
  IN_RACCOLTA: 'IN RACCOLTA',
  SOGLIA_RAGGIUNTA: 'SOGLIA RAGGIUNTA',
  PRODUZIONE_AVVIATA: 'PRODUZIONE AVVIATA',
  PRODUZIONE_COMPLETATA: 'PRODUZIONE COMPLETATA'
};
const nextProduction: Record<string, string> = {
  IN_RACCOLTA: 'SOGLIA_RAGGIUNTA',
  SOGLIA_RAGGIUNTA: 'PRODUZIONE_AVVIATA',
  PRODUZIONE_AVVIATA: 'PRODUZIONE_COMPLETATA'
};

export function AdminDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const [dashboardResponse, ordersResponse] = await Promise.all([
      fetch('/api/admin/dashboard', { cache: 'no-store' }),
      fetch('/api/admin/orders', { cache: 'no-store' })
    ]);
    if (dashboardResponse.status === 401 || ordersResponse.status === 401) return router.replace('/admin/login');
    const dashboardData = await dashboardResponse.json();
    const ordersData = await ordersResponse.json();
    if (!dashboardResponse.ok) throw new Error(dashboardData.error ?? 'Dashboard non disponibile.');
    if (!ordersResponse.ok) throw new Error(ordersData.error ?? 'Ordini non disponibili.');
    setDashboard(dashboardData);
    setOrders(ordersData);
    setError('');
  }, [router]);

  useEffect(() => {
    load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Errore di caricamento.'));
    const timer = window.setInterval(() => load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Errore di aggiornamento.')), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function action(url: string, data?: unknown, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? {})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Operazione non riuscita.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  }

  async function changeDelivery(id: string, event: ChangeEvent<HTMLSelectElement>) {
    await action(`/api/admin/orders/${id}/delivery`, { status: event.target.value });
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  const filtered = orders.filter((order) => `${order.orderNumber} ${order.firstName} ${order.lastName} ${order.email} ${order.size}`.toLowerCase().includes(search.toLowerCase()));
  const tryOnEnabled = dashboard?.tryOnEnabled ?? false;
  const next = dashboard ? nextProduction[dashboard.production] : undefined;

  return (
    <main className="admin-wrap">
      <header className="admin-header">
        <div><p className="eyebrow">RUSH · BACK OFFICE</p><h1>PRE-SALE ADMIN</h1></div>
        <button type="button" onClick={logout}>ESCI</button>
      </header>
      {error && <p className="error-box" role="alert">{error}</p>}
      {dashboard && (
        <>
          <section className="admin-grid" aria-label="Statistiche PRE-SALE">
            <div className="admin-card"><span>PEZZI PRENOTATI / SOGLIA</span><b>{dashboard.total} / {dashboard.threshold}</b></div>
            <div className="admin-card"><span>RAGGIUNGIMENTO</span><b>{dashboard.percent}%</b></div>
            <div className="admin-card"><span>ORDINI</span><b>{dashboard.ordersCount}</b></div>
            <div className="admin-card"><span>INCASSATO</span><b>{money(dashboard.revenueCents)}</b></div>
            <div className="admin-card"><span>PRE-SALE</span><b>{dashboard.open ? 'APERTA' : 'CHIUSA'}</b></div>
            <div className="admin-card"><span>PRODUZIONE</span><b>{productionLabels[dashboard.production] ?? dashboard.production}</b></div>
            <div className="admin-card"><span>IN SCADENZA · 7 GG</span><b>{dashboard.nearExpiry}</b></div>
            <div className="admin-card"><span>DA RIMBORSARE</span><b>{dashboard.toRefund}</b></div>
          </section>
          {dashboard.thresholdReached && <p className="threshold-badge">✓ SOGLIA RAGGIUNTA</p>}
          <section className="admin-card">
            <strong>Quantità per taglia</strong>
            <div className="size-summary">{Object.entries(dashboard.bySize).map(([size, quantity]) => <span key={size}>{size} · {quantity}</span>)}</div>
          </section>
          <section className="admin-card tryon-stats">
            <strong>PROVA VIRTUALE</strong>
            <span>Generazioni oggi: {dashboard.tryOnGenerations}</span>
            <span>Errori oggi: {dashboard.tryOnFailures}</span>
            <span>Spesa stimata oggi: ${dashboard.tryOnCostUsd.toFixed(2)}</span>
            <label>Limite giornaliero <input id="tryon-limit" type="number" min="0" max="1000" defaultValue={dashboard.tryOnDailyLimit} /></label>
            <div className="admin-actions">
              <button disabled={busy} onClick={() => action('/api/admin/settings/tryon', {
                enabled: !tryOnEnabled,
                dailyLimit: Number((document.getElementById('tryon-limit') as HTMLInputElement)?.value ?? dashboard.tryOnDailyLimit)
              })}>{tryOnEnabled ? 'DISATTIVA PROVA VIRTUALE' : 'ATTIVA PROVA VIRTUALE'}</button>
              <button disabled={busy} onClick={() => action('/api/admin/settings/tryon', {
                enabled: tryOnEnabled,
                dailyLimit: Number((document.getElementById('tryon-limit') as HTMLInputElement)?.value ?? dashboard.tryOnDailyLimit)
              })}>SALVA LIMITE</button>
            </div>
          </section>
          <div className="admin-actions">
            <button disabled={busy} onClick={() => action('/api/admin/presale', { open: !dashboard.open }, dashboard.open ? 'Chiudere la PRE-SALE? I checkout in sospeso verranno annullati.' : 'Riaprire la PRE-SALE?')}>{dashboard.open ? 'CHIUDI PRE-SALE' : 'APRI PRE-SALE'}</button>
            {next && <button disabled={busy || (next === 'SOGLIA_RAGGIUNTA' && !dashboard.thresholdReached) || (next === 'PRODUZIONE_AVVIATA' && !dashboard.thresholdReached)} onClick={() => action('/api/admin/production', { status: next }, `Confermi il passaggio a ${productionLabels[next]}?`)}>{productionLabels[next]}</button>}
            <a href="/api/admin/export" download>ESPORTA ORDINI CSV</a>
          </div>
          <section>
            <div className="orders-heading"><h2>ORDINI</h2><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca ordine, nome, email o taglia" /></div>
            <div className="table-scroll">
              <table className="orders-table">
                <thead><tr><th>Ordine</th><th>Nome</th><th>Email</th><th>Taglia</th><th>Qtà</th><th>Importo</th><th>Pagamento</th><th>Pagato</th><th>Scadenza</th><th>Produzione</th><th>Rimborso</th><th>Consegna</th><th>Azioni</th></tr></thead>
                <tbody>{filtered.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td><td>{order.firstName} {order.lastName}</td><td>{order.email}</td><td>{order.size}</td>
                    <td>{order.quantity}</td><td>{money(order.amountCents)}</td><td>{order.paymentStatus}</td><td>{date(order.paidAt)}</td>
                    <td>{date(order.expiresAt)}</td><td>{dashboard.production}</td><td>{order.refundStatus}</td>
                    <td><select value={order.deliveryStatus} onChange={(event) => changeDelivery(order.id, event)}>{deliveryStates.map((state) => <option value={state} key={state}>{state}</option>)}</select></td>
                    <td>{order.paymentStatus === 'PAID' && order.refundStatus !== 'REFUNDED' && <button disabled={busy} onClick={() => action(`/api/admin/orders/${order.id}/refund`, {}, `Rimborsare l’ordine ${order.orderNumber} tramite Stripe?`)}>RIMBORSA</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
