'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Trophy, Users, TrendingUp, Crown, Medal, Award, Sparkles, Mail, Check, Copy, Share2, MessageCircle, Gift, Lock, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { toast } from 'sonner';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/ui/form';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
// import { loadStripe, type Stripe as StripeType } from '@stripe/stripe-js';
// import { Elements } from '@stripe/react-stripe-js';
// import { createPaymentIntent } from '@/app/actions/stripe';
import CheckoutForm from '@/app/components/CheckoutForm';
import { getAppSettings, AppSettings } from '@/app/actions/settings';
import { sendAccountDeletionCode } from '@/app/actions/auth';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/app/components/ui/input-otp';

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  rank: number;
}

function VipBanner({ userName, onJoinClick, spotsLeft }: { userName: string, onJoinClick: () => void, spotsLeft: number }) {
  return (
    <Card 
      onClick={onJoinClick}
      className="mb-8 bg-gradient-to-tr from-yellow-300/10 via-primary/10 to-yellow-300/10 border-primary/20 text-center p-6 shadow-lg cursor-pointer hover:shadow-primary/20 transition-shadow"
    >
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-3xl font-bold text-primary">
          👑 {userName}, join the VIP list! 👑
        </CardTitle>
        <CardDescription className="text-lg text-foreground/80">
          Become a founding member, get exclusive early bird pricing, and earn <span className="font-bold text-primary">1.5x points</span> for every referral!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="h-10 flex items-center justify-center">
            <p className="text-xl font-semibold bg-primary text-primary-foreground rounded-full px-6 py-2 inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Only {spotsLeft} spots left!
            </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketingOptInBanner({ onOptIn }: { onOptIn: () => void }) {
  return (
    <Card className="mb-8 bg-blue-500/10 border-blue-500/20">
      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Mail className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">Don't Miss Out!</h3>
            <p className="text-muted-foreground text-sm">
              Get the latest promotions and exclusive offers from PawMe.
            </p>
          </div>
        </div>
        <Button onClick={onOptIn} variant="outline" className="bg-transparent hover:bg-blue-500/10 border-blue-500/30 text-blue-600 hover:text-blue-500">Opt-In to Promotions</Button>
      </CardContent>
    </Card>
  );
}

function LeaderboardDisplay() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch top 8 users from Firestore (client-side with auth context)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('points', 'desc'), limit(8));
        const querySnapshot = await getDocs(q);
        
        const topUsers: LeaderboardUser[] = querySnapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            points: data.points,
            rank: index + 1,
          };
        });
        
        setLeaderboard(topUsers);
        setTotalUsers(topUsers.length);
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

  const displayedUsers = showAll ? leaderboard : leaderboard.slice(0, 3);

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
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center"><Skeleton className="h-5 w-5 rounded-full mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                displayedUsers.map((user) => {
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
        </div>
        {!loading && totalUsers > 3 && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowAll(!showAll)}
              className="gap-2"
            >
              {showAll ? (
                <>
                  <TrendingUp className="h-4 w-4 rotate-180" />
                  Show Less
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Show More ({totalUsers - 3} more)
                </>
              )}
            </Button>
          </div>
        )}
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

export default function LeaderboardPage() {
  const { user, profile, loading: authLoading, joinVip, redeemReward, updateMarketingPreference, refreshProfile, deleteAccount } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [vipCount, setVipCount] = useState(0);

  const [copied, setCopied] = useState(false);
  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${profile?.referralCode}` : '';

  const [receiverName, setReceiverName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const [isVipDialogOpen, setVipDialogOpen] = useState(false);
  const [isRedeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isOptInDialogOpen, setOptInDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionCode, setDeletionCode] = useState('');
  const [storedDeletionCode, setStoredDeletionCode] = useState('');
  const [deletionCodeExpiry, setDeletionCodeExpiry] = useState(0);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  // const [stripePromise] = useState(() => {
  //   const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  //   if (stripePublicKey) {
  //     return loadStripe(stripePublicKey);
  //   }
  //   return null;
  // });

  const addressForm = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: '', address1: '', address2: '', city: '', state: '', zip: '', country: '', phone: ''
    }
  });

  useEffect(() => {
    const fetchPageData = async () => {
      setLoadingSettings(true);
      try {
        // Refresh profile to get latest referral stats
        if (refreshProfile) {
          console.log('🔄 [LEADERBOARD] Refreshing profile data...');
          await refreshProfile();
        }
        
        const [appSettings, vipUsersSnapshot] = await Promise.all([
          getAppSettings(),
          getCountFromServer(query(collection(db, 'users'), where('isVip', '==', true)))
        ]);
        setSettings(appSettings);
        setVipCount(vipUsersSnapshot.data().count);
      } catch (error) {
        console.error("Failed to fetch page settings:", error);
        toast.error("Could not load page settings.");
      }
      setLoadingSettings(false);
    };

    if (!authLoading && user) {
      fetchPageData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Console log analytics data whenever profile updates
  useEffect(() => {
    if (profile) {
      console.log('========================================');
      console.log('📊 [ANALYTICS] Current Profile Data');
      console.log('========================================');
      console.log('User Name:', profile.name);
      console.log('User Email:', profile.email);
      console.log('Total Points:', profile.points || 0);
      console.log('Referral Count:', profile.referralCount || 0);
      console.log('Referral Code:', profile.referralCode);
      console.log('Is VIP:', profile.isVip || false);
      console.log('Rewards Unlocked:', profile.rewards?.length || 0);
      console.log('========================================\n');
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile && referralUrl) {
      const recipient = receiverName.trim() ? receiverName.trim() : 'there';
      // Generate personalized referral message with improved copy
      setShareMessage(
`Hi ${recipient}! 🐾

I just joined the PawMe waitlist and thought you'd love this!

PawMe is an AI-powered companion for pets with some amazing features:
• 📹 HD camera to check on your pet anytime
• 💚 Health monitoring to track their wellbeing  
• 🎯 Interactive laser play to keep them entertained
• 🤖 Smart AI that learns your pet's behavior

🎁 Join using my referral link and get 100 bonus points to unlock exclusive rewards:
${referralUrl}

The more friends who join, the higher we climb on the leaderboard - and the more rewards we unlock! 🏆

Let me know if you have any questions!

With paws and applause 🐾
${profile.name}

P.S. Limited spots available for early bird pricing!`
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

    const subject = `🐾 ${profile?.name} invited you to join PawMe!`;
    
    // Detect user's email provider from their profile
    const userEmail = profile?.email || '';
    const emailDomain = userEmail.split('@')[1]?.toLowerCase() || '';
    
    let emailUrl: string;
    let providerName: string;
    
    // Detect email provider and construct appropriate compose URL
    if (emailDomain.includes('gmail.com') || emailDomain.includes('googlemail.com')) {
      // Gmail
      emailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailAddress)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareMessage)}`;
      providerName = 'Gmail';
    } else if (emailDomain.includes('outlook.com') || emailDomain.includes('hotmail.com') || emailDomain.includes('live.com')) {
      // Outlook
      emailUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(emailAddress)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareMessage)}`;
      providerName = 'Outlook';
    } else if (emailDomain.includes('yahoo.com')) {
      // Yahoo Mail
      emailUrl = `https://compose.mail.yahoo.com/?to=${encodeURIComponent(emailAddress)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareMessage)}`;
      providerName = 'Yahoo Mail';
    } else {
      // Fallback to mailto for other providers
      emailUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareMessage)}`;
      providerName = 'your email client';
    }
    
    // Open email client
    window.open(emailUrl, '_blank');
    
    setEmailAddress('');
    setReceiverName('');
    toast.success(`${providerName} opened with your referral message!`);
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

  const finalizeVipJoin = async () => {
    try {
      await joinVip();
      setVipCount(v => v + 1); // Optimistic update
      toast.success("Welcome to the VIP list! 👑 You're now a founding member.");
    } catch (e) {
      toast.error('There was an issue updating your VIP status. Please contact support.');
    } finally {
      setVipDialogOpen(false);
    }
  };
  
  const handleOpenVipDialog = async () => {
    setIsSubmitting(true);
    // const res = await createPaymentIntent(100); // $1.00 deposit
    // if (res.clientSecret) {
    //   setClientSecret(res.clientSecret);
      setVipDialogOpen(true);
    // } else {
    //   toast.error(res.error || 'Could not initiate payment. Please try again later.');
    // }
    setIsSubmitting(false);
  };
  
  const handleOpenRedeemDialog = (reward: any) => {
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

  const handleOptIn = async () => {
    try {
      await updateMarketingPreference(true);
      toast.success("You've opted in to marketing messages!", {
        description: "You'll now receive our latest promotions and offers.",
      });
    } catch (e) {
      toast.error("There was an issue updating your preferences. Please try again.");
    } finally {
        setOptInDialogOpen(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user || !profile) return;
    
    setIsDeletingAccount(true);
    try {
      const result = await sendAccountDeletionCode({ email: user.email!, name: profile.name });
      if (result.success && result.code && result.expiresAt) {
        setStoredDeletionCode(result.code);
        setDeletionCodeExpiry(result.expiresAt);
        setDeleteDialogOpen(true);
        toast.success('Verification code sent to your email');
      } else {
        toast.error(result.message || 'Failed to send verification code');
      }
    } catch (error) {
      toast.error('Failed to send verification code. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (deletionCode !== storedDeletionCode) {
      toast.error('Invalid verification code');
      return;
    }

    if (Date.now() > deletionCodeExpiry) {
      toast.error('Verification code has expired. Please request a new one.');
      setDeleteDialogOpen(false);
      setDeletionCode('');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      toast.success('Your account has been deleted successfully');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
      setDeleteDialogOpen(false);
      setDeletionCode('');
    }
  };

  if (authLoading || loadingSettings || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const referralTiers = settings?.referralTiers || [];
  const rewardTiers = settings?.rewardTiers || [];
  const spotsLeft = Math.max(0, (settings?.vipConfig?.totalSpots || 100) - vipCount);

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <div className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
          {!profile.isVip && spotsLeft > 0 && (
            <VipBanner 
              userName={profile.name.split(' ')[0]} 
              onJoinClick={handleOpenVipDialog}
              spotsLeft={spotsLeft}
            />
          )}

          {profile && !profile.marketingOptIn && (
            <MarketingOptInBanner onOptIn={() => setOptInDialogOpen(true)} />
          )}

          {/* Analytics Cards */}
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

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Redeem Your Points</CardTitle>
              <CardDescription>Use your points to claim exclusive rewards. The more you refer, the better the rewards!</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewardTiers.map(tier => {
                const isUnlocked = profile.points >= tier.requiredPoints;
                const isRedeemed = profile.rewards.some(r => r.rewardId === tier.id);
                const pointsNeeded = tier.requiredPoints - profile.points;
                return (
                  <Card key={tier.id} className={`flex flex-col overflow-hidden transition-all ${!isUnlocked ? 'opacity-70 border-muted' : 'border-primary/20'}`}>
                     <div className="relative">
                      <ImageWithFallback 
                        src={tier.image}
                        alt={tier.alt}
                        className={`object-cover aspect-[3/2] w-full ${!isUnlocked ? 'grayscale' : ''}`}
                      />
                      {tier.price && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs font-bold py-1 px-2 rounded-full backdrop-blur-sm">
                          ${tier.price.toFixed(2)} Value
                        </div>
                      )}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                          <Lock className="h-12 w-12 text-white/90 mb-2" />
                          <div className="bg-destructive/90 text-white text-xs font-bold py-1 px-3 rounded-full">
                            🔒 LOCKED
                          </div>
                        </div>
                      )}
                      {isRedeemed && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold py-1 px-3 rounded-full flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Redeemed
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-lg">{tier.title}</h4>
                        {!isUnlocked && !isRedeemed && (
                          <Badge variant="secondary" className="text-xs">
                            Need {pointsNeeded.toLocaleString()} pts
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 mb-4 flex-grow">{tier.reward}</p>
                      <div className="flex justify-between items-center mt-auto gap-2">
                        <span className={`font-bold ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                          {tier.requiredPoints.toLocaleString()} points
                        </span>
                        {isRedeemed ? (
                          <Button variant="outline" size="sm" disabled className="bg-green-50">
                            <Check className="h-4 w-4 mr-1" />
                            Redeemed
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenRedeemDialog(tier)} 
                            disabled={!isUnlocked}
                            className={!isUnlocked ? 'cursor-not-allowed' : ''}
                          >
                            {!isUnlocked ? (
                              <>
                                <Lock className="h-4 w-4 mr-1" />
                                Locked
                              </>
                            ) : (
                              'Redeem'
                            )}
                          </Button>
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
        
        {/* Delete Account Link - Not too obvious */}
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="text-center">
            <button
              onClick={handleRequestDeletion}
              disabled={isDeletingAccount}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors underline"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
      
      <Dialog open={isVipDialogOpen} onOpenChange={setVipDialogOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="flex min-h-[550px]">
            <div className="w-1/2 p-8 flex flex-col justify-between">
              <div>
                <DialogHeader>
                  <DialogTitle className="text-2xl">Become a PawMe VIP</DialogTitle>
                  <DialogDescription>
                    Make a $1.00 fully refundable deposit to secure your spot as a founding member.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6">
                  <CheckoutForm onSuccess={finalizeVipJoin} />
                </div>
              </div>
               <p className="text-xs text-muted-foreground mt-4 text-center">
                This is a fully refundable $1.00 deposit. You can request a refund at any time before our Kickstarter launch.
              </p>
            </div>
            <div className="relative hidden w-1/2 flex-col justify-between rounded-r-lg bg-gradient-to-br from-primary/20 via-secondary to-primary/20 p-8 md:flex">
                <div className="absolute inset-0 z-0">
                    <ImageWithFallback
                        src="https://picsum.photos/seed/vip-pet/600/800"
                        alt="A happy pet"
                        data-ai-hint="happy pet"
                        className="size-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </div>
                <div className="relative z-10">
                    <div className="mb-4 text-2xl font-bold">
                    Founding Member Benefits
                    </div>
                    <p className="text-sm text-muted-foreground">
                    Your small deposit unlocks big rewards and helps us build the best companion for your pet.
                    </p>
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-start gap-3">
                      <Star className="mt-1 size-5 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Earn 1.5x Points</span> on all referrals, forever.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Sparkles className="mt-1 size-5 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Exclusive Discounts</span> on our Kickstarter launch.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="mt-1 size-5 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Guaranteed Early Bird</span> access to the best deals.</p>
                    </div>
                </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRedeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
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

      <AlertDialog open={isOptInDialogOpen} onOpenChange={setOptInDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Receive Promotions?</AlertDialogTitle>
            <AlertDialogDescription>
              By clicking "Agree", you agree to receive promotional and marketing emails from PawMe. You can unsubscribe at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOptIn}>Agree</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setDeletionCode('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p className="font-semibold text-destructive">
                ⚠️ Warning: This action is permanent and cannot be undone.
              </p>
              <p>
                Deleting your account will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Remove all your personal data</li>
                <li>Delete your referral code and links</li>
                <li>Forfeit all earned points and rewards</li>
                <li>Remove you from the leaderboard</li>
              </ul>
              <p className="pt-2">
                A verification code has been sent to your email. Please enter it below to confirm deletion.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deletion-code">Verification Code</Label>
              <InputOTP
                maxLength={4}
                value={deletionCode}
                onChange={(value) => setDeletionCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingAccount}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeletion}
              disabled={isDeletingAccount || deletionCode.length !== 4}
              className="w-full sm:w-auto"
            >
              {isDeletingAccount ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
