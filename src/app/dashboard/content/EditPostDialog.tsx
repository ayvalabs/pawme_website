'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Plus,
  Trash2,
  Upload,
  X as XIcon,
  Image as ImageIcon,
  Film,
  GripVertical,
  Loader2,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ScheduledPost, PostPlatform } from '@/types/scheduled-post';

const CATEGORIES = [
  'Build Journey',
  'Product Shots',
  'Team',
  'Milestones',
  'Community',
  'Behind the Scenes',
  'IAO Launch',
  'AYVA Token',
  'Patent & IP',
  'Partnerships',
  'Kickstarter',
  'App Launch',
];

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ScheduledPost | null;
  onSaved: () => void;
}

interface FormState {
  text: string;
  threadTexts: string[];
  mediaUrls: string[];
  mediaFilePaths: string[];
  mediaTypes: ('image' | 'video')[];
  threadMediaMap?: number[][];
  videoThumbnailUrls: string[];
  videoThumbnailFiles: string[];
  scheduledAt: string;
  platforms: PostPlatform;
  category: string;
  hashtags: string[];
  mentions: string[];
  ctaUrl: string;
  campaignWeek: number;
  campaignDay: number;
}

export default function EditPostDialog({
  open,
  onOpenChange,
  post,
  onSaved,
}: EditPostDialogProps) {
  const isNew = !post;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hashtagInput, setHashtagInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [thumbnailTarget, setThumbnailTarget] = useState<number | null>(null);

  // Build initial form state from post
  const buildInitialState = useCallback((): FormState => {
    if (!post) {
      return {
        text: '',
        threadTexts: [],
        mediaUrls: [],
        mediaFilePaths: [],
        mediaTypes: [],
        threadMediaMap: undefined,
        videoThumbnailUrls: [],
        videoThumbnailFiles: [],
        scheduledAt: '',
        platforms: 'both',
        category: '',
        hashtags: [],
        mentions: [],
        ctaUrl: '',
        campaignWeek: 1,
        campaignDay: 1,
      };
    }
    return {
      text: post.text,
      threadTexts: post.threadTexts || [],
      mediaUrls: post.mediaUrls || [],
      mediaFilePaths: post.mediaFilePaths || [],
      mediaTypes: post.mediaTypes || [],
      threadMediaMap: post.threadMediaMap,
      videoThumbnailUrls: post.videoThumbnailUrls || [],
      videoThumbnailFiles: post.videoThumbnailFiles || [],
      scheduledAt: post.scheduledAt,
      platforms: post.platforms,
      category: post.category,
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
      ctaUrl: post.ctaUrl || '',
      campaignWeek: post.campaignWeek,
      campaignDay: post.campaignDay,
    };
  }, [post]);

  const [form, setForm] = useState<FormState>(buildInitialState);

  // Reset form when post changes
  const prevPostId = useRef<string | null>(null);
  if ((post?.id ?? null) !== prevPostId.current) {
    prevPostId.current = post?.id ?? null;
    const newState = buildInitialState();
    setForm(newState);
    setHashtagInput((post?.hashtags || []).join(', '));
    setMentionInput('');
  }

  // ----- Thread Management -----
  const addThread = () => {
    setForm((f) => ({ ...f, threadTexts: [...f.threadTexts, ''] }));
  };

  const updateThread = (idx: number, value: string) => {
    setForm((f) => {
      const threadTexts = [...f.threadTexts];
      threadTexts[idx] = value;
      return { ...f, threadTexts };
    });
  };

  const removeThread = (idx: number) => {
    setForm((f) => {
      const threadTexts = f.threadTexts.filter((_, i) => i !== idx);
      // Also update threadMediaMap if present
      let threadMediaMap = f.threadMediaMap;
      if (threadMediaMap) {
        // Thread index 0 = main tweet, so thread tweets are index 1+
        threadMediaMap = threadMediaMap.filter((_, i) => i !== idx + 1);
      }
      return { ...f, threadTexts, threadMediaMap };
    });
  };

  // ----- Media Upload -----
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/posts/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await response.json();
      const uploadedFiles: { url: string; path: string; type: 'image' | 'video'; name: string }[] = data.files;

      setForm((f) => ({
        ...f,
        mediaUrls: [...f.mediaUrls, ...uploadedFiles.map((uf) => uf.url)],
        mediaFilePaths: [...f.mediaFilePaths, ...uploadedFiles.map((uf) => uf.path)],
        mediaTypes: [...f.mediaTypes, ...uploadedFiles.map((uf) => uf.type)],
      }));

      toast.success(`${uploadedFiles.length} file(s) uploaded`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ----- Thumbnail Upload -----
  const handleThumbnailUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || thumbnailTarget === null) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', files[0]);

      const response = await fetch('/api/posts/upload-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Thumbnail upload failed');

      const data = await response.json();
      const uploaded = data.files[0];

      setForm((f) => {
        const videoThumbnailUrls = [...f.videoThumbnailUrls];
        const videoThumbnailFiles = [...f.videoThumbnailFiles];
        // Find the video index among all media
        videoThumbnailUrls[thumbnailTarget] = uploaded.url;
        videoThumbnailFiles[thumbnailTarget] = uploaded.path;
        return { ...f, videoThumbnailUrls, videoThumbnailFiles };
      });

      toast.success('Thumbnail uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload thumbnail');
    } finally {
      setUploading(false);
      setThumbnailTarget(null);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const removeMedia = (idx: number) => {
    setForm((f) => {
      const wasVideo = f.mediaTypes[idx] === 'video';
      const mediaUrls = f.mediaUrls.filter((_, i) => i !== idx);
      const mediaFilePaths = f.mediaFilePaths.filter((_, i) => i !== idx);
      const mediaTypes = f.mediaTypes.filter((_, i) => i !== idx);

      // Adjust thumbnails if a video was removed
      let videoThumbnailUrls = [...f.videoThumbnailUrls];
      let videoThumbnailFiles = [...f.videoThumbnailFiles];
      if (wasVideo) {
        // Find which video index this was
        let videoIdx = 0;
        for (let i = 0; i < idx; i++) {
          if (f.mediaTypes[i] === 'video') videoIdx++;
        }
        videoThumbnailUrls.splice(videoIdx, 1);
        videoThumbnailFiles.splice(videoIdx, 1);
      }

      // Adjust threadMediaMap indices
      let threadMediaMap = f.threadMediaMap;
      if (threadMediaMap) {
        threadMediaMap = threadMediaMap.map((indices) =>
          indices
            .filter((i) => i !== idx)
            .map((i) => (i > idx ? i - 1 : i))
        );
      }

      return {
        ...f,
        mediaUrls,
        mediaFilePaths,
        mediaTypes,
        videoThumbnailUrls,
        videoThumbnailFiles,
        threadMediaMap,
      };
    });
  };

  // ----- Hashtags / Mentions -----
  const addHashtags = () => {
    if (!hashtagInput.trim()) return;
    const tags = hashtagInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    setForm((f) => ({
      ...f,
      hashtags: [...new Set([...f.hashtags, ...tags])],
    }));
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    setForm((f) => ({ ...f, hashtags: f.hashtags.filter((t) => t !== tag) }));
  };

  const addMentions = () => {
    if (!mentionInput.trim()) return;
    const mentions = mentionInput
      .split(',')
      .map((m) => m.trim().replace(/^@/, ''))
      .filter(Boolean);
    setForm((f) => ({
      ...f,
      mentions: [...new Set([...f.mentions, ...mentions])],
    }));
    setMentionInput('');
  };

  const removeMention = (mention: string) => {
    setForm((f) => ({ ...f, mentions: f.mentions.filter((m) => m !== mention) }));
  };

  // ----- Save -----
  const handleSave = async () => {
    if (!form.text.trim()) {
      toast.error('Post text is required');
      return;
    }
    if (!form.scheduledAt) {
      toast.error('Scheduled date is required');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        text: form.text.trim(),
        threadTexts: form.threadTexts.filter((t) => t.trim()),
        mediaUrls: form.mediaUrls,
        mediaFilePaths: form.mediaFilePaths,
        mediaTypes: form.mediaTypes,
        threadMediaMap: form.threadMediaMap,
        videoThumbnailUrls: form.videoThumbnailUrls,
        videoThumbnailFiles: form.videoThumbnailFiles,
        scheduledAt: form.scheduledAt,
        platforms: form.platforms,
        category: form.category,
        hashtags: form.hashtags,
        mentions: form.mentions,
        ctaUrl: form.ctaUrl || undefined,
        campaignWeek: form.campaignWeek,
        campaignDay: form.campaignDay,
      };

      if (post) {
        payload.id = post.id;
      }

      const response = await fetch('/api/posts', {
        method: post ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      toast.success(post ? 'Post updated' : 'Post created');
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  // ----- Helpers -----
  const getVideoThumbnail = (mediaIdx: number): string | undefined => {
    // Count how many videos are before this index
    let videoIdx = 0;
    for (let i = 0; i < mediaIdx; i++) {
      if (form.mediaTypes[i] === 'video') videoIdx++;
    }
    return form.videoThumbnailUrls[videoIdx];
  };

  const getVideoIndex = (mediaIdx: number): number => {
    let videoIdx = 0;
    for (let i = 0; i < mediaIdx; i++) {
      if (form.mediaTypes[i] === 'video') videoIdx++;
    }
    return videoIdx;
  };

  const charCount = form.text.length;
  const isOverLimit = charCount > 280;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">
            {isNew ? 'Create New Post' : 'Edit Post'}
          </DialogTitle>
          {post?.status === 'published' && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mt-1">
              <AlertCircle className="w-4 h-4" />
              Published posts cannot be edited
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-6 h-auto pb-0">
            <TabsTrigger
              value="content"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
            >
              Content
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
            >
              Media ({form.mediaUrls.length})
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ====== CONTENT TAB ====== */}
          <TabsContent value="content" className="px-6 py-4 space-y-5 mt-0">
            {/* Main tweet */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Main Tweet</Label>
              <Textarea
                placeholder="What's happening?"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                className="min-h-[100px] resize-none text-[15px] leading-relaxed"
                disabled={post?.status === 'published'}
              />
              <div className="flex justify-between text-xs">
                <span className={isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'}>
                  {charCount} / 280
                </span>
                {charCount > 250 && !isOverLimit && (
                  <span className="text-amber-500">Approaching limit</span>
                )}
              </div>
            </div>

            {/* Thread tweets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Thread ({form.threadTexts.length} replies)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addThread}
                  disabled={post?.status === 'published'}
                  className="gap-1 h-8 text-xs rounded-full"
                >
                  <Plus className="w-3 h-3" />
                  Add Reply
                </Button>
              </div>

              {form.threadTexts.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No thread replies. Add one to create a thread.
                </p>
              )}

              {form.threadTexts.map((threadText, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex flex-col items-center pt-3">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className="text-xs text-gray-400 mt-1">{idx + 1}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Textarea
                      placeholder={`Reply ${idx + 1}...`}
                      value={threadText}
                      onChange={(e) => updateThread(idx, e.target.value)}
                      className="min-h-[80px] resize-none text-sm"
                      disabled={post?.status === 'published'}
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{threadText.length} / 280</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeThread(idx)}
                    disabled={post?.status === 'published'}
                    className="text-gray-400 hover:text-red-500 mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Hashtags & Mentions inline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hashtags</Label>
                <div className="flex gap-1">
                  <Input
                    placeholder="#PawMe, #AIpet"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addHashtags();
                      }
                    }}
                    className="text-sm h-9"
                    disabled={post?.status === 'published'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHashtags}
                    className="h-9 px-3"
                    disabled={post?.status === 'published'}
                  >
                    Add
                  </Button>
                </div>
                {form.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.hashtags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 rounded-full text-xs py-0.5"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="hover:text-red-500 ml-0.5"
                        >
                          <XIcon className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Mentions</Label>
                <div className="flex gap-1">
                  <Input
                    placeholder="@AyvaLabs"
                    value={mentionInput}
                    onChange={(e) => setMentionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMentions();
                      }
                    }}
                    className="text-sm h-9"
                    disabled={post?.status === 'published'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMentions}
                    className="h-9 px-3"
                    disabled={post?.status === 'published'}
                  >
                    Add
                  </Button>
                </div>
                {form.mentions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.mentions.map((m) => (
                      <Badge
                        key={m}
                        variant="secondary"
                        className="gap-1 rounded-full text-xs py-0.5"
                      >
                        @{m}
                        <button
                          type="button"
                          onClick={() => removeMention(m)}
                          className="hover:text-red-500 ml-0.5"
                        >
                          <XIcon className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ====== MEDIA TAB ====== */}
          <TabsContent value="media" className="px-6 py-4 space-y-5 mt-0">
            {/* Upload area */}
            <div
              className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-blue-600 font-medium">Uploading...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Drop images or videos here, or{' '}
                    <span className="text-blue-500 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports images (JPG, PNG, WebP) and videos (MP4, WebM)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={uploading || post?.status === 'published'}
              />
            </div>

            {/* Hidden thumbnail input */}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleThumbnailUpload(e.target.files)}
            />

            {/* Media grid */}
            {form.mediaUrls.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Attached Media ({form.mediaUrls.length})
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {form.mediaUrls.map((url, idx) => {
                    const isVideo = form.mediaTypes[idx] === 'video';
                    const thumbnail = isVideo ? getVideoThumbnail(idx) : undefined;
                    const videoIdx = isVideo ? getVideoIndex(idx) : -1;

                    return (
                      <div
                        key={idx}
                        className="relative group bg-gray-50 rounded-xl overflow-hidden border border-gray-200"
                      >
                        {/* Media preview */}
                        {isVideo ? (
                          <div className="relative">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={`Video thumbnail ${idx + 1}`}
                                className="w-full h-40 object-cover"
                              />
                            ) : (
                              <video
                                src={url}
                                className="w-full h-40 object-cover bg-black"
                                preload="metadata"
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-black/60 rounded-full p-2">
                                <Film className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Media ${idx + 1}`}
                            className="w-full h-40 object-cover"
                          />
                        )}

                        {/* Overlay actions */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            disabled={post?.status === 'published'}
                            className="bg-black/70 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                            title="Remove media"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Media info bar */}
                        <div className="px-3 py-2 bg-white border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {isVideo ? (
                                <Film className="w-3.5 h-3.5 text-purple-500" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                                {form.mediaFilePaths[idx]
                                  ? form.mediaFilePaths[idx].split('/').pop()
                                  : `${isVideo ? 'Video' : 'Image'} ${idx + 1}`}
                              </span>
                            </div>
                            {isVideo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setThumbnailTarget(videoIdx);
                                  thumbnailInputRef.current?.click();
                                }}
                                disabled={post?.status === 'published'}
                                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                              >
                                {thumbnail ? 'Change Thumbnail' : 'Add Thumbnail'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Thumbnail preview for videos */}
                        {isVideo && thumbnail && (
                          <div className="px-3 pb-2 bg-white">
                            <div className="flex items-center gap-2">
                              <img
                                src={thumbnail}
                                alt="Thumbnail"
                                className="w-12 h-8 object-cover rounded border"
                              />
                              <span className="text-xs text-gray-400">Thumbnail</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No media attached yet</p>
              </div>
            )}
          </TabsContent>

          {/* ====== SETTINGS TAB ====== */}
          <TabsContent value="settings" className="px-6 py-4 space-y-5 mt-0">
            {/* Schedule */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Schedule Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : '',
                  }))
                }
                disabled={post?.status === 'published'}
                className="max-w-xs"
              />
            </div>

            {/* Platform & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Platform</Label>
                <Select
                  value={form.platforms}
                  onValueChange={(value: PostPlatform) =>
                    setForm((f) => ({ ...f, platforms: value }))
                  }
                  disabled={post?.status === 'published'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x">X Only</SelectItem>
                    <SelectItem value="telegram">Telegram Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, category: value }))
                  }
                  disabled={post?.status === 'published'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campaign Week & Day */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Campaign Week</Label>
                <Select
                  value={(form.campaignWeek || 1).toString()}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, campaignWeek: parseInt(value) }))
                  }
                  disabled={post?.status === 'published'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((w) => (
                      <SelectItem key={w} value={w.toString()}>
                        Week {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Campaign Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={form.campaignDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, campaignDay: parseInt(e.target.value) || 1 }))
                  }
                  disabled={post?.status === 'published'}
                />
              </div>
            </div>

            {/* CTA URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">CTA URL (Optional)</Label>
              <Input
                type="url"
                placeholder="https://pawmebot.com"
                value={form.ctaUrl}
                onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                disabled={post?.status === 'published'}
              />
            </div>

            {/* Status info */}
            {post && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Post Info</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>Status: <strong className="text-gray-700">{post.status}</strong></span>
                  <span>ID: <code className="text-gray-600">{post.id.slice(0, 8)}...</code></span>
                  {post.createdAt && (
                    <span>Created: {new Date(post.createdAt).toLocaleString()}</span>
                  )}
                  {post.publishedAt && (
                    <span>Published: {new Date(post.publishedAt).toLocaleString()}</span>
                  )}
                  {post.xPostId && (
                    <span>X Post ID: <code className="text-gray-600">{post.xPostId}</code></span>
                  )}
                  {post.errorMessage && (
                    <span className="col-span-2 text-red-500">Error: {post.errorMessage}</span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50/50">
          <div className="text-xs text-gray-400">
            {form.mediaUrls.length > 0 && (
              <span>{form.mediaUrls.length} media · </span>
            )}
            {form.threadTexts.filter((t) => t.trim()).length > 0 && (
              <span>{form.threadTexts.filter((t) => t.trim()).length} thread replies · </span>
            )}
            {form.hashtags.length > 0 && (
              <span>{form.hashtags.length} tags</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-black hover:bg-gray-800 px-6 gap-2"
              onClick={handleSave}
              disabled={saving || post?.status === 'published' || isOverLimit}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isNew ? 'Create Post' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
