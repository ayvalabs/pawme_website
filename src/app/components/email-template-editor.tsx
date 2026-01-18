'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Code, Paintbrush } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface EmailTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EmailTemplateEditor({ value, onChange, placeholder }: EmailTemplateEditorProps) {
  const [editorMode, setEditorMode] = useState<'design' | 'code'>('design');
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleDesignChange = (content: string) => {
    setLocalValue(content);
    onChange(content);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="template-html">HTML Content *</Label>
        <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'design' | 'code')} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="design" className="text-xs gap-1.5">
              <Paintbrush className="w-3 h-3" />
              Design
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs gap-1.5">
              <Code className="w-3 h-3" />
              Code
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {editorMode === 'design' ? (
        <div className="border rounded-md">
          <ReactQuill
            theme="snow"
            value={localValue}
            onChange={handleDesignChange}
            modules={quillModules}
            formats={quillFormats}
            placeholder={placeholder || "Enter email content..."}
            className="min-h-[400px]"
          />
        </div>
      ) : (
        <Textarea
          id="template-html"
          value={localValue}
          onChange={handleCodeChange}
          placeholder={placeholder || "Enter HTML email content..."}
          className="font-mono text-sm min-h-[400px]"
        />
      )}
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
      <div className="flex-grow overflow-auto">
        <iframe
          srcDoc={previewHtml || '<p style="padding: 1rem; color: #999;">Email preview will appear here...</p>'}
          className="w-full h-full border-0"
          title="Email Preview"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
