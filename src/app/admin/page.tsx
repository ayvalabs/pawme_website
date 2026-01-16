'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { toast } from 'sonner';
import { defaultTemplates, EmailTemplate } from '@/lib/email-templates';
import { Mail, Send, Eye, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (selectedTemplate && templates[selectedTemplate]) {
      setEditedTemplate({ ...templates[selectedTemplate] });
    }
  }, [selectedTemplate, templates]);

  const handleSaveTemplate = () => {
    if (!editedTemplate) return;
    
    setTemplates(prev => ({
      ...prev,
      [editedTemplate.id]: editedTemplate,
    }));
    
    toast.success('Template saved successfully!');
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !editedTemplate) {
      toast.error('Please enter a test email address');
      return;
    }

    setSending(true);
    try {
      // Create sample variables for testing
      const sampleVariables: Record<string, string> = {};
      editedTemplate.variables.forEach(variable => {
        if (variable === 'userName') sampleVariables[variable] = 'Test User';
        else if (variable === 'referralCode') sampleVariables[variable] = 'TEST123';
        else sampleVariables[variable] = `[${variable}]`;
      });

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: editedTemplate.subject,
          html: editedTemplate.html,
          variables: sampleVariables,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Test email sent successfully!');
        setTestEmail('');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const renderPreview = () => {
    if (!editedTemplate) return '';
    
    let html = editedTemplate.html;
    editedTemplate.variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      if (variable === 'userName') html = html.replace(regex, 'Test User');
      else if (variable === 'referralCode') html = html.replace(regex, 'TEST123');
      else html = html.replace(regex, `[${variable}]`);
    });
    
    return html;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to access the admin panel</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Email Template Manager</h1>
          <p className="text-muted-foreground">Manage and customize email templates for your application</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Select a template to edit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.values(templates).map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {template.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Template Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Edit Template: {editedTemplate?.name}</CardTitle>
              <CardDescription>
                Available variables: {editedTemplate?.variables.map(v => `{{${v}}}`).join(', ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="test">Test & Send</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      value={editedTemplate?.subject || ''}
                      onChange={(e) => setEditedTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                      placeholder="Email subject..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="html">HTML Content</Label>
                    <Textarea
                      id="html"
                      value={editedTemplate?.html || ''}
                      onChange={(e) => setEditedTemplate(prev => prev ? { ...prev, html: e.target.value } : null)}
                      placeholder="HTML content..."
                      className="font-mono text-sm min-h-[400px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveTemplate} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Template
                    </Button>
                    <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="test" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="testEmail">Test Email Address</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Test Data</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• userName: "Test User"</li>
                      <li>• referralCode: "TEST123"</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleSendTestEmail} 
                    disabled={sending || !testEmail}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              This is how your email will look to recipients
            </DialogDescription>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: renderPreview() }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
