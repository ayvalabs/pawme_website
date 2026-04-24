'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ScheduledPost } from '@/types/scheduled-post';
import type { MediaLibraryEntry } from '@/types/media-library';
import { format, parseISO } from 'date-fns';
import {
  X as XIcon, Trash2, Plus, Wand2, Loader2, Sparkles, Save,
  Image as ImageIcon, Play, Search, Video, Send, Calendar, CalendarX,
  Tag, Clock, FileText, CheckCircle2, AlertCircle,
} from 'lucide-react';

interface EditTweetDialogProps {
  post: ScheduledPost;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ScheduledPost>) => void;
  onOpenMediaModal: (post: ScheduledPost) => void;
  onScheduleToggle: (tweetId: string, currentStatus: string) => void;
}

const PILLAR_LABELS: Record<string, string> = {
  build_in_public: 'Build in Public',
  product_showcase: 'Product Showcase',
  founder_voice: 'Founder Voice',
  community_prompt: 'Community',
  market_context: 'Market Context',
};

export function EditTweetDialog({ post, onClose, onUpdate, onOpenMediaModal, onScheduleToggle }: EditTweetDialogProps) {
  // Text editing
  const [editedText, setEditedText] = useState(post.text);
  const [editedThreads, setEditedThreads] = useState<string[]>(post.threadTexts || []);
  const [editedHashtags, setEditedHashtags] = useState<string[]>(post.hashtags || []);
  const [editedMentions, setEditedMentions] = useState<string[]>(post.mentions || []);
  const [newHashtag, setNewHashtag] = useState('');
  const [newMention, setNewMention] = useState('');

  // AI text
  const [showAiWrite, setShowAiWrite] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);

  // AI image
  const [showAiImage, setShowAiImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenError, setImageGenError] = useState('');

  // Media library
  const [showLibrary, setShowLibrary] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryEntry[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libType, setLibType] = useState<'all' | 'image' | 'video'>('all');
  const [selectedLib, setSelectedLib] = useState<string[]>([]);
  const [attachingMedia, setAttachingMedia] = useState(false);

  // Local media state (not committed until Save)
  const [localMediaUrls, setLocalMediaUrls] = useState<string[]>(post.mediaUrls || []);
  const [localMediaTypes, setLocalMediaTypes] = useState<('image' | 'video')[]>(post.mediaTypes || []);
  const [localMediaFilePaths, setLocalMediaFilePaths] = useState<string[]>(post.mediaFilePaths || []);
  const [mediaDirty, setMediaDirty] = useState(false);

  // Post now
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active panel tracking
  const [activePanel, setActivePanel] = useState<'none' | 'ai-write' | 'ai-image' | 'library'>('none');

  const charCount = editedText.length;
  const isOverLimit = charCount > 280;
  const hasMedia = localMediaUrls && localMediaUrls.length > 0;

  // Seed image prompt
  useEffect(() => {
    if (activePanel === 'ai-image' && !imagePrompt) {
      const allText = [editedText, ...editedThreads].join(' ');
      const hints: Record<string, string> = {
        build_in_public: 'behind-the-scenes hardware development, workshop, prototyping',
        product_showcase: 'sleek product photography, clean background, cute robot with pets',
        founder_voice: 'candid founder moment, startup life, authentic',
        community_prompt: 'pets and technology, pet owners, community, warm',
        market_context: 'pet industry data visualization, infographic style',
      };
      const hint = hints[post.pillar || ''] || 'cute robot interacting with pets';
      setImagePrompt(`Create a compelling social media image for this tweet:\n\n"${allText.substring(0, 300)}"\n\nStyle: ${hint}\nProduct: PawMe — a spherical self-balancing AI pet companion robot.`);
    }
  }, [activePanel]);

  // Load media library on demand
  useEffect(() => {
    if (activePanel === 'library' && mediaLibrary.length === 0) {
      loadMediaLibrary();
    }
  }, [activePanel]);

  const loadMediaLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const res = await fetch('/api/media-library');
      const data = await res.json();
      setMediaLibrary(data.media || []);
    } catch {}
    setLoadingLibrary(false);
  };

  const filteredLibMedia = useMemo(() => {
    return mediaLibrary.filter((m) => {
      if (!m.storageUrl) return false;
      if (libType !== 'all' && m.type !== libType) return false;
      if (libSearch) {
        const q = libSearch.toLowerCase();
        return m.caption?.toLowerCase().includes(q) || m.path?.toLowerCase().includes(q) || m.tags?.some((t: string) => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [mediaLibrary, libType, libSearch]);

  const togglePanel = (panel: 'ai-write' | 'ai-image' | 'library') => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  };

  // --- Handlers ---

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Partial<ScheduledPost> & { updatedAt: string } = {
      text: editedText,
      threadTexts: editedThreads.filter(t => t.trim()),
      hashtags: editedHashtags.filter(h => h.trim()),
      mentions: editedMentions.filter(m => m.trim()),
      updatedAt: new Date().toISOString(),
    };
    // Include media if changed
    if (mediaDirty) {
      updates.mediaUrls = localMediaUrls;
      updates.mediaTypes = localMediaTypes;
      updates.mediaFilePaths = localMediaFilePaths;
    }
    try {
      const response = await fetch('/api/tweets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: post.id, updates }),
      });
      if (response.ok) {
        onUpdate(post.id, updates);
        onClose();
      }
    } catch (error) { console.error('Failed to save:', error); }
    finally { setIsSaving(false); }
  };

  const handleGenerateText = async () => {
    setIsGeneratingText(true);
    try {
      const response = await fetch('/api/tweets/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: post.id, context: aiContext || undefined, pillar: post.pillar, tone: 'authentic, passionate, technical-but-accessible' }),
      });
      if (response.ok) {
        const data = await response.json();
        setEditedText(data.mainText);
        if (data.threadTexts?.length > 0) setEditedThreads(data.threadTexts);
        setActivePanel('none');
      }
    } catch (error) { console.error('Failed to generate text:', error); }
    finally { setIsGeneratingText(false); }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setImageGenError('');
    try {
      const response = await fetch('/api/generate-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: post.id, prompt: imagePrompt }),
      });
      const data = await response.json();
      if (response.ok) {
        // Update local state only — committed on Save
        setLocalMediaUrls(data.mediaUrls || []);
        setLocalMediaTypes(data.mediaTypes || ['image']);
        setMediaDirty(true);
        setActivePanel('none');
        setImagePrompt('');
      } else {
        const details = data.details ? `\n${data.details}` : '';
        const models = data.modelsAttempted ? `\nModels tried: ${data.modelsAttempted.join(', ')}` : '';
        setImageGenError(`${data.error || 'Generation failed'}${details}${models}`);
      }
    } catch (error: any) { setImageGenError(error.message || 'Network error'); }
    finally { setIsGeneratingImage(false); }
  };

  const handleAttachLib = async () => {
    if (selectedLib.length === 0) return;
    setAttachingMedia(true);
    try {
      const response = await fetch('/api/tweets/attach-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: post.id, mediaLibraryIds: selectedLib }),
      });
      if (response.ok) {
        const data = await response.json();
        setLocalMediaUrls(data.mediaUrls || []);
        setLocalMediaTypes(data.mediaTypes || []);
        setMediaDirty(true);
        setSelectedLib([]);
        setActivePanel('none');
      }
    } catch (error) { console.error('Failed to attach media:', error); }
    finally { setAttachingMedia(false); }
  };

  const handleRemoveMedia = (index: number) => {
    setLocalMediaUrls(prev => prev.filter((_, i) => i !== index));
    setLocalMediaTypes(prev => prev.filter((_, i) => i !== index));
    setLocalMediaFilePaths(prev => prev.filter((_, i) => i !== index));
    setMediaDirty(true);
  };

  const handlePostNow = async () => {
    setIsPosting(true);
    try {
      const response = await fetch('/api/tweets/post-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: post.id }),
      });
      if (response.ok) {
        const data = await response.json();
        onUpdate(post.id, { status: 'published', xPostId: data.xPostId, publishedAt: new Date().toISOString() });
        onClose();
      }
    } catch (error) { console.error('Failed to post:', error); }
    finally { setIsPosting(false); }
  };

  const addThread = () => setEditedThreads([...editedThreads, '']);
  const updateThread = (idx: number, val: string) => { const t = [...editedThreads]; t[idx] = val; setEditedThreads(t); };
  const removeThread = (idx: number) => setEditedThreads(editedThreads.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-[5vh] overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              <img src="/favicon.svg" alt="PawMe" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Edit Tweet</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {post.pillar && <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">{PILLAR_LABELS[post.pillar] || post.pillar}</span>}
                {post.category && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{post.category}</span>}
                {post.campaignWeek && <span>W{post.campaignWeek}D{post.campaignDay || '?'}</span>}
                {post.scheduledAt && <span>· {format(parseISO(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><XIcon className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Main tweet text */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Main Tweet</label>
            <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-[15px] leading-5 resize-none ${isOverLimit ? 'border-red-400' : 'border-gray-300'}`} />
            <div className={`text-xs text-right mt-0.5 ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{charCount}/280</div>
          </div>

          {/* Thread tweets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Thread Tweets</label>
              <button onClick={addThread} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {editedThreads.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No thread tweets. Click "Add" to create a thread.</p>
            ) : (
              <div className="space-y-2">
                {editedThreads.map((threadText, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-xs text-gray-400 mt-2.5 w-6 text-right flex-shrink-0">{idx + 2}.</span>
                    <div className="flex-1">
                      <textarea value={threadText} onChange={(e) => updateThread(idx, e.target.value)} rows={2}
                        placeholder={`Thread tweet ${idx + 2}...`} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
                      <div className={`text-xs text-right mt-0.5 ${threadText.length > 280 ? 'text-red-600' : 'text-gray-400'}`}>{threadText.length}/280</div>
                    </div>
                    <button onClick={() => removeThread(idx)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded self-start mt-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hashtags & Mentions — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Hashtags</label>
              <div className="flex flex-wrap gap-1.5 items-center p-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[36px]">
                {editedHashtags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                    #{tag}
                    <button onClick={() => setEditedHashtags(editedHashtags.filter((_, i) => i !== idx))} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
                  </span>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); const t = newHashtag.trim().replace(/^#/, ''); if (t && !editedHashtags.includes(t)) { setEditedHashtags([...editedHashtags, t]); setNewHashtag(''); } }} className="inline-flex">
                  <input type="text" value={newHashtag} onChange={(e) => setNewHashtag(e.target.value)}
                    placeholder="Add..." className="w-20 px-1.5 py-0.5 bg-transparent text-xs focus:outline-none" />
                </form>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mentions</label>
              <div className="flex flex-wrap gap-1.5 items-center p-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[36px]">
                {editedMentions.map((mention, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    @{mention}
                    <button onClick={() => setEditedMentions(editedMentions.filter((_, i) => i !== idx))} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
                  </span>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); const m = newMention.trim().replace(/^@/, ''); if (m && !editedMentions.includes(m)) { setEditedMentions([...editedMentions, m]); setNewMention(''); } }} className="inline-flex">
                  <input type="text" value={newMention} onChange={(e) => setNewMention(e.target.value)}
                    placeholder="Add..." className="w-20 px-1.5 py-0.5 bg-transparent text-xs focus:outline-none" />
                </form>
              </div>
            </div>
          </div>

          {/* Current media preview */}
          {hasMedia && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Media ({localMediaUrls.length}){mediaDirty && <span className="text-orange-500 ml-1">· unsaved</span>}</label>
              <div className="grid grid-cols-4 gap-2">
                {localMediaUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group">
                    {localMediaTypes?.[idx] === 'video' ? (
                      <div className="relative w-full h-full bg-gray-900">
                        {post.videoThumbnailUrls?.[idx] ? (
                          <img src={post.videoThumbnailUrls[idx]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center"><Play className="w-5 h-5 text-white drop-shadow" fill="white" /></div>
                      </div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI & Media tool buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => togglePanel('ai-write')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activePanel === 'ai-write' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
              <Wand2 className="w-4 h-4" /> AI Write
            </button>
            <button onClick={() => togglePanel('ai-image')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activePanel === 'ai-image' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}>
              <Sparkles className="w-4 h-4" /> AI Image
            </button>
            <button onClick={() => togglePanel('library')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activePanel === 'library' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
              <ImageIcon className="w-4 h-4" /> Library
            </button>
            <button onClick={() => onOpenMediaModal(post)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100">
              <Plus className="w-4 h-4" /> Full Media Panel
            </button>
          </div>

          {/* AI Write panel */}
          {activePanel === 'ai-write' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">AI Tweet Writer</h4>
              <textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} rows={2}
                placeholder="Optional direction (e.g., 'focus on pet health monitoring', 'make it a poll')"
                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm mb-2" />
              <button onClick={handleGenerateText} disabled={isGeneratingText}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                {isGeneratingText ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
              </button>
            </div>
          )}

          {/* AI Image panel */}
          {activePanel === 'ai-image' && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-pink-900 mb-2">AI Image Generator</h4>
              <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3}
                placeholder="Describe the image you want to generate..."
                className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm mb-2" />
              {imageGenError && (
                <div className="mb-2 bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-xs text-red-700 whitespace-pre-wrap">{imageGenError}</p>
                </div>
              )}
              <button onClick={handleGenerateImage} disabled={isGeneratingImage || !imagePrompt}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 text-sm">
                {isGeneratingImage ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Image</>}
              </button>
            </div>
          )}

          {/* Media Library panel */}
          {activePanel === 'library' && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-teal-900 mb-2">Media Library</h4>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={libSearch} onChange={(e) => setLibSearch(e.target.value)}
                    placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500" />
                </div>
                <select value={libType} onChange={(e) => setLibType(e.target.value as any)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
                  <option value="all">All</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </select>
              </div>

              {loadingLibrary ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">{filteredLibMedia.length} assets</p>
                  <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
                    {filteredLibMedia.map((media) => {
                      const isSelected = selectedLib.includes(media.id);
                      return (
                        <div key={media.id} onClick={() => setSelectedLib(prev => prev.includes(media.id) ? prev.filter(id => id !== media.id) : [...prev, media.id])}
                          className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-400'}`}>
                          {media.type === 'video' ? (
                            <div className="relative w-full h-full bg-gray-900">
                              {media.thumbnailUrl ? <img src={media.thumbnailUrl} alt="" className="w-full h-full object-cover" /> :
                                media.storageUrl ? <video src={media.storageUrl} className="w-full h-full object-cover" muted preload="metadata" /> :
                                <div className="flex items-center justify-center w-full h-full"><Video className="w-4 h-4 text-white" /></div>}
                              <div className="absolute top-0.5 right-0.5 bg-black/75 text-white text-[8px] px-1 py-0.5 rounded">VID</div>
                            </div>
                          ) : (
                            <img src={media.storageUrl} alt="" className="w-full h-full object-cover" />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                              <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedLib.length > 0 && (
                    <button onClick={handleAttachLib} disabled={attachingMedia}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium">
                      {attachingMedia ? <><Loader2 className="w-4 h-4 animate-spin" /> Attaching...</> : <><ImageIcon className="w-4 h-4" /> Attach {selectedLib.length} to Tweet</>}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0 bg-gray-50 rounded-b-xl">
          <div className="flex gap-2">
            {post.status !== 'published' && (
              <button onClick={() => onScheduleToggle(post.id, post.status)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${
                  post.status === 'scheduled' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}>
                {post.status === 'scheduled' ? <><CalendarX className="w-4 h-4" /> Unschedule</> : <><Calendar className="w-4 h-4" /> Schedule</>}
              </button>
            )}
            {post.status !== 'published' && (
              <button onClick={handlePostNow} disabled={isPosting || !hasMedia}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 text-sm">
                <Send className="w-4 h-4" /> {isPosting ? 'Posting...' : 'Post Now'}
              </button>
            )}
            {post.xPostId && (
              <a href={`https://x.com/pawme_ai/status/${post.xPostId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:underline">View on X ↗</a>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={isSaving || isOverLimit}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
