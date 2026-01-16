import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const slides = [
  {
    id: 'hero-1',
    title: 'Never Let Your Pet Be Lonely Again.',
    subtitle:
      "PawMe is the revolutionary AI companion that keeps your furry friend engaged, happy, and safe while you're away.",
    image: PlaceHolderImages.find((img) => img.id === 'hero-1'),
  },
  {
    id: 'hero-2',
    title: 'Intelligent Play, All Day Long.',
    subtitle:
      "From laser chasing to treat dispensing, PawMe learns your pet's favorite games for endless entertainment.",
    image: PlaceHolderImages.find((img) => img.id === 'hero-2'),
  },
  {
    id: 'hero-3',
    title: 'Peace of Mind in Your Pocket.',
    subtitle:
      "Check in anytime with HD video and two-way audio. It's like you never left.",
    image: PlaceHolderImages.find((img) => img.id === 'hero-3'),
  },
];

export function HeroSection() {
  return (
    <section className="relative w-full h-[80vh] md:h-screen overflow-hidden">
      <Carousel
        className="w-full h-full"
        opts={{ loop: true }}
        autoplay-delay="5000"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id}>
              <div className="relative w-full h-[80vh] md:h-screen">
                {slide.image && (
                  <Image
                    src={slide.image.imageUrl}
                    alt={slide.image.description}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    data-ai-hint={slide.image.imageHint}
                  />
                )}
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white">
                  <div className="container mx-auto px-4">
                    <h1 className="font-headline text-4xl md:text-6xl lg:text-7xl font-bold !text-white drop-shadow-lg">
                      {slide.title}
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-white/90 drop-shadow-md">
                      {slide.subtitle}
                    </p>
                    <Button size="lg" className="mt-8" asChild>
                      <a href="#features">
                        Explore Features <ArrowRight className="ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
      </Carousel>
    </section>
  );
}
