
'use client';
import { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Copy, Check, Share2, Gift, Users, Trophy, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralDashboardProps {
  email: string;
  referralCode: string;
  referralCount: number;
}

export function ReferralDashboard({ email, referralCode, referralCount }: ReferralDashboardProps) {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://pawme.com/join?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = (platform: string) => {
    const text = encodeURIComponent('Check out PawMe - an AI companion robot for pets! Join the waitlist and get early access.');
    const url = encodeURIComponent(referralLink);
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text} ${url}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const getRewardTier = (count: number) => {
    if (count >= 25) return { tier: 'Platinum', reward: 'Limited Edition PawMe + Lifetime Premium' };
    if (count >= 10) return { tier: 'Gold', reward: 'Early Bird Discount 50% OFF' };
    if (count >= 5) return { tier: 'Silver', reward: 'Early Bird Discount 30% OFF' };
    if (count >= 1) return { tier: 'Bronze', reward: 'Early Bird Discount 15% OFF' };
    return { tier: 'Starter', reward: 'Exclusive Updates' };
  };

  const currentReward = getRewardTier(referralCount);

  const rewardTiers = [
    { count: 1, tier: 'Bronze', reward: '15% OFF Early Bird Discount', icon: '🥉' },
    { count: 5, tier: 'Silver', reward: '30% OFF Early Bird Discount', icon: '🥈' },
    { count: 10, tier: 'Gold', reward: '50% OFF Early Bird Discount', icon: '🥇' },
    { count: 25, tier: 'Platinum', reward: 'Limited Edition PawMe', icon: '💎' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Welcome message */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl mb-4">Welcome to the PawMe Family! 🎉</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          You're on the waitlist for <span className="text-primary">{email}</span>. Share your unique referral link with friends and family to earn amazing rewards!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 border-2 border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-3xl">{referralCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Tier</p>
              <p className="text-2xl text-primary">{currentReward.tier}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2 border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Reward</p>
              <p className="text-sm">
                {referralCount >= 25 ? 'Max tier reached!' : `${rewardTiers.find(t => t.count > referralCount)?.count || 25} referrals`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="p-6 mb-8 border-2 border-primary/20">
        <h3 className="mb-4">Your Unique Referral Link</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={referralLink}
            readOnly
            className="flex-1 font-mono text-sm bg-secondary"
          />
          <Button onClick={handleCopy} className="bg-primary hover:bg-primary/90">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-3">Share on social media:</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('twitter')}
              className="flex-1 sm:flex-none"
            >
              <Twitter className="w-4 h-4 mr-2" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('facebook')}
              className="flex-1 sm:flex-none"
            >
              <Facebook className="w-4 h-4 mr-2" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('whatsapp')}
              className="flex-1 sm:flex-none"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      </Card>

      {/* Reward Tiers */}
      <Card className="p-6">
        <h3 className="mb-6">Referral Rewards Program</h3>
        <div className="space-y-4">
          {rewardTiers.map((tier, index) => {
            const isUnlocked = referralCount >= tier.count;
            const isCurrent = referralCount >= tier.count && (index === rewardTiers.length - 1 || referralCount < rewardTiers[index + 1].count);
            
            return (
              <div
                key={tier.tier}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                  isUnlocked
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-muted/30 opacity-60'
                } ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}
              >
                <div className="text-3xl">{tier.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4>{tier.tier} Tier</h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.reward}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {isUnlocked ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <span>{tier.count} referrals</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
