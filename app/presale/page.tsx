import { Storefront } from '@/components/Storefront';
import { BrandFooter } from '@/components/BrandFooter';

export const metadata = {
  title: 'PRE-SALE RUSH T-SHIRT — RUSH',
  description: 'Prenota la maglietta RUSH: 25€, scegli la taglia e sostieni la produzione.'
};

export default function PresalePage() {
  return (
    <div className="site-shell">
      <Storefront />
      <BrandFooter />
    </div>
  );
}
