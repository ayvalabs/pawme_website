import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { useAuth } from '@/app/context/AuthContext';
import { AuthDialog } from '@/app/components/auth-dialog';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1749542119767-28f14d41c87c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB3aXRoJTIwZG9nJTIwaGFwcHl8ZW58MXx8fHwxNzY4NTM1OTk2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: '360° Movement',
    subtitle: 'Follows Your Pet Anywhere',
    description: 'Advanced AI tracking keeps PawMe moving with your pet throughout your home, never missing a moment of their day.',
  },
  {
    image: 'https://images.unsplash.com/photo-1758925403665-fd17d683b841?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB3aXRoJTIwY2F0JTIwaG9tZXxlbnwxfHx8fDE3Njg1MzU5OTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'AI Health Monitoring',
    subtitle: 'Early Detection Saves Lives',
    description: 'Detect skin issues, ticks, unusual behavior, and health changes before they become serious problems.',
  },
  {
    image: 'https://images.unsplash.com/photo-1597046902504-dfae3612605f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2clMjBwbGF5aW5nJTIwZmV0Y2h8ZW58MXx8fHwxNzY4NTM1OTk3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Interactive Play Mode',
    subtitle: 'Keep Your Pet Entertained',
    description: 'Built-in laser pointer and motion tracking for endless fun, keeping your pet active and engaged while you\'re away.',
  },
  {
    image: 'https://images.unsplash.com/photo-1753685725058-1230c9a6586b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXQlMjBvd25lciUyMHNtYXJ0cGhvbmV8ZW58MXx8fHwxNzY4NTM1OTk4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Remote Control via App',
    subtitle: 'Monitor From Anywhere',
    description: 'Live HD video feed, two-way audio, and full remote control through our iOS and Android companion app.',
  },
  {
    image: 'https://images.unsplash.com/photo-1632498301446-5f78baad40d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGRvZyUyMG93bmVyfGVufDF8fHx8MTc2ODQ0NjIwMHww&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Daily Highlight Reels',
    subtitle: 'Never Miss A Precious Moment',
    description: 'Automatic motion detection captures your pet\'s cutest and funniest moments, compiled into daily highlight videos.',
  },
];

export function Hero() {
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume autoplay after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % slides.length);
  };

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  };

  const slide = slides[currentSlide];

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        {slides.map((s, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <ImageWithFallback
              src={s.image}
              alt={s.title}
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex items-center justify-center px-4 z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Animated Text Content */}
          <div
            key={currentSlide}
            className="animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 drop-shadow-2xl">
              {slide.title}
            </h1>
            <p className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-6 text-primary drop-shadow-xl">
              {slide.subtitle}
            </p>
            <p className="text-lg md:text-xl lg:text-2xl mb-12 max-w-3xl mx-auto drop-shadow-lg text-white/90">
              {slide.description}
            </p>

            {/* CTA Button */}
            <Button
              size="lg"
              onClick={() => setAuthDialogOpen(true)}
              className="text-lg px-8 py-6 gap-3 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 text-white"
            >
              {user ? 'Share & Earn Rewards' : 'Join the Waitlist'}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Slide Indicators */}
          <div className="flex items-center justify-center gap-3 mt-16">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all ${
                  index === currentSlide
                    ? 'w-12 h-3 bg-primary'
                    : 'w-3 h-3 bg-white/50 hover:bg-white/75'
                } rounded-full`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all flex items-center justify-center group border border-white/20"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-white group-hover:scale-110 transition-transform" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all flex items-center justify-center group border border-white/20"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Scroll Down Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" />
        </div>
      </div>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab="signup"
      />
    </section>
  );
}
