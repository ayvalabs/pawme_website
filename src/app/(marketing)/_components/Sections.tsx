'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useInView from './useInView';
import AppStoreButtons from './AppStoreButtons';

const EASE = [0.22, 1, 0.36, 1] as const;

// ── inline icons (stroke, currentColor) ──────────────────────────────────────
type IconProps = { className?: string };
const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const CameraIcon = (p: IconProps) => <Icon {...p} d="M3 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z|M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />;
const HeartIcon = (p: IconProps) => <Icon {...p} d="M12 21s-7-4.35-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.65 12 21 12 21z" />;
const StethIcon = (p: IconProps) => <Icon {...p} d="M6 3v6a4 4 0 0 0 8 0V3|M10 15v2a4 4 0 0 0 8 0v-2|M18 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />;
const ShieldIcon = (p: IconProps) => <Icon {...p} d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z|M9 12l2 2 4-4" />;
const BookIcon = (p: IconProps) => <Icon {...p} d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z|M4 19a2 2 0 0 1 2-2h12" />;
const PinIcon = (p: IconProps) => <Icon {...p} d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z|M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />;
const CheckCircle = (p: IconProps) => <Icon {...p} d="M9 12l2 2 4-4|M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />;
const ChevronDown = (p: IconProps) => <Icon {...p} d="M6 9l6 6 6-6" />;
const CalendarIcon = (p: IconProps) => <Icon {...p} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z|M4 9.5h16|M8 3v4|M16 3v4|M9 14.5l2 2 3.5-3.5" />;
const PillIcon = (p: IconProps) => <Icon {...p} d="M10.5 4.6a4 4 0 0 1 5.66 5.66l-5.9 5.9a4 4 0 1 1-5.66-5.66l5.9-5.9z|M8 8l6 6" />;

// Real app screenshot inside a phone frame (screens are 1320×2868 = 9:19.5).
function PhoneFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`rounded-[2rem] border-[5px] border-obsidian/90 bg-obsidian/90 overflow-hidden shadow-2xl shadow-obsidian/10 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full aspect-[1320/2868] object-cover object-top" loading="lazy" />
    </div>
  );
}

// ── HERO ─────────────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16 lg:pt-0">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[20%] top-0 bottom-0 vitality-line opacity-30" />
        <div className="absolute left-[50%] top-0 bottom-0 vitality-line opacity-20" />
        <div className="absolute left-[80%] top-0 bottom-0 vitality-line opacity-15" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[85vh]">
          <div className="order-2 lg:order-1 flex flex-col gap-6 lg:gap-8 pb-10 lg:pb-0">
            <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
              <div className="w-1.5 h-1.5 rounded-full bg-coral animate-breathe" />
              <span className="text-xs font-inter font-semibold tracking-[0.2em] text-sage uppercase">AI-Powered Pet Health</span>
            </motion.div>

            <motion.h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-obsidian leading-[1.05] tracking-tight" initial={{ opacity: 0, filter: 'blur(12px)', y: 30 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} transition={{ delay: 0.35, duration: 0.8, ease: EASE }}>
              Your pet deserves a <span className="text-sage italic">co-pilot,</span> not just an app.
            </motion.h1>

            <motion.p className="text-base lg:text-lg text-obsidian/55 font-inter max-w-lg leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }}>
              Snap any food to grade it A–F for your pet. Run a 10-second daily gut-health check. Never miss a vaccine. PawMe is the AI assistant built for modern pet parents.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
              <AppStoreButtons glow />
            </motion.div>

            <motion.p className="text-sm text-obsidian/40 font-inter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }}>
              Free to try · No account needed to explore · Works for dogs &amp; cats
            </motion.p>
          </div>

          <div className="order-1 lg:order-2 relative flex items-center justify-center">
            <motion.div
              className="relative w-full animate-breathe"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
            >
              <div className="w-full aspect-[4/3] rounded-[2rem] overflow-hidden bg-coral shadow-2xl shadow-coral/25">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/marketing/hero.webp" alt="Point your camera at any food — PawMe grades it in seconds" className="w-full h-full object-cover object-center" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <a href="#features" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-sage/40 hover:text-sage transition-colors animate-breathe">
        <span className="text-[10px] font-inter tracking-widest uppercase">Explore</span>
        <ChevronDown className="w-4 h-4" />
      </a>
    </section>
  );
}

// ── FEATURES ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: CameraIcon, title: 'Snap-to-Grade Food Scanner', description: "Point your camera at anything your pet might eat. PawMe grades it A–F with a 0–100 score personalised to your pet's breed, age, weight, and allergies.", sage: true },
  { Icon: HeartIcon, title: 'Daily Poop & Gut Check', description: 'A 10-second daily check that catches problems early. Snap a photo of their poop and PawMe reads it like a vet: Bristol type, colour signals, hydration, and urgency.', sage: false },
  { Icon: CalendarIcon, title: 'Vaccine Calendar & Reminders', description: 'Photograph the vet card once. PawMe logs every vaccine, builds the schedule, and reminds you before each dose is due — so you never miss a shot.', sage: true },
  { Icon: PillIcon, title: 'Medication Tracker', description: 'Log meds and supplements with dosages and times. Get reminders for every dose and a clear history to share with your vet.', sage: false },
  { Icon: StethIcon, title: 'Symptom Checker', description: "Describe what's wrong, add a photo. PawMe returns a likely cause, a triage rating, and whether it's worth a vet visit — with clear guidance.", sage: true },
  { Icon: ShieldIcon, title: 'Pet Passport', description: 'A shareable profile with vaccines, medications, and allergies. Hand it to sitters, groomers, or your vet — one tap, complete care history.', sage: false },
  { Icon: BookIcon, title: 'AI Training Sessions', description: "Pick a skill like 'sit' or 'leave it'. PawMe builds a 3-step micro-session, reads it aloud, then watches your video and tells you what to fix.", sage: true },
  { Icon: PinIcon, title: 'Find Nearby', description: 'Vets, pet shops, dog parks, groomers, daycare, and pet-friendly spots on a clean map. One tap to navigate or call.', sage: false },
];

export function Features() {
  const [ref, inView] = useInView();
  return (
    <section id="features" className="py-24 lg:py-36 relative" ref={ref as React.RefObject<HTMLElement>}>
      <div className="absolute left-[33%] top-0 bottom-0 vitality-line opacity-10" />
      <div className="absolute left-[66%] top-0 bottom-0 vitality-line opacity-10" />
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-16 lg:mb-24">
          <motion.div className="flex items-center gap-2 mb-4" initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
            <div className="w-8 h-px bg-sage" />
            <span className="text-xs font-inter font-semibold tracking-[0.2em] text-sage uppercase">Core Features</span>
          </motion.div>
          <motion.h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-obsidian leading-tight" initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }} animate={inView ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}} transition={{ delay: 0.15, duration: 0.7 }}>
            Every tool a <span className="italic text-sage">modern pet parent</span> needs
          </motion.h2>
          <motion.p className="mt-5 text-base text-obsidian/45 font-inter max-w-lg" initial={{ opacity: 0, y: 15 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.5 }}>
            Powered by multimodal AI, personalised to your pet&apos;s profile. PawMe reads photos, scans labels, and gives vet-informed guidance.
          </motion.p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} className="group p-6 lg:p-8 rounded-2xl border border-sage/5 bg-white/40 hover:bg-white/70 hover:border-sage/15 transition-all duration-500 hover:shadow-lg hover:shadow-sage/5" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 * i + 0.3, duration: 0.5 }}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${f.sage ? 'bg-sage/[0.08]' : 'bg-coral/[0.08]'}`}>
                <f.Icon className={`w-5 h-5 ${f.sage ? 'text-sage' : 'text-coral'}`} />
              </div>
              <h3 className="font-playfair text-lg font-semibold text-obsidian mb-2">{f.title}</h3>
              <p className="text-sm text-obsidian/45 font-inter leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
const STEPS = [
  { number: '01', title: 'Add Your Pet', description: 'Snap a photo and our AI suggests the breed, age, and weight. Build a complete profile with allergies, medications, and care notes.', image: '/marketing/appstore/03-home.webp' },
  { number: '02', title: 'Scan Everything', description: 'Point your camera at food, ingredient lists, barcodes, vaccine cards, or symptoms. PawMe analyses it instantly, personalised to your pet.', image: '/marketing/appstore/04-food-scan-screen.webp' },
  { number: '03', title: 'Act With Confidence', description: "Get clear A–F grades, triage ratings, and 'monitor / see vet / emergency' guidance. Share results with your vet in one tap.", image: '/marketing/appstore/01-food-perfect-match.webp' },
];

export function HowItWorks() {
  const [ref, inView] = useInView();
  return (
    <section id="how-it-works" className="py-24 lg:py-36 bg-sage/[0.03] relative" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-24">
          <motion.div className="flex items-center justify-center gap-2 mb-4" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
            <div className="w-8 h-px bg-sage" /><span className="text-xs font-inter font-semibold tracking-[0.2em] text-sage uppercase">How It Works</span><div className="w-8 h-px bg-sage" />
          </motion.div>
          <motion.h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-obsidian leading-tight" initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }} animate={inView ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}} transition={{ delay: 0.1, duration: 0.7 }}>
            Three steps to <span className="italic text-sage">precision care</span>
          </motion.h2>
        </div>
        <div className="space-y-16 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {STEPS.map((step, i) => (
            <motion.div key={step.number} className="relative" initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15 * i + 0.2, duration: 0.6 }}>
              {i < 2 && <div className="hidden lg:block absolute top-12 left-[calc(50%+60px)] right-0 h-px bg-gradient-to-r from-sage/20 to-transparent" />}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white border border-sage/10 flex items-center justify-center mb-6 shadow-sm"><span className="font-playfair text-3xl font-bold text-sage">{step.number}</span></div>
                <PhoneFrame src={step.image} alt={step.title} className="w-full max-w-[190px] mb-6" />
                <h3 className="font-playfair text-xl font-bold text-obsidian mb-2">{step.title}</h3>
                <p className="text-sm text-obsidian/45 font-inter leading-relaxed max-w-xs">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── NUTRITION ─────────────────────────────────────────────────────────────────
const INGREDIENTS = [
  { name: 'Wild Salmon', emoji: '🐟', grade: 'A+', score: 96, keyNutrient: 'Omega-3 EPA/DHA', bar: '94%', benefit: 'Supports coat health, joint mobility, and cognitive function. PawMe prioritises salmon for dogs over 2 with joint sensitivity.' },
  { name: 'Blueberries', emoji: '🫐', grade: 'A', score: 92, keyNutrient: 'Anthocyanins', bar: '87%', benefit: 'Antioxidant support for urinary-tract health and cognitive longevity. PawMe suggests higher portions for senior dogs.' },
  { name: 'Kale', emoji: '🥬', grade: 'A', score: 88, keyNutrient: 'Vitamin K & Iron', bar: '78%', benefit: 'Supports blood health and immunity. PawMe adjusts kale by thyroid-sensitivity profile for specific breeds.' },
  { name: 'Sweet Potato', emoji: '🍠', grade: 'A', score: 90, keyNutrient: 'Beta-Carotene', bar: '91%', benefit: 'Slow-release energy for active breeds. PawMe flags oversized portions for weight-sensitive pets.' },
];

export function Nutrition() {
  const [ref, inView] = useInView();
  const [active, setActive] = useState(0);
  const item = INGREDIENTS[active];
  return (
    <section id="nutrition" className="py-24 lg:py-36 relative" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-14 lg:mb-20">
          <motion.div className="flex items-center gap-2 mb-4" initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
            <div className="w-8 h-px bg-coral" /><span className="text-xs font-inter font-semibold tracking-[0.2em] text-coral uppercase">Nutrition Intelligence</span>
          </motion.div>
          <motion.h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-obsidian leading-tight" initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }} animate={inView ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}} transition={{ delay: 0.1, duration: 0.7 }}>
            The science behind <span className="italic text-sage">every scan</span>
          </motion.h2>
          <p className="mt-4 text-sm text-obsidian/40 font-inter max-w-lg">An illustrative look at how PawMe weighs an ingredient for your pet.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="grid grid-cols-2 gap-4">
            {INGREDIENTS.map((ing, i) => (
              <button key={ing.name} onClick={() => setActive(i)} className={`group relative rounded-2xl overflow-hidden border-2 aspect-square flex flex-col items-center justify-center gap-2 transition-all duration-300 ${active === i ? 'border-sage shadow-lg shadow-sage/10 scale-[1.02] bg-sage/[0.06]' : 'border-transparent bg-white/50 hover:border-sage/20'}`}>
                <span className="text-5xl">{ing.emoji}</span>
                <span className="text-sm font-inter font-semibold text-obsidian">{ing.name}</span>
                <span className="text-[11px] font-inter text-sage">Bioavailability {ing.bar}</span>
              </button>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.35, duration: 0.6 }}>
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.35 }} className="bg-white/60 rounded-3xl p-6 lg:p-8 border border-sage/10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="text-xs font-inter font-semibold tracking-[0.15em] text-sage/60 uppercase">PawMe Analysis</span>
                    <h3 className="font-playfair text-2xl lg:text-3xl font-bold text-obsidian mt-1">{item.name}</h3>
                  </div>
                  <div className="flex flex-col items-center bg-sage/5 rounded-xl px-4 py-3">
                    <span className="font-playfair text-2xl font-bold text-sage">{item.grade}</span>
                    <span className="text-[10px] font-inter text-sage/60">{item.score}/100</span>
                  </div>
                </div>
                <div className="space-y-4 mb-6">
                  <div>
                    <span className="text-xs font-inter font-semibold text-obsidian/30 uppercase tracking-wider">Key Nutrient</span>
                    <p className="font-inter font-medium text-obsidian mt-0.5">{item.keyNutrient}</p>
                  </div>
                  <div>
                    <span className="text-xs font-inter font-semibold text-obsidian/30 uppercase tracking-wider">Protein Bioavailability</span>
                    <div className="mt-2 h-2 bg-sage/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-sage to-sage/70 rounded-full" initial={{ width: 0 }} animate={{ width: item.bar }} transition={{ duration: 0.8, delay: 0.2 }} />
                    </div>
                    <span className="text-xs font-inter text-sage font-semibold mt-1 inline-block">{item.bar}</span>
                  </div>
                </div>
                <div className="bg-sage/[0.03] rounded-xl p-4 border border-sage/5">
                  <span className="text-xs font-inter font-semibold text-sage mb-1 block">AI Insight</span>
                  <p className="text-sm text-obsidian/55 font-inter leading-relaxed">{item.benefit}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── APP PREVIEW (App Store gallery — designed marketing shots) ─────────────────
const SHOTS = Array.from({ length: 10 }, (_, i) => `/marketing/store/image${i + 1}.webp`);

export function AppPreview() {
  const [ref, inView] = useInView();
  return (
    <section id="preview" className="py-24 lg:py-36 bg-gradient-to-b from-parchment via-sage/[0.02] to-parchment overflow-hidden" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <motion.div className="flex items-center justify-center gap-2 mb-4" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
            <div className="w-8 h-px bg-sage" /><span className="text-xs font-inter font-semibold tracking-[0.2em] text-sage uppercase">See it in action</span><div className="w-8 h-px bg-sage" />
          </motion.div>
          <motion.h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-obsidian leading-tight" initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }} animate={inView ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}} transition={{ delay: 0.1, duration: 0.7 }}>
            The whole app, <span className="italic text-sage">screen by screen</span>
          </motion.h2>
        </div>
      </div>
      <motion.div
        className="flex gap-4 lg:gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-6 lg:px-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {SHOTS.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="PawMe app screen" loading="lazy" className="w-[230px] lg:w-[268px] shrink-0 snap-center rounded-[1.75rem] shadow-2xl shadow-obsidian/10" />
        ))}
      </motion.div>
      <p className="text-center text-xs font-inter text-obsidian/40 mt-3">Swipe to explore →</p>
    </section>
  );
}

// ── TRUST ─────────────────────────────────────────────────────────────────────
export function Trust() {
  const [ref, inView] = useInView();
  return (
    <section className="py-20 lg:py-28 bg-sage/[0.04]" ref={ref as React.RefObject<HTMLElement>}>
      <motion.div className="max-w-3xl mx-auto px-6 text-center" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sage shadow-sm"><ShieldIcon className="h-7 w-7" /></div>
        <h2 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-bold text-obsidian leading-tight">Guidance you can trust — <span className="italic text-sage">not a replacement for your vet.</span></h2>
        <p className="mt-4 text-base lg:text-lg text-obsidian/50 font-inter leading-relaxed">PawMe helps you make everyday decisions with confidence and tells you when to see a professional. Your pet&apos;s data stays private.</p>
      </motion.div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Is PawMe free?', a: 'Free to download; everyday features (food scans, safe-food checks, adding your pet, the passport) are free. An optional Pro upgrade for power users is on the way.' },
  { q: 'Is it a replacement for my vet?', a: "No — it gives everyday guidance and flags when something needs professional attention, but doesn't diagnose or replace your vet." },
  { q: 'Cats or just dogs?', a: 'Both — tailored to species, breed, age and needs.' },
  { q: 'How does the A–F score work?', a: "AI reads the label's ingredients and nutrition, weighs them against what's right for your pet, and returns an A–F grade with a plain-English why." },
  { q: 'Is my data private?', a: 'Yes — used to power your experience, not sold. Demos work with no account.' },
];

export function Faq() {
  const [ref, inView] = useInView();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 lg:py-32" ref={ref as React.RefObject<HTMLElement>}>
      <div className="max-w-2xl mx-auto px-6">
        <motion.h2 className="font-playfair text-3xl sm:text-4xl font-bold text-obsidian text-center mb-10" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>Questions, answered</motion.h2>
        <div className="divide-y divide-sage/10 rounded-2xl border border-sage/10 bg-white/50">
          {FAQS.map((f, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open === i}>
                <span className="font-inter text-base font-semibold text-obsidian">{f.q}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-sage transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="px-5 pb-5 -mt-1 font-inter text-[15px] leading-relaxed text-obsidian/50">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── DOWNLOAD ──────────────────────────────────────────────────────────────────
export function Download() {
  const [ref, inView] = useInView();
  return (
    <section id="download" className="py-24 lg:py-36 relative overflow-hidden" ref={ref as React.RefObject<HTMLElement>}>
      <div className="absolute inset-0 bg-gradient-to-br from-sage/5 via-transparent to-coral/5 pointer-events-none" />
      <motion.div className="max-w-4xl mx-auto px-6 lg:px-10 relative text-center" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
        <div className="w-16 h-16 rounded-2xl bg-sage mx-auto mb-8 flex items-center justify-center shadow-lg shadow-sage/20"><CheckCircle className="w-8 h-8 text-parchment" /></div>
        <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-obsidian leading-tight mb-5">Start your pet&apos;s <span className="italic text-sage">wellness journey</span></h2>
        <p className="text-base lg:text-lg text-obsidian/45 font-inter max-w-lg mx-auto mb-10">Free to start, no sign-up required. Download PawMe and scan your first food in seconds.</p>
        <div className="flex justify-center"><AppStoreButtons size="large" glow /></div>
        <div className="mt-10 flex items-center justify-center gap-8 text-sm text-obsidian/30 font-inter">
          <span>Free to use</span><div className="w-1 h-1 rounded-full bg-obsidian/20" /><span>No account needed</span><div className="w-1 h-1 rounded-full bg-obsidian/20" /><span>Dogs &amp; cats</span>
        </div>
      </motion.div>
    </section>
  );
}
