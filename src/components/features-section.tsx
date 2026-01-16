import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Crosshair, Bone, Camera, Mic, ToyBrick } from 'lucide-react';

const features = [
  {
    icon: <Bot className="h-10 w-10 text-primary" />,
    title: 'AI-Powered Companion',
    description:
      "PawMe's advanced AI learns your pet's personality and preferences to create unique play sessions every day.",
  },
  {
    icon: <Crosshair className="h-10 w-10 text-primary" />,
    title: 'Dynamic Laser Play',
    description:
      'An integrated, pet-safe laser provides endless fun, with patterns that adapt to keep your pet engaged.',
  },
  {
    icon: <Bone className="h-10 w-10 text-primary" />,
    title: 'Smart Treat Dispenser',
    description:
      'Reward good behavior or just spoil your pet from anywhere with the app-controlled treat dispenser.',
  },
  {
    icon: <Camera className="h-10 w-10 text-primary" />,
    title: 'HD Video & Night Vision',
    description:
      'Keep an eye on your best friend with a crystal-clear 1080p camera, even in low-light conditions.',
  },
  {
    icon: <Mic className="h-10 w-10 text-primary" />,
    title: 'Two-Way Audio',
    description:
      'Talk to your pet and hear them back. Comfort them with your voice, no matter where you are.',
  },
  {
    icon: <ToyBrick className="h-10 w-10 text-primary" />,
    title: 'Interactive Toy Control',
    description:
      'Our LLM-driven system controls a variety of built-in toys for diverse and stimulating entertainment.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A New Best Friend for Your Best Friend
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            PawMe is packed with cutting-edge technology to ensure your pet is
            never lonely or bored.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="text-center hover:shadow-xl transition-shadow duration-300"
            >
              <CardHeader className="items-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  {feature.icon}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="font-headline text-2xl mb-2">
                  {feature.title}
                </CardTitle>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
