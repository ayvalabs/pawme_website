
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
import { User, Mail, Send, Truck, Package, PackageCheck, FileText, Plus, Edit, Trash2, Eye, Lock } from 'lucide-react';
import { markRewardShipped } from '@/app/actions/users';
import { sendAdminBroadcast, sendShippingNotificationEmail } from '@/app/actions/email';
import type { UserProfile, Reward } from '@/app/context/AuthContext';
import type { EmailTemplate } from '@/app/actions/email-templates';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

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

  // Email template management state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  // Template form state
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateVariables, setTemplateVariables] = useState('');
  
  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', html: '' });

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

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchAllUsers();
      fetchEmailTemplates();
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="rewards">Rewards ({pendingRewards.length})</TabsTrigger>
              <TabsTrigger value="email">Broadcast</TabsTrigger>
              <TabsTrigger value="templates">Templates ({emailTemplates.length})</TabsTrigger>
            </TabsList>
            
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
                                    <Lock className="w-4 h-4 text-muted-foreground" title={`${u.name} has unsubscribed.`}/>
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
                          emailTemplates.map(template => (
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
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive"/>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
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

      {/* Template Editor Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the email template details.' : 'Create a new reusable email template.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow space-y-4 overflow-y-auto pr-2">
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

              <div className="space-y-2">
                <Label htmlFor="template-html">HTML Content *</Label>
                <Textarea 
                  id="template-html" 
                  value={templateHtml} 
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  placeholder="Enter HTML email content..."
                  className="font-mono text-sm min-h-[400px]"
                />
              </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => handlePreview(templateSubject, templateHtml)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
            </Button>
            <div className="flex-grow" />
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
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
