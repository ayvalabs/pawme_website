'use client';

import { Navbar, ScrollProgress, StickyFooter } from './_components/Nav';
import { Hero, Features, HowItWorks, Nutrition, AppPreview, Trust, Faq, Download } from './_components/Sections';
import Footer from './_components/Footer';

export default function MarketingHome() {
  return (
    <div className="relative bg-parchment min-h-screen">
      <Navbar />
      <ScrollProgress />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Nutrition />
        <AppPreview />
        <Trust />
        <Faq />
        <Download />
      </main>
      <Footer />
      <StickyFooter />
    </div>
  );
}
