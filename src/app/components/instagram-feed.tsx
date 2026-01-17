import { Instagram } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import imageData from '@/app/lib/placeholder-images.json';

const feedImages = [
  imageData.instaFeed1,
  imageData.instaFeed2,
  imageData.instaFeed3,
  imageData.instaFeed4,
  imageData.instaFeed5,
  imageData.instaFeed6,
];

export function InstagramFeed() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl mb-4">Follow our Journey</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay up to date with the latest PawMe news and cute pet moments on our Instagram.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {feedImages.map((img, index) => (
            <a href="https://instagram.com/pawme" key={index} target="_blank" rel="noopener noreferrer" className="block relative aspect-square overflow-hidden rounded-lg group">
              <ImageWithFallback
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                data-ai-hint={img['data-ai-hint']}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="w-8 h-8 text-white" />
              </div>
            </a>
          ))}
        </div>
        
        <div className="text-center">
          <Button asChild size="lg" className="gap-2">
            <a href="https://instagram.com/pawme" target="_blank" rel="noopener noreferrer">
              <Instagram className="w-5 h-5" />
              Follow @pawme on Instagram
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
