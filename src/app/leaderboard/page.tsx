
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
import { Trophy, Users, Gift, Share2, Copy, Check, Mail, MessageCircle, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getTotalUsers } from '@/app/actions/users';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/ui/form';

function VipBanner({ totalUsers, loading, userName, onJoinClick }: { totalUsers: number | null, loading: boolean, userName: string, onJoinClick: () => void }) {
  const vipLimit = 100;
  const spotsLeft = totalUsers !== null ? Math.max(0, vipLimit - totalUsers) : null;

  return (
    <Card className="mb-8 bg-gradient-to-tr from-yellow-300/10 via-primary/10 to-yellow-300/10 border-primary/20 text-center p-6 shadow-lg">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-3xl font-bold text-primary">
          👑 {userName}, join the {vipLimit} VIP List! 👑
        </CardTitle>
        <CardDescription className="text-lg text-foreground/80">
          Become a founding member and get exclusive early bird pricing.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <span className="text-2xl text-muted-foreground line-through">$199</span>
          <span className="text-5xl font-extrabold text-foreground">$79</span>
        </div>
        <Button onClick={onJoinClick} size="lg" className="h-12 text-lg animate-pulse">
          <Star className="mr-2 h-5 w-5" /> Join for $1
        </Button>
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

const rewardTiers = [
  { id: 'bronze', title: '🥉 Bronze Tier', requiredReferrals: 1, reward: '15% OFF Early Bird Discount' },
  { id: 'silver', title: '🥈 Silver Tier', requiredReferrals: 5, reward: '30% OFF Early Bird Discount' },
  { id: 'gold', title: '🥇 Gold Tier', requiredReferrals: 10, reward: '50% OFF Early Bird Discount' },
  { id: 'platinum', title: '💎 Platinum Tier', requiredReferrals: 25, reward: 'Limited Edition PawMe' },
];

const addressSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  address1: z.string().min(5, 'Address is required.'),
  address2: z.string().optional(),
  city: z.string().min(2, 'City is required.'),
  state: z.string().min(2, 'State/Province is required.'),
  zip: z.string().min(4, 'ZIP/Postal code is required.'),
  country: z.string().min(2, 'Country is required.'),
  phone: z.string().min(10, 'A valid phone number is required.'),
});

export default function LeaderboardPage() {
  const { user, profile, loading: authLoading, joinVip, redeemReward } = useAuth();
  const router = useRouter();
  
  const [copied, setCopied] = useState(false);
  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${profile?.referralCode}` : '';

  const [receiverName, setReceiverName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loadingVipCount, setLoadingVipCount] = useState(true);

  const [isVipDialogOpen, setVipDialogOpen] = useState(false);
  const [isRedeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<(typeof rewardTiers)[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '', address1: '', address2: '', city: '', state: '', zip: '', country: '', phone: ''
    }
  });

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

  const handleJoinVip = async () => {
    setIsSubmitting(true);
    try {
      await joinVip();
      toast.success("Welcome to the VIP list! 👑 You're now a founding member.");
      setVipDialogOpen(false);
    } catch (e) {
      toast.error('Could not process VIP payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenRedeemDialog = (reward: (typeof rewardTiers)[0]) => {
    setSelectedReward(reward);
    form.reset({ fullName: profile?.name, phone: '' });
    setRedeemDialogOpen(true);
  };
  
  const handleRedeemSubmit = async (values: z.infer<typeof addressSchema>) => {
    if (!selectedReward) return;
    setIsSubmitting(true);
    try {
      await redeemReward(selectedReward.id);
      toast.success(`'${selectedReward.title}' reward redeemed!`, {
        description: 'We will be in touch about shipping details soon.'
      });
      setRedeemDialogOpen(false);
    } catch (e) {
      toast.error('Failed to redeem reward. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
    <>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <div className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
          {!profile.isVip && (
            <VipBanner 
              totalUsers={totalUsers} 
              loading={loadingVipCount} 
              userName={profile.name.split(' ')[0]} 
              onJoinClick={() => setVipDialogOpen(true)}
            />
          )}
          
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Referral Dashboard</h1>
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
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Your Rewards</CardTitle>
              <CardDescription>Unlock rewards by referring more friends.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rewardTiers.map(tier => {
                const isUnlocked = profile.referralCount >= tier.requiredReferrals;
                const isRedeemed = profile.rewards.some(r => r.rewardId === tier.id);
                return (
                  <div key={tier.id} className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      isUnlocked
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-muted/30 opacity-70'
                    }`}>
                    <div className="text-4xl">{tier.title.split(' ')[0]}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{tier.title}</h4>
                      <p className="text-sm text-muted-foreground">{tier.reward}</p>
                    </div>
                    <div>
                      {isRedeemed ? (
                        <Button variant="outline" disabled>Redeemed</Button>
                      ) : isUnlocked ? (
                        <Button onClick={() => handleOpenRedeemDialog(tier)}>Redeem</Button>
                      ) : (
                        <Button variant="secondary" disabled>
                          {tier.requiredReferrals - profile.referralCount} more
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

        </div>
        
        <Footer />
      </div>
      
      <Dialog open={isVipDialogOpen} onOpenChange={setVipDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm VIP Membership</DialogTitle>
            <DialogDescription>
              Become a founding member of PawMe for a one-time payment of $1. You'll get exclusive early-bird pricing and a special badge.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVipDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleJoinVip} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Confirm & Pay $1'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRedeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Redeem: {selectedReward?.title}</DialogTitle>
            <DialogDescription>Please provide your shipping details to receive your reward. We'll be in touch to confirm.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRedeemSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State/Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="zip" render={({ field }) => (
                  <FormItem><FormLabel>ZIP/Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormDescription>In case we need to contact you about shipping.</FormDescription><FormMessage /></FormItem>
              )}/>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRedeemDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Shipping Info'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
