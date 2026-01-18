
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
    // ... default rewards
];

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<UserWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingReward, setShippingReward] = useState<RewardWithUser | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [sendingShipping, setSendingShipping] = useState(false);

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

  const fetchAdminData = async () => {
    setLoadingUsers(true);
    setLoadingSettings(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const [usersSnapshot, appSettings] = await Promise.all([
        getDocs(usersQuery),
        getAppSettings(),
      ]);

      const usersData: UserWithId[] = [];
      usersSnapshot.forEach((doc) => usersData.push({ id: doc.id, ...doc.data() } as UserWithId));
      setAllUsers(usersData);
      setLoadingUsers(false);
      
      setSettings(appSettings);
      setLocalVipSpots(appSettings?.vipConfig?.totalSpots || 100);
      setLocalReferralTiers(appSettings?.referralTiers || []);
      setLocalRewardTiers(appSettings?.rewardTiers || defaultRewardTiers);
      setLoadingSettings(false);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error("Failed to load dashboard data.");
    }
  };

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchAdminData();
    }
  }, [user, profile]);

  const handleSelectAll = () => {
    const marketingUsers = filteredUsers.filter(u => u.marketingOptIn).map(u => u.id);
    if (selectedUserIds.size === marketingUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(marketingUsers));
    }
  };
  
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

  const handleSendBroadcast = async () => {
    if (selectedUserIds.size === 0) {
      toast.error("No users selected.");
      return;
    }
    if (!broadcastSubject || !broadcastBody) {
      toast.error("Subject and body are required.");
      return;
    }
    setSendingBroadcast(true);
    const selectedUsers = allUsers.filter(u => selectedUserIds.has(u.id));
    try {
      await sendAdminBroadcast(selectedUsers, broadcastSubject, broadcastBody);
      toast.success(`Email sent to ${selectedUsers.length} users.`);
      setBroadcastSubject('');
      setBroadcastBody('');
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
      await fetchAdminData();
      setShippingDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update reward status.");
    } finally {
      setSendingShipping(false);
    }
  };

  const handleSaveSettings = async (settingsToSave: Partial<AppSettings>) => {
    setSavingSettings(true);
    try {
      await saveAppSettings(settingsToSave);
      toast.success("Settings saved successfully!");
      await fetchAdminData();
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
    // ... loading skeleton
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
            
            {/* Other TabsContent go here, using the existing component code */}
             <TabsContent value="settings" className="mt-4">{/* ... */}</TabsContent>
             <TabsContent value="email" className="mt-4">{/* ... */}</TabsContent>
             <TabsContent value="users" className="mt-4">{/* ... */}</TabsContent>
             <TabsContent value="rewards">{/* ... */}</TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    </>
  );
}
