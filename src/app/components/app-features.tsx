'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Video, Gamepad2, Film, Activity, Smartphone } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

const appFeatures = [
  {
    icon: Video,
    title: 'Live Feed',
    description: 'Watch your pet in real-time with crystal-clear HD video streaming. Multiple camera angles and two-way audio let you see and talk to your pet from anywhere in the world.',
    screenshot: '/feed.png',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/5',
  },
  {
    icon: Gamepad2,
    title: 'Remote Control',
    description: 'Take full control of PawMe from anywhere. Navigate your home, adjust camera angles, and interact with your pet using intuitive touch controls. Monitor battery and signal strength in real-time.',
    screenshot: '/remote.png',
    gradient: 'from-indigo-500/10 to-purple-500/10',
    iconColor: 'text-indigo-500',
    bgColor: 'bg-indigo-500/5',
  },
  {
    icon: Film,
    title: 'Daily Magic Moments',
    description: 'Automatically generated highlight reels of your pet\'s cutest and funniest moments. AI-powered video compilation captures the best parts of your pet\'s day and creates shareable memories.',
    screenshot: '/moments.png',
    gradient: 'from-purple-500/10 to-pink-500/10',
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-500/5',
  },
  {
    icon: Activity,
    title: 'Health Status',
    description: 'Track your pet\'s activity levels, sleep patterns, and behavioral changes. Get insights and alerts about potential health concerns before they become serious problems.',
    screenshot: '/health.png',
    gradient: 'from-green-500/10 to-emerald-500/10',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/5',
  },
];

export function AppFeatures() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const scrollProgress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / window.innerHeight));
        
        // Calculate scale based on scroll progress
        const scale = 0.95 + (scrollProgress * 0.05);

        card.style.transform = `scale(${scale})`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={sectionRef} className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Smartphone className="w-4 h-4" />
            Companion App
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Control Everything From Your Phone
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our intuitive mobile app puts complete control of PawMe at your fingertips. Monitor, interact, and stay connected with your pet from anywhere in the world.
          </p>
        </div>

        <div className="relative" style={{ height: `${appFeatures.length * 100}vh` }}>
          {appFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const topOffset = 80 + (index * 20);
            
            return (
              <div
                key={index}
                ref={(el) => { cardRefs.current[index] = el; }}
                className="sticky transition-all duration-300 ease-out"
                style={{ 
                  top: `${topOffset}px`,
                  zIndex: index + 1
                }}
              >
                <div className="mx-auto max-w-6xl">
                  <div className="overflow-hidden rounded-3xl bg-background shadow-lg">
                    <div className="p-0">
                      <div className="grid md:grid-cols-2 gap-0">
                        {/* Screenshot Side */}
                        <div className={`relative p-8 md:p-12 flex items-center justify-center`}>
                          <div className="relative mx-auto max-w-xs w-full">
                            {/* Phone Frame */}
                            <div className="relative rounded-[2.5rem] border-8 border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
                              {/* Notch */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-gray-800 rounded-b-3xl z-10" />
                              
                              {/* Screenshot */}
                              <div className="relative aspect-[9/19.5] bg-white">
                                <ImageWithFallback
                                  src={feature.screenshot}
                                  alt={feature.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            
                            {/* Glow Effect */}
                            <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-white" />
                          </div>
                        </div>

                        {/* Content Side */}
                        <div className="p-8 md:p-12 flex flex-col justify-center">
                          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${feature.bgColor} mb-6`}>
                            <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                          </div>
                          
                          <h3 className="text-3xl md:text-4xl font-bold mb-4">
                            {feature.title}
                          </h3>
                          
                          <p className="text-lg text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Available on iOS and Android
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="px-6 py-3 rounded-lg bg-muted/50 text-sm font-semibold">
              📱 App Store
            </div>
            <div className="px-6 py-3 rounded-lg bg-muted/50 text-sm font-semibold">
              🤖 Google Play
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
