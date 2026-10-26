'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string; size: 'flexible'; language: 'it';
        callback: (token: string) => void;
        'expired-callback': () => void; 'error-callback': () => boolean;
        'timeout-callback': () => void; 'unsupported-callback': () => void;
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type ChallengeStatus = 'loading' | 'slow' | 'ready' | 'expired' | 'error' | 'unsupported' | 'script-error';

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<ChallengeStatus>('loading');
  const [retry, setRetry] = useState(0);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const handleReady = useCallback(() => setScriptReady(true), []);

  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setStatus(value => value === 'loading' ? 'slow' : value);
    }, 15_000);
    const invalidate = (next: ChallengeStatus) => {
      if (!active) return;
      window.clearTimeout(timer);
      onToken('');
      setStatus(next);
    };
    if (scriptReady && container.current && window.turnstile) {
      try {
        widget.current = window.turnstile.render(container.current, {
          sitekey: siteKey,
          size: 'flexible', language: 'it',
          callback: token => {
            if (!active) return;
            window.clearTimeout(timer);
            onToken(token);
            setStatus('ready');
          },
          'expired-callback': () => invalidate('expired'),
          'timeout-callback': () => invalidate('expired'),
          'unsupported-callback': () => invalidate('unsupported'),
          'error-callback': () => { invalidate('error'); return true; }
        });
      } catch { invalidate('error'); }
    }
    return () => {
      active = false;
      window.clearTimeout(timer);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [onToken, retry, scriptReady, siteKey]);

  function retryChallenge() {
    onToken('');
    setStatus('loading');
    if (!scriptReady || status === 'script-error') {
      window.location.reload();
      return;
    }
    setRetry(value => value + 1);
  }

  if (!siteKey) return <p className="error-box" role="alert">La verifica di sicurezza non è disponibile. Riprova più tardi.</p>;
  return (
    <div className="turnstile-slot">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={handleReady} onError={() => { onToken(''); setStatus('script-error'); }} />
      <div ref={container} />
      <p className="fine-print" role="status" aria-live="polite">
        {status === 'ready' ? 'Verifica completata. Puoi proseguire con il pagamento.' : status === 'expired'
          ? 'La verifica è scaduta. Completala di nuovo per continuare.' : status === 'loading'
            ? 'Verifica di sicurezza in corso…' : 'La verifica di sicurezza non è stata completata.'}
      </p>
      {status !== 'loading' && status !== 'ready' && (
        <div className="challenge-help">
          <p>Se la verifica resta bloccata, apri questa pagina direttamente in Safari o Chrome aggiornato. Le restrizioni del browser, inclusa la modalità Isolamento, possono impedire il controllo.</p>
          <button type="button" className="challenge-retry" onClick={retryChallenge}>{!scriptReady || status === 'script-error' ? 'Ricarica pagina' : 'Riprova verifica'}</button>
        </div>
      )}
      <noscript><p className="error-box">Per la verifica di sicurezza e il pagamento è necessario JavaScript.</p></noscript>
    </div>
  );
}
