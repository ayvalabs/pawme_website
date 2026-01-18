
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { User, Mail, Send, Truck, Package, PackageCheck, FileText, Plus, Edit, Trash2, Eye, Lock, SettingsIcon, Upload } from 'lucide-react';
import { markRewardShipped } from '@/app/actions/users';
import { sendAdminBroadcast, sendShippingNotificationEmail } from '@/app/actions/email';
import type { UserProfile, Reward } from '@/app/context/AuthContext';
import type { EmailTemplate } from '@/app/actions/email-templates';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAppSettings, type AppSettings, type ReferralTier, type RewardTier } from '@/app/actions/settings';
import { defaultTemplates } from '@/lib/email-templates';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import Image from 'next/image';
import { uploadRewardImages, saveAppSettings } from '@/app/services/adminService';
import { EmailTemplateEditor, EmailPreview } from '@/app/components/email-template-editor';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { ScrollArea } from '@/app/components/ui/scroll-area';

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
    id: 'treats-1',
    title: 'Premium Organic Treats',
    reward: '🐾 A bag of delicious, high-quality organic treats.',
    requiredPoints: 500,
    image: 'https://picsum.photos/seed/reward1/600/400',
    alt: 'A pack of premium organic pet treats',
    'data-ai-hint': 'pet treats'
  },
  {
    id: 'toy-1',
    title: 'Interactive Puzzle Toy',
    reward: '🧠 A fun and engaging puzzle toy to keep your pet\'s mind sharp.',
    requiredPoints: 1000,
    image: 'https://picsum.photos/seed/reward2/600/400',
    alt: 'An interactive smart puzzle toy for pets',
    'data-ai-hint': 'pet toy'
  },
  {
    id: 'collar-1',
    title: 'Stylish Personalized Collar',
    reward: '✨ A stylish and durable leather collar, personalized with your pet\'s name.',
    requiredPoints: 1500,
    image: 'https://picsum.photos/seed/reward3/600/400',
    alt: 'A stylish personalized leather pet collar',
    'data-ai-hint': 'dog collar'
  },
  {
    id: 'bed-1',
    title: 'Orthopedic Pet Bed',
    reward: '😴 A luxurious and comfortable orthopedic bed for the perfect nap.',
    requiredPoints: 3000,
    image: 'https://picsum.photos/seed/reward5/600/400',
    alt: 'A luxurious orthopedic memory foam pet bed',
    'data-ai-hint': 'dog bed'
  },
  {
    id: 'feeder-1',
    title: 'Automated Smart Feeder',
    reward: '🍽️ A smart feeder that automates feeding schedules with portion control.',
    requiredPoints: 5000,
    image: 'https://picsum.photos/seed/reward6/600/400',
    alt: 'A smart automated pet feeder with portion control',
    'data-ai-hint': 'smart feeder'
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

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateVariables, setTemplateVariables] = useState('');
  
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

  const fetchEmailTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const templatesRef = collection(db, 'emailTemplates');
      const q = query(templatesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const templatesData: EmailTemplate[] = [];
      querySnapshot.forEach((doc) => {
        templatesData.push(doc.data() as EmailTemplate);
      });
      
      setEmailTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("Failed to load email templates.");
    } finally {
      setLoadingTemplates(false);
    }
  }

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const appSettings = await getAppSettings();
      if (appSettings) {
        setSettings(appSettings);
        setLocalVipSpots(appSettings.vipConfig?.totalSpots || 100);
        setLocalReferralTiers(appSettings.referralTiers || []);
        
        const validRewardTiers = (appSettings.rewardTiers || []).filter(tier => tier.image && !tier.image.startsWith('blob:'));
        if (appSettings.rewardTiers && validRewardTiers.length < appSettings.rewardTiers.length) {
          toast.warning("Corrupt reward data found", {
            description: "Some rewards had invalid image URLs and were ignored. Please re-save your rewards.",
          });
        }
        
        if (validRewardTiers.length > 0) {
            setLocalRewardTiers(validRewardTiers);
        } else {
            setLocalRewardTiers(defaultRewardTiers);
        }
      } else {
        setLocalRewardTiers(defaultRewardTiers);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings.');
    }
    setLoadingSettings(false);
  }

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchAllUsers();
      fetchEmailTemplates();
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

  const handleOpenTemplateDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateId(template.id);
      setTemplateName(template.name);
      setTemplateSubject(template.subject);
      setTemplateHtml(template.html);
      setTemplateVariables(template.variables.join(', '));
    } else {
      setEditingTemplate(null);
      setTemplateId('');
      setTemplateName('');
      setTemplateSubject('');
      setTemplateHtml('');
      setTemplateVariables('');
    }
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateId || !templateName || !templateSubject || !templateHtml) {
      toast.error("All fields are required.");
      return;
    }

    try {
      const variables = templateVariables.split(',').map(v => v.trim()).filter(v => v);
      const templateData: Omit<EmailTemplate, 'createdAt' | 'updatedAt'> = {
        id: templateId,
        name: templateName,
        subject: templateSubject,
        html: templateHtml,
        variables,
      };

      const templateRef = doc(db, 'emailTemplates', templateId);
      
      if (editingTemplate) {
        await updateDoc(templateRef, { ...templateData, updatedAt: new Date().toISOString() });
        toast.success("Template updated successfully!");
      } else {
        await setDoc(templateRef, { ...templateData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        toast.success("Template created successfully!");
      }

      await fetchEmailTemplates();
      setTemplateDialogOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template.");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if(Object.keys(defaultTemplates).includes(templateId)){
      toast.error("Cannot delete a default system template.");
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the template "${templateId}"? This cannot be undone.`)) {
      return;
    }

    try {
      const templateRef = doc(db, 'emailTemplates', templateId);
      await deleteDoc(templateRef);
      
      setEmailTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success("Template deleted successfully!");
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template.");
    }
  };
  
  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'custom') {
      setSubject('');
      setBody('');
      return;
    }
    const selectedTemplate = emailTemplates.find(t => t.id === templateId);
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject);
      setBody(selectedTemplate.html);
    }
  };
  
  const handlePreview = (subject: string, body: string) => {
    if (!subject || !body) {
      toast.error('Subject and body are required to preview.');
      return;
    }
    
    let previewHtml = body.replace(/{{userName}}/g, 'John Doe');
    let previewSubject = subject.replace(/{{userName}}/g, 'John Doe');
    
    setPreviewContent({ subject: previewSubject, html: previewHtml });
    setPreviewOpen(true);
  };
  
  const handleSaveSettings = async (settingsToSave: Partial<AppSettings>) => {
    setSavingSettings(true);
    try {
      await saveAppSettings(settingsToSave);
      toast.success("Settings saved successfully!");
      await fetchSettings();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings.");
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

  const handleSaveRewardFromDialog = () => {
    if (!editingReward) return;

    const newLocalTiers = [...localRewardTiers];

    if (editingRewardIndex !== null) {
      // Update existing reward
      newLocalTiers[editingRewardIndex] = editingReward;
    } else {
      // Add new reward
      newLocalTiers.push(editingReward);
    }

    setLocalRewardTiers(newLocalTiers);
    setRewardDialogOpen(false);
  };
  
  const handleRemoveRewardTier = (index: number) => {
    if (confirm('Are you sure you want to remove this reward tier?')) {
      const newTiers = localRewardTiers.filter((_, i) => i !== index);
      setLocalRewardTiers(newTiers);
    }
  };

  const handleSaveRewardTiers = async () => {
    setSavingSettings(true);
    try {
      const tiersWithUploadedImages = await uploadRewardImages(localRewardTiers, rewardImageFiles);
      await saveAppSettings({ rewardTiers: tiersWithUploadedImages });

      toast.success("Point Rewards saved successfully!");
      await fetchSettings();
      setRewardImageFiles({}); // Clear the staged files
    } catch (error) {
      console.error("Error saving point rewards:", error);
      toast.error("Failed to save point rewards. Check the console for details.");
    } finally {
      setSavingSettings(false);
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="rewards">Rewards ({pendingRewards.length})</TabsTrigger>
              <TabsTrigger value="email">Broadcast</TabsTrigger>
              <TabsTrigger value="templates">Templates ({emailTemplates.length})</TabsTrigger>
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
                                  <TableCell colSpan={4} className="h-24 text-center">No point rewards configured.</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button onClick={handleSaveRewardTiers} disabled={savingSettings}>
                            {savingSettings ? 'Saving...' : 'Save All Point Rewards'}
                          </Button>
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
                                          <Lock className="w-4 h-4 text-muted-foreground" />
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

                  <div className="space-y-2">
                    <Label htmlFor="template">2. Choose a Template (Optional)</Label>
                    <Select onValueChange={handleTemplateChange}>
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Start with a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Email</SelectItem>
                        {emailTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>3. Compose Email</Label>
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
            <TabsContent value="templates" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Email Templates</CardTitle>
                      <CardDescription>Manage email templates for automated communications.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenTemplateDialog()}>
                      <Plus className="w-4 h-4 mr-2"/>
                      New Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTemplates ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TooltipProvider>
                            {emailTemplates.map(template => {
                              const isDefaultTemplate = Object.keys(defaultTemplates).includes(template.id);
                              return (
                                <TableRow key={template.id}>
                                  <TableCell className="font-medium">{template.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{template.subject}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(template.updatedAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex gap-1 justify-end">
                                      <Button size="icon" variant="ghost" onClick={() => handlePreview(template.subject, template.html)}>
                                        <Eye className="w-4 h-4"/>
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => handleOpenTemplateDialog(template)}>
                                        <Edit className="w-4 h-4"/>
                                      </Button>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div tabIndex={0}>
                                            <Button size="icon" variant="ghost" onClick={() => handleDeleteTemplate(template.id)} disabled={isDefaultTemplate}>
                                              <Trash2 className="w-4 h-4 text-destructive"/>
                                            </Button>
                                          </div>
                                        </TooltipTrigger>
                                        {isDefaultTemplate && (
                                          <TooltipContent>
                                            <p>Default templates cannot be deleted.</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TooltipProvider>
                        )}
                        {emailTemplates.length === 0 && !loadingTemplates && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              No email templates yet. Click "New Template" to create one.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRewardFromDialog}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          <div className="flex h-full">
            {/* Left Panel - Editor */}
            <div className="w-1/2 flex flex-col border-r">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                <DialogDescription>
                  {editingTemplate ? 'Update the email template details.' : 'Create a new reusable email template.'}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-grow">
                <div className="space-y-4 p-6 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-id">Template ID *</Label>
                      <Input 
                        id="template-id" 
                        value={templateId} 
                        onChange={(e) => setTemplateId(e.target.value)}
                        placeholder="e.g., welcome, shipping"
                        disabled={!!editingTemplate}
                      />
                      <p className="text-xs text-muted-foreground">Unique identifier, no spaces.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name *</Label>
                      <Input 
                        id="template-name" 
                        value={templateName} 
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Welcome Email"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-subject">Email Subject *</Label>
                    <Input 
                      id="template-subject" 
                      value={templateSubject} 
                      onChange={(e) => setTemplateSubject(e.target.value)}
                      placeholder="e.g., Welcome to PawMe! 🐾"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-variables">Variables (comma-separated)</Label>
                    <Input 
                      id="template-variables" 
                      value={templateVariables} 
                      onChange={(e) => setTemplateVariables(e.target.value)}
                      placeholder="e.g., userName, referralCode"
                    />
                    <p className="text-xs text-muted-foreground">Use as {'{{variableName}}'} in your HTML.</p>
                  </div>

                  <EmailTemplateEditor
                    value={templateHtml}
                    onChange={setTemplateHtml}
                    placeholder="Enter HTML email content..."
                  />
                </div>
              </ScrollArea>
              
              <DialogFooter className="p-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </DialogFooter>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="w-1/2 flex flex-col bg-muted/30">
              <div className="p-6 pb-4 border-b bg-background">
                <h3 className="text-lg font-semibold">Live Preview</h3>
                <p className="text-sm text-muted-foreground">See how your email will look with sample data</p>
              </div>
              <div className="flex-grow p-6">
                <EmailPreview
                  subject={templateSubject}
                  html={templateHtml}
                />
              </div>
            </div>
          </div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkAsShipped} disabled={sendingShipping || !trackingCode}>
              {sendingShipping ? 'Sending...' : 'Mark Shipped & Notify'}
            </Button>
          </DialogFooter>
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
          <DialogFooter className="p-6 pt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

