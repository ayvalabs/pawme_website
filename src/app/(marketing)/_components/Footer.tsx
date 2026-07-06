type FooterLink = { label: string; href: string; external?: boolean };
const FOOTER_LINKS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Download', href: '#download' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Ayva Labs', href: 'https://www.ayvalabs.com/', external: true },
      { label: 'Privacy Policy', href: 'https://www.ayvalabs.com/privacy', external: true },
      { label: 'Terms of Use', href: 'https://www.ayvalabs.com/terms', external: true },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Us', href: 'mailto:support@ayvalabs.com', external: true },
      { label: 'App Store', href: 'https://apps.apple.com/hk/app/pawme-pet-health-food-ai/id6758856073?l=en-GB', external: true },
      { label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=ai.ayvalabs.pawme', external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-obsidian text-parchment/80 pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-14">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marketing/paw.webp" alt="PawMe" className="w-9 h-9 object-contain" />
              <span className="font-playfair font-bold text-xl text-parchment">PawMe</span>
            </div>
            <p className="text-sm text-parchment/40 font-inter leading-relaxed max-w-xs">
              The AI co-pilot for modern pet parents. Scan food, check health, and care smarter — all in one calm, beautiful app.
            </p>
          </div>
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-inter font-semibold tracking-[0.15em] text-parchment/30 uppercase mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="text-sm text-parchment/50 font-inter hover:text-parchment transition-colors duration-300">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-parchment/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-parchment/25 font-inter">© 2026 Ayva Labs Limited. All rights reserved.</span>
          <span className="text-xs text-parchment/25 font-inter">Made with care for pets everywhere.</span>
        </div>
      </div>
    </footer>
  );
}
