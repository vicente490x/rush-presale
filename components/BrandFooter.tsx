import Link from 'next/link';

export function BrandFooter() {
  return (
    <>
      <div className="marquee" aria-label="LICK ME HARD. LICK ME RUSH.">
        <div className="marquee-track" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index}>LICK ME HARD. LICK ME RUSH. &nbsp; ✳ &nbsp; RUSH PRE-SALE &nbsp; ✳ &nbsp;</span>
          ))}
        </div>
      </div>
      <footer className="site-footer">
        <strong>LICK ME HARD. LICK ME RUSH.</strong>
        <nav aria-label="Link legali">
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookie">Cookie</Link>
          <Link href="/termini">Termini</Link>
          <Link href="/rimborsi">PRE-SALE e rimborsi</Link>
        </nav>
      </footer>
    </>
  );
}
