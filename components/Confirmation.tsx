'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type OrderState = {
  orderNumber: string; size: string; quantity: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  amountCents: number; amountPaidCents: number | null; currency: string;
  method: string | null; cardBrand: string | null; cardLast4: string | null; paidAt: string | null;
  expiresAt: string | null; refundStatus: string; productionStartedAt: string | null;
};

export function Confirmation({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderState>();
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      if (!orderNumber) { setError('Numero ordine mancante.'); setWaiting(false); return; }
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Ordine non disponibile.');
        if (controller.signal.aborted) return;
        setOrder(data); setError('');
        if (data.paymentStatus === 'PENDING' && attempts++ < 20) timer = setTimeout(poll, 3000);
        else setWaiting(false);
      } catch (reason) {
        if (!controller.signal.aborted) { setOrder(undefined); setError(reason instanceof Error ? reason.message : 'Conferma non disponibile.'); setWaiting(false); }
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [orderNumber, revision]);
  const paid = order?.paymentStatus === 'PAID';
  const money = (cents: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: order?.currency ?? 'eur' }).format(cents / 100);
  return (
    <main className="confirm-card">
      <p className="eyebrow">RUSH PRE-SALE</p>
      <h1>{error ? 'VERIFICA NON DISPONIBILE' : order?.refundStatus === 'REFUNDED' && paid ? 'ORDINE RIMBORSATO' : paid ? 'ORDINE CONFERMATO' : order?.paymentStatus === 'FAILED' ? 'PAGAMENTO NON COMPLETATO' : order ? 'PAGAMENTO IN ELABORAZIONE' : 'VERIFICA ORDINE'}</h1>
      {error && <p className="error-box" role="alert">{error}</p>}
      {!error && !paid && order?.paymentStatus !== 'FAILED' && <p role="status">Attendiamo la conferma del pagamento. Non effettuare un secondo pagamento per lo stesso ordine.</p>}
      {orderNumber && <p className="order-code">{orderNumber}</p>}
      {order && <dl className="payment-summary">
        <div><dt>Prodotto</dt><dd>RUSH T-SHIRT · taglia {order.size}</dd></div>
        <div><dt>Quantità</dt><dd>{order.quantity}</dd></div>
        <div><dt>{paid ? 'Totale pagato' : 'Totale ordine'}</dt><dd>{money(paid && order.amountPaidCents !== null ? order.amountPaidCents : order.amountCents)}</dd></div>
        {paid && <>
          <div><dt>Metodo di pagamento</dt><dd>{order.method ?? 'Non disponibile'}</dd></div>
          {order.cardLast4 && <div><dt>Carta</dt><dd>{order.cardBrand?.toUpperCase()} •••• {order.cardLast4}</dd></div>}
          {order.paidAt && <div><dt>Data e ora del pagamento</dt><dd>{new Date(order.paidAt).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} (ora italiana)</dd></div>}
        </>}
      </dl>}
      {paid && !error && <>
        {order.refundStatus === 'REFUNDED' ? <p>Il rimborso è stato confermato. I tempi di accredito dipendono dal metodo di pagamento.</p> : order.refundStatus === 'PENDING' ? <p>Rimborso in elaborazione: attendiamo l’esito di Stripe.</p> : order.productionStartedAt ? <p>La produzione è stata avviata. La consegna sarà organizzata da RUSH.</p> : order.expiresAt && <p>Se la produzione non parte entro il {new Date(order.expiresAt).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })}, riceverai il rimborso automatico.</p>}
        <p>La conferma sarà inviata all’indirizzo email dell’ordine.</p>
      </>}
      {!waiting && (error || order?.paymentStatus === 'PENDING') && <button className="button-primary" onClick={() => { setOrder(undefined); setError(''); setWaiting(true); setRevision(value => value + 1); }}>RICONTROLLA PAGAMENTO</button>}
      {order?.paymentStatus === 'FAILED' && <p><Link href="/presale">TORNA ALLA PRE-SALE</Link></p>}
      <p><Link className="button-primary" href="/">TORNA ALLA HOME</Link></p>
    </main>
  );
}
