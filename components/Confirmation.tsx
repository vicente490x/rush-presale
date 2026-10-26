'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type OrderState = {
  orderNumber: string;
  size: string;
  quantity: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  expiresAt: string | null;
  refundStatus: string;
  productionStartedAt: string | null;
};

export function Confirmation({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderState>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      if (!orderNumber) return setError('Numero ordine mancante.');
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Ordine non trovato.');
        if (!active) return;
        setOrder(data);
        if (data.paymentStatus === 'PENDING' && attempts++ < 20) timer = setTimeout(poll, 1500);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Ordine non disponibile.');
      }
    }
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [orderNumber]);

  return (
    <main className="confirm-card">
      {order?.refundStatus === 'REFUNDED' ? <><h1>ORDINE RIMBORSATO</h1><p>{order.orderNumber}</p><p>Il rimborso è stato confermato. I tempi di accredito dipendono dal metodo di pagamento.</p></> : order?.paymentStatus === 'PAID' ? (
        <>
          <div className="confirmation-tick" aria-hidden="true">✓</div>
          <p className="eyebrow">GRAZIE PER ESSERE PARTE DI RUSH</p>
          <h1>ORDINE<br />CONFERMATO</h1>
          <p className="order-code">{order.orderNumber}</p>
          <p>RUSH T-SHIRT · taglia {order.size} × {order.quantity}</p>
          {order.refundStatus === 'PENDING' ? <p>Rimborso in elaborazione: attendiamo l’esito di Stripe.</p> : order.productionStartedAt ? <p>La produzione è stata avviata. La consegna sarà organizzata da RUSH.</p> : order.expiresAt && <p>Se la produzione non parte entro il {new Date(order.expiresAt).toLocaleDateString('it-IT')}, riceverai il rimborso automatico.</p>}
          <p>La conferma arriverà all’indirizzo email usato per il pagamento.</p>
        </>
      ) : order?.paymentStatus === 'FAILED' ? (
        <><h1>PAGAMENTO NON COMPLETATO</h1><p>Non risulta un pagamento acquisito per questo ordine.</p><Link className="button-primary" href="/presale">TORNA ALLA PRE-SALE</Link></>
      ) : (
        <><p className="eyebrow">RUSH PRE-SALE</p><h1>{order ? 'PAGAMENTO IN ELABORAZIONE' : 'VERIFICA ORDINE'}</h1><p role="status">Stiamo verificando la conferma inviata da Stripe. Puoi lasciare aperta questa pagina.</p>{error && <p className="error-box" role="alert">{error}</p>}</>
      )}
      <p><Link href="/">TORNA ALLA HOME</Link></p>
    </main>
  );
}
