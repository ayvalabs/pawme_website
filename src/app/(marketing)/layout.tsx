import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pawme.ayvalabs.com'),
  title: 'PawMe — AI Pet Health & Food Scanner for Dogs & Cats',
  description:
    'Scan any pet food for an instant A–F score, check gut health from a photo, and never miss a vaccine. The free AI pet-health app for dogs and cats.',
  keywords: [
    'pet food scanner', 'dog food grade', 'cat food checker', 'AI pet health',
    'pet gut health', 'vaccine reminder', 'pet passport', 'dog breed identifier',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'PawMe — AI Pet Health & Food Scanner for Dogs & Cats',
    description:
      'Scan any pet food for an instant A–F score, check gut health from a photo, and never miss a vaccine — free, for dogs and cats.',
    url: 'https://pawme.ayvalabs.com',
    siteName: 'PawMe',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PawMe — AI Pet Health & Food Scanner',
    description: 'Instant A–F food scores, gut-health checks and vaccine reminders. Free for dogs and cats.',
  },
  robots: { index: true, follow: true },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'PawMe',
  operatingSystem: 'iOS, Android',
  applicationCategory: 'HealthApplication',
  description:
    'Scan any pet food for an instant A–F score, check gut health from a photo, and never miss a vaccine. The free AI pet-health app for dogs and cats.',
  url: 'https://pawme.ayvalabs.com',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'Ayva Labs', url: 'https://www.ayvalabs.com' },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${inter.variable} font-inter bg-parchment text-obsidian antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {children}
    </div>
  );
}
