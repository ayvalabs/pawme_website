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
import { Trophy, Users, Gift, Share2, Copy, Check, Mail, MessageCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getTotalUsers } from '@/app/actions/users';
import { Skeleton } from '@/app/components/ui/skeleton';

function VipBanner({ totalUsers, loading }: { totalUsers: number | null, loading: boolean }) {
  const vipLimit = 100;
  const spotsLeft = totalUsers !== null ? Math.max(0, vipLimit - totalUsers) : null;

  return (
    <Card className="mb-8 bg-primary/10 border-primary/20 text-center p-6 shadow-lg">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-3xl font-bold text-primary">
          👑 Join the {vipLimit} VIP List! 👑
        </CardTitle>
        <CardDescription className="text-lg text-foreground/80">
          Get exclusive early bird pricing as one of our first supporters.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className="text-2xl text-muted-foreground line-through">$199</span>
          <span className="text-5xl font-extrabold text-foreground">$79</span>
        </div>
        <div className="h-10 flex items-center justify-center">
          {loading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <p className="text-xl font-semibold bg-primary text-primary-foreground rounded-full px-6 py-2 inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Only {spotsLeft} spots left!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeaderboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [copied, setCopied] = useState(false);
  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${profile?.referralCode}` : '';

  const [receiverName, setReceiverName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loadingVipCount, setLoadingVipCount] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchTotalUsers() {
      try {
        const count = await getTotalUsers();
        setTotalUsers(count);
      } catch (error) {
        console.error("Failed to fetch total users:", error);
        toast.error("Could not load VIP spots count.");
      } finally {
        setLoadingVipCount(false);
      }
    }
    fetchTotalUsers();
  }, []);

  useEffect(() => {
    if (profile && referralUrl) {
      const recipient = receiverName.trim() ? receiverName.trim() : 'there';
      setShareMessage(
`Hey ${recipient}!

I'm on the waitlist for PawMe, an amazing AI companion for pets that I think you'd love. It has features like an HD camera, health monitoring, and even a laser for interactive play.

Sign up using my link to get 100 bonus points and join me on the leaderboard: ${referralUrl}

Let me know what you think!

Best,
${profile.name}`
      );
    }
  }, [profile, referralUrl, receiverName]);

  const handleCopyReferralLink = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenericShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on the PawMe waitlist!',
        text: `I'm on the waitlist for PawMe, an amazing AI companion for pets. Join with my link to get 100 bonus points!`,
        url: referralUrl,
      });
    } else {
      handleCopyReferralLink();
    }
  };

  const handleEmailShare = () => {
    if (!emailAddress) {
      toast.error("Please enter your friend's email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const subject = encodeURIComponent(`🐾 ${profile?.name} invited you to join PawMe!`);
    const body = encodeURIComponent(shareMessage);

    window.location.href = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
    setEmailAddress('');
    setReceiverName('');
    toast.success('Your email client has been opened!');
  };

  const handleWhatsAppShare = () => {
    if (!phoneNumber) {
      toast.error("Please enter your friend's phone number.");
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
    setReceiverName('');
    toast.success('WhatsApp has been opened!');
  };

  if (authLoading) {
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
        <VipBanner totalUsers={totalUsers} loading={loadingVipCount} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {profile.name}! 👋</h1>
          <p className="text-muted-foreground">Share your referral link to earn points and climb the leaderboard.</p>
        </div>

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

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Share Your Referral Link</CardTitle>
            <CardDescription>Share your unique link and earn 100 points for every friend who signs up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="referral-link">Your Unique Link</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input id="referral-link" value={referralUrl} readOnly className="flex-1 font-mono text-sm bg-muted" />
                <Button variant="outline" size="icon" onClick={handleCopyReferralLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button onClick={handleGenericShare} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Send a Personal Invite</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="receiver-name">Friend's Name</Label>
                  <Input id="receiver-name" placeholder="e.g., Jane" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Friend's Email</Label>
                  <Input id="email" type="email" placeholder="jane@example.com" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Friend's WhatsApp</Label>
                  <Input id="phone" type="tel" placeholder="+15551234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-message">Your Message</Label>
                <Textarea id="share-message" value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} className="min-h-[200px]" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleEmailShare} className="gap-2 flex-1" disabled={!emailAddress}>
                  <Mail className="h-4 w-4" />
                  Send via Email
                </Button>
                <Button onClick={handleWhatsAppShare} className="gap-2 flex-1 bg-[#25D366] hover:bg-[#20BA5A]" disabled={!phoneNumber}>
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>How Referrals Work</CardTitle>
              <CardDescription>Earn points and climb the leaderboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  <div>
                    <p className="font-medium">Share Your Link</p>
                    <p className="text-sm text-muted-foreground">Send your referral link to friends and family.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  <div>
                    <p className="font-medium">They Sign Up</p>
                    <p className="text-sm text-muted-foreground">Your friend joins using your referral link.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                  <div>
                    <p className="font-medium">Earn Points</p>
                    <p className="text-sm text-muted-foreground">Get 100 points instantly when they complete signup.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
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
                <span className="font-medium">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Theme:</span>
                <span className="font-medium capitalize">{profile.theme}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
