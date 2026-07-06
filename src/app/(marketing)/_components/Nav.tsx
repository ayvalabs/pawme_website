'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IOS_URL } from './AppStoreButtons';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Nutrition', href: '#nutrition' },
  { label: 'Download', href: '#download' },
];

function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/marketing/paw.webp" alt="PawMe" className={`${className} object-contain`} />;
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass border-b border-sage/5 shadow-sm' : 'bg-transparent'}`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 lg:h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <Logo className="w-9 h-9" />
            <span className="font-playfair font-bold text-xl text-obsidian">PawMe</span>
          </a>

          <div className="hidden lg:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-inter font-medium text-obsidian/60 hover:text-sage transition-colors duration-300 tracking-wide">
                {link.label}
              </a>
            ))}
          </div>

          <a href="#download" className="hidden lg:inline-block px-5 py-2.5 bg-sage text-parchment text-sm font-inter font-semibold rounded-full hover:bg-sage/90 transition-all duration-300">
            Get the App
          </a>

          <button onClick={() => setMenuOpen(true)} className="lg:hidden w-10 h-10 flex items-center justify-center" aria-label="Open menu">
            <svg className="w-5 h-5 text-obsidian" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div className="fixed inset-0 z-[60] flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="absolute inset-0 bg-parchment/95 backdrop-blur-xl" />
            <button onClick={() => setMenuOpen(false)} className="absolute top-5 right-6 w-10 h-10 flex items-center justify-center z-10" aria-label="Close menu">
              <svg className="w-6 h-6 text-obsidian" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </button>
            <div className="relative z-10 flex flex-col items-center gap-8">
              {NAV_LINKS.map((link, i) => (
                <motion.a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="font-playfair text-4xl md:text-5xl font-bold text-obsidian hover:text-sage transition-colors" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
                  {link.label}
                </motion.a>
              ))}
              <motion.a href="#download" onClick={() => setMenuOpen(false)} className="mt-4 px-8 py-3 bg-sage text-parchment font-inter font-semibold rounded-full text-lg" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
                Download PawMe
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-2">
      <span className="text-[10px] font-inter font-semibold text-sage tracking-wider rotate-180" style={{ writingMode: 'vertical-rl' }}>VITALITY</span>
      <div className="w-[2px] h-32 bg-sage/10 rounded-full overflow-hidden relative">
        <div className="absolute bottom-0 left-0 w-full rounded-full transition-[height] duration-100" style={{ height: `${progress}%`, background: 'linear-gradient(to top, #F47B5A, #E56A48)' }} />
      </div>
      <span className="text-[10px] font-inter font-bold text-coral">{Math.round(progress)}%</span>
    </div>
  );
}

export function StickyFooter() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-sage/10 shadow-lg lg:hidden" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo className="w-7 h-7" />
              <span className="font-playfair font-bold text-sm text-obsidian">PawMe</span>
            </div>
            <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className="px-5 py-2 bg-sage text-parchment text-xs font-inter font-semibold rounded-full animate-pulse-glow">Get the App</a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
