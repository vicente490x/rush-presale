'use client';

import { FormEvent, useCallback, useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Turnstile } from '@/components/Turnstile';

export function AdminLogin() {
  const [token, setToken] = useState('');
  const [challengeReset, setChallengeReset] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [localDevelopment, setLocalDevelopment] = useState(false);
  const router = useRouter();
  const onToken = useCallback((value: string) => setToken(value), []);

  useEffect(() => {
    setLocalDevelopment(
      process.env.NODE_ENV !== 'production' &&
      !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    );
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get('password');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, turnstileToken: localDevelopment ? 'local-development' : token })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Accesso non riuscito.');
      router.replace('/admin');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Accesso non riuscito.');
      setToken('');
    } finally {
      setBusy(false);
      setToken('');
      setChallengeReset((value) => value + 1);
    }
  }

  return (
    <main className="confirm-card admin-login">
      <a href="/" aria-label="Torna a RUSH">RUSH</a>
      <p className="eyebrow">AREA RISERVATA</p>
      <h1>ADMIN</h1>
      <form onSubmit={submit} className="order-form">
        <label className="field-label" htmlFor="admin-password">Password</label>
        <input className="form-control" id="admin-password" name="password" type="password" autoComplete="current-password" required />
        {localDevelopment
          ? <p className="fine-print">Accesso locale di sviluppo: la verifica anti-bot esterna non è richiesta.</p>
          : <Turnstile onToken={onToken} resetKey={challengeReset} />}
        <button className="button-primary" disabled={busy || (!localDevelopment && !token)}>{busy ? 'VERIFICA…' : 'ACCEDI'}</button>
        <p role="alert" className="error-box">{error}</p>
      </form>
    </main>
  );
}
