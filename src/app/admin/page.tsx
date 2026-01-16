
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
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { User, Mail, Send, Truck, Package, PackageCheck } from 'lucide-react';
import { getAllUsers, markRewardShipped } from '@/app/actions/users';
import { sendAdminBroadcast, sendShippingNotificationEmail } from '@/app/actions/email';
import type { UserProfile, Reward } from '@/app/context/AuthContext';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';

type UserWithId = UserProfile & { id: string };
type RewardWithUser = Reward & { user: { id: string; name: string; email: string }, rewardTitle: string };

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

  useEffect(() => {
    if (!authLoading && (!user || profile?.email !== 'pawme@ayvalabs.com')) {
      router.push('/');
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const usersData = await getAllUsers();
          setAllUsers(usersData as UserWithId[]);
        } catch (error) {
          toast.error("Failed to load users.");
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [user, profile]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === allUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(allUsers.map(u => u.id)));
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
    return rewards;
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
    return rewards;
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
      // Refetch users to update the list
      const usersData = await getAllUsers();
      setAllUsers(usersData as UserWithId[]);
      setShippingDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update reward status.");
    } finally {
      setSendingShipping(false);
    }
  };

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Users ({allUsers.length})</TabsTrigger>
              <TabsTrigger value="rewards">Reward Fulfillment ({pendingRewards.length})</TabsTrigger>
              <TabsTrigger value="email">Email Broadcast</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>Select users to include in an email broadcast.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedUserIds.size === allUsers.length && allUsers.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-center">Points</TableHead>
                          <TableHead className="text-center">Redeemed</TableHead>
                          <TableHead className="text-center">VIP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingUsers ? (
                           Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          allUsers.map(u => (
                            <TableRow key={u.id} data-state={selectedUserIds.has(u.id) ? 'selected' : ''}>
                              <TableCell>
                                <Checkbox checked={selectedUserIds.has(u.id)} onCheckedChange={() => handleSelectUser(u.id)} />
                              </TableCell>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-muted-foreground">{u.email}</TableCell>
                              <TableCell className="text-center">{u.points}</TableCell>
                              <TableCell className="text-center">{u.rewards?.length || 0}</TableCell>
                              <TableCell className="text-center">{u.isVip ? '👑' : ''}</TableCell>
                            </TableRow>
                          ))
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
            <TabsContent value="email" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Broadcast</CardTitle>
                  <CardDescription>
                    Send an email to {selectedUserIds.size} selected user(s). You can use {'{{userName}}'} as a placeholder.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="A quick update from PawMe..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Body (HTML supported)</Label>
                    <Textarea id="body" value={body} onChange={e => setBody(e.target.value)} placeholder="Hi {{userName}}," className="min-h-[300px]" />
                  </div>
                  <Button onClick={handleSendBroadcast} disabled={sendingBroadcast || selectedUserIds.size === 0}>
                    <Send className="w-4 h-4 mr-2"/>
                    {sendingBroadcast ? 'Sending...' : `Send to ${selectedUserIds.size} users`}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>

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
    </>
  );
}
