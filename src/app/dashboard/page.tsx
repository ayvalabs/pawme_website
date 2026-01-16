
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
import { User, Mail, Send, Truck, Package, PackageCheck, Save, ClipboardList } from 'lucide-react';
import { markRewardShipped } from '@/app/actions/users';
import { sendAdminBroadcast, sendShippingNotificationEmail } from '@/app/actions/email';
import type { UserProfile, Reward } from '@/app/context/AuthContext';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { defaultTemplates, type EmailTemplate } from '@/lib/email-templates';

type UserWithId = UserProfile & { id: string };
type RewardWithUser = Reward & { user: { id: string; name: string; email: string }, rewardTitle: string };

const getReferralTierIcon = (referralCount: number) => {
  if (referralCount >= 25) return '💎'; // Platinum
  if (referralCount >= 10) return '🥇'; // Gold
  if (referralCount >= 5) return '🥈'; // Silver
  if (referralCount >= 1) return '🥉'; // Bronze
  return '';
};

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

  const [welcomeTemplate, setWelcomeTemplate] = useState({ subject: '', html: '' });
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

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
      
      const fetchTemplates = async () => {
        setLoadingTemplate(true);
        try {
          const templates: EmailTemplate[] = [];
          // In a real app, you might fetch these from Firestore
          // For now, we'll use the defaults
          for (const key in defaultTemplates) {
              templates.push(defaultTemplates[key]);
          }
          setEmailTemplates(templates);

          const welcomeTemplateRef = doc(db, 'email_templates', 'welcome');
          const welcomeTemplateSnap = await getDoc(welcomeTemplateRef);
          if (welcomeTemplateSnap.exists()) {
              setWelcomeTemplate(welcomeTemplateSnap.data() as { subject: string, html: string });
          } else {
              setWelcomeTemplate(defaultTemplates.welcome);
          }

        } catch (error) {
          console.error("Error fetching email templates", error);
          toast.error("Could not load email templates from database.");
        } finally {
          setLoadingTemplate(false);
        }
      };

      fetchUsers();
      fetchTemplates();
    }
  }, [user, profile]);

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
        const templateRef = doc(db, 'email_templates', 'welcome');
        await setDoc(templateRef, welcomeTemplate);
        toast.success('Welcome email template saved!');
    } catch (e) {
        toast.error('Failed to save template.');
    } finally {
        setSavingTemplate(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'custom') {
      setSubject('');
      setBody('');
      return;
    }
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.html);
    }
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => u.email !== 'pawme@ayvalabs.com');
  }, [allUsers]);

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
    if (selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
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
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData: UserWithId[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as UserWithId);
      });
      
      setAllUsers(usersData);
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

          <Tabs defaultValue="broadcast" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
              <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="rewards">Reward Fulfillment ({pendingRewards.length})</TabsTrigger>
              <TabsTrigger value="templates">Email Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="broadcast" className="mt-4">
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
                                checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
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
                              <TableRow key={u.id} data-state={selectedUserIds.has(u.id) ? 'selected' : ''}>
                                <TableCell>
                                  <Checkbox checked={selectedUserIds.has(u.id)} onCheckedChange={() => handleSelectUser(u.id)} />
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

                  <Button onClick={handleSendBroadcast} disabled={sendingBroadcast || selectedUserIds.size === 0}>
                    <Send className="w-4 h-4 mr-2"/>
                    {sendingBroadcast ? 'Sending...' : `Send to ${selectedUserIds.size} users`}
                  </Button>
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
                            </TableRow>
                          ))
                        )}
                        {filteredUsers.length === 0 && !loadingUsers && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No referral members yet.</TableCell>
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
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList />
                    Welcome Email Template
                  </CardTitle>
                  <CardDescription>
                    Edit the template for the automated welcome email sent to new users. Use placeholders like {"{{userName}}"}, {"{{referralCode}}"}, {"{{referralLink}}"}, and {"{{vipBanner}}"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTemplate ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-64 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-subject">Subject</Label>
                        <Input 
                          id="template-subject" 
                          value={welcomeTemplate.subject} 
                          onChange={e => setWelcomeTemplate(prev => ({ ...prev, subject: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-body">Body (HTML)</Label>
                        <Textarea 
                          id="template-body"
                          value={welcomeTemplate.html}
                          onChange={e => setWelcomeTemplate(prev => ({...prev, html: e.target.value}))}
                          className="min-h-[400px] font-mono text-xs"
                        />
                      </div>
                      <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                        <Save className="w-4 h-4 mr-2" />
                        {savingTemplate ? 'Saving...' : 'Save Template'}
                      </Button>
                    </div>
                  )}
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

    