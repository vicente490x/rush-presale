'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

const embers = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 47 + 9) % 100}%`,
  duration: `${6 + (index % 5) * 1.8}s`,
  delay: `${-(index % 7) * 1.1}s`,
  drift: `${(index % 2 ? 1 : -1) * (8 + index % 18)}px`
}));

export function HomeHero() {
  const reduceMotion = useReducedMotion();
  return (
    <main className="hero grain">
      <div className="hero-backdrop">
        <Image src="/assets/mockup-retro.png" alt="" fill sizes="100vw" />
      </div>
      <div className="hero-vignette" />
      <div className="ember-field" aria-hidden="true">
        {embers.map((ember, index) => (
          <i key={index} style={{
            left: ember.left,
            '--duration': ember.duration,
            '--delay': ember.delay,
            '--drift': ember.drift
          } as React.CSSProperties} />
        ))}
      </div>
      <motion.div
        className="hero-content"
        initial={false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <Image
          className="hero-logo"
          src="/assets/logo.png"
          alt="Logo rosso RUSH"
          width={720}
          height={360}
          priority
          sizes="(max-width: 760px) 74vw, 590px"
        />
        <p className="hero-title">LICK ME HARD. LICK ME RUSH.</p>
        <motion.div whileHover={reduceMotion ? undefined : { scale: 1.05 }} whileTap={{ scale: 0.97 }}>
          <Link className="hero-cta" href="/presale">PRE-SALE</Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
