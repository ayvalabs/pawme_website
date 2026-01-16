
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
import { User, Mail, Send, Truck, Package, PackageCheck, FileText, Plus, Edit, Trash2, Eye } from 'lucide-react';
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
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  
  // Template form state
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateVariables, setTemplateVariables] = useState('');

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
      fetchUsers();
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      const fetchTemplates = async () => {
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
      };
      fetchTemplates();
    }
  }, [user, profile]);

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
      // Refetch users to update the list
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
      const templateData: EmailTemplate = {
        id: templateId,
        name: templateName,
        subject: templateSubject,
        html: templateHtml,
        variables,
        createdAt: editingTemplate?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const templateRef = doc(db, 'emailTemplates', templateId);
      
      if (editingTemplate) {
        await updateDoc(templateRef, {
          name: templateName,
          subject: templateSubject,
          html: templateHtml,
          variables,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Template updated successfully!");
      } else {
        await setDoc(templateRef, templateData);
        toast.success("Template created successfully!");
      }

      // Refetch templates
      const templatesRef = collection(db, 'emailTemplates');
      const q = query(templatesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const templatesData: EmailTemplate[] = [];
      querySnapshot.forEach((doc) => {
        templatesData.push(doc.data() as EmailTemplate);
      });
      
      setEmailTemplates(templatesData);
      setTemplateDialogOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template.");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(`Are you sure you want to delete this template?`)) {
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

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
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
                              checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
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
                              <TableCell><Skeleton className="h-5 w-5" /></TableCell>
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
                            <TableRow key={u.id} data-state={selectedUserIds.has(u.id) ? 'selected' : ''}>
                              <TableCell>
                                <Checkbox checked={selectedUserIds.has(u.id)} onCheckedChange={() => handleSelectUser(u.id)} />
                              </TableCell>
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
                          <TableHead>Variables</TableHead>
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
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          emailTemplates.map(template => (
                            <TableRow key={template.id}>
                              <TableCell className="font-medium">{template.name}</TableCell>
                              <TableCell className="text-muted-foreground">{template.subject}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {template.variables.map(v => (
                                    <span key={v} className="text-xs bg-muted px-2 py-1 rounded">
                                      {`{{${v}}}`}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(template.updatedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="ghost" onClick={() => handlePreviewTemplate(template)}>
                                    <Eye className="w-4 h-4"/>
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleOpenTemplateDialog(template)}>
                                    <Edit className="w-4 h-4"/>
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>
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
        <DialogContent className="w-[96vw] max-h-[92vh] overflow-hidden p-6">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the email template details. Preview updates in real-time.' : 'Create a new email template. Preview updates in real-time.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-6 h-[calc(92vh-160px)]">
            {/* Left: Editor (2 columns) */}
            <div className="col-span-2 space-y-4 overflow-y-auto pr-4">
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
                  <p className="text-xs text-muted-foreground">Unique identifier</p>
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
                  placeholder="e.g., userName, referralCode, totalUsers"
                />
                <p className="text-xs text-muted-foreground">Use as {`{{variableName}}`} in HTML</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-html">HTML Content *</Label>
                <Textarea 
                  id="template-html" 
                  value={templateHtml} 
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  placeholder="Enter HTML email content..."
                  className="font-mono text-sm min-h-[500px]"
                />
              </div>
            </div>

            {/* Right: Live Preview (3 columns) */}
            <div className="col-span-3 border-l pl-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Live Preview</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    This is how users will see the email with PawMe branding. Variables show as placeholders.
                  </p>
                </div>

                {/* Subject Preview */}
                {templateSubject && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Subject Line:</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">{templateSubject}</p>
                    </div>
                  </div>
                )}

                {/* Email Preview with Branded Wrapper */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Email Body:</Label>
                  <div className="border rounded-lg bg-gradient-to-b from-gray-100 to-gray-50 p-8">
                    <div className="max-w-[600px] mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                      {/* Branded Header */}
                      <div style={{
                        background: 'linear-gradient(135deg, #7678EE 0%, #9673D6 100%)',
                        padding: '32px 24px',
                        textAlign: 'center'
                      }}>
                        <div style={{ marginBottom: '12px' }}>
                          <svg width="48" height="48" viewBox="0 0 100 100" style={{ display: 'inline-block' }}>
                            <circle cx="50" cy="50" r="45" fill="white" opacity="0.2"/>
                            <circle cx="50" cy="50" r="35" fill="white"/>
                            <text x="50" y="65" fontSize="40" fill="#7678EE" textAnchor="middle" fontWeight="bold">🐾</text>
                          </svg>
                        </div>
                        <h1 style={{ 
                          margin: 0, 
                          color: 'white', 
                          fontSize: '28px', 
                          fontWeight: '600',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          PawMe
                        </h1>
                      </div>

                      {/* Email Content */}
                      <div style={{ padding: '32px 24px' }}>
                        {templateHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: templateHtml }} />
                        ) : (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '80px 20px',
                            color: '#999',
                            fontSize: '14px'
                          }}>
                            Start typing HTML to see preview...
                          </div>
                        )}
                      </div>

                      {/* Branded Footer */}
                      <div style={{
                        background: '#f8f8fc',
                        padding: '24px',
                        textAlign: 'center',
                        borderTop: '1px solid #e5e5e5'
                      }}>
                        <p style={{ 
                          margin: '0 0 12px', 
                          color: '#666', 
                          fontSize: '14px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          © 2024 PawMe by Ayva Labs Limited. All rights reserved.
                        </p>
                        <p style={{ 
                          margin: '0 0 16px', 
                          color: '#999', 
                          fontSize: '12px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          You're receiving this email because you signed up for PawMe.
                        </p>
                        <div style={{ marginTop: '16px' }}>
                          <a href="#" style={{ 
                            display: 'inline-block',
                            margin: '0 8px',
                            color: '#7678EE',
                            textDecoration: 'none',
                            fontSize: '12px'
                          }}>Twitter</a>
                          <span style={{ color: '#ddd' }}>•</span>
                          <a href="#" style={{ 
                            display: 'inline-block',
                            margin: '0 8px',
                            color: '#7678EE',
                            textDecoration: 'none',
                            fontSize: '12px'
                          }}>Facebook</a>
                          <span style={{ color: '#ddd' }}>•</span>
                          <a href="#" style={{ 
                            display: 'inline-block',
                            margin: '0 8px',
                            color: '#7678EE',
                            textDecoration: 'none',
                            fontSize: '12px'
                          }}>Instagram</a>
                          <span style={{ color: '#ddd' }}>•</span>
                          <a href="#" style={{ 
                            display: 'inline-block',
                            margin: '0 8px',
                            color: '#7678EE',
                            textDecoration: 'none',
                            fontSize: '12px'
                          }}>TikTok</a>
                        </div>
                        <p style={{ 
                          margin: '16px 0 0', 
                          color: '#999', 
                          fontSize: '11px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}>
                          Follow us @pawme on all social media
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variables Info */}
                {templateVariables && (
                  <div className="p-4 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium mb-2">Available Variables:</p>
                    <div className="flex gap-2 flex-wrap">
                      {templateVariables.split(',').map(v => v.trim()).filter(v => v).map(v => (
                        <span key={v} className="text-xs bg-background px-2 py-1 rounded border">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Subject: {previewTemplate?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <div 
                className="bg-white p-4 rounded"
                dangerouslySetInnerHTML={{ __html: previewTemplate?.html || '' }}
              />
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Available Variables:</p>
              <div className="flex gap-2 flex-wrap">
                {previewTemplate?.variables.map(v => (
                  <span key={v} className="text-xs bg-background px-2 py-1 rounded border">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              setPreviewDialogOpen(false);
              if (previewTemplate) handleOpenTemplateDialog(previewTemplate);
            }}>
              <Edit className="w-4 h-4 mr-2"/>
              Edit Template
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
    </>
  );
}
