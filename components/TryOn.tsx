'use client';


import Link from 'next/link';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { Turnstile } from '@/components/Turnstile';

export function TryOn({ selectedSize }: { selectedSize: string }) {
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState('');
  const [resultExpiresAt, setResultExpiresAt] = useState<number>();
  const [token, setToken] = useState('');
  const [challengeReset, setChallengeReset] = useState(0);
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [split, setSplit] = useState(50);
  const onToken = useCallback((value: string) => setToken(value), []);

  useEffect(() => () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!result || resultExpiresAt === undefined) return;
    const timeout = window.setTimeout(() => {
      setResult('');
      setResultExpiresAt(undefined);
      setPhoto(undefined);
      setPreview('');
      setError('L’anteprima è scaduta ed è stata rimossa. Puoi generarne una nuova.');
    }, Math.max(0, resultExpiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [result, resultExpiresAt]);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError('');
    setResult('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError('Scegli una foto JPG, PNG o WEBP da massimo 8 MB.');
      event.target.value = '';
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function generate() {
    if (!photo || !consent || !adult || !token) {
      setError('Carica una foto, conferma consenso e maggiore età, poi completa la verifica anti-bot.');
      return;
    }
    setBusy(true);
    setError('');
    const body = new FormData();
    body.set('photo', photo);
    body.set('consent', 'true');
    body.set('adult', 'true');
    body.set('turnstileToken', token);
    try {
      const response = await fetch('/api/tryon', { method: 'POST', body, cache: 'no-store' });
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object') throw new Error('Risposta del servizio non valida.');
      const payload = data as { error?: unknown; imageDataUrl?: unknown; expiresAt?: unknown };
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Generazione non riuscita.');
      if (typeof payload.imageDataUrl !== 'string' || !payload.imageDataUrl.startsWith('data:image/webp;base64,') || typeof payload.expiresAt !== 'string') {
        throw new Error('Risposta del servizio non valida.');
      }
      const expiresAt = Date.parse(payload.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('Anteprima scaduta. Generane una nuova.');
      setResult(payload.imageDataUrl);
      setResultExpiresAt(expiresAt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Generazione non riuscita.');
    } finally {
      setBusy(false);
      setToken('');
      setChallengeReset((value) => value + 1);
    }
  }

  function retry() {
    setResult('');
    setResultExpiresAt(undefined);
    setError('');
    setPhoto(undefined);
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview('');
  }

  async function share() {
    if (!result) return;
    try {
      if (navigator.share) {
        const response = await fetch(result);
        const file = new File([await response.blob()], 'rush-tryon.webp', { type: 'image/webp' });
        if (!navigator.canShare?.({ files: [file] })) {
          setError('Condivisione non supportata su questo dispositivo. Puoi scaricare l’anteprima.');
          return;
        }
        await navigator.share({ title: 'RUSH virtual try-on', files: [file] });
      } else {
        setError('Condivisione non supportata su questo dispositivo. Puoi scaricare l’anteprima.');
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError') setError('Condivisione non disponibile su questo dispositivo.');
    }
  }

  return (
    <section className="tryon-section" aria-labelledby="tryon-heading">
      <h2 id="tryon-heading">PROVALA ADDOSSO</h2>
      <p>Carica una foto frontale, con il busto visibile e una buona illuminazione. Inquadra il busto nell’area tratteggiata.</p>
      <p className="fine-print">La foto viene elaborata dal provider AI solo per generare l’anteprima e rimossa dal nostro storage al termine. Il risultato resta nella memoria della pagina; ricaricando o chiudendo la scheda viene perso. <Link href="/privacy">Leggi l’informativa privacy</Link>.</p>
      {!result && (
        <div className="tryon-form">
          <label className="upload-label">
            SCEGLI UNA FOTO
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={selectPhoto} />
          </label>
          {preview && (
            <div className="photo-guide">
              {/* The frame gives the user a simple torso-alignment crop guide. */}
              <img src={preview} alt="Anteprima della foto caricata" />
              <div className="photo-guide-frame" aria-hidden="true" />
            </div>
          )}
          <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Ho almeno 18 anni e acconsento all’invio temporaneo della foto a fal.ai/FASHN per generare questa anteprima. Ho letto l’informativa privacy sulle modalità di trattamento del provider.</span></label>
          <label className="check-row"><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} /><span>Confermo di essere maggiorenne.</span></label>
          <Turnstile onToken={onToken} resetKey={challengeReset} />
          <button className="button-primary" type="button" onClick={generate} disabled={busy || !photo || !consent || !adult || !token}>
            {busy ? 'RUSH STA PREPARANDO LA TUA ANTEPRIMA…' : 'PROVA LA T-SHIRT'}
          </button>
        </div>
      )}
      {busy && <p role="status">Elaborazione in corso. Non chiudere questa pagina.</p>}
      {result && preview && (
        <>
          <div className="compare-slider">
            <img src={result} alt="Anteprima AI con la maglietta RUSH indossata" />
            <div className="compare-before" style={{ width: `${split}%` }}>
              <img src={preview} alt="Foto originale caricata" />
            </div>
            <input aria-label="Confronta foto originale e anteprima" type="range" min="0" max="100" value={split} onChange={(event) => setSplit(Number(event.target.value))} />
          </div>
          <p className="fine-print">Anteprima generata dall’AI, indicativa. Vestibilità e colori reali possono differire.</p>
          <div className="tryon-actions">
            <button type="button" onClick={retry}>PROVA UN’ALTRA FOTO</button>
            <a href={result} download="rush-tryon.webp">SCARICA</a>
            <button type="button" onClick={share}>CONDIVIDI</button>
            <Link className="button-primary" href={`/presale?size=${encodeURIComponent(selectedSize)}#order`}>PRE-SALE · TAGLIA {selectedSize}</Link>
          </div>
        </>
      )}
      {error && <p className="error-box" role="alert">{error}</p>}
    </section>
  );
}
