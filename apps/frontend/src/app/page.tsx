import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { HowItWorks } from '@/components/how-it-works';
import { ProductDeepDive } from '@/components/product-deep-dive';
import { SecuritySection } from '@/components/security-section';
import { UseCases } from '@/components/use-cases';
import { CTASection } from '@/components/cta-section';

export default function Home() {
  return (
    <main className="w-full bg-slate-950 selection:bg-blue-500/30">
      <Hero />
      <ProductDeepDive />
      <Features />
      <HowItWorks />
      <UseCases />
      <SecuritySection />
      <CTASection />
    </main>
  );
}

