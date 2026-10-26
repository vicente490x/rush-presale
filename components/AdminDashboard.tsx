'use client';
import Link from 'next/link';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
type Dashboard = { total: number; threshold: number; percent: number; missing: number; ordersCount: number; paidOrders: number; grossCents: number; refundedCents: number; revenueCents: number; bySize: Record<string, number>; open: boolean; maintenance: boolean; production: string; productionStartedAt: string | null; thresholdReached: boolean; nearExpiry: number; toRefund: number; pendingRefunds: number; failedRefunds: number; toDeliver: number; recent: { id: string; actor: string; action: string; createdAt: string }[] };
type Order = { id: string; orderNumber: string; firstName: string; lastName: string; email: string; size: string; quantity: number; unitPriceCents: number; amountCents: number; refundedAmountCents: number; paymentStatus: string; paidAt: string | null; expiresAt: string | null; refundStatus: string; deliveryStatus: string; createdAt: string; stripeSessionId: string | null; stripePaymentIntentId: string | null; termsVersionId: string | null };
const money = (cents: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const date = (v: string | null) => v ? new Date(v).toLocaleString('it-IT') : '—';
const deliveries = ['DA_CONSEGNARE', 'SERATA_RUSH', 'PR', 'CONSEGNATA'];
const label = (s: string) => s.replaceAll('_', ' ');
export function AdminDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState({ q: '', payment: '', refund: '', size: '', delivery: '', sort: 'createdAt', direction: 'desc', page: 1 });
  const [total, setTotal] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const loadSequence = useRef(0);
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, String(v)]))).toString();
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const responses = await Promise.all([fetch('/api/admin/dashboard', { cache: 'no-store' }), fetch('/api/admin/orders?' + params, { cache: 'no-store' })]);
    if (responses.some(r => r.status === 401)) { router.replace('/admin/login'); return; }
    const [d, o] = await Promise.all(responses.map(r => r.json()));
    if (sequence !== loadSequence.current) return;
    if (!responses[0].ok || !responses[1].ok) throw new Error(d.error ?? o.error ?? 'Dati non disponibili.');
    setDashboard(d); setOrders(o.orders); setTotal(o.total);
  }, [params, router]);
  // Async server polling updates state after network completion.
  useEffect(() => { load().catch(e => setError(e.message)); const timer = window.setInterval(() => load().catch(e => setError(e.message)), 30000); return () => clearInterval(timer); }, [load]);
  async function action(url: string, data: object, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, ...(confirmation ? { confirm: true } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Operazione non riuscita.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Operazione non riuscita.'); await load().catch(() => undefined); } finally { setBusy(false); }
  }
  function filter(event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) { setFilters(v => ({ ...v, [event.target.name]: event.target.value, page: 1 })); }
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Uscita non completata. Riprova per invalidare la sessione.');
      router.replace('/admin/login'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Uscita non completata.'); }
    finally { setBusy(false); }
  }
  const next = dashboard?.productionStartedAt ? dashboard.production === 'PRODUZIONE_AVVIATA' ? 'PRODUZIONE_COMPLETATA' : null : 'PRODUZIONE_AVVIATA';
  return <main className="admin-wrap">
    <header className="admin-header"><div><p className="eyebrow">RUSH · BACK OFFICE</p><h1>PRE-SALE ADMIN</h1></div><nav className="admin-actions"><Link href="/admin/impostazioni">IMPOSTAZIONI</Link><button onClick={logout} disabled={busy}>ESCI</button></nav></header>
    {error && <p className="error-box" role="alert">{error}</p>}
    {!dashboard && !error && <p role="status">Caricamento dashboard…</p>}
    {dashboard && <>
      <section className="admin-grid" aria-label="Statistiche PRE-SALE">{[
        ['PEZZI PAGATI / SOGLIA', dashboard.total + ' / ' + dashboard.threshold], ['RAGGIUNGIMENTO', dashboard.percent + '%'], ['PEZZI MANCANTI', dashboard.missing],
        ['ORDINI TOTALI / PAGATI', dashboard.ordersCount + ' / ' + dashboard.paidOrders], ['LORDO PAGATO', money(dashboard.grossCents)], ['RIMBORSATO', money(dashboard.refundedCents)],
        ['NETTO DOPO RIMBORSI', money(dashboard.revenueCents)], ['PRE-SALE', dashboard.open ? 'APERTA' : 'CHIUSA'], ['PRODUZIONE', label(dashboard.production)],
        ['IN PREAVVISO', dashboard.nearExpiry], ['SCADUTI', dashboard.toRefund], ['RIMBORSI IN CORSO / FALLITI', dashboard.pendingRefunds + ' / ' + dashboard.failedRefunds], ['DA CONSEGNARE', dashboard.toDeliver]
      ].map(([name, value]) => <div className="admin-card" key={name}><span>{name}</span><b>{value}</b></div>)}</section>
      <p className="fine-print">Il netto esclude i rimborsi e non sottrae le commissioni Stripe. Le quantità comprendono i pagamenti con rimborso ancora in corso e gli eventuali rimborsi parziali.</p>
      {dashboard.maintenance && <p className="status-closed">MANUTENZIONE ATTIVA</p>}
      {dashboard.thresholdReached && <p className="threshold-badge">✓ SOGLIA RAGGIUNTA · la PRE-SALE resta {dashboard.open ? 'aperta' : 'chiusa'}</p>}
      <section className="admin-card"><strong>Quantità per taglia</strong><div className="size-summary">{Object.entries(dashboard.bySize).map(([size, q]) => <span key={size}>{size} · {q}</span>)}</div></section>
      <div className="admin-actions">
        <button disabled={busy} onClick={() => action('/api/admin/presale', { open: !dashboard.open }, dashboard.open ? 'Chiudere la PRE-SALE e annullare i checkout aperti?' : 'Riaprire la PRE-SALE?')}>{dashboard.open ? 'CHIUDI PRE-SALE' : 'APRI PRE-SALE'}</button>
        {next && <button disabled={busy || !dashboard.productionStartedAt && !dashboard.thresholdReached} onClick={() => action('/api/admin/production', { status: next }, 'Confermi ' + label(next) + '? Il passaggio è irreversibile; l’avvio interrompe i rimborsi automatici.')}>{label(next)}</button>}
        <Link href="/admin/impostazioni#rimborsi">SCADENZE E RIMBORSI</Link>
      </div>
      {dashboard.productionStartedAt && <p>Produzione avviata: {date(dashboard.productionStartedAt)}</p>}
      <section><h2>ORDINI</h2><div className="admin-filters">
        <input name="q" className="form-control" value={filters.q} onChange={filter} aria-label="Cerca ordine, nome o email" placeholder="Cerca ordine, nome o email" maxLength={100} />
        {[
          ['payment', 'Pagamento', ['PENDING', 'PAID', 'FAILED']], ['refund', 'Rimborso', ['NONE', 'PENDING', 'REFUNDED', 'FAILED']],
          ['size', 'Taglia', ['XS', 'S', 'M', 'L', 'XL', 'XXL']], ['delivery', 'Consegna', deliveries],
          ['sort', 'Ordina per', ['createdAt', 'paidAt', 'expiresAt', 'amountCents', 'orderNumber', 'quantity']], ['direction', 'Direzione', ['desc', 'asc']]
        ].map(([name, title, choices]) => <label key={String(name)}>{title}<select name={String(name)} value={filters[name as keyof typeof filters]} onChange={filter}>{!['sort', 'direction'].includes(String(name)) && <option value="">Tutti</option>}{(choices as string[]).map(choice => <option key={choice} value={choice}>{label(choice)}</option>)}</select></label>)}
      </div><div className="admin-actions"><a href={'/api/admin/export?format=csv&' + params} download>ESPORTA CSV</a><a href={'/api/admin/export?format=xlsx&' + params} download>ESPORTA EXCEL</a></div>
      <p>{total} ordini · pagina {filters.page} di {Math.max(1, Math.ceil(total / 25))}</p>
      <div className="table-scroll"><table className="orders-table"><thead><tr>{['Ordine / dettagli', 'Nome', 'Email', 'Taglia', 'Qtà', 'Prezzo', 'Importo', 'Data ordine', 'Pagato', 'Scadenza', 'Pagamento', 'Produzione', 'Rimborso', 'Consegna', 'Azioni'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{orders.map(o => <tr key={o.id}>
        <td><details><summary>{o.orderNumber}</summary><p>Sessione: {o.stripeSessionId ?? '—'}</p><p>Payment intent: {o.stripePaymentIntentId ?? '—'}</p><p>Termini: {o.termsVersionId ?? 'storico non disponibile'}</p></details></td>
        <td>{o.firstName} {o.lastName}</td><td>{o.email}</td><td>{o.size}</td><td>{o.quantity}</td><td>{money(o.unitPriceCents)}</td><td>{money(o.amountCents)}</td><td>{date(o.createdAt)}</td><td>{date(o.paidAt)}</td><td>{date(o.expiresAt)}</td><td>{o.paymentStatus}</td><td>{label(dashboard.production)}</td><td>{o.refundStatus}<br />{money(o.refundedAmountCents)}</td>
        <td><select aria-label={'Consegna ' + o.orderNumber} value={o.deliveryStatus} disabled={busy || o.paymentStatus !== 'PAID' || o.refundStatus !== 'NONE'} onChange={e => action('/api/admin/orders/' + o.id + '/delivery', { status: e.target.value })}>{deliveries.map(v => <option key={v} value={v}>{label(v)}</option>)}</select></td>
        <td>{o.paymentStatus === 'PAID' && o.refundStatus !== 'REFUNDED' && <button disabled={busy} onClick={() => action('/api/admin/orders/' + o.id + '/refund', {}, 'Confermi il rimborso/riconciliazione Stripe nella modalità configurata dell’ordine ' + o.orderNumber + '?')}>{o.refundStatus === 'PENDING' ? 'RICONCILIA' : 'RIMBORSA'}</button>}</td>
      </tr>)}</tbody></table></div>
      {orders.length === 0 && <p>Nessun ordine con questi filtri.</p>}
      <div className="admin-actions"><button disabled={filters.page <= 1} onClick={() => setFilters(v => ({ ...v, page: v.page - 1 }))}>PRECEDENTE</button><button disabled={filters.page * 25 >= total} onClick={() => setFilters(v => ({ ...v, page: v.page + 1 }))}>SUCCESSIVA</button></div></section>
      <section><h2>ULTIME OPERAZIONI</h2>{dashboard.recent.length ? <ul>{dashboard.recent.map(a => <li key={a.id}>{date(a.createdAt)} · {a.actor} · {label(a.action)}</li>)}</ul> : <p>Nessuna operazione amministrativa registrata.</p>}</section>
    </>}
  </main>;
}
