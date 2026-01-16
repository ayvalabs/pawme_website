import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Share2, Gift, Users, Trophy, Copy, Check, Mail, MessageCircle, Facebook, Twitter } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { AuthDialog } from '@/app/components/auth-dialog';
import { toast } from 'sonner';

const rewards = [
  {
    points: 100,
    reward: 'Early Bird Badge',
    description: 'First referral unlock',
    icon: '🎖️',
  },
  {
    points: 500,
    reward: '$50 Kickstarter Discount',
    description: '5 successful referrals',
    icon: '💰',
  },
  {
    points: 1000,
    reward: 'Exclusive PawMe Accessories',
    description: '10 successful referrals',
    icon: '🎁',
  },
  {
    points: 2000,
    reward: 'Lifetime Premium Features',
    description: '20 successful referrals',
    icon: '⭐',
  },
];

export function ReferralProgram() {
  const { user, profile } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = profile?.referralCode 
    ? `${window.location.origin}?ref=${profile.referralCode}`
    : '';

  const handleCopy = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (platform: string) => {
    if (!referralLink) return;

    const text = `Join me on the PawMe waitlist! Get an AI companion for your pet. 🐾`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(referralLink);

    const urls: Record<string, string> = {
      email: `mailto:?subject=${encodeURIComponent('Join PawMe Waitlist')}&body=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <section id="referral-program" className="py-20 px-4 bg-background">
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

        {!user ? (
          /* Not Logged In State */
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Join to Start Earning</h3>
                <p className="text-muted-foreground mb-6">
                  Sign up to get your unique referral link and start earning points toward exclusive rewards.
                </p>
                <Button onClick={() => setAuthDialogOpen(true)} size="lg" className="gap-2">
                  Get My Referral Link
                  <Share2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Logged In State */
          <div className="space-y-12">
            {/* Referral Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{profile?.referralCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Successful Referrals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{profile?.points || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Gift className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{profile?.rewards?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Rewards Unlocked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Share Section */}
            <Card className="border-2 border-primary/20">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">Your Unique Referral Link</h3>
                <div className="flex gap-3 mb-4">
                  <Input
                    value={referralLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleCopy} className="gap-2 flex-shrink-0">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Share on your favorite platforms:
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleShare('email')}
                    className="gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('whatsapp')}
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('facebook')}
                    className="gap-2"
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('twitter')}
                    className="gap-2"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rewards Tiers */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">Rewards Tiers</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {rewards.map((tier, index) => (
              <Card
                key={index}
                className={`border-2 transition-all ${
                  user && (profile?.points || 0) >= tier.points
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">{tier.icon}</div>
                  <div className="text-2xl font-bold text-primary mb-2">
                    {tier.points} pts
                  </div>
                  <h4 className="font-semibold mb-2">{tier.reward}</h4>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                  {user && (profile?.points || 0) >= tier.points && (
                    <div className="mt-3 text-xs font-semibold text-primary">
                      ✓ Unlocked!
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 md:p-12 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Every Referral Counts!
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            The more you share, the more you earn. Plus, you'll be helping other pet parents discover PawMe. 
            Together, we're building a community of happy pets and their loving owners.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => user ? handleCopy() : setAuthDialogOpen(true)}
              className="gap-2"
            >
              {user ? 'Share My Link' : 'Get Started'}
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
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