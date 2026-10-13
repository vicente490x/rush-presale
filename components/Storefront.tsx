'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ImageGallery } from '@/components/ImageGallery';
import { ScrollReveal } from '@/components/ScrollReveal';
import { TryOn } from '@/components/TryOn';
import { Turnstile } from '@/components/Turnstile';

type SaleStatus = {
  total: number;
  threshold: number;
  missing: number;
  thresholdReached: boolean;
  open: boolean;
  priceCents: number;
  maxQty: number;
  sizes: string[];
  tryOn: boolean;
};

function euro(cents: number) {
  return `${(cents / 100).toFixed(cents % 100 ? 2 : 0).replace('.', ',')}€`;
}

export function Storefront() {
  const [sale, setSale] = useState<SaleStatus>();
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('M');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [challengeReset, setChallengeReset] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onToken = useCallback((token: string) => setTurnstileToken(token), []);

  const load = useCallback(async () => {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Impossibile caricare lo stato PRE-SALE.');
    setSale(result as SaleStatus);
  }, []);

  useEffect(() => {
    load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Stato PRE-SALE non disponibile.'));
    const interval = window.setInterval(() => {
      load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Stato PRE-SALE non disponibile.'));
    }, 15_000);
    const querySize = new URLSearchParams(window.location.search).get('size');
    if (querySize && ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(querySize)) setSize(querySize);
    if (new URLSearchParams(window.location.search).has('annullato')) setError('Pagamento annullato. Puoi riprovare quando vuoi.');
    return () => window.clearInterval(interval);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sale?.open) return setError('La PRE-SALE è chiusa.');
    if (!turnstileToken) return setError('Completa la verifica anti-bot.');
    setError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          email: form.get('email'),
          size,
          quantity,
          terms: form.get('terms') === 'on',
          turnstileToken,
          website: form.get('website')
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Checkout non disponibile.');
      if (typeof result.checkoutUrl !== 'string') throw new Error('Stripe non ha restituito un link di pagamento.');
      window.location.assign(result.checkoutUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pagamento non avviato. Riprova.');
      setTurnstileToken('');
      await load().catch(() => undefined);
    } finally {
      setSubmitting(false);
      setTurnstileToken('');
      setChallengeReset((value) => value + 1);
    }
  }

  const threshold = sale?.threshold ?? 15;
  const total = sale?.total ?? 0;
  const progress = Math.min(100, total / threshold * 100);

  return (
    <>
      <header className="topbar">
        <Link href="/" aria-label="RUSH, torna alla home"><Image src="/assets/logo.png" alt="Logo RUSH" width={180} height={90} priority /></Link>
        <Link href="/">TORNA ALLA HOME</Link>
      </header>
      <main className="page-wrap">
        <div className="product-grid">
          <ScrollReveal><ImageGallery /></ScrollReveal>
          <ScrollReveal className="product-copy">
            <div className="eyebrow">EDIZIONE RUSH · PRE-SALE</div>
            <h1>RUSH<br />T-SHIRT</h1>
            <p className="price">{euro(sale?.priceCents ?? 2500)}</p>

            <section className="counter-card" aria-live="polite">
              <div className="counter-numbers"><span>{total}</span> / {threshold} <small>PEZZI PRENOTATI</small></div>
              <div className="progress-track" aria-label={`${Math.round(progress)}% della soglia raggiunto`}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="counter-message">
                {sale?.thresholdReached
                  ? '✓ SOGLIA RAGGIUNTA — la produzione può partire. La PRE-SALE resta aperta.'
                  : `${sale?.missing ?? threshold} ${sale?.missing === 1 ? 'pezzo mancante' : 'pezzi mancanti'} alla soglia minima di produzione.`}
              </p>
            </section>

            <form id="order" className="order-form" onSubmit={submit}>
              <div>
                <span className="field-label">Taglia</span>
                <div className="size-options" role="group" aria-label="Scegli la taglia">
                  {(sale?.sizes ?? ['XS', 'S', 'M', 'L', 'XL', 'XXL']).map((item) => (
                    <button key={item} type="button" aria-pressed={size === item} onClick={() => setSize(item)}>{item}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="field-label">Quantità</span>
                <div className="qty-control">
                  <button type="button" aria-label="Diminuisci quantità" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                  <output aria-live="polite">{quantity}</output>
                  <button type="button" aria-label="Aumenta quantità" onClick={() => setQuantity((value) => Math.min(sale?.maxQty ?? 5, value + 1))}>+</button>
                </div>
              </div>
              <div className="name-fields">
                <input className="form-control" name="firstName" autoComplete="given-name" placeholder="Nome" aria-label="Nome" maxLength={60} required />
                <input className="form-control" name="lastName" autoComplete="family-name" placeholder="Cognome" aria-label="Cognome" maxLength={60} required />
              </div>
              <input className="form-control" name="email" type="email" autoComplete="email" placeholder="Email" aria-label="Email" maxLength={120} required />
              <input className="sr-only" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

              <section className="presale-terms">
                <h2>ATTENZIONE — PRE-SALE</h2>
                <p>Questa maglietta viene prodotta esclusivamente al raggiungimento di un minimo di 15 pezzi pre-ordinati.</p>
                <p>La maglietta non è quindi immediatamente disponibile. Una volta raggiunta la soglia minima, la produzione potrà essere avviata.</p>
                <p>La consegna avverrà durante una serata Rush oppure tramite uno dei nostri PR di fiducia.</p>
                <p>Qualora la produzione non venga avviata entro 2 mesi dalla data del pagamento, l&apos;importo dell&apos;ordine verrà automaticamente rimborsato.</p>
                <label className="check-row">
                  <input type="checkbox" name="terms" required />
                  <span>Ho letto e accetto le condizioni della PRE-SALE e i <Link href="/termini">termini e condizioni</Link>.</span>
                </label>
              </section>

              <div className="total-row"><span>Totale</span><strong>{euro((sale?.priceCents ?? 2500) * quantity)}</strong></div>
              {sale?.open === false ? (
                <div className="status-closed" role="status">PRE-SALE CHIUSA</div>
              ) : (
                <>
                  <Turnstile onToken={onToken} resetKey={challengeReset} />
                  <button className="button-primary" type="submit" disabled={submitting || !turnstileToken}>
                    {submitting ? 'COLLEGAMENTO A STRIPE…' : 'PRE-SALE'}
                  </button>
                </>
              )}
              <p className="error-box" role="alert">{error}</p>
              <p className="fine-print">Pagamento sicuro tramite Stripe. I dati della carta non transitano né vengono conservati su RUSH.</p>
            </form>
          </ScrollReveal>
        </div>

        <section className="how-grid" aria-label="Come funziona la PRE-SALE">
          {[
            ['01', 'Prenota', '25€ a maglietta. Scegli taglia e quantità.'],
            ['02', 'Soglia 15', 'Raggiunta la soglia la produzione può partire. La PRE-SALE resta aperta.'],
            ['03', 'Produzione', 'Lo stato viene aggiornato dall’amministratore.'],
            ['04', 'Consegna', 'Durante una serata RUSH o tramite uno dei PR di fiducia.']
          ].map(([index, title, text]) => (
            <ScrollReveal key={index} className="how-step">
              <div className="how-index">{index} / COME FUNZIONA</div><b>{title}</b><span>{text}</span>
            </ScrollReveal>
          ))}
        </section>

        {sale?.tryOn && <TryOn selectedSize={size} />}
      </main>
    </>
  );
}
