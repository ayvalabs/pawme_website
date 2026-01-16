
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Trophy, Users, Gift, Share2, Copy, Check, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${profile?.referralCode}` : '';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile && referralUrl) {
      setShareMessage(
`Hey!

I'm on the waitlist for PawMe, an amazing AI companion for pets that I think you'd love. It has features like an HD camera, health monitoring, and even a laser for interactive play.

Sign up using my link to get 100 bonus points: ${referralUrl}

Let me know what you think!

Best,
${profile.name}`
      );
    }
  }, [profile, referralUrl]);

  const handleCopyReferralCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join PawMe!',
        text: 'Join me on PawMe and get 100 points! Use my referral code:',
        url: referralUrl,
      });
    } else {
      navigator.clipboard.writeText(referralUrl);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const handleEmailShare = () => {
    if (!emailAddress) {
      toast.error('Please enter an email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const subject = encodeURIComponent(`🐾 You're invited to join PawMe!`);
    const body = encodeURIComponent(shareMessage);

    window.location.href = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
    setEmailAddress('');
    toast.success('Your email client has been opened!');
  };

  const handleWhatsAppShare = () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number.');
      return;
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number (including country code).');
      return;
    }

    const message = encodeURIComponent(shareMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    setPhoneNumber('');
    toast.success('WhatsApp has been opened!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {profile.name}! 👋</h1>
          <p className="text-muted-foreground">Track your referrals and earn rewards.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{profile.points || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Keep referring to earn more!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile.referralCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Friends joined through your link
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rewards</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profile.rewards?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Unlocked rewards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Code</CardTitle>
              <CardDescription>
                Share this code with friends to earn 100 points for each signup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold tracking-wider text-primary">
                    {profile.referralCode}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReferralCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                onClick={handleShareReferral}
                className="w-full gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share Referral Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How Referrals Work</CardTitle>
              <CardDescription>
                Earn points and climb the leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Share Your Code</p>
                    <p className="text-sm text-muted-foreground">
                      Send your referral code to friends and family.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">They Sign Up</p>
                    <p className="text-sm text-muted-foreground">
                      Your friend joins using your referral code.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Earn Points</p>
                    <p className="text-sm text-muted-foreground">
                      Get 100 points instantly when they complete signup.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Share with a Personal Message</CardTitle>
            <CardDescription>
              Customize the message below and send it directly to your friends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="share-message">Your Message</Label>
              <Textarea
                id="share-message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
            
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-3">
                <Label htmlFor="email">Send via Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="friend@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEmailShare()}
                  />
                  <Button onClick={handleEmailShare} className="gap-2 whitespace-nowrap">
                    <Mail className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone">Send via WhatsApp</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleWhatsAppShare()}
                  />
                  <Button onClick={handleWhatsAppShare} className="gap-2 whitespace-nowrap bg-[#25D366] hover:bg-[#20BA5A]">
                    <MessageCircle className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since:</span>
              <span className="font-medium">
                {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Theme:</span>
              <span className="font-medium capitalize">{profile.theme}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
