import { Camera, Mic, Speaker, Thermometer, Activity, Zap, Video, Heart, Shield } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

const features = [
  {
    icon: Video,
    title: '360° Movement & HD Camera',
    description: 'PawMe follows your pet around the house with smooth 360° rotation, capturing every moment in crystal-clear HD video.',
    image: 'https://images.unsplash.com/photo-1678397491553-207b9666a71e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGRvZyUyMGhvbWUlMjBhbG9uZXxlbnwxfHx8fDE3Njg1MjcwNzh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Happy dog at home being monitored',
  },
  {
    icon: Mic,
    title: 'Two-Way Audio Communication',
    description: 'Talk to your pet in real-time with our high-fidelity speaker and microphone. Comfort them when they miss you.',
    image: 'https://images.unsplash.com/photo-1753685723914-0ad1fbb4e213?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXQlMjBvd25lciUyMHZpZGVvJTIwY2FsbHxlbnwxfHx8fDE3Njg1MjcwNzl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Pet owner on video call with their pet',
  },
  {
    icon: Thermometer,
    title: 'AI Health Monitoring',
    description: 'Built-in temperature sensor and AI analysis constantly monitor your pet\'s health, detecting early signs of issues.',
    image: 'https://images.unsplash.com/photo-1761039265612-59d076ee7af0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXQlMjBsb29raW5nJTIwY2FtZXJhJTIwaG9tZXxlbnwxfHx8fDE3Njg1MjcwNzl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Cat looking at camera for health monitoring',
  },
  {
    icon: Activity,
    title: 'Distance Sensor & Smart Tracking',
    description: 'Advanced sensors ensure your pet stays in frame. PawMe intelligently positions itself to capture the best view.',
    image: 'https://images.unsplash.com/photo-1758296518679-f4591f5fcde2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcGV0JTIwd2FpdGluZyUyMG93bmVyfGVufDF8fHx8MTc2ODUyNzA4MHww&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Pet waiting and being tracked',
  },
  {
    icon: Zap,
    title: 'Interactive Laser Play',
    description: 'Keep your pet active and entertained! Control the laser pointer remotely or let PawMe\'s AI create engaging play sessions.',
    image: 'https://images.unsplash.com/photo-1651089293923-fe90f30e3d9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2clMjBwbGF5aW5nJTIwbGFzZXIlMjBwb2ludGVyfGVufDF8fHx8MTc2ODUyNzA3OXww&ixlib=rb-4.1.0&q=80&w=1080',
    alt: 'Dog playing with laser pointer',
  },
  {
    icon: Camera,
    title: 'AI-Powered Health Detection',
    description: 'PawMe monitors your pet\'s eyes, nose, and skin hourly using advanced AI to detect ticks, skin issues, and health changes.',
    image: 'PLACEHOLDER - Add close-up photo of pet face/eyes',
    alt: 'Close-up of pet for AI health detection',
  },
  {
    icon: Heart,
    title: 'Daily Highlight Reels',
    description: 'Automatic video compilations of your pet\'s cutest and most memorable moments each day. Never miss a precious memory.',
    image: 'PLACEHOLDER - Add photo of happy pet moments compilation',
    alt: 'Pet highlight moments',
  },
  {
    icon: Shield,
    title: 'Smart Security Alerts',
    description: 'Get instant notifications about unusual sounds, unknown visitors, or any unusual activity in your home.',
    image: 'PLACEHOLDER - Add photo of alert/security concept',
    alt: 'Smart home security for pets',
  },
];

export function ProductFeatures() {
  return (
    <section className="py-20 px-4 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Revolutionary Features for Modern Pet Parents
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            PawMe is more than a camera. It's an AI-powered companion that keeps your pet happy, healthy, and entertained while giving you peace of mind.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-background rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-64 overflow-hidden">
                {feature.image.includes('PLACEHOLDER') ? (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <feature.icon className="w-20 h-20 text-primary/40" />
                  </div>
                ) : (
                  <ImageWithFallback
                    src={feature.image}
                    alt={feature.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-4 left-4 p-3 bg-primary rounded-lg">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-primary/10 border border-primary/20 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Your Pet's Personal AI Companion
              </h3>
              <p className="text-muted-foreground mb-6">
                PawMe uses cutting-edge artificial intelligence to understand your pet's behavior, health patterns, and needs. 
                It learns and adapts to provide personalized care, entertainment, and monitoring.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-xs">✓</span>
                  </div>
                  <span className="text-sm">Learns your pet's daily routine and preferences</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-xs">✓</span>
                  </div>
                  <span className="text-sm">Automatically creates engaging play sessions</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-xs">✓</span>
                  </div>
                  <span className="text-sm">Detects health issues before they become serious</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-xs">✓</span>
                  </div>
                  <span className="text-sm">Regular software updates with new AI features</span>
                </li>
              </ul>
            </div>
            
            <div className="relative h-96 rounded-xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <p className="text-center text-muted-foreground px-4">
                  PLACEHOLDER<br />Add photo of PawMe robot interacting with pet
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
