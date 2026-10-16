'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
export function StagingLogin() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const password = new FormData(event.currentTarget).get('password');
    try {
      const response = await fetch('/api/staging/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.replace('/'); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Accesso non disponibile.'); } finally { setBusy(false); }
  }
  return <main className="confirm-card"><p className="eyebrow">RUSH · ANTEPRIMA RISERVATA</p><h1>PRE-SALE</h1><p>Pagamenti esclusivamente di test.</p><form className="order-form" onSubmit={submit}><label htmlFor="preview-password">Password anteprima</label><input className="form-control" id="preview-password" name="password" type="password" autoComplete="current-password" required maxLength={200} /><button className="button-primary" disabled={busy}>{busy ? 'VERIFICA…' : 'ENTRA'}</button>{error && <p role="alert" className="error-box">{error}</p>}</form></main>;
}
