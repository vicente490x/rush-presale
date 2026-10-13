import { HomeHero } from '@/components/HomeHero';
import { BrandFooter } from '@/components/BrandFooter';

export default function HomePage() {
  return (
    <div className="site-shell">
      <HomeHero />
      <BrandFooter />
    </div>
  );
}
