
'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Share2, Gift } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthDialog } from '@/app/components/auth-dialog';
import { toast } from 'sonner';

const rewards = [
  {
    icon: '🦴',
    reward: 'Starter Treats',
    description: '10 Points',
  },
  {
    icon: '🧸',
    reward: 'Plush Squeaky Toy',
    description: '18 Points',
  },
  {
    icon: '🌿',
    reward: 'Snuffle Mat',
    description: '36 Points',
  },
  {
    icon: '👑',
    reward: 'Custom Collar Set',
    description: '80 Points',
  },
];

export function ReferralProgram() {
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <section id="referral-program" className="py-20 px-4 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Gift className="w-4 h-4" />
            Earn Rewards
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Share PawMe, Earn Amazing Rewards
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Help us bring PawMe to more pet families. Share your unique referral link with friends, family, and on social media to earn exclusive rewards and move up the leaderboard!
          </p>
        </div>

        {/* Rewards Tiers */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rewards.map((tier, index) => (
            <Card
              key={index}
              className="border-2 border-border group hover:border-primary/30 transition-all hover:-translate-y-1"
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">{tier.icon}</div>
                <h4 className="font-semibold mb-2">{tier.reward}</h4>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          {!user && (
            <Button
              size="lg"
              onClick={() => setAuthDialogOpen(true)}
              className="gap-2"
            >
              Get My Referral Link
              <Share2 className="w-4 h-4" />
            </Button>
          )}
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
