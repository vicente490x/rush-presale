import { Storefront } from '@/components/Storefront';
import { BrandFooter } from '@/components/BrandFooter';

export const metadata = {
  title: 'PRE-SALE RUSH T-SHIRT — RUSH',
  description: 'PRE-SALE della maglietta RUSH: scegli la taglia e sostieni la produzione.'
};

export default function PresalePage() {
  return (
    <div className="site-shell">
      <Storefront />
      <BrandFooter />
    </div>
  );
}
