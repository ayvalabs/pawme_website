'use client';

import { useMemo } from 'react';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';

interface EmailTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EmailTemplateEditor({ value, onChange, placeholder }: EmailTemplateEditorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="template-html">HTML Content *</Label>
      <Textarea
        id="template-html"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter HTML email content..."}
        className="font-mono text-sm min-h-[400px]"
      />
      <p className="text-xs text-muted-foreground">
        Use {'{{variableName}}'} for dynamic content (e.g., {'{{userName}}'}, {'{{trackingCode}}'})
      </p>
    </div>
  );
}


interface EmailPreviewProps {
  subject: string;
  html: string;
  variables?: Record<string, string>;
}

export function EmailPreview({ subject, html, variables = {} }: EmailPreviewProps) {
  const previewHtml = useMemo(() => {
    let processed = html;
    
    const defaultVariables = {
      userName: 'John Doe',
      referralCode: 'PAWME123',
      trackingCode: '1Z999AA10123456784',
      rewardTitle: 'Premium Pet Collar',
      ...variables
    };

    Object.entries(defaultVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    });

    return processed;
  }, [html, variables]);

  const previewSubject = useMemo(() => {
    let processed = subject;
    
    const defaultVariables = {
      userName: 'John Doe',
      ...variables
    };

    Object.entries(defaultVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    });

    return processed;
  }, [subject, variables]);

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      <div className="p-4 border-b bg-muted/50">
        <div className="text-xs text-muted-foreground mb-1">Preview</div>
        <div className="text-sm font-medium">
          <span className="text-muted-foreground">Subject:</span> {previewSubject || '(No subject)'}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto overflow-x-hidden">
        <iframe
          srcDoc={previewHtml || '<p style="padding: 1rem; color: #999;">Email preview will appear here...</p>'}
          className="w-full min-h-full border-0"
          title="Email Preview"
          sandbox="allow-same-origin"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
