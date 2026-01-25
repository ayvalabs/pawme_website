'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { Send, Eye, Lock } from 'lucide-react';
import { sendAdminBroadcast } from '@/app/actions/email';
import type { UserProfile } from '@/app/context/AuthContext';
import type { EmailTemplate } from '@/app/actions/email-templates';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';

type UserWithId = UserProfile & { id: string };

export default function BroadcastPage() {
  const { user, profile } = useAuth();
  const [allUsers, setAllUsers] = useState<UserWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState({ subject: '', html: '' });

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchAllUsers();
      fetchEmailTemplates();
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
      setSelectedUserIds(new Set());
    } catch (error) {
      toast.error("Failed to send broadcast.");
    } finally {
      setSendingBroadcast(false);
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
    
    setPreviewContent({ subject: subject, html: body });
    setPreviewOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Email Broadcast</h1>
        <p className="text-muted-foreground">Send emails to your users</p>
      </div>

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
    </div>
  );
}
