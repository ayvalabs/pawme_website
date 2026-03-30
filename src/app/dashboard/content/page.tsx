'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Button,
} from '@/app/components/ui/button';
import {
  Badge,
} from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Label,
} from '@/app/components/ui/label';
import {
  Input,
} from '@/app/components/ui/input';
import {
  Textarea,
} from '@/app/components/ui/textarea';
import {
  Checkbox,
} from '@/app/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Send,
  MoreHorizontal,
  Image as ImageIcon,
  X as XIcon,
  MessageCircle,
  Tag,
  Heart,
  Repeat2,
  BarChart3,
  Bookmark,
  Share,
  Play,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { toast } from 'sonner';
import type { ScheduledPost, CreatePostInput, PostStatus } from '@/types/scheduled-post';
import EditPostDialog from './EditPostDialog';

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  published: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_ICONS: Record<PostStatus, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  scheduled: <Clock className="w-3 h-3" />,
  published: <CheckCircle2 className="w-3 h-3" />,
  failed: <AlertCircle className="w-3 h-3" />,
};

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

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];

interface FilterState {
  status: PostStatus | 'all';
  category: string;
  week: string;
}

/** Render tweet text with highlighted hashtags and @mentions */
function renderTweetText(text: string) {
  // Split text into parts: @mentions, #hashtags, URLs, and regular text
  const parts = text.split(/([@#]\w+|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-blue-500 hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    if (part.startsWith('#')) {
      return (
        <span key={i} className="text-blue-500 hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    if (part.startsWith('http')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {part.replace(/^https?:\/\//, '').slice(0, 30)}...
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Format date like X does: "2h", "Mar 15", etc. */
function formatTweetDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const absDiff = Math.abs(diffMs);

    // If within 24 hours, show relative
    if (absDiff < 86400000) {
      return formatDistanceToNowStrict(date, { addSuffix: false })
        .replace(' seconds', 's')
        .replace(' second', 's')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h');
    }

    // If same year, show "Mar 15"
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }

    // Otherwise "Mar 15, 2026"
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/** Media grid component - mimics X's media layout */
function MediaGrid({ mediaUrls, mediaTypes }: { mediaUrls: string[]; mediaTypes: ('image' | 'video')[] }) {
  if (!mediaUrls || mediaUrls.length === 0) return null;

  const count = mediaUrls.length;

  if (count === 1) {
    const isVideo = mediaTypes?.[0] === 'video';
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
        {isVideo ? (
          <div className="relative">
            <video
              src={mediaUrls[0]}
              className="w-full max-h-[400px] object-cover bg-black"
              controls
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 rounded-full p-3">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={mediaUrls[0]}
            alt="Post media"
            className="w-full max-h-[400px] object-cover"
            loading="lazy"
          />
        )}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5">
        {mediaUrls.slice(0, 2).map((url, idx) => {
          const isVideo = mediaTypes?.[idx] === 'video';
          return (
            <div key={idx} className="relative aspect-square">
              {isVideo ? (
                <video src={url} className="w-full h-full object-cover bg-black" controls preload="metadata" />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: '300px' }}>
        <div className="row-span-2 relative">
          {mediaTypes?.[0] === 'video' ? (
            <video src={mediaUrls[0]} className="w-full h-full object-cover bg-black" controls preload="metadata" />
          ) : (
            <img src={mediaUrls[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
          )}
        </div>
        {mediaUrls.slice(1, 3).map((url, idx) => {
          const realIdx = idx + 1;
          const isVideo = mediaTypes?.[realIdx] === 'video';
          return (
            <div key={idx} className="relative">
              {isVideo ? (
                <video src={url} className="w-full h-full object-cover bg-black" controls preload="metadata" />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 4+ media
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: '300px' }}>
      {mediaUrls.slice(0, 4).map((url, idx) => {
        const isVideo = mediaTypes?.[idx] === 'video';
        return (
          <div key={idx} className="relative">
            {isVideo ? (
              <video src={url} className="w-full h-full object-cover bg-black" controls preload="metadata" />
            ) : (
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            )}
            {idx === 3 && count > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{count - 4}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Placeholder media indicator when mediaUrls are empty but mediaFilePaths exist */
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
        <p className="text-xs text-gray-400">
          Run <code className="bg-gray-200 px-1 rounded text-gray-500">npm run upload-media</code> to upload
        </p>
      </div>
    </div>
  );
}

/** Single X/Twitter-style tweet card */
function TweetCard({
  post,
  isSelected,
  onToggleSelect,
  onEdit,
  onPublishNow,
  onDelete,
}: {
  post: ScheduledPost;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onPublishNow: () => void;
  onDelete: () => void;
}) {
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const hasFilePaths = post.mediaFilePaths && post.mediaFilePaths.length > 0;
  const hasThread = post.threadTexts && post.threadTexts.length > 0;
  const [threadExpanded, setThreadExpanded] = useState(false);

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
      <div className="px-4 pt-3 pb-1">
        {/* Status banner for scheduled/failed */}
        {post.status !== 'published' && (
          <div className="flex items-center gap-1.5 ml-12 mb-1">
            {STATUS_ICONS[post.status]}
            <span className="text-xs text-gray-500 font-medium">
              {post.status === 'scheduled' && post.scheduledAt && (
                <>Scheduled for {format(parseISO(post.scheduledAt), 'MMM d, yyyy \'at\' h:mm a')}</>
              )}
              {post.status === 'draft' && 'Draft'}
              {post.status === 'failed' && (
                <span className="text-red-500">Failed to publish{post.errorMessage ? `: ${post.errorMessage}` : ''}</span>
              )}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Selection checkbox */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              <img
                src="/favicon.svg"
                alt="PawMe"
                className="w-7 h-7"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header: Name, handle, date, menu */}
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

              {/* More menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors text-gray-500 -mt-1">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit post
                  </DropdownMenuItem>
                  {(post.status === 'draft' || post.status === 'scheduled') && (
                    <DropdownMenuItem onClick={onPublishNow}>
                      <Send className="w-4 h-4 mr-2" />
                      Publish now
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tweet text */}
            <div className="text-[15px] leading-5 text-gray-900 whitespace-pre-wrap break-words mt-0.5">
              {renderTweetText(post.text)}
            </div>

            {/* Thread preview */}
            {hasThread && (
              <div className="mt-2">
                <button
                  onClick={() => setThreadExpanded(!threadExpanded)}
                  className="text-blue-500 text-sm font-medium hover:underline"
                >
                  {threadExpanded ? 'Hide thread' : `Show thread (${post.threadTexts!.length} more tweets)`}
                </button>
                {threadExpanded && (
                  <div className="mt-2 border-l-2 border-blue-200 pl-3 space-y-3">
                    {post.threadTexts!.map((tweet, idx) => (
                      <div key={idx} className="relative">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-xs text-gray-400 font-medium">{idx + 2}/{post.threadTexts!.length + 1}</span>
                        </div>
                        <div className="text-[14px] leading-5 text-gray-800 whitespace-pre-wrap break-words">
                          {renderTweetText(tweet)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Media */}
            {hasMedia ? (
              <MediaGrid mediaUrls={post.mediaUrls} mediaTypes={post.mediaTypes} />
            ) : hasFilePaths ? (
              <MediaPlaceholder filePaths={post.mediaFilePaths} mediaTypes={post.mediaTypes} />
            ) : null}

            {/* Category & Platform badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
                  <Tag className="w-3 h-3" />
                  {post.category}
                </span>
              )}
              {post.campaignWeek && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-600">
                  W{post.campaignWeek}D{post.campaignDay || '?'}
                </span>
              )}
              {post.platforms && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
                  {(post.platforms === 'x' || post.platforms === 'both') && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  )}
                  {(post.platforms === 'telegram' || post.platforms === 'both') && (
                    <MessageCircle className="w-3 h-3" />
                  )}
                  {post.platforms === 'both' ? 'X + Telegram' : post.platforms === 'x' ? 'X' : 'Telegram'}
                </span>
              )}
              <Badge variant="outline" className={`text-xs py-0 h-5 gap-1 ${STATUS_COLORS[post.status]}`}>
                {STATUS_ICONS[post.status]}
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </Badge>
            </div>

            {/* Engagement action bar - mimics X layout */}
            <div className="flex justify-between items-center mt-2 -ml-2 max-w-[425px]">
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500">
                <MessageCircle className="w-[18px] h-[18px]" />
                <span className="text-xs group-hover:text-blue-500">
                  {post.status === 'published' ? '0' : ''}
                </span>
              </button>
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-green-50 transition-colors text-gray-500 hover:text-green-500">
                <Repeat2 className="w-[18px] h-[18px]" />
                <span className="text-xs group-hover:text-green-500">
                  {post.status === 'published' ? '0' : ''}
                </span>
              </button>
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-pink-50 transition-colors text-gray-500 hover:text-pink-500">
                <Heart className="w-[18px] h-[18px]" />
                <span className="text-xs group-hover:text-pink-500">
                  {post.status === 'published' ? '0' : ''}
                </span>
              </button>
              <button className="group flex items-center gap-1 p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500">
                <BarChart3 className="w-[18px] h-[18px]" />
                <span className="text-xs group-hover:text-blue-500">
                  {post.status === 'published' ? '0' : ''}
                </span>
              </button>
              <div className="flex items-center">
                <button className="p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500">
                  <Bookmark className="w-[18px] h-[18px]" />
                </button>
                <button className="p-2 rounded-full hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500">
                  <Share className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentManagerPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: 'All',
    week: 'All',
  });
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editDialogPost, setEditDialogPost] = useState<ScheduledPost | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePostInput & { id?: string }>({
    text: '',
    scheduledAt: '',
    platforms: 'both',
    category: '',
    hashtags: [],
    mentions: [],
    ctaUrl: '',
    campaignWeek: 1,
    campaignDay: 1,
    mediaUrls: [],
    mediaFilePaths: [],
    mediaTypes: [],
  });
  const [hashtagInput, setHashtagInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string[]>([]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.category !== 'All') params.append('category', filters.category);
      if (filters.week !== 'All') {
        const weekNum = parseInt(filters.week.split(' ')[1]);
        params.append('week', weekNum.toString());
      }

      const response = await fetch(`/api/posts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Calculate stats
  const stats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
    withMedia: posts.filter((p) => (p.mediaUrls?.length > 0) || (p.mediaFilePaths?.length > 0)).length,
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.text.trim()) {
      toast.error('Please enter post text');
      return;
    }

    if (!formData.scheduledAt) {
      toast.error('Please select a scheduled date');
      return;
    }

    try {
      const submitData = {
        ...formData,
        text: formData.text.trim(),
      };

      const response = await fetch('/api/posts', {
        method: editingPost ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPost ? { id: editingPost.id, ...submitData } : submitData),
      });

      if (!response.ok) throw new Error('Failed to save post');

      toast.success(editingPost ? 'Post updated successfully' : 'Post created successfully');
      resetForm();
      setShowModal(false);
      fetchPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/posts?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete post');

      toast.success('Post deleted successfully');
      setPostToDelete(null);
      setShowDeleteDialog(false);
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      const promises = Array.from(selectedPosts).map((id) =>
        fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok).length;

      if (failed > 0) {
        toast.error(`Failed to delete ${failed} posts`);
      } else {
        toast.success(`Deleted ${selectedPosts.size} posts`);
      }

      setSelectedPosts(new Set());
      setShowBulkDeleteDialog(false);
      fetchPosts();
    } catch (error) {
      console.error('Error bulk deleting posts:', error);
      toast.error('Failed to delete posts');
    }
  };

  // Handle publish now
  const handlePublishNow = async (id: string) => {
    try {
      const response = await fetch(`/api/posts/publish?id=${id}`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to publish post');

      toast.success('Post published successfully');
      fetchPosts();
    } catch (error) {
      console.error('Error publishing post:', error);
      toast.error('Failed to publish post');
    }
  };

  // Handle bulk schedule
  const handleBulkSchedule = async () => {
    const scheduledAt = new Date().toISOString();
    try {
      const promises = Array.from(selectedPosts).map((id) => {
        const post = posts.find((p) => p.id === id);
        if (!post) return Promise.resolve();
        return fetch('/api/posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: post.id,
            scheduledAt,
            status: 'scheduled',
          }),
        });
      });

      await Promise.all(promises);
      toast.success('Posts scheduled successfully');
      setSelectedPosts(new Set());
      fetchPosts();
    } catch (error) {
      console.error('Error bulk scheduling:', error);
      toast.error('Failed to schedule posts');
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      scheduledAt: '',
      platforms: 'both',
      category: '',
      hashtags: [],
      mentions: [],
      ctaUrl: '',
      campaignWeek: 1,
      campaignDay: 1,
      mediaUrls: [],
      mediaFilePaths: [],
      mediaTypes: [],
    });
    setHashtagInput('');
    setMentionInput('');
    setMediaPreview([]);
    setEditingPost(null);
  };

  const openEditModal = (post: ScheduledPost) => {
    setEditDialogPost(post);
    setShowEditDialog(true);
  };

  const togglePostSelection = (id: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPosts(newSelected);
  };

  const handleAddHashtag = () => {
    if (hashtagInput.trim()) {
      const tags = hashtagInput.split(',').map((t) => t.trim()).filter(Boolean);
      setFormData({
        ...formData,
        hashtags: [...new Set([...(formData.hashtags || []), ...tags])],
      });
      setHashtagInput('');
    }
  };

  const handleAddMention = () => {
    if (mentionInput.trim()) {
      const mentions = mentionInput.split(',').map((m) => m.trim()).filter(Boolean);
      setFormData({
        ...formData,
        mentions: [...new Set([...(formData.mentions || []), ...mentions])],
      });
      setMentionInput('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setFormData({
      ...formData,
      hashtags: (formData.hashtags || []).filter((t) => t !== tag),
    });
  };

  const handleRemoveMention = (mention: string) => {
    setFormData({
      ...formData,
      mentions: (formData.mentions || []).filter((m) => m !== mention),
    });
  };

  const handleRemoveMedia = (index: number) => {
    setFormData({
      ...formData,
      mediaUrls: formData.mediaUrls?.filter((_, i) => i !== index) || [],
      mediaFilePaths: formData.mediaFilePaths?.filter((_, i) => i !== index) || [],
      mediaTypes: formData.mediaTypes?.filter((_, i) => i !== index) || [],
    });
    setMediaPreview(mediaPreview.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Manager</h1>
          <p className="text-gray-500 mt-1 text-sm">Preview and manage your scheduled posts as they&apos;ll appear on X</p>
        </div>
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setEditingPost(null);
              }}
              className="gap-2 rounded-full bg-black hover:bg-gray-800 text-white px-5"
            >
              <Plus className="w-4 h-4" />
              Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Text Editor */}
              <div className="space-y-2">
                <Label htmlFor="text">Post Text</Label>
                <Textarea
                  id="text"
                  placeholder="What's happening?"
                  value={formData.text}
                  onChange={(e) => {
                    if (e.target.value.length <= 280) {
                      setFormData({ ...formData, text: e.target.value });
                    }
                  }}
                  className="h-28 resize-none border-0 border-b focus-visible:ring-0 rounded-none text-lg"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formData.text.length} / 280</span>
                  {formData.text.length > 250 && (
                    <span className="text-orange-600">Approaching limit</span>
                  )}
                </div>
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Media</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Drop images/videos or click to upload</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.currentTarget.files;
                      if (files) {
                        Array.from(files).forEach((file) => {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setMediaPreview([
                                ...mediaPreview,
                                event.target.result as string,
                              ]);
                              setFormData({
                                ...formData,
                                mediaFilePaths: [
                                  ...(formData.mediaFilePaths || []),
                                  file.name,
                                ],
                                mediaTypes: [
                                  ...(formData.mediaTypes || []),
                                  file.type.startsWith('video/') ? 'video' : 'image',
                                ],
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                    id="media-upload"
                  />
                  <label htmlFor="media-upload" className="cursor-pointer text-blue-500 text-sm font-medium">
                    Browse files
                  </label>
                </div>

                {/* Media Preview */}
                {mediaPreview.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {mediaPreview.map((preview, idx) => (
                      <div
                        key={idx}
                        className="relative bg-gray-100 rounded-xl overflow-hidden"
                      >
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(idx)}
                          className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Schedule</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt ? formData.scheduledAt.slice(0, 16) : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduledAt: new Date(e.target.value).toISOString(),
                    })
                  }
                />
              </div>

              {/* Platform & Category Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platforms">Platforms</Label>
                  <Select
                    value={formData.platforms}
                    onValueChange={(value: 'x' | 'telegram' | 'both') =>
                      setFormData({ ...formData, platforms: value })
                    }
                  >
                    <SelectTrigger id="platforms">
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
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger id="category">
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
                  <Label htmlFor="week">Campaign Week</Label>
                  <Select
                    value={(formData.campaignWeek || 1).toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, campaignWeek: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="week">
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
                  <Label htmlFor="day">Day</Label>
                  <Input
                    id="day"
                    type="number"
                    min="1"
                    max="7"
                    value={formData.campaignDay}
                    onChange={(e) =>
                      setFormData({ ...formData, campaignDay: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags</Label>
                <div className="flex gap-2">
                  <Input
                    id="hashtags"
                    placeholder="Add hashtags (comma-separated)"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHashtag();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddHashtag} variant="outline">
                    Add
                  </Button>
                </div>
                {(formData.hashtags || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(formData.hashtags || []).map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 rounded-full">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveHashtag(tag)}
                          className="hover:text-red-500"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Mentions */}
              <div className="space-y-2">
                <Label htmlFor="mentions">Mentions</Label>
                <div className="flex gap-2">
                  <Input
                    id="mentions"
                    placeholder="Add mentions (comma-separated)"
                    value={mentionInput}
                    onChange={(e) => setMentionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMention();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddMention} variant="outline">
                    Add
                  </Button>
                </div>
                {(formData.mentions || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(formData.mentions || []).map((mention) => (
                      <Badge key={mention} variant="secondary" className="gap-1 rounded-full">
                        @{mention}
                        <button
                          type="button"
                          onClick={() => handleRemoveMention(mention)}
                          className="hover:text-red-500"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* CTA URL */}
              <div className="space-y-2">
                <Label htmlFor="ctaUrl">CTA URL (Optional)</Label>
                <Input
                  id="ctaUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.ctaUrl}
                  onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-black hover:bg-gray-800 px-6">
                  {editingPost ? 'Update' : 'Create Post'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Scheduled</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Published</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.published}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Failed</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">With Media</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{stats.withMedia}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="w-36">
          <Label htmlFor="status-filter" className="text-xs mb-1 block text-gray-500">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value: PostStatus | 'all') =>
              setFilters({ ...filters, status: value })
            }
          >
            <SelectTrigger id="status-filter" className="h-9 text-sm rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Label htmlFor="category-filter" className="text-xs mb-1 block text-gray-500">Category</Label>
          <Select
            value={filters.category}
            onValueChange={(value) =>
              setFilters({ ...filters, category: value })
            }
          >
            <SelectTrigger id="category-filter" className="h-9 text-sm rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-32">
          <Label htmlFor="week-filter" className="text-xs mb-1 block text-gray-500">Week</Label>
          <Select
            value={filters.week}
            onValueChange={(value) =>
              setFilters({ ...filters, week: value })
            }
          >
            <SelectTrigger id="week-filter" className="h-9 text-sm rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Weeks</SelectItem>
              {WEEKS.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPosts.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedPosts.size} post{selectedPosts.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={handleBulkSchedule}
            >
              Schedule Now
            </Button>
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                Delete Selected
              </Button>
              <AlertDialogContent>
                <AlertDialogTitle>Delete Posts</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedPosts.size} post{selectedPosts.size !== 1 ? 's' : ''}? This action cannot be undone.
                </AlertDialogDescription>
                <div className="flex justify-end gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Posts Feed — X/Twitter style */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12">
          <div className="text-center text-gray-500">Loading posts...</div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            No posts found. Create your first post to get started.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {posts.map((post) => (
            <TweetCard
              key={post.id}
              post={post}
              isSelected={selectedPosts.has(post.id)}
              onToggleSelect={() => togglePostSelection(post.id)}
              onEdit={() => openEditModal(post)}
              onPublishNow={() => handlePublishNow(post.id)}
              onDelete={() => {
                setPostToDelete(post.id);
                setShowDeleteDialog(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Post</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this post? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => postToDelete && handleDelete(postToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Edit Post Dialog */}
      <EditPostDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        post={editDialogPost}
        onSaved={() => {
          fetchPosts();
          setEditDialogPost(null);
        }}
      />
    </div>
  );
}
