'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';
import styles from './RushShirt360.module.css';

// Replace the public asset and version its URL so existing visitors fetch the new model.
const modelSrc = '/assets/models/rush-oversized-shirt.glb?v=f32fdbc136cc4d1c';

export default function RushShirt360({ onPhotos }: { onPhotos: () => void }) {
  const [attempt, setAttempt] = useState(0);
  return <ShirtViewer key={attempt} src={attempt ? `${modelSrc}&retry=${attempt}` : modelSrc} onPhotos={onPhotos} onRetry={() => setAttempt(value => value + 1)} />;
}

function ShirtViewer({ src, onPhotos, onRetry }: { src: string; onPhotos: () => void; onRetry: () => void }) {
  const viewer = useRef<ModelViewerElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [failure, setFailure] = useState<'graphics' | 'load' | 'timeout'>('load');
  const [progress, setProgress] = useState(0);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    const element = viewer.current;
    if (!element) return;
    let disposed = false;
    let failed = false;
    const fail = (reason: 'graphics' | 'load' | 'timeout' = 'load') => {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timeout);
      element.autoRotate = false;
      setRotating(false);
      setFailure(reason);
      setState('error');
    };
    const timeout = window.setTimeout(() => fail('timeout'), 45000);
    const modelError = (event: Event) => {
      const type = (event as CustomEvent<{ type?: string }>).detail?.type;
      fail(type === 'webglcontextlost' ? 'graphics' : 'load');
    };
    const loaded = () => { if (!disposed && !failed) { window.clearTimeout(timeout); setState('ready'); } };
    const updateProgress = (event: Event) => {
      const value = (event as CustomEvent<{ totalProgress?: number }>).detail?.totalProgress;
      if (!disposed && !failed && typeof value === 'number' && Number.isFinite(value)) {
        setProgress(Math.round(Math.min(1, Math.max(0, value)) * 100));
      }
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => { element.autoRotate = false; setRotating(false); };
    const visibility = () => { if (document.hidden) stop(); };
    element.addEventListener('load', loaded);
    element.addEventListener('error', modelError);
    element.addEventListener('progress', updateProgress);
    reducedMotion.addEventListener('change', stop);
    document.addEventListener('visibilitychange', visibility);
    // The viewer library and GLB are fetched only after selecting this slide.
    Promise.resolve().then(async () => {
      if (disposed) return;
      const context = document.createElement('canvas').getContext('webgl2');
      if (!context) { fail('graphics'); return; }
      context.getExtension('WEBGL_lose_context')?.loseContext();
      await import('@google/model-viewer');
      if (disposed || failed) return;
      element.autoRotate = !reducedMotion.matches && !document.hidden;
      setRotating(element.autoRotate);
      if (element.loaded) loaded();
    }).catch(() => fail());
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      element.autoRotate = false;
      element.removeEventListener('load', loaded);
      element.removeEventListener('error', modelError);
      element.removeEventListener('progress', updateProgress);
      reducedMotion.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  function view(degrees: number) {
    const element = viewer.current;
    if (!element) return;
    element.autoRotate = false;
    setRotating(false);
    element.cameraOrbit = `${degrees}deg 82deg 105%`;
    element.cameraTarget = 'auto auto auto';
    element.fieldOfView = '30deg';
    element.resetTurntableRotation();
    element.jumpCameraToGoal();
  }

  return (
    <section className={styles.shell} aria-label="Maglietta RUSH in 3D" onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
      {state === 'error' ? (
        <div className={styles.fallback}>
          <Image src="/assets/mockup-fronte.png" alt="Maglietta RUSH, vista frontale" width={960} height={1440} sizes="(max-width: 800px) 100vw, 58vw" />
          <p role="status">{failure === 'graphics'
            ? 'Questo browser non rende disponibile la grafica 3D (WebGL). Le fotografie restano disponibili.'
            : failure === 'timeout'
              ? 'Il caricamento 3D sta impiegando troppo tempo. Controlla la connessione e riprova.'
              : 'Non è stato possibile caricare la vista 3D. Controlla la connessione e riprova.'}</p>
          {failure === 'graphics' && <p>Prova ad aprire la pagina direttamente in Safari o Chrome aggiornato. Alcune restrizioni del browser possono limitare la grafica 3D.</p>}
          <div className={styles.controls}>
            <button type="button" onClick={onRetry}>RIPROVA VISTA 3D</button>
            <button type="button" onClick={onPhotos}>TORNA ALLE FOTO</button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.topline}><span>RUSH / OBJECT 001</span><span>VISTA 360°</span></div>
          <div className={styles.stage}>
            <model-viewer ref={viewer} className={styles.model} src={src}
              alt="Maglietta RUSH tridimensionale. Trascina per ruotare, pizzica o scorri per ingrandire."
              camera-controls disable-pan touch-action="pan-y"
              camera-orbit="0deg 82deg 105%" min-camera-orbit="auto 45deg 45%" max-camera-orbit="auto 120deg 160%"
              field-of-view="30deg" environment-image="neutral" exposure="1.35"
              shadow-intensity="1.1" shadow-softness="0.85" rotation-per-second="18deg"
              interaction-prompt="none" loading="eager" reveal="auto" poster="/assets/mockup-fronte.png">
              <div slot="poster" className={styles.poster}>
                <Image src="/assets/mockup-fronte.png" alt="Anteprima fotografica della maglietta RUSH" fill sizes="(max-width: 800px) 100vw, 58vw" />
              </div>
              <div slot="progress-bar" />
            </model-viewer>
            {state === 'loading' && <div className={styles.loading} role="status">
              Caricamento 3D… {progress}%
              <progress max={100} value={progress} aria-label="Caricamento modello 3D" />
            </div>}
          </div>
          <div className={styles.controls} role="group" aria-label="Controlli modello 3D">
            <button type="button" disabled={state !== 'ready'} onClick={() => view(0)}>FRONTE</button>
            <button type="button" disabled={state !== 'ready'} onClick={() => view(180)}>RETRO</button>
            <button type="button" disabled={state !== 'ready'} aria-pressed={rotating} onClick={() => {
              if (!viewer.current) return;
              viewer.current.autoRotate = !rotating;
              setRotating(!rotating);
            }}>{rotating ? 'FERMA ROTAZIONE' : 'AVVIA ROTAZIONE'}</button>
            <button type="button" disabled={state !== 'ready'} onClick={() => view(0)}>RIPRISTINA</button>
          </div>
          <p className={styles.hint}>TRASCINA PER RUOTARE · PIZZICA O SCORRI PER LO ZOOM</p>
        </>
      )}
    </section>
  );
}
