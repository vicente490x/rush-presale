'use client';

import Image from 'next/image';
import { createElement, useEffect, useRef, useState } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';

export default function RushShirt3D({ onPhotos }: { onPhotos: () => void }) {
  const [attempt, setAttempt] = useState(0);
  return <ShirtViewer key={attempt} onPhotos={onPhotos} onRetry={() => setAttempt(value => value + 1)} />;
}

function ShirtViewer({ onPhotos, onRetry }: { onPhotos: () => void; onRetry: () => void }) {
  const viewer = useRef<ModelViewerElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [failure, setFailure] = useState<'graphics' | 'load' | 'timeout'>('load');
  const [progress, setProgress] = useState(0);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    const element = viewer.current;
    if (!element) return;
    let disposed = false;
    const fail = (reason: 'graphics' | 'load' | 'timeout' = 'load') => {
      if (disposed) return;
      window.clearTimeout(timeout);
      setFailure(reason);
      setState('error');
    };
    const timeout = window.setTimeout(() => fail('timeout'), 45000);
    const modelError = (event: Event) => {
      const type = (event as CustomEvent<{ type?: string }>).detail?.type;
      fail(type === 'webglcontextlost' ? 'graphics' : 'load');
    };
    const loaded = () => { window.clearTimeout(timeout); setState('ready'); };
    const updateProgress = (event: Event) => setProgress(Math.round((event as CustomEvent<{ totalProgress: number }>).detail.totalProgress * 100));
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
      if (disposed) return;
      element.autoRotate = !reducedMotion.matches;
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
    element.cameraOrbit = `${degrees}deg 78deg 105%`;
    element.cameraTarget = 'auto auto auto';
    element.fieldOfView = '32deg';
    element.resetTurntableRotation();
    element.jumpCameraToGoal();
  }

  return (
    <section className="shirt-viewer" aria-label="Maglietta RUSH in 3D" onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
      {state === 'error' ? (
        <div className="shirt-viewer-fallback">
          <Image src="/assets/mockup-fronte.png" alt="Maglietta RUSH, vista frontale" width={960} height={1440} sizes="(max-width: 800px) 100vw, 58vw" />
          <p role="status">{failure === 'graphics'
            ? 'Questo browser non rende disponibile la grafica 3D (WebGL). Le fotografie restano disponibili.'
            : failure === 'timeout'
              ? 'Il caricamento 3D sta impiegando troppo tempo. Controlla la connessione e riprova.'
              : 'Non è stato possibile caricare la vista 3D. Controlla la connessione e riprova.'}</p>
          {failure === 'graphics' && <p>Prova ad aprire la pagina direttamente in Safari o Chrome aggiornato. Alcune restrizioni del browser possono limitare la grafica 3D.</p>}
          <button type="button" onClick={onRetry}>RIPROVA VISTA 3D</button>
          <button type="button" onClick={onPhotos}>TORNA ALLE FOTO</button>
        </div>
      ) : (
        <>
          {createElement('model-viewer', {
            ref: viewer, src: '/assets/models/rush-oversized-shirt.glb',
            alt: 'Maglietta RUSH tridimensionale. Trascina per ruotare, pizzica o scorri per ingrandire.',
            'camera-controls': '', 'disable-pan': '', 'touch-action': 'pan-y',
            'camera-orbit': '0deg 78deg 105%', 'min-camera-orbit': 'auto 25deg 2m', 'max-camera-orbit': 'auto 150deg 12m',
            'field-of-view': '32deg', 'environment-image': 'neutral', exposure: '1.35', 'shadow-intensity': '1',
            'interaction-prompt': 'none', loading: 'eager', reveal: 'auto',
            poster: '/assets/mockup-fronte.png',
            children: state === 'loading' ? createElement('div', { slot: 'progress-bar', className: 'shirt-viewer-loading', role: 'status' },
              'Caricamento 3D… ', createElement('progress', { max: 100, value: progress, 'aria-label': 'Caricamento modello 3D' })) : null
          })}
          <div className="shirt-viewer-controls" role="group" aria-label="Controlli modello 3D">
            <button type="button" disabled={state !== 'ready'} onClick={() => view(0)}>FRONTE</button>
            <button type="button" disabled={state !== 'ready'} onClick={() => view(180)}>RETRO</button>
            <button type="button" disabled={state !== 'ready'} aria-pressed={rotating} onClick={() => {
              if (!viewer.current) return;
              viewer.current.autoRotate = !rotating;
              setRotating(!rotating);
            }}>{rotating ? 'FERMA ROTAZIONE' : 'AVVIA ROTAZIONE'}</button>
            <button type="button" disabled={state !== 'ready'} onClick={() => view(0)}>RIPRISTINA</button>
          </div>
          <p className="gallery-caption">TRASCINA PER RUOTARE · PIZZICA O SCORRI PER LO ZOOM</p>
        </>
      )}
    </section>
  );
}
