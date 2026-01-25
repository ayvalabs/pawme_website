'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import type { EmailTemplate } from '@/app/actions/email-templates';
import { getAppSettings, type AppSettings } from '@/app/actions/settings';
import { saveAppSettings } from '@/app/services/adminService';
import { db } from '@/firebase/config';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { defaultTemplates } from '@/lib/email-templates';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { EmailTemplateEditor, EmailPreview } from '@/app/components/email-template-editor';
import { ScrollArea } from '@/app/components/ui/scroll-area';

const DEFAULT_HEADER = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🐾 PawMe</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Your AI Companion Robot</p>
            </td>
          </tr>`;

const DEFAULT_FOOTER = `          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f8fc; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 15px; color: #666666; font-size: 14px;">
                Follow us on social media! @pawme
              </p>
              <p style="margin: 0 0 15px;">
                <a href="https://twitter.com/pawme" style="text-decoration: none; margin: 0 5px;">X</a>
                <a href="https://facebook.com/pawme" style="text-decoration: none; margin: 0 5px;">FB</a>
                <a href="https://instagram.com/pawme" style="text-decoration: none; margin: 0 5px;">IG</a>
              </p>
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                &copy; 2026 PawMe by Ayva Labs Limited.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                If you no longer wish to receive these emails, you can <a href="{{unsubscribeLink}}" style="color: #999999;">unsubscribe here</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export default function TemplatesPage() {
  const { user, profile } = useAuth();
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
  const [localEmailHeader, setLocalEmailHeader] = useState('');
  const [localEmailFooter, setLocalEmailFooter] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isBrandingDialogOpen, setBrandingDialogOpen] = useState(false);
  const [editingBrandingPart, setEditingBrandingPart] = useState<'header' | 'footer' | null>(null);
  const [brandingEditorContent, setBrandingEditorContent] = useState('');

  useEffect(() => {
    if (user && profile?.email === 'pawme@ayvalabs.com') {
      fetchEmailTemplates();
      fetchSettings();
    }
  }, [user, profile]);

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

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const appSettings = await getAppSettings();
      setLocalEmailHeader(appSettings?.emailHeader || DEFAULT_HEADER);
      setLocalEmailFooter(appSettings?.emailFooter || DEFAULT_FOOTER);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setLocalEmailHeader(DEFAULT_HEADER);
      setLocalEmailFooter(DEFAULT_FOOTER);
    }
    setLoadingSettings(false);
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

  const handlePreview = (subject: string, body: string) => {
    if (!subject || !body) {
      toast.error('Subject and body are required to preview.');
      return;
    }
    
    setPreviewContent({ subject: subject, html: body });
    setPreviewOpen(true);
  };

  const handleOpenBrandingDialog = (part: 'header' | 'footer') => {
    setEditingBrandingPart(part);
    setBrandingEditorContent(part === 'header' ? localEmailHeader : localEmailFooter);
    setBrandingDialogOpen(true);
  };

  const handleSaveBranding = async () => {
    setSavingSettings(true);
    try {
      const updateData = editingBrandingPart === 'header' 
        ? { emailHeader: brandingEditorContent }
        : { emailFooter: brandingEditorContent };
      
      await saveAppSettings(updateData);
      
      if (editingBrandingPart === 'header') {
        setLocalEmailHeader(brandingEditorContent);
      } else {
        setLocalEmailFooter(brandingEditorContent);
      }
      
      toast.success(`Email ${editingBrandingPart} updated successfully!`);
      setBrandingDialogOpen(false);
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error("Failed to save branding.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Email Templates</h1>
        <p className="text-muted-foreground">Manage email templates and branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Email Branding</CardTitle>
          <CardDescription>Define a consistent header and footer for all emails. Click a section to edit.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Email Header</Label>
            <div className="relative group border rounded-lg h-64 cursor-pointer" onClick={() => handleOpenBrandingDialog('header')}>
              <div className="h-full overflow-auto p-4 bg-muted/30 pointer-events-none">
                <iframe srcDoc={localEmailHeader} className="w-full h-full border-0" title="Header Preview" sandbox="allow-same-origin"/>
              </div>
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/40 transition-all flex items-center justify-center">
                <Button variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="w-4 h-4 mr-2"/> Edit Header
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email Footer</Label>
            <div className="relative group border rounded-lg h-64 cursor-pointer" onClick={() => handleOpenBrandingDialog('footer')}>
              <div className="h-full overflow-auto p-4 bg-muted/30 pointer-events-none">
                <iframe srcDoc={localEmailFooter} className="w-full h-full border-0" title="Footer Preview" sandbox="allow-same-origin"/>
              </div>
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/40 transition-all flex items-center justify-center">
                <Button variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="w-4 h-4 mr-2"/> Edit Footer
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <Dialog open={isBrandingDialogOpen} onOpenChange={setBrandingDialogOpen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>Edit Email {editingBrandingPart === 'header' ? 'Header' : 'Footer'}</DialogTitle>
            <DialogDescription>
              Update the global email {editingBrandingPart}. This will appear on all automated emails.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow flex min-h-0">
            <div className="w-1/2 flex flex-col border-r">
              <div className="p-6 flex-grow flex flex-col">
                <div className="space-y-2 flex-grow flex flex-col">
                  <Label htmlFor="branding-editor-html">HTML Content</Label>
                  <Textarea
                    id="branding-editor-html"
                    value={brandingEditorContent}
                    onChange={(e) => setBrandingEditorContent(e.target.value)}
                    className="font-mono text-sm flex-grow"
                  />
                  {editingBrandingPart === 'footer' && (
                    <p className="text-xs text-muted-foreground">
                      Use {'{{unsubscribeLink}}'} to insert the unsubscribe link.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="w-1/2 flex flex-col bg-muted/30">
              <div className="p-6 pb-4 border-b bg-background flex-shrink-0">
                <h3 className="text-lg font-semibold">Live Preview</h3>
              </div>
              <div className="flex-grow p-6 min-h-0">
                <div className="border rounded-lg overflow-hidden bg-background h-full">
                  <iframe
                    srcDoc={brandingEditorContent}
                    className="w-full h-full border-0"
                    title="Branding Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setBrandingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBranding} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save ' + (editingBrandingPart === 'header' ? 'Header' : 'Footer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the email template details.' : 'Create a new reusable email template.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow flex min-h-0">
            <div className="w-1/2 flex flex-col border-r">
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
              
              <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </DialogFooter>
            </div>

            <div className="w-1/2 flex flex-col bg-muted/30">
              <div className="p-6 pb-4 border-b bg-background flex-shrink-0">
                <h3 className="text-lg font-semibold">Live Preview</h3>
                <p className="text-sm text-muted-foreground">See how your email will look with sample data</p>
              </div>
              <div className="flex-grow p-6 min-h-0">
                <EmailPreview
                  subject={templateSubject}
                  html={templateHtml}
                  headerHtml={localEmailHeader}
                  footerHtml={localEmailFooter}
                />
              </div>
            </div>
          </div>
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
    </div>
  );
}
