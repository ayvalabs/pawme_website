import { Card } from '@/app/components/ui/card';
import { Bot, Camera, Heart, Smartphone, Zap, Shield } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: Bot,
      title: 'AI-Powered Intelligence',
      description: 'Advanced AI understands your pet\'s behavior, mood, and needs, adapting interactions in real-time.',
    },
    {
      icon: Camera,
      title: '24/7 Pet Monitoring',
      description: 'HD cameras and sensors keep you connected with live streaming and activity alerts on your phone.',
    },
    {
      icon: Heart,
      title: 'Interactive Play',
      description: 'Engages your pet with intelligent play patterns, laser games, and treat dispensing rewards.',
    },
    {
      icon: Smartphone,
      title: 'Smart App Control',
      description: 'Control PawMe from anywhere with our intuitive mobile app. Schedule activities and check in anytime.',
    },
    {
      icon: Zap,
      title: 'Automated Care',
      description: 'Scheduled feeding, water reminders, and activity tracking ensure your pet\'s health and happiness.',
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      description: 'Built with pet-safe materials and designed to prevent accidents. Your pet\'s safety is our priority.',
    },
  ];

  return (
    <div className="py-20 px-4 bg-gradient-to-b from-transparent via-secondary/20 to-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl mb-4">Why PawMe?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            PawMe combines cutting-edge AI technology with thoughtful design to create the perfect companion for your furry friends.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-6 hover:shadow-lg hover:shadow-primary/10 transition-all hover:-translate-y-1 border-2 border-border hover:border-primary/30"
              >
                <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
