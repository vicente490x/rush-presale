'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function MockCheckoutContent() {
  const sessionId = useSearchParams().get('session');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function completePayment() {
    if (!sessionId) return setError('Sessione di test non valida.');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/mock-checkout/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Pagamento di test non riuscito.');
      window.location.assign(`/conferma?code=${encodeURIComponent(new URLSearchParams(window.location.search).get('code') ?? '')}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pagamento di test non riuscito.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="confirm-card">
      <p className="eyebrow">AMBIENTE LOCALE · NESSUN ADDEBITO</p>
      <h1>Checkout di test</h1>
      <p>Completa il pagamento simulato per verificare il webhook firmato localmente.</p>
      {error && <p className="error-box" role="alert">{error}</p>}
      <button className="button-primary" disabled={busy || !sessionId} onClick={completePayment}>
        {busy ? 'VERIFICA…' : 'COMPLETA PAGAMENTO TEST'}
      </button>
    </main>
  );
}

export default function MockCheckoutPage() {
  return <Suspense fallback={<main className="confirm-card">Caricamento checkout…</main>}><MockCheckoutContent /></Suspense>;
}
