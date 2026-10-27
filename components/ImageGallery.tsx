'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const images = [
  { src: '/assets/mockup-fronte.png', alt: 'Maglietta RUSH vista frontale durante uno shooting notturno in un campo in fiamme.' },
  { src: '/assets/mockup-retro.png', alt: 'Maglietta RUSH vista da dietro, con la R rossa effetto gelatina e la scritta LICK ME HARD. LICK ME RUSH.' },
  { src: '/assets/mockup-retro.png', alt: 'Dettaglio ravvicinato della stampa R rossa effetto gelatina sul retro della maglietta RUSH.', detail: true }
];

const RushShirt3D = dynamic(() => import('./RushShirt3D'), {
  ssr: false, loading: () => <p className="shirt-viewer-loading" role="status">Caricamento vista 3D…</p>
});

export function ImageGallery() {
  const dialog = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number>();
  const is3D = selected === images.length;
  useEffect(() => { if (zoomed) dialog.current?.showModal(); }, [zoomed]);

  return (
    <div className="gallery">
      <div
        className="gallery-main"
        onTouchStart={(event) => { if (!is3D) setTouchStart(event.touches[0]?.clientX); }}
        onTouchEnd={(event) => {
          if (is3D || touchStart === undefined) return;
          const delta = event.changedTouches[0]?.clientX - touchStart;
          if (delta > 45) setSelected((current) => Math.max(0, current - 1));
          if (delta < -45) setSelected((current) => Math.min(images.length, current + 1));
          setTouchStart(undefined);
        }}
      >
        {is3D ? <RushShirt3D onPhotos={() => setSelected(0)} /> : <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={`Ingrandisci immagine ${selected === 0 ? 'frontale' : selected === 1 ? 'posteriore' : 'dettaglio della stampa'}`}
          style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'zoom-in' }}
        >
          <motion.div
            className={images[selected].detail ? 'gallery-image-detail' : undefined}
            key={selected}
            initial={reduceMotion ? false : { opacity: 0, rotateY: selected === 0 ? -16 : 16 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Image
              src={images[selected].src}
              alt={images[selected].alt}
              width={960}
              height={1440}
              priority={selected === 0}
              loading={selected === 0 ? 'eager' : 'lazy'}
              sizes="(max-width: 800px) 100vw, 58vw"
            />
          </motion.div>
        </button>}
      </div>
      <div className="gallery-controls" aria-label="Seleziona immagine">
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            aria-label={`Mostra ${index === 0 ? 'vista frontale' : index === 1 ? 'vista posteriore' : 'dettaglio della stampa'}`}
            aria-current={selected === index}
            onClick={() => setSelected(index)}
          />
        ))}
        <button type="button" className="gallery-3d-button" aria-label="Mostra modello 3D" aria-current={is3D} onClick={() => setSelected(images.length)}>3D</button>
      </div>
      <p className="gallery-caption">{is3D ? 'VISTA 3D INTERATTIVA' : `${selected === 0 ? 'VISTA FRONTALE' : selected === 1 ? 'VISTA POSTERIORE' : 'DETTAGLIO STAMPA'} · TOCCA PER INGRANDIRE`}</p>
      {zoomed && !is3D && (
        <dialog
          ref={dialog}
          onCancel={() => setZoomed(false)}
          aria-modal="true"
          aria-label="Immagine ingrandita della maglietta"
          onClick={() => setZoomed(false)}
          style={{ position: 'fixed', zIndex: 1100, inset: 0, width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh', margin: 0, border: 0, display: 'grid', placeItems: 'center', padding: 14, background: 'rgba(0,0,0,.94)', cursor: 'zoom-out' }}
        >
          <button type="button" onClick={() => setZoomed(false)} aria-label="Chiudi ingrandimento" style={{ position: 'absolute', top: 20, right: 22, border: 0, background: 'transparent', color: 'white', fontSize: 30 }}>×</button>
          <Image src={images[selected].src} alt={images[selected].alt} width={1200} height={1800} sizes="100vw" style={{ width: 'auto', maxWidth: '100%', height: 'auto', maxHeight: '94vh', objectFit: 'contain' }} />
        </dialog>
      )}
    </div>
  );
}
