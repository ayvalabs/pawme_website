'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ScheduledPost } from '@/types/scheduled-post';
import type { MediaLibraryEntry } from '@/types/media-library';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import {
  FileText, Clock, CheckCircle2, AlertCircle, Edit2, Trash2, Send, Plus,
  MoreHorizontal, Image as ImageIcon, X as XIcon, MessageCircle, Tag,
  Heart, Repeat2, BarChart3, Bookmark, Share, Play, Wand2, Loader2,
  Sparkles, Save, Calendar, CalendarX, Search, Video,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  published: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  scheduled: <Clock className="w-3 h-3" />,
  published: <CheckCircle2 className="w-3 h-3" />,
  failed: <AlertCircle className="w-3 h-3" />,
};

/** Render tweet text with highlighted hashtags and @mentions */
function renderTweetText(text: string) {
  const parts = text.split(/([@#]\w+|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') || part.startsWith('#')) {
      return <span key={i} className="text-blue-500 hover:underline cursor-pointer">{part}</span>;
    }
    if (part.startsWith('http')) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{part.replace(/^https?:\/\//, '').slice(0, 30)}...</a>;
    }
    return <span key={i}>{part}</span>;
  });
}

/** Format date like X does */
function formatTweetDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const now = new Date();
    const absDiff = Math.abs(date.getTime() - now.getTime());
    if (absDiff < 86400000) {
      return formatDistanceToNowStrict(date, { addSuffix: false })
        .replace(' seconds', 's').replace(' second', 's')
        .replace(' minutes', 'm').replace(' minute', 'm')
        .replace(' hours', 'h').replace(' hour', 'h');
    }
    if (date.getFullYear() === now.getFullYear()) return format(date, 'MMM d');
    return format(date, 'MMM d, yyyy');
  } catch { return dateStr; }
}

function getVideoThumbnailUrl(mediaIdx: number, mediaTypes: ('image' | 'video')[], videoThumbnailUrls?: string[]): string | undefined {
  if (!videoThumbnailUrls || videoThumbnailUrls.length === 0) return undefined;
  let videoIdx = 0;
  for (let i = 0; i < mediaIdx; i++) { if (mediaTypes?.[i] === 'video') videoIdx++; }
  return videoThumbnailUrls[videoIdx] || undefined;
}

/** Single media item with video play support */
function MediaItem({ url, isVideo, thumbnail, className }: { url: string; isVideo: boolean; thumbnail?: string; className: string }) {
  const [playing, setPlaying] = useState(false);
  if (isVideo) {
    if (playing) return <video src={url} className={`${className} bg-black`} controls autoPlay preload="auto" onClick={(e) => e.stopPropagation()} />;
    return (
      <div className="relative w-full h-full cursor-pointer" onClick={() => setPlaying(true)}>
        {thumbnail ? <img src={thumbnail} alt="Video" className={className} loading="lazy" /> : <video src={url} className={`${className} bg-black`} preload="metadata" />}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 rounded-full p-3 hover:bg-black/80 transition-colors"><Play className="w-6 h-6 text-white fill-white" /></div>
        </div>
      </div>
    );
  }
  return <img src={url} alt="Post media" className={className} loading="lazy" />;
}

/** Media grid — mimics X's layout (1, 2, 3, 4+ items) */
function MediaGrid({ mediaUrls, mediaTypes, videoThumbnailUrls, onRemoveMedia }: {
  mediaUrls: string[]; mediaTypes: ('image' | 'video')[]; videoThumbnailUrls?: string[]; onRemoveMedia?: (index: number) => void;
}) {
  if (!mediaUrls || mediaUrls.length === 0) return null;
  const count = mediaUrls.length;

  const removeBtn = (idx: number) => onRemoveMedia && (
    <button onClick={() => onRemoveMedia(idx)} className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
      <XIcon className="w-4 h-4" />
    </button>
  );

  if (count === 1) {
    const isVideo = mediaTypes?.[0] === 'video';
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 relative group">
        <MediaItem url={mediaUrls[0]} isVideo={isVideo} thumbnail={getVideoThumbnailUrl(0, mediaTypes, videoThumbnailUrls)} className="w-full max-h-[400px] object-cover" />
        {removeBtn(0)}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5">
        {mediaUrls.slice(0, 2).map((url, idx) => (
          <div key={idx} className="relative aspect-square group">
            <MediaItem url={url} isVideo={mediaTypes?.[idx] === 'video'} thumbnail={getVideoThumbnailUrl(idx, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
            {removeBtn(idx)}
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: '300px' }}>
        <div className="row-span-2 relative group">
          <MediaItem url={mediaUrls[0]} isVideo={mediaTypes?.[0] === 'video'} thumbnail={getVideoThumbnailUrl(0, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
          {removeBtn(0)}
        </div>
        {mediaUrls.slice(1, 3).map((url, idx) => {
          const realIdx = idx + 1;
          return (
            <div key={idx} className="relative group">
              <MediaItem url={url} isVideo={mediaTypes?.[realIdx] === 'video'} thumbnail={getVideoThumbnailUrl(realIdx, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
              {removeBtn(realIdx)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: '300px' }}>
      {mediaUrls.slice(0, 4).map((url, idx) => (
        <div key={idx} className="relative group">
          <MediaItem url={url} isVideo={mediaTypes?.[idx] === 'video'} thumbnail={getVideoThumbnailUrl(idx, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
          {removeBtn(idx)}
          {idx === 3 && count > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-2xl font-bold">+{count - 4}</span></div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Placeholder when media file paths exist but URLs haven't been linked */
function MediaPlaceholder({ filePaths, mediaTypes }: { filePaths: string[]; mediaTypes: ('image' | 'video')[] }) {
  if (!filePaths || filePaths.length === 0) return null;
  const imageCount = mediaTypes?.filter(t => t === 'image').length || filePaths.length;
  const videoCount = mediaTypes?.filter(t => t === 'video').length || 0;
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 p-6">
      <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
        <div className="flex gap-2">
          {imageCount > 0 && <ImageIcon className="w-8 h-8" />}
          {videoCount > 0 && <Play className="w-8 h-8" />}
        </div>
        <p className="text-sm font-medium">
          {imageCount > 0 && `${imageCount} photo${imageCount > 1 ? 's' : ''}`}
          {imageCount > 0 && videoCount > 0 && ' + '}
          {videoCount > 0 && `${videoCount} video${videoCount > 1 ? 's' : ''}`}
        </p>
        <p className="text-xs">Run <code className="bg-gray-200 px-1 rounded text-gray-500">pnpm link-media</code> to link</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN TWEET CARD — matches dashboard/content layout
// ══════════════════════════════════════════════════════════

interface TweetCardProps {
  post: ScheduledPost;
  onUpdate: (id: string, updates: Partial<ScheduledPost>) => void;
  onOpenMediaModal: (post: ScheduledPost) => void;
  onScheduleToggle: (tweetId: string, currentStatus: string) => void;
}

export function TweetCard({ post, onUpdate, onOpenMediaModal, onScheduleToggle }: TweetCardProps) {
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const hasFilePaths = post.mediaFilePaths && post.mediaFilePaths.length > 0;
  const hasThread = post.threadTexts && post.threadTexts.length > 0;
  const [threadExpanded, setThreadExpanded] = useState(false);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(post.text);
  const [editedThreads, setEditedThreads] = useState<string[]>(post.threadTexts || []);
  const [editedHashtags, setEditedHashtags] = useState<string[]>(post.hashtags || []);
  const [editedMentions, setEditedMentions] = useState<string[]>(post.mentions || []);
  const [newHashtag, setNewHashtag] = useState('');
  const [newMention, setNewMention] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Inline media library state
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryEntry[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libSearchQuery, setLibSearchQuery] = useState('');
  const [libTypeFilter, setLibTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedLibMedia, setSelectedLibMedia] = useState<string[]>([]);
  const [attachingMedia, setAttachingMedia] = useState(false);

  // AI Image generation inline state
  const [showAiImage, setShowAiImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenError, setImageGenError] = useState('');

  const charCount = editedText.length;
  const isOverLimit = charCount > 280;

  // Load media library on demand
  useEffect(() => {
    if (showMediaLibrary && mediaLibrary.length === 0) {
      loadMediaLibrary();
    }
  }, [showMediaLibrary]);

  // Seed image prompt from tweet text
  useEffect(() => {
    if (showAiImage && !imagePrompt) {
      const allText = [editedText, ...editedThreads].join(' ');
      const pillarHints: Record<string, string> = {
        build_in_public: 'behind-the-scenes hardware development, workshop, prototyping',
        product_showcase: 'sleek product photography, clean background, cute robot with pets',
        founder_voice: 'candid founder moment, startup life, authentic',
        community_prompt: 'pets and technology, pet owners, community, warm',
        market_context: 'pet industry data visualization, infographic style',
      };
      const hint = pillarHints[post.pillar || ''] || 'cute robot interacting with pets';
      setImagePrompt(`Create a compelling social media image for this tweet:\n\n"${allText.substring(0, 300)}"\n\nStyle: ${hint}\nProduct: PawMe — a spherical self-balancing AI pet companion robot.`);
    }
  }, [showAiImage]);

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
      if (libTypeFilter !== 'all' && m.type !== libTypeFilter) return false;
      if (libSearchQuery) {
        const q = libSearchQuery.toLowerCase();
        const match = m.caption?.toLowerCase().includes(q) || m.path?.toLowerCase().includes(q) || m.tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [mediaLibrary, libTypeFilter, libSearchQuery]);

  const handleAttachLibMedia = async () => {
    if (selectedLibMedia.length === 0) return;
    setAttachingMedia(true);
    try {
      const response = await fetch('/api/tweets/attach-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: post.id, mediaLibraryIds: selectedLibMedia }),
      });
      if (response.ok) {
        const data = await response.json();
        onUpdate(post.id, { mediaUrls: data.mediaUrls, mediaTypes: data.mediaTypes });
        setSelectedLibMedia([]);
        setShowMediaLibrary(false);
      }
    } catch (error) { console.error('Failed to attach media:', error); }
    finally { setAttachingMedia(false); }
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
        onUpdate(post.id, { mediaUrls: data.mediaUrls, mediaTypes: data.mediaTypes || ['image'] });
        setShowAiImage(false);
        setImagePrompt('');
      } else {
        const details = data.details ? `\n${data.details}` : '';
        const models = data.modelsAttempted ? `\nModels tried: ${data.modelsAttempted.join(', ')}` : '';
        setImageGenError(`${data.error || 'Generation failed'}${details}${models}`);
      }
    } catch (error: any) { setImageGenError(error.message || 'Network error'); }
    finally { setIsGeneratingImage(false); }
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
      }
    } catch (error) { console.error('Failed to post:', error); }
    finally { setIsPosting(false); }
  };

  const handleSave = async () => {
    const updates = {
      text: editedText,
      threadTexts: editedThreads.filter(t => t.trim()),
      hashtags: editedHashtags.filter(h => h.trim()),
      mentions: editedMentions.filter(m => m.trim()),
      updatedAt: new Date().toISOString(),
    };
    const response = await fetch('/api/tweets/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweetId: post.id, updates }),
    });
    if (response.ok) { onUpdate(post.id, updates); setIsEditing(false); }
  };

  const handleRemoveMedia = async (index: number) => {
    const newMediaUrls = post.mediaUrls.filter((_, i) => i !== index);
    const newMediaTypes = post.mediaTypes.filter((_, i) => i !== index);
    const newMediaFilePaths = post.mediaFilePaths.filter((_, i) => i !== index);
    const response = await fetch('/api/tweets/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweetId: post.id, updates: { mediaUrls: newMediaUrls, mediaTypes: newMediaTypes, mediaFilePaths: newMediaFilePaths } }),
    });
    if (response.ok) onUpdate(post.id, { mediaUrls: newMediaUrls, mediaTypes: newMediaTypes, mediaFilePaths: newMediaFilePaths });
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
        setIsEditing(true);
        setShowAiPanel(false);
      }
    } catch (error) { console.error('Failed to generate text:', error); }
    finally { setIsGeneratingText(false); }
  };

  const addThread = () => setEditedThreads([...editedThreads, '']);
  const updateThread = (index: number, value: string) => { const t = [...editedThreads]; t[index] = value; setEditedThreads(t); };
  const removeThread = (index: number) => setEditedThreads(editedThreads.filter((_, i) => i !== index));

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
      <div className="px-4 pt-3 pb-1">
        {/* Status banner */}
        {post.status !== 'published' && (
          <div className="flex items-center gap-1.5 ml-12 mb-1">
            {STATUS_ICONS[post.status]}
            <span className="text-xs text-gray-500 font-medium">
              {post.status === 'scheduled' && post.scheduledAt && <>Scheduled for {format(parseISO(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}</>}
              {post.status === 'draft' && 'Draft'}
              {post.status === 'failed' && <span className="text-red-500">Failed{post.errorMessage ? `: ${post.errorMessage}` : ''}</span>}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              <img src="/favicon.svg" alt="PawMe" className="w-7 h-7" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-bold text-[15px] text-gray-900 truncate">PawMe</span>
                <svg viewBox="0 0 22 22" className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.272 1.893.143.634-.131 1.22-.434 1.69-.88.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.9.584-.272 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
                <span className="text-gray-500 text-[15px] truncate">@pawme_ai</span>
                <span className="text-gray-500 text-[15px]">·</span>
                <span className="text-gray-500 text-[15px] hover:underline cursor-pointer flex-shrink-0">
                  {post.scheduledAt ? formatTweetDate(post.scheduledAt) : 'No date'}
                </span>
              </div>
            </div>

            {/* Tweet text — inline editing or display */}
            {isEditing ? (
              <div className="mt-0.5">
                <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-[15px] leading-5 ${isOverLimit ? 'border-red-400' : 'border-gray-300'}`} />
                <div className={`text-xs text-right ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{charCount}/280</div>

                {/* Thread editing */}
                {editedThreads.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {editedThreads.map((threadText, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="flex-1 relative">
                          <textarea value={threadText} onChange={(e) => updateThread(idx, e.target.value)} rows={2}
                            placeholder={`Thread tweet ${idx + 2}`} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-[14px]" />
                          <div className="text-xs text-right text-gray-400">{threadText.length}/280</div>
                        </div>
                        <button onClick={() => removeThread(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded self-start"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={addThread} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                      <Plus className="w-4 h-4" /> Add Thread Tweet
                    </button>
                  </div>
                )}

                {/* Hashtags editor */}
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Hashtags</label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {editedHashtags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                        #{tag}
                        <button onClick={() => setEditedHashtags(editedHashtags.filter((_, i) => i !== idx))} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <form onSubmit={(e) => { e.preventDefault(); const t = newHashtag.trim().replace(/^#/, ''); if (t && !editedHashtags.includes(t)) { setEditedHashtags([...editedHashtags, t]); setNewHashtag(''); } }} className="inline-flex">
                      <input type="text" value={newHashtag} onChange={(e) => setNewHashtag(e.target.value)}
                        placeholder="Add tag..." className="w-24 px-2 py-0.5 border border-gray-300 rounded-full text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400" />
                    </form>
                  </div>
                </div>

                {/* Mentions editor */}
                <div className="mt-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Mentions</label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {editedMentions.map((mention, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs">
                        @{mention}
                        <button onClick={() => setEditedMentions(editedMentions.filter((_, i) => i !== idx))} className="hover:text-red-600"><XIcon className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <form onSubmit={(e) => { e.preventDefault(); const m = newMention.trim().replace(/^@/, ''); if (m && !editedMentions.includes(m)) { setEditedMentions([...editedMentions, m]); setNewMention(''); } }} className="inline-flex">
                      <input type="text" value={newMention} onChange={(e) => setNewMention(e.target.value)}
                        placeholder="Add @user..." className="w-28 px-2 py-0.5 border border-gray-300 rounded-full text-xs focus:ring-1 focus:ring-purple-400 focus:border-purple-400" />
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-[15px] leading-5 text-gray-900 whitespace-pre-wrap break-words mt-0.5">
                  {renderTweetText(post.text)}
                </div>

                {/* Thread preview */}
                {hasThread && (
                  <div className="mt-2">
                    <button onClick={() => setThreadExpanded(!threadExpanded)} className="text-blue-500 text-sm font-medium hover:underline">
                      {threadExpanded ? 'Hide thread' : `Show thread (${post.threadTexts!.length} more tweets)`}
                    </button>
                    {threadExpanded && (
                      <div className="mt-2 border-l-2 border-blue-200 pl-3 space-y-4">
                        {post.threadTexts!.map((tweet, idx) => {
                          const tweetPos = idx + 1;
                          const mediaIndices = post.threadMediaMap?.[tweetPos] || [];
                          const tMediaUrls = mediaIndices.map(i => post.mediaUrls?.[i]).filter((u): u is string => !!u);
                          const tMediaTypes = mediaIndices.map(i => post.mediaTypes?.[i] || 'image') as ('image' | 'video')[];
                          return (
                            <div key={idx} className="relative">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-xs text-gray-400 font-medium">{idx + 2}/{post.threadTexts!.length + 1}</span>
                              </div>
                              <div className="text-[14px] leading-5 text-gray-800 whitespace-pre-wrap break-words">{renderTweetText(tweet)}</div>
                              {tMediaUrls.length > 0 && <MediaGrid mediaUrls={tMediaUrls} mediaTypes={tMediaTypes} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Media grid or placeholder */}
            {hasMedia ? (() => {
              if (hasThread && post.threadMediaMap && post.threadMediaMap[0]) {
                const mainIndices = post.threadMediaMap[0] as number[];
                if (mainIndices.length === 0) return null;
                const mUrls = mainIndices.map(i => post.mediaUrls?.[i]).filter((u): u is string => !!u);
                const mTypes = mainIndices.map(i => post.mediaTypes?.[i] || 'image') as ('image' | 'video')[];
                if (mUrls.length === 0) return null;
                return <MediaGrid mediaUrls={mUrls} mediaTypes={mTypes} videoThumbnailUrls={post.videoThumbnailUrls} onRemoveMedia={handleRemoveMedia} />;
              }
              return <MediaGrid mediaUrls={post.mediaUrls} mediaTypes={post.mediaTypes} videoThumbnailUrls={post.videoThumbnailUrls} onRemoveMedia={handleRemoveMedia} />;
            })() : hasFilePaths ? (
              <MediaPlaceholder filePaths={post.mediaFilePaths} mediaTypes={post.mediaTypes} />
            ) : null}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap mt-3">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm">
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                  <button onClick={() => setShowAiPanel(!showAiPanel)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all text-sm">
                    <Wand2 className="w-4 h-4" /> AI Write
                  </button>
                  <button onClick={() => { setShowAiImage(!showAiImage); setShowMediaLibrary(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-sm">
                    <Sparkles className="w-4 h-4" /> AI Image
                  </button>
                  <button onClick={() => { setShowMediaLibrary(!showMediaLibrary); setShowAiImage(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all text-sm">
                    <ImageIcon className="w-4 h-4" /> Library
                  </button>
                  <button onClick={() => onOpenMediaModal(post)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm">
                    <Plus className="w-4 h-4" /> Full Media Panel
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditedText(post.text); setEditedThreads(post.threadTexts || []); setEditedHashtags(post.hashtags || []); setEditedMentions(post.mentions || []); setShowAiPanel(false); setShowAiImage(false); setShowMediaLibrary(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowAiPanel(!showAiPanel)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all text-sm">
                    <Wand2 className="w-4 h-4" /> AI Write
                  </button>
                  <button onClick={() => onOpenMediaModal(post)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-sm">
                    <ImageIcon className="w-4 h-4" /> Add Media
                  </button>
                  {post.status !== 'published' && (
                    <button onClick={handlePostNow} disabled={isPosting || !hasMedia}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
                      <Send className="w-4 h-4" /> {isPosting ? 'Posting...' : 'Post Now'}
                    </button>
                  )}
                  {post.status !== 'published' && (
                    <button onClick={() => onScheduleToggle(post.id, post.status)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${
                        post.status === 'scheduled' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}>
                      {post.status === 'scheduled' ? <><CalendarX className="w-4 h-4" /> Unschedule</> : <><Calendar className="w-4 h-4" /> Schedule</>}
                    </button>
                  )}
                  <button onClick={() => { setIsEditing(true); setEditedText(post.text); setEditedThreads(post.threadTexts || []); setEditedHashtags(post.hashtags || []); setEditedMentions(post.mentions || []); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm">
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                </>
              )}
            </div>

            {/* Category & status badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600"><Tag className="w-3 h-3" />{post.category}</span>
              )}
              {post.pillar && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-xs text-purple-600">{post.pillar.replace(/_/g, ' ')}</span>
              )}
              {post.campaignWeek && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-600">W{post.campaignWeek}D{post.campaignDay || '?'}</span>
              )}
              {post.platforms && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
                  {(post.platforms === 'x' || post.platforms === 'both') && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  )}
                  {post.platforms === 'both' ? 'X + Telegram' : post.platforms === 'x' ? 'X' : 'Telegram'}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${STATUS_COLORS[post.status]}`}>
                {STATUS_ICONS[post.status]}
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </span>
              {post.xPostId && (
                <a href={`https://x.com/pawme_ai/status/${post.xPostId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline self-center">View on X ↗</a>
              )}
              {post.hashtags && post.hashtags.length > 0 && post.hashtags.map((tag, i) => (
                <span key={`h${i}`} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-600">#{tag}</span>
              ))}
              {post.mentions && post.mentions.length > 0 && post.mentions.map((m, i) => (
                <span key={`m${i}`} className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-xs text-purple-600">@{m}</span>
              ))}
            </div>

            {/* AI Write Panel */}
            {showAiPanel && (
              <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-purple-900">AI Tweet Writer</h4>
                </div>
                <textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} rows={2}
                  placeholder="Optional: Give direction (e.g., 'focus on pet health monitoring' or 'make it a poll')"
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm mb-3" />
                <div className="flex gap-2">
                  <button onClick={handleGenerateText} disabled={isGeneratingText}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all text-sm">
                    {isGeneratingText ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing...</> : <><Sparkles className="w-4 h-4" /> Generate Tweet</>}
                  </button>
                  <button onClick={() => setShowAiPanel(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              </div>
            )}

            {/* AI Image Generation Panel */}
            {showAiImage && (
              <div className="mt-3 bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-600" />
                    <h4 className="text-sm font-semibold text-pink-900">AI Image Generator</h4>
                  </div>
                  <button onClick={() => setShowAiImage(false)} className="p-1 hover:bg-pink-100 rounded"><XIcon className="w-4 h-4 text-pink-600" /></button>
                </div>
                <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3}
                  placeholder="Describe the image you want to generate..."
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm mb-3" />
                {imageGenError && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-xs text-red-700 whitespace-pre-wrap">{imageGenError}</p>
                  </div>
                )}
                <button onClick={handleGenerateImage} disabled={isGeneratingImage || !imagePrompt}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-orange-600 text-white rounded-lg hover:from-pink-700 hover:to-orange-700 disabled:opacity-50 transition-all text-sm">
                  {isGeneratingImage ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Image</>}
                </button>
              </div>
            )}

            {/* Inline Media Library Picker */}
            {showMediaLibrary && (
              <div className="mt-3 border border-teal-200 rounded-lg p-4 bg-gradient-to-r from-teal-50 to-cyan-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-semibold text-teal-900">Media Library</h4>
                  </div>
                  <button onClick={() => { setShowMediaLibrary(false); setSelectedLibMedia([]); }} className="p-1 hover:bg-teal-100 rounded"><XIcon className="w-4 h-4 text-teal-600" /></button>
                </div>

                {/* Search & filters */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" value={libSearchQuery} onChange={(e) => setLibSearchQuery(e.target.value)}
                      placeholder="Search media..." className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <select value={libTypeFilter} onChange={(e) => setLibTypeFilter(e.target.value as any)}
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
                    <p className="text-xs text-gray-500 mb-2">{filteredLibMedia.length} assets · Click to select</p>
                    <div className="grid grid-cols-5 gap-2 max-h-[240px] overflow-y-auto">
                      {filteredLibMedia.map((media) => {
                        const isSelected = selectedLibMedia.includes(media.id);
                        return (
                          <div key={media.id} onClick={() => setSelectedLibMedia(prev => prev.includes(media.id) ? prev.filter(id => id !== media.id) : [...prev, media.id])}
                            className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-400'}`}>
                            {media.type === 'video' ? (
                              <div className="relative w-full h-full bg-gray-900">
                                {media.thumbnailUrl ? <img src={media.thumbnailUrl} alt="" className="w-full h-full object-cover" /> :
                                  media.storageUrl ? <video src={media.storageUrl} className="w-full h-full object-cover" muted preload="metadata" /> :
                                  <div className="flex items-center justify-center w-full h-full"><Video className="w-5 h-5 text-white" /></div>}
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

                    {selectedLibMedia.length > 0 && (
                      <button onClick={handleAttachLibMedia} disabled={attachingMedia}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-all text-sm font-medium">
                        {attachingMedia ? <><Loader2 className="w-4 h-4 animate-spin" /> Attaching...</> : <><ImageIcon className="w-4 h-4" /> Attach {selectedLibMedia.length} to Tweet</>}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Engagement bar */}
            <div className="flex justify-between items-center mt-2 -ml-2 max-w-[425px]">
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500">
                <MessageCircle className="w-[18px] h-[18px]" />
              </button>
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-green-50 transition-colors text-gray-500 hover:text-green-500">
                <Repeat2 className="w-[18px] h-[18px]" />
              </button>
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-pink-50 transition-colors text-gray-500 hover:text-pink-500">
                <Heart className="w-[18px] h-[18px]" />
              </button>
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500">
                <BarChart3 className="w-[18px] h-[18px]" />
              </button>
              <div className="flex items-center">
                <button className="p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500"><Bookmark className="w-[18px] h-[18px]" /></button>
                <button className="p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500"><Share className="w-[18px] h-[18px]" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
