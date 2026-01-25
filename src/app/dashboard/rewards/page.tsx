'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { Truck, Package, PackageCheck, Plus, Edit, Trash2, Gift, LayoutGrid, List } from 'lucide-react';
import { markRewardShipped } from '@/app/actions/users';
import { sendShippingNotificationEmail } from '@/app/actions/email';
import { getAppSettings, type AppSettings, type RewardTier } from '@/app/actions/settings';
import { uploadRewardImages, saveAppSettings } from '@/app/services/adminService';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { UserProfile, Reward } from '@/app/context/AuthContext';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

type UserWithId = UserProfile & { id: string };
type RewardWithUser = Reward & { user: { id: string; name: string; email: string }, rewardTitle: string };

const defaultRewardTiers: RewardTier[] = [
  {
    id: "chewy_starter_treats",
    title: "Chewy Starter Treats Pouch 🦴",
    reward: "A mixed pouch of bite-sized dog or cat treats, perfect for training sessions or robot-assisted playtime.",
    requiredPoints: 10,
    price: 12.99,
    image: "https://picsum.photos/seed/chewytreats/600/400",
    alt: "Treat pouch",
    "data-ai-hint": "dog cat treats"
  },
];

export default function RewardsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<UserWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingReward, setShippingReward] = useState<RewardWithUser | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [sendingShipping, setSendingShipping] = useState(false);
  
  const [localRewardTiers, setLocalRewardTiers] = useState<RewardTier[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [savingRewards, setSavingRewards] = useState(false);
  const [isRewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardTier | null>(null);
  const [editingRewardIndex, setEditingRewardIndex] = useState<number | null>(null);
  const [rewardImageFiles, setRewardImageFiles] = useState<Record<string, File>>({});
  const [catalogView, setCatalogView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchAllUsers();
      fetchRewardCatalog();
    }
  }, [user, profile]);

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

  const fetchRewardCatalog = async () => {
    setLoadingRewards(true);
    try {
      const appSettings = await getAppSettings();
      if (appSettings && appSettings.rewardTiers && appSettings.rewardTiers.length > 0) {
        setLocalRewardTiers(appSettings.rewardTiers);
      } else {
        setLocalRewardTiers(defaultRewardTiers);
      }
    } catch (error) {
      console.error('Error fetching reward catalog:', error);
      toast.error('Failed to load reward catalog.');
      setLocalRewardTiers(defaultRewardTiers);
    } finally {
      setLoadingRewards(false);
    }
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

    setSavingRewards(true);
    
    const newLocalTiers = [...localRewardTiers];
    if (editingRewardIndex !== null) {
      newLocalTiers[editingRewardIndex] = editingReward;
    } else {
      newLocalTiers.push(editingReward);
    }

    try {
      const tiersWithUploadedImages = await uploadRewardImages(newLocalTiers, rewardImageFiles);
      await saveAppSettings({ rewardTiers: tiersWithUploadedImages });
      
      toast.success("Reward saved successfully!");
      setRewardDialogOpen(false);
      setRewardImageFiles({});
      await fetchRewardCatalog();
    } catch (error: any) {
      console.error('Error saving reward:', error);
      toast.error(error.message || "Failed to save reward.");
    } finally {
      setSavingRewards(false);
    }
  };

  const handleRemoveRewardTier = async (index: number) => {
    if (!confirm(`Are you sure you want to delete this reward? This cannot be undone.`)) {
      return;
    }

    setSavingRewards(true);
    try {
      const newTiers = localRewardTiers.filter((_, i) => i !== index);
      await saveAppSettings({ rewardTiers: newTiers });
      toast.success("Reward deleted successfully!");
      await fetchRewardCatalog();
    } catch (error: any) {
      console.error('Error deleting reward:', error);
      toast.error(error.message || "Failed to delete reward.");
    } finally {
      setSavingRewards(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Rewards Management</h1>
        <p className="text-muted-foreground">Manage reward catalog and track shipments</p>
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog">
            <Gift className="w-4 h-4 mr-2"/>
            Reward Catalog
          </TabsTrigger>
          <TabsTrigger value="shipments">
            <Package className="w-4 h-4 mr-2"/>
            Shipments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reward Catalog</CardTitle>
                  <CardDescription>Manage rewards that users can redeem with points</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md">
                    <Button 
                      variant={catalogView === 'grid' ? 'default' : 'ghost'} 
                      size="sm"
                      onClick={() => setCatalogView('grid')}
                      className="rounded-r-none"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant={catalogView === 'list' ? 'default' : 'ghost'} 
                      size="sm"
                      onClick={() => setCatalogView('list')}
                      className="rounded-l-none"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button onClick={() => handleOpenRewardDialog(null)}>
                    <Plus className="w-4 h-4 mr-2"/>
                    Add Reward
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {catalogView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingRewards ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <div className="aspect-video bg-muted animate-pulse" />
                        <CardContent className="p-4">
                          <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                        </CardContent>
                      </Card>
                    ))
                  ) : localRewardTiers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No rewards configured.
                    </div>
                  ) : (
                    localRewardTiers.map((tier, index) => (
                      <Card key={tier.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                        <div className="relative aspect-video bg-muted overflow-hidden">
                          <ImageWithFallback 
                            src={tier.image || "https://picsum.photos/seed/placeholder/400/300"} 
                            alt={tier.alt || tier.title} 
                            width={400}
                            height={300}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleOpenRewardDialog(tier, index)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleRemoveRewardTier(index)} 
                              disabled={savingRewards}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{tier.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tier.reward}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{tier.requiredPoints} pts</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-sm font-medium">${tier.price ? tier.price.toFixed(2) : '0.00'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
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
                      {loadingRewards ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <>
                          {localRewardTiers.map((tier, index) => (
                            <TableRow key={tier.id}>
                              <TableCell>
                                <ImageWithFallback 
                                  src={tier.image || "https://picsum.photos/seed/placeholder/40/40"} 
                                  alt={tier.alt || tier.title} 
                                  width={40} 
                                  height={40} 
                                  className="rounded-md object-cover aspect-square bg-muted"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{tier.title}</TableCell>
                              <TableCell>{tier.requiredPoints}</TableCell>
                              <TableCell>${tier.price ? tier.price.toFixed(2) : '0.00'}</TableCell>
                              <TableCell className="text-right">
                                <div className='inline-flex'>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenRewardDialog(tier, index)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRewardTier(index)} disabled={savingRewards}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {localRewardTiers.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">No rewards configured.</TableCell>
                            </TableRow>
                          )}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="text-primary"/>
              Pending Shipments
            </CardTitle>
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
                  {pendingRewards.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No pending rewards.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="text-green-500"/>
              Shipped Rewards
            </CardTitle>
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
                  {shippedRewards.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No shipped rewards yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>
      </Tabs>

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
                <Input id="reward-price" type="number" step="0.01" value={editingReward.price || ''} onChange={(e) => handleDialogFieldChange('price', Number(e.target.value))} placeholder="e.g. 25.99" className="col-span-3"/>
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
            <Button variant="outline" onClick={() => setRewardDialogOpen(false)} disabled={savingRewards}>Cancel</Button>
            <Button onClick={handleSaveRewardFromDialog} disabled={savingRewards}>
              {savingRewards ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
