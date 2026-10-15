'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [scriptReady, setScriptReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const testMode = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_RUSH_TEST_MODE === '1';
  const handleReady = useCallback(() => setScriptReady(true), []);

  useEffect(() => {
    if (!scriptReady || !siteKey || !container.current || !window.turnstile) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      callback: onToken,
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken('')
    });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
    };
  }, [onToken, resetKey, scriptReady, siteKey]);

  if (testMode) {
    return <button type="button" className="turnstile-test" onClick={() => onToken('test-pass')}>VERIFICA ANTI-BOT (TEST)</button>;
  }
  if (!siteKey) return <p className="error-box">Configura Turnstile per abilitare il pagamento.</p>;
  return (
    <div className="turnstile-slot">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={handleReady} />
      <div ref={container} />
    </div>
  );
}
