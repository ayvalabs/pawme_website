import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/hero-section';
import { FeaturesSection } from '@/components/features-section';
import { AiDemoSection } from '@/components/ai-demo-section';
import { KickstarterWaitlist } from '@/components/kickstarter-waitlist';
import { ChatWidget } from '@/components/chat-widget';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <AiDemoSection />
      </main>
      <Footer />
      <KickstarterWaitlist />
      <ChatWidget />
    </div>
  );
}
