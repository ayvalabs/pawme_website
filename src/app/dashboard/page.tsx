
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent } from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { User, Mail, Send, Truck, Package, PackageCheck, FileText, Plus, Edit, Trash2, Eye, Lock, SettingsIcon, Upload } from 'lucide-react';
import { markRewardShipped } from '@/app/actions/users';
import { sendAdminBroadcast, sendShippingNotificationEmail } from '@/app/actions/email';
import type { UserProfile, Reward } from '@/app/context/AuthContext';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getAppSettings, type AppSettings, type ReferralTier, type RewardTier } from '@/app/actions/settings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import Image from 'next/image';
import { uploadRewardImages, saveAppSettings } from '@/app/services/adminService';
import { EmailPreview } from '@/app/components/email-template-editor';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

type UserWithId = UserProfile & { id: string };
type RewardWithUser = Reward & { user: { id: string; name: string; email: string }, rewardTitle: string };

const getReferralTierIcon = (referralCount: number) => {
  if (referralCount >= 25) return '💎'; // Platinum
  if (referralCount >= 10) return '🥇'; // Gold
  if (referralCount >= 5) return '🥈'; // Silver
  if (referralCount >= 1) return '🥉'; // Bronze
  return '';
};

const defaultRewardTiers: RewardTier[] = [
    {
      id: "chewy_starter_treats",
      title: "Chewy Starter Treats Pouch 🦴",
      reward: "A mixed pouch of bite-sized dog or cat treats, perfect for training sessions or robot-assisted playtime. Soft, high-value nibbles to keep tails wagging while PawMe works its magic.",
      requiredPoints: 10,
      price: 12.99,
      image: "https://picsum.photos/seed/chewytreats/600/400",
      alt: "Use a clean flatlay of a small resealable pouch spilling out assorted treats on a neutral background.",
      "data-ai-hint": "dog cat treats"
    },
    {
      id: "eco_poop_bag_holder",
      title: "Eco Poop-Bag Holder & Rolls 🌱",
      reward: "Clip-on poop-bag holder with a starter roll of eco-friendly bags. Attach it to your leash or PawMe robot leash handle so you never forget cleanup duty on walks.",
      requiredPoints: 12,
      price: 8.50,
      image: "https://picsum.photos/seed/poopbag/600/400",
      alt: "Show a small dispenser with colorful rolls of bags next to a leash.",
      "data-ai-hint": "poop bag holder"
    },
    {
      id: "feather_teaser_wand",
      title: "Feather Teaser Wand For Cats 🪶",
      reward: "A flexible teaser wand with soft feathers and bells to spark your cat’s hunting instincts. Great for interactive play before PawMe takes over nighttime monitoring.",
      requiredPoints: 14,
      price: 7.99,
      image: "https://picsum.photos/seed/featherwand/600/400",
      alt: "Capture a simple feather wand being played with by a cat or laid diagonally on a pastel background.",
      "data-ai-hint": "cat feather toy"
    },
    {
      id: "plush_squeaky_friend",
      title: "Plush Squeaky Friend 🧸",
      reward: "A soft, durable plush toy with an internal squeaker for dogs that love to pounce, shake, and cuddle. Designed to pair perfectly with PawMe’s playtime reminders.",
      requiredPoints: 18,
      price: 15.00,
      image: "https://picsum.photos/seed/plushdogtoy/600/400",
      alt: "Use a bright photo of a single plush dog toy (bone, animal, or robot theme).",
      "data-ai-hint": "dog plush toy"
    },
    {
      id: "interactive_treat_ball",
      title: "Interactive Treat Ball Puzzle 🧠",
      reward: "A rolling treat-dispensing ball that turns snack time into a brain game. Fill it with kibble or small treats and let your pet nudge and chase it while PawMe keeps watch.",
      requiredPoints: 20,
      price: 18.50,
      image: "https://picsum.photos/seed/dogtreatball/600/400",
      alt: "Show a translucent or colorful treat ball with a few kibbles around it.",
      "data-ai-hint": "dog treat puzzle"
    },
    {
      id: "natural_jerky_pack",
      title: "Natural Jerky Treat Pack 🍗",
      reward: "Grain-free, limited-ingredient jerky strips made for sensitive tummies. Ideal as a high-value reward after successful training sessions with your PawMe companion.",
      requiredPoints: 24,
      price: 16.00,
      image: "https://picsum.photos/seed/dogjerky/600/400",
      alt: "Use a kraft paper pouch with visible jerky strips for an artisanal look.",
      "data-ai-hint": "dog jerky"
    },
    {
      id: "grooming_wipes_bundle",
      title: "Aloe & Coconut Grooming Wipes 🧼",
      reward: "Gentle, hypoallergenic wipes for quick paw, coat, and muzzle cleanups after walks or playtime. Keep your pet camera-ready for every PawMe selfie.",
      requiredPoints: 26,
      price: 10.00,
      image: "https://picsum.photos/seed/petwipes/600/400",
      alt: "Show a packet of wipes with a dog or cat illustration on the label.",
      "data-ai-hint": "pet grooming wipes"
    },
    {
      id: "durable_tug_rope",
      title: "Durable Tug & Fetch Rope 💪",
      reward: "A tough cotton rope toy for tug-of-war and fetch sessions. Great for high-energy pups who need a good workout before settling down with PawMe.",
      requiredPoints: 30,
      price: 12.00,
      image: "https://picsum.photos/seed/dogropetoy/600/400",
      alt: "Rope toy in a simple composition; braided, with bright colors for visual pop.",
      "data-ai-hint": "dog rope toy"
    },
    {
      id: "snuffle_mat",
      title: "Snuffle Treasure Hunt Mat 🌿",
      reward: "A fleece snuffle mat that hides treats in its folds, encouraging natural foraging instincts. Perfect enrichment while PawMe monitors relaxation and stress levels.",
      requiredPoints: 36,
      price: 25.00,
      image: "https://picsum.photos/seed/snufflemat/600/400",
      alt: "Top-down view of a colorful snuffle mat with a few treats tucked inside.",
      "data-ai-hint": "dog snuffle mat"
    },
    {
      id: "smart_laser_cat_toy",
      title: "Smart Laser Chase Toy 🔦",
      reward: "An automatic laser toy that projects unpredictable patterns across the floor and walls, turning your living room into a cat playground while PawMe captures the action.",
      requiredPoints: 48,
      price: 30.00,
      image: "https://picsum.photos/seed/catlasertoy/600/400",
      alt: "Show a compact laser device on the ground with a cat chasing the dot.",
      "data-ai-hint": "cat laser toy"
    },
    {
      id: "deluxe_treat_variety_box",
      title: "Deluxe Variety Treat Box 🎁",
      reward: "A curated selection of premium dog or cat treats: crunchy biscuits, soft chews, and lickable rewards. A perfect way to celebrate hitting a big referral milestone.",
      requiredPoints: 60,
      price: 40.00,
      image: "https://picsum.photos/seed/pettreatbox/600/400",
      alt: "Use a gift-style box with dividers showing different treat types.",
      "data-ai-hint": "pet gift box"
    },
    {
      id: "custom_name_tag_collar",
      title: "Custom Name Tag & Collar Set 👑",
      reward: "A personalized collar and engraved name tag so your pet can show off their PawMe fame. Choose colors and fonts that match your robot’s personality.",
      requiredPoints: 80,
      price: 35.00,
      image: "https://picsum.photos/seed/dogcollartag/600/400",
      alt: "Photograph a collar and tag on a soft fabric or wooden surface, tag facing camera.",
      "data-ai-hint": "custom dog collar"
    },
    {
      id: "pawme_mini_box",
      title: "PawMe Mini Celebration Box 🎉",
      reward: "A one-off mini box inspired by premium pet subscriptions: 2 toys + 2 full-size treats tailored to your pet’s size and species. A taste of the VIP experience.",
      requiredPoints: 100,
      price: 25.00,
      image: "https://picsum.photos/seed/petsubscriptionbox/600/400",
      alt: "Show an open box with toys and treat bags neatly arranged, similar to top pet subscription boxes.",
      "data-ai-hint": "pet subscription box"
    }
];

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<UserWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingReward, setShippingReward] = useState<RewardWithUser | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [sendingShipping, setSendingShipping] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', html: '' });

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localVipSpots, setLocalVipSpots] = useState(100);
  const [localReferralTiers, setLocalReferralTiers] = useState<ReferralTier[]>([]);
  const [localRewardTiers, setLocalRewardTiers] = useState<RewardTier[]>([]);
  
  const [isRewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardTier | null>(null);
  const [editingRewardIndex, setEditingRewardIndex] = useState<number | null>(null);
  const [rewardImageFiles, setRewardImageFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    if (!authLoading && (!user || profile?.email !== 'pawme@ayvalabs.com')) {
      router.push('/');
    }
  }, [user, profile, authLoading, router]);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData: UserWithId[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as UserWithId);
      });
      
      setAllUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const appSettings = await getAppSettings();
      setSettings(appSettings);

      if (appSettings && appSettings.rewardTiers && appSettings.rewardTiers.length > 0) {
        setLocalRewardTiers(appSettings.rewardTiers);
      } else {
        setLocalRewardTiers(defaultRewardTiers);
      }

      if (appSettings) {
        setLocalVipSpots(appSettings.vipConfig?.totalSpots || 100);
        setLocalReferralTiers(appSettings.referralTiers || []);
      } else {
        setLocalRewardTiers(defaultRewardTiers);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings.');
      setLocalRewardTiers(defaultRewardTiers);
    }
    setLoadingSettings(false);
  }

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchAllUsers();
      fetchSettings();
    }
  }, [user, profile]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => u.email !== 'pawme@ayvalabs.com');
  }, [allUsers]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      const userToToggle = allUsers.find(u => u.id === userId);
      if (userToToggle && !userToToggle.marketingOptIn) {
        toast.error(`${userToToggle.name} has unsubscribed from marketing emails.`);
        return prev;
      }
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.filter(u => u.marketingOptIn).length && filteredUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.filter(u => u.marketingOptIn).map(u => u.id)));
    }
  };

  const handleSendBroadcast = async () => {
    if (selectedUserIds.size === 0) {
      toast.error("No users selected.");
      return;
    }
    if (!subject || !body) {
      toast.error("Subject and body are required.");
      return;
    }
    setSendingBroadcast(true);
    const selectedUsers = allUsers.filter(u => selectedUserIds.has(u.id));
    try {
      await sendAdminBroadcast(selectedUsers, subject, body);
      toast.success(`Email sent to ${selectedUsers.length} users.`);
      setSubject('');
      setBody('');
    } catch (error) {
      toast.error("Failed to send broadcast.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const pendingRewards = useMemo(() => {
    const rewards: RewardWithUser[] = [];
    allUsers.forEach(u => {
      if (u.rewards) {
        u.rewards.forEach(r => {
          if (r.status === 'pending') {
            rewards.push({ ...r, user: { id: u.id, name: u.name, email: u.email }, rewardTitle: r.rewardId });
          }
        });
      }
    });
    return rewards.sort((a,b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
  }, [allUsers]);

  const shippedRewards = useMemo(() => {
    const rewards: RewardWithUser[] = [];
    allUsers.forEach(u => {
      if (u.rewards) {
        u.rewards.forEach(r => {
          if (r.status === 'shipped') {
            rewards.push({ ...r, user: { id: u.id, name: u.name, email: u.email }, rewardTitle: r.rewardId });
          }
        });
      }
    });
    return rewards.sort((a,b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
  }, [allUsers]);

  const handleOpenShippingDialog = (reward: RewardWithUser) => {
    setShippingReward(reward);
    setTrackingCode('');
    setShippingDialogOpen(true);
  };

  const handleMarkAsShipped = async () => {
    if (!shippingReward || !trackingCode) {
      toast.error("Tracking code is required.");
      return;
    }
    setSendingShipping(true);
    try {
      await markRewardShipped(shippingReward.user.id, shippingReward.rewardId, shippingReward.redeemedAt, trackingCode);
      await sendShippingNotificationEmail({
        to: shippingReward.user.email,
        userName: shippingReward.user.name,
        rewardTitle: shippingReward.rewardTitle,
        trackingCode: trackingCode
      });
      toast.success(`Reward marked as shipped for ${shippingReward.user.name}.`);
      await fetchAllUsers();
      setShippingDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update reward status.");
    } finally {
      setSendingShipping(false);
    }
  };

  const handlePreview = (subject: string, body: string) => {
    if (!subject || !body) {
      toast.error('Subject and body are required to preview.');
      return;
    }
    
    setPreviewContent({ subject: subject, html: body });
    setPreviewOpen(true);
  };
  
  const handleSaveSettings = async (settingsToSave: Partial<AppSettings>) => {
    setSavingSettings(true);
    try {
      await saveAppSettings(settingsToSave);
      toast.success("Settings saved successfully!");
      await fetchSettings();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleReferralTierChange = (index: number, field: keyof ReferralTier, value: string | number) => {
    const newTiers = [...localReferralTiers];
    (newTiers[index] as any)[field] = field === 'count' ? Number(value) : value;
    setLocalReferralTiers(newTiers);
  };

  const handleAddReferralTier = () => {
    setLocalReferralTiers([...localReferralTiers, { count: 0, icon: '🎉', reward: '', tier: '' }]);
  };

  const handleRemoveReferralTier = (index: number) => {
    setLocalReferralTiers(localReferralTiers.filter((_, i) => i !== index));
  };
  
  const handleOpenRewardDialog = (reward: RewardTier | null, index: number | null = null) => {
    if (reward) {
      setEditingReward({ ...reward });
      setEditingRewardIndex(index);
    } else {
      setEditingReward({
        id: `new-reward-${Date.now()}`,
        title: '',
        requiredPoints: 0,
        price: 0,
        reward: '',
        image: '',
        alt: '',
        'data-ai-hint': '',
      });
      setEditingRewardIndex(null);
    }
    setRewardDialogOpen(true);
  };

  const handleDialogFieldChange = (field: keyof RewardTier, value: string | number) => {
    if (editingReward) {
      setEditingReward({ ...editingReward, [field]: value });
    }
  };

  const handleDialogImageChange = (file: File | null) => {
    if (file && editingReward) {
        const previewUrl = URL.createObjectURL(file);
        setEditingReward({ ...editingReward, image: previewUrl });
        setRewardImageFiles(prev => ({...prev, [editingReward.id]: file}));
    }
  };

  const handleSaveRewardFromDialog = async () => {
    if (!editingReward) return;

    setSavingSettings(true);
    
    const newLocalTiers = [...localRewardTiers];
    if (editingRewardIndex !== null) {
      newLocalTiers[editingRewardIndex] = editingReward;
    } else {
      newLocalTiers.push(editingReward);
    }

    try {
      const tiersWithUploadedImages = await uploadRewardImages(newLocalTiers, rewardImageFiles);
      await saveAppSettings({ rewardTiers: tiersWithUploadedImages });

      toast.success("Rewards updated successfully!");
      setLocalRewardTiers(tiersWithUploadedImages);
      setRewardImageFiles({});
      setRewardDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving reward:", error);
      toast.error(`Failed to save reward: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  };
  
  const handleRemoveRewardTier = (index: number) => {
    if (confirm('Are you sure you want to remove this reward tier?')) {
      const newTiers = localRewardTiers.filter((_, i) => i !== index);
      setLocalRewardTiers(newTiers);
      handleSaveSettings({ rewardTiers: newTiers });
    }
  };

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, rewards, and communications.</p>
          </div>

          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="rewards">Rewards ({pendingRewards.length})</TabsTrigger>
              <TabsTrigger value="email">Broadcast</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Application Settings</CardTitle>
                  <CardDescription>Manage referral tiers, rewards, and other application settings. Changes will be live immediately.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {loadingSettings ? <Skeleton className="h-64 w-full" /> : (
                    <>
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg">VIP Settings</h3>
                        <div className="flex items-center gap-4">
                          <Label htmlFor="vip-spots">Total VIP Spots</Label>
                          <Input id="vip-spots" type="number" value={localVipSpots} onChange={(e) => setLocalVipSpots(Number(e.target.value))} className="w-24" />
                          <Button onClick={() => handleSaveSettings({ vipConfig: { totalSpots: localVipSpots } })} disabled={savingSettings}>
                            {savingSettings ? 'Saving...' : 'Save VIP Spots'}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg">Referral Tiers (by referral count)</h3>
                        <div className="space-y-2">
                          {localReferralTiers.map((tier, index) => (
                            <div key={index} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center">
                              <Input value={tier.icon} onChange={(e) => handleReferralTierChange(index, 'icon', e.target.value)} className="w-16 text-center" placeholder="Icon"/>
                              <Input type="number" value={tier.count} onChange={(e) => handleReferralTierChange(index, 'count', e.target.value)} placeholder="Count"/>
                              <Input value={tier.tier} onChange={(e) => handleReferralTierChange(index, 'tier', e.target.value)} placeholder="Tier Name (e.g., Bronze)"/>
                              <Input value={tier.reward} onChange={(e) => handleReferralTierChange(index, 'reward', e.target.value)} placeholder="Reward Description"/>
                              <Button size="icon" variant="ghost" onClick={() => handleRemoveReferralTier(index)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleAddReferralTier}>Add Referral Tier</Button>
                          <Button onClick={() => handleSaveSettings({ referralTiers: localReferralTiers })} disabled={savingSettings}>
                            {savingSettings ? 'Saving...' : 'Save Referral Tiers'}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-lg">Point Rewards</h3>
                          <Button variant="outline" onClick={() => handleOpenRewardDialog(null)}>
                            <Plus className="w-4 h-4 mr-2"/>
                            Add Reward
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-20">Image</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Points</TableHead>
                                <TableHead>Price ($)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {localRewardTiers.map((tier, index) => (
                                <TableRow key={tier.id}>
                                  <TableCell>
                                    <ImageWithFallback src={tier.image || "https://picsum.photos/seed/placeholder/40/40"} alt={tier.alt || tier.title} width={40} height={40} className="rounded-md object-cover aspect-square bg-muted"/>
                                  </TableCell>
                                  <TableCell className="font-medium">{tier.title}</TableCell>
                                  <TableCell>{tier.requiredPoints}</TableCell>
                                  <TableCell>${tier.price ? tier.price.toFixed(2) : '0.00'}</TableCell>
                                  <TableCell className="text-right">
                                    <div className='inline-flex'>
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenRewardDialog(tier, index)}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleRemoveRewardTier(index)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {localRewardTiers.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center">No point rewards configured.</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="email" className="mt-4">
               <Card>
                <CardHeader>
                  <CardTitle>Email Broadcast</CardTitle>
                  <CardDescription>
                    Select users and compose a message to send an email broadcast.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>1. Select Recipients ({selectedUserIds.size} selected)</Label>
                     <div className="border rounded-md mt-2 max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox 
                                checked={selectedUserIds.size === filteredUsers.filter(u => u.marketingOptIn).length && filteredUsers.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingUsers ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                              </TableRow>
                            ))
                          ) : (
                            filteredUsers.map(u => (
                              <TableRow key={u.id} data-state={selectedUserIds.has(u.id) ? 'selected' : ''} className={!u.marketingOptIn ? 'opacity-50' : ''}>
                                <TableCell>
                                  {u.marketingOptIn ? (
                                    <Checkbox checked={selectedUserIds.has(u.id)} onCheckedChange={() => handleSelectUser(u.id)} />
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <div tabIndex={0}>
                                          <Lock className="w-4 h-4 text-muted-foreground" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{u.name} has unsubscribed.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{u.name}</TableCell>
                                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>2. Compose Email</Label>
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-normal text-muted-foreground">Subject</Label>
                      <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="A quick update from PawMe..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="body" className="text-sm font-normal text-muted-foreground">Body (HTML supported)</Label>
                      <Textarea id="body" value={body} onChange={e => setBody(e.target.value)} placeholder="Hi {{userName}}," className="min-h-[300px]" />
                      <p className="text-xs text-muted-foreground">You can use {'{{userName}}'} as a placeholder.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handlePreview(subject, body)} disabled={!subject || !body}>
                      <Eye className="w-4 h-4 mr-2"/>
                      Preview
                    </Button>
                    <Button onClick={handleSendBroadcast} disabled={sendingBroadcast || selectedUserIds.size === 0}>
                      <Send className="w-4 h-4 mr-2"/>
                      {sendingBroadcast ? 'Sending...' : `Send to ${selectedUserIds.size} users`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>A complete list of everyone who has joined the waitlist.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-center">Points</TableHead>
                          <TableHead className="text-center">Referrals</TableHead>
                          <TableHead className="text-center">Tier</TableHead>
                          <TableHead className="text-center">VIP</TableHead>
                          <TableHead className="text-center">Marketing</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingUsers ? (
                           Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          filteredUsers.map(u => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-muted-foreground">{u.email}</TableCell>
                              <TableCell className="text-center">{u.points}</TableCell>
                              <TableCell className="text-center">{u.referralCount || 0}</TableCell>
                              <TableCell className="text-center text-xl" title={getReferralTierIcon(u.referralCount || 0) ? "Referral Tier" : ""}>
                                {getReferralTierIcon(u.referralCount || 0)}
                              </TableCell>
                              <TableCell className="text-center">{u.isVip ? '👑' : ''}</TableCell>
                              <TableCell className="text-center">{u.marketingOptIn ? '✅' : '❌'}</TableCell>
                            </TableRow>
                          ))
                        )}
                        {filteredUsers.length === 0 && !loadingUsers && (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No referral members yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rewards">
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Package className="text-primary"/>Pending Shipments</CardTitle>
                    <CardDescription>{pendingRewards.length} rewards waiting to be shipped.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Reward</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingRewards.map(r => (
                            <TableRow key={`${r.user.id}-${r.redeemedAt}`}>
                              <TableCell>
                                <div className="font-medium">{r.user.name}</div>
                                <div className="text-xs text-muted-foreground">{new Date(r.redeemedAt).toLocaleDateString()}</div>
                              </TableCell>
                              <TableCell>{r.rewardTitle}</TableCell>
                              <TableCell>
                                <Button size="sm" onClick={() => handleOpenShippingDialog(r)}>
                                  <Truck className="w-4 h-4 mr-2"/>
                                  Ship
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                           {pendingRewards.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No pending rewards.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PackageCheck className="text-green-500"/>Shipped Rewards</CardTitle>
                    <CardDescription>{shippedRewards.length} rewards have been shipped.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Reward</TableHead>
                            <TableHead>Tracking #</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shippedRewards.map(r => (
                            <TableRow key={`${r.user.id}-${r.redeemedAt}`}>
                              <TableCell>
                                <div className="font-medium">{r.user.name}</div>
                                <div className="text-xs text-muted-foreground">{new Date(r.redeemedAt).toLocaleDateString()}</div>
                              </TableCell>
                              <TableCell>{r.rewardTitle}</TableCell>
                              <TableCell className="font-mono text-xs">{r.trackingCode}</TableCell>
                            </TableRow>
                          ))}
                           {shippedRewards.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No shipped rewards yet.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
      
      <Dialog open={isRewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRewardIndex !== null ? 'Edit Reward' : 'Add New Reward'}</DialogTitle>
            <DialogDescription>
              {editingRewardIndex !== null ? 'Update the details for this reward.' : 'Create a new reward that users can redeem with points.'}
            </DialogDescription>
          </DialogHeader>
          {editingReward && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-title" className="text-right">Title</Label>
                <Input id="reward-title" value={editingReward.title} onChange={(e) => handleDialogFieldChange('title', e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-points" className="text-right">Points</Label>
                <Input id="reward-points" type="number" value={editingReward.requiredPoints} onChange={(e) => handleDialogFieldChange('requiredPoints', Number(e.target.value))} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-price" className="text-right">Price ($)</Label>
                <Input id="reward-price" type="number" value={editingReward.price || ''} onChange={(e) => handleDialogFieldChange('price', Number(e.target.value))} placeholder="e.g. 25.99" className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-desc" className="text-right">Description</Label>
                <Textarea id="reward-desc" value={editingReward.reward} onChange={(e) => handleDialogFieldChange('reward', e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-image" className="text-right">Image</Label>
                <div className="col-span-3 flex items-center gap-4">
                  {editingReward.image && <ImageWithFallback src={editingReward.image} alt="preview" width={40} height={40} className="rounded-md object-cover aspect-square"/>}
                  <Input id="reward-image" type="file" accept="image/*" onChange={(e) => handleDialogImageChange(e.target.files ? e.target.files[0] : null)} />
                </div>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-alt" className="text-right">Alt Text</Label>
                <Input id="reward-alt" value={editingReward.alt} onChange={(e) => handleDialogFieldChange('alt', e.target.value)} className="col-span-3"/>
              </div>
            </div>
          )}
          <DialogFooterComponent>
            <Button variant="outline" onClick={() => setRewardDialogOpen(false)} disabled={savingSettings}>Cancel</Button>
            <Button onClick={handleSaveRewardFromDialog} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooterComponent>
        </DialogContent>
      </Dialog>
      
      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship Reward: {shippingReward?.rewardTitle}</DialogTitle>
            <DialogDescription>
              Enter the tracking code for the shipment to {shippingReward?.user.name}. An email notification will be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tracking-code">Tracking Code</Label>
              <Input id="tracking-code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
            </div>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
              <strong>Shipping to:</strong><br/>
              {shippingReward?.shippingAddress?.fullName}<br/>
              {shippingReward?.shippingAddress?.address1}<br/>
              {shippingReward?.shippingAddress?.address2 && <>{shippingReward?.shippingAddress?.address2}<br/></>}
              {shippingReward?.shippingAddress?.city}, {shippingReward?.shippingAddress?.state} {shippingReward?.shippingAddress?.zip}<br/>
              {shippingReward?.shippingAddress?.country}<br/>
              T: {shippingReward?.shippingAddress?.phone}
            </pre>
          </div>
          <DialogFooterComponent>
            <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkAsShipped} disabled={sendingShipping || !trackingCode}>
              {sendingShipping ? 'Sending...' : 'Mark Shipped & Notify'}
            </Button>
          </DialogFooterComponent>
        </DialogContent>
      </Dialog>
      
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              This is a preview of how the email will look. Placeholders are filled with sample data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow border-y flex flex-col overflow-hidden">
            <div className="p-3 px-6 border-b bg-muted text-sm">
              <strong>Subject:</strong> {previewContent.subject}
            </div>
            <iframe
              srcDoc={previewContent.html}
              className="w-full flex-grow border-0"
              title="Email Preview"
            />
          </div>
          <DialogFooterComponent className="p-6 pt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooterComponent>
        </DialogContent>
      </Dialog>
    </>
  );
}
