
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
import { Trophy, Users, Gift, Share2, Copy, Check, Mail, MessageCircle, Sparkles, Star, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getTotalUsers, getLeaderboard } from '@/app/actions/users';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/ui/form';
import Image from 'next/image';
import imageData from '@/app/lib/placeholder-images.json';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  rank: number;
}

function VipBanner({ totalUsers, loading, userName, onJoinClick }: { totalUsers: number | null, loading: boolean, userName: string, onJoinClick: () => void }) {
  const vipLimit = 250;
  const spotsLeft = totalUsers !== null ? Math.max(0, vipLimit - totalUsers) : null;

  return (
    <Card 
      onClick={onJoinClick}
      className="mb-8 bg-gradient-to-tr from-yellow-300/10 via-primary/10 to-yellow-300/10 border-primary/20 text-center p-6 shadow-lg cursor-pointer hover:shadow-primary/20 transition-shadow"
    >
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-3xl font-bold text-primary">
          👑 {userName}, join the {vipLimit} VIP list! 👑
        </CardTitle>
        <CardDescription className="text-lg text-foreground/80">
          Become a founding member, get exclusive early bird pricing, and earn <span className="font-bold text-primary">1.5x points</span> for every referral!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
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

function LeaderboardDisplay() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const topUsers = await getLeaderboard();
        setLeaderboard(topUsers);
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getTierInfo = (rank: number) => {
    if (rank === 1) return { icon: '💎', name: 'Diamond' };
    if (rank <= 3) return { icon: '🥇', name: 'Platinum' };
    if (rank <= 10) return { icon: '🏆', name: 'Gold' };
    return { icon: '👤', name: 'Participant' };
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="text-primary w-6 h-6" />
          Leaderboard
        </CardTitle>
        <CardDescription>See how you stack up against other top referrers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center"><Skeleton className="h-5 w-5 rounded-full mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              leaderboard.map((user) => {
                const tier = getTierInfo(user.rank);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="text-center font-bold text-lg">{user.rank}</TableCell>
                    <TableCell className="font-medium flex items-center gap-3">
                      <span className="text-xl" title={tier.name}>{tier.icon}</span>
                      {user.name}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{user.points}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

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

const paymentSchema = z.object({
  cardNumber: z.string().length(16, "Card number must be 16 digits.").regex(/^\d+$/, "Card number must be numeric."),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry date must be in MM/YY format."),
  cvc: z.string().length(3, "CVC must be 3 digits.").regex(/^\d+$/, "CVC must be numeric."),
});

export default function LeaderboardPage() {
  const { user, profile, loading: authLoading, joinVip, redeemReward } = useAuth();
  const router = useRouter();

  const rewardTiers = [
    { 
      id: 'treats', 
      title: 'Premium Treats Sampler', 
      requiredPoints: 1000, 
      reward: 'A delicious pack of high-quality, natural pet treats.',
      image: imageData.rewardTreats.src,
      alt: 'Premium pet treats',
      'data-ai-hint': imageData.rewardTreats['data-ai-hint'],
    },
    { 
      id: 'toy', 
      title: 'Interactive Puzzle Toy', 
      requiredPoints: 2500, 
      reward: 'A treat-dispensing ball or puzzle to keep your pet engaged.',
      image: imageData.rewardToy.src,
      alt: 'Interactive pet toy',
      'data-ai-hint': imageData.rewardToy['data-ai-hint'],
    },
    { 
      id: 'accessory', 
      title: 'Personalized Pet Accessory', 
      requiredPoints: 5000, 
      reward: 'A custom engraved collar or a stylish harness in brand colors.',
      image: imageData.rewardAccessory.src,
      alt: 'Personalized pet collar',
      'data-ai-hint': imageData.rewardAccessory['data-ai-hint'],
    },
    { 
      id: 'bundle', 
      title: 'Comfort Bundle', 
      requiredPoints: 7500, 
      reward: 'A gift set with a plush toy, grooming wipes, and a travel bowl.',
      image: imageData.rewardBundle.src,
      alt: 'Pet comfort bundle',
      'data-ai-hint': imageData.rewardBundle['data-ai-hint'],
    },
    { 
      id: 'bed', 
      title: 'Premium Pet Bed', 
      requiredPoints: 10000, 
      reward: 'A cozy, high-quality pet bed for ultimate comfort.',
      image: imageData.rewardBed.src,
      alt: 'A cozy premium pet bed',
      'data-ai-hint': imageData.rewardBed['data-ai-hint'],
    },
    { 
      id: 'feeder', 
      title: 'Smart Pet Feeder', 
      requiredPoints: 20000, 
      reward: 'An automated, app-controlled pet feeder for scheduled meals.',
      image: imageData.rewardFeeder.src,
      alt: 'A smart automated pet feeder',
      'data-ai-hint': imageData.rewardFeeder['data-ai-hint'],
    }
  ];

  const referralTiers = [
    { count: 1, tier: 'Bronze', reward: '15% OFF Early Bird Discount', icon: '🥉' },
    { count: 5, tier: 'Silver', reward: '30% OFF Early Bird Discount', icon: '🥈' },
    { count: 10, tier: 'Gold', reward: '50% OFF Early Bird Discount', icon: '🥇' },
    { count: 25, tier: 'Platinum', reward: 'Limited Edition PawMe', icon: '💎' },
  ];
  
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

  const addressForm = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '', address1: '', address2: '', city: '', state: '', zip: '', country: '', phone: ''
    }
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '', expiryDate: '', cvc: ''
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
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate payment processing
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
    addressForm.reset({ fullName: profile?.name || '', phone: '' });
    setRedeemDialogOpen(true);
  };
  
  const handleRedeemSubmit = async (values: z.infer<typeof addressSchema>) => {
    if (!selectedReward) return;
    setIsSubmitting(true);
    try {
      await redeemReward(selectedReward.id, values);
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
          
          <LeaderboardDisplay />

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Share Your Referral Link</CardTitle>
              <CardDescription>Share your unique link and earn points for every friend who signs up.</CardDescription>
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
              <CardTitle>Your Referral Tiers</CardTitle>
              <CardDescription>Unlock rewards as you refer more friends.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {referralTiers.map((tier) => {
                  const isUnlocked = profile.referralCount >= tier.count;
                  return (
                      <Card
                      key={tier.tier}
                      className={`p-6 text-center border-2 transition-all ${
                          isUnlocked ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30 opacity-70'
                      }`}
                      >
                      <div className="text-4xl mb-3">{tier.icon}</div>
                      <h4 className="font-semibold mb-2">{tier.tier} Tier</h4>
                      <p className="text-sm text-muted-foreground">{tier.reward}</p>
                      {isUnlocked && (
                          <div className="mt-4 text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1 inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              UNLOCKED
                          </div>
                      )}
                      </Card>
                  );
              })}
            </CardContent>
          </Card>
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Redeem Your Points</CardTitle>
              <CardDescription>Use your points to claim exclusive rewards. The more you refer, the better the rewards!</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewardTiers.map(tier => {
                const isUnlocked = profile.points >= tier.requiredPoints;
                const isRedeemed = profile.rewards.some(r => r.rewardId === tier.id);
                return (
                  <Card key={tier.id} className={`flex flex-col overflow-hidden transition-all ${!isUnlocked && 'opacity-60'}`}>
                     <div className="relative">
                      <Image 
                        src={tier.image}
                        alt={tier.alt}
                        width={600}
                        height={400}
                        data-ai-hint={tier['data-ai-hint']}
                        className="object-cover aspect-[3/2]"
                      />
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Lock className="h-12 w-12 text-white/70" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h4 className="font-semibold text-lg">{tier.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 mb-4 flex-grow">{tier.reward}</p>
                      <div className="flex justify-between items-center mt-auto">
                        <span className="font-bold text-primary">{tier.requiredPoints.toLocaleString()} points</span>
                        {isRedeemed ? (
                          <Button variant="outline" size="sm" disabled>Redeemed</Button>
                        ) : (
                          <Button size="sm" onClick={() => handleOpenRedeemDialog(tier)} disabled={!isUnlocked}>Redeem</Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </div>
        
        <Footer />
      </div>
      
      <Dialog open={isVipDialogOpen} onOpenChange={setVipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join the VIP List</DialogTitle>
            <DialogDescription>
              Become a founding member for a one-time payment to unlock exclusive perks and 1.5x referral points.
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleJoinVip)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Number</FormLabel>
                    <FormControl><Input {...field} placeholder="0000 0000 0000 0000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry (MM/YY)</FormLabel>
                      <FormControl><Input {...field} placeholder="MM/YY" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="cvc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVC</FormLabel>
                      <FormControl><Input {...field} placeholder="123" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVipDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Confirm & Join VIP'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRedeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Redeem: {selectedReward?.title}</DialogTitle>
            <DialogDescription>Please provide your shipping details to receive your reward. We'll be in touch to confirm.</DialogDescription>
          </DialogHeader>
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(handleRedeemSubmit)} className="space-y-4 pt-4">
              <FormField
                control={addressForm.control}
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
                control={addressForm.control}
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
                control={addressForm.control}
                name="address2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={addressForm.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={addressForm.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State/Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={addressForm.control} name="zip" render={({ field }) => (
                  <FormItem><FormLabel>ZIP/Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={addressForm.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={addressForm.control} name="phone" render={({ field }) => (
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
