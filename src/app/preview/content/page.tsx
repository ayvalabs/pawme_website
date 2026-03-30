'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
} from '@/app/components/ui/card';
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
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  MessageCircle,
  Tag,
  Repeat2,
  Play,
  BarChart3,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import type { ScheduledPost, PostStatus } from '@/types/scheduled-post';

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

    if (absDiff < 86400000) {
      return formatDistanceToNowStrict(date, { addSuffix: false })
        .replace(' seconds', 's')
        .replace(' second', 's')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h');
    }

    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }

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
      </div>
    </div>
  );
}

/** Single X/Twitter-style tweet card (read-only preview) */
function PreviewTweetCard({ post }: { post: ScheduledPost }) {
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
            {/* Header: Name, handle, date */}
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

            {/* Text content */}
            <div className="text-[14px] leading-5 text-gray-800 mt-1 whitespace-pre-wrap break-words">
              {renderTweetText(post.text)}
            </div>

            {/* Media — shown on main tweet (above thread) */}
            {hasMedia ? (
              <MediaGrid mediaUrls={post.mediaUrls} mediaTypes={post.mediaTypes} />
            ) : hasFilePaths ? (
              <MediaPlaceholder filePaths={post.mediaFilePaths} mediaTypes={post.mediaTypes} />
            ) : null}

            {/* CTA Link Card */}
            {post.ctaUrl && (
              <a
                href={post.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-2xl border border-gray-200 overflow-hidden hover:bg-gray-50 transition-colors"
              >
                <div className="px-3 py-2.5">
                  <div className="text-xs text-gray-500 truncate">{post.ctaUrl.replace(/^https?:\/\//, '').split('/')[0]}</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{post.ctaUrl.replace(/^https?:\/\//, '')}</div>
                </div>
              </a>
            )}

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
                    {post.threadTexts!.map((tweet, idx) => {
                      // Check threadMediaMap for media assigned to this thread tweet
                      const threadMediaIndices = (post as any).threadMediaMap?.[idx] as number[] | undefined;
                      const threadMediaUrls = threadMediaIndices?.map(i => post.mediaUrls?.[i]).filter(Boolean) as string[] || [];
                      const threadMediaTypes = threadMediaIndices?.map(i => post.mediaTypes?.[i]).filter(Boolean) as ('image' | 'video')[] || [];

                      return (
                        <div key={idx} className="relative">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs text-gray-400 font-medium">{idx + 2}/{post.threadTexts!.length + 1}</span>
                          </div>
                          <div className="text-[14px] leading-5 text-gray-800 whitespace-pre-wrap break-words">
                            {renderTweetText(tweet)}
                          </div>
                          {threadMediaUrls.length > 0 && (
                            <MediaGrid mediaUrls={threadMediaUrls} mediaTypes={threadMediaTypes} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[post.status]}`}>
                {STATUS_ICONS[post.status]}
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </span>
            </div>

            {/* Engagement action bar - mimics X layout (read-only) */}
            <div className="flex justify-between items-center mt-2 -ml-2 max-w-[425px]">
              <button disabled className="group flex items-center gap-1 p-2 rounded-full text-gray-400 cursor-default">
                <MessageCircle className="w-[18px] h-[18px]" />
                <span className="text-xs">0</span>
              </button>
              <button disabled className="group flex items-center gap-1 p-2 rounded-full text-gray-400 cursor-default">
                <Repeat2 className="w-[18px] h-[18px]" />
                <span className="text-xs">0</span>
              </button>
              <button disabled className="group flex items-center gap-1 p-2 rounded-full text-gray-400 cursor-default">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="text-xs">0</span>
              </button>
              <button disabled className="group flex items-center gap-1 p-2 rounded-full text-gray-400 cursor-default">
                <BarChart3 className="w-[18px] h-[18px]" />
                <span className="text-xs">0</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreviewContentPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: 'All',
    week: 'All',
  });

  // Calculate stats
  const stats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
    withMedia: posts.filter((p) => (p.mediaUrls?.length > 0) || (p.mediaFilePaths?.length > 0)).length,
  };

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
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">PawMe Content Preview</h1>
        <p className="text-gray-500 text-sm mt-2">Preview mode — read only</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Scheduled</p>
            <p className="text-2xl font-bold mt-1 text-blue-700">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Published</p>
            <p className="text-2xl font-bold mt-1 text-green-700">{stats.published}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Failed</p>
            <p className="text-2xl font-bold mt-1 text-red-700">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">With Media</p>
            <p className="text-2xl font-bold mt-1 text-purple-700">{stats.withMedia}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8 pb-4 border-b border-gray-200">
        <div className="w-40">
          <Label htmlFor="status-filter" className="text-xs mb-1 block text-gray-500">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value as PostStatus | 'all' })
            }
          >
            <SelectTrigger id="status-filter" className="h-9 text-sm rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
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

      {/* Posts Feed — X/Twitter style */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12">
          <div className="text-center text-gray-500">Loading posts...</div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            No posts found. Try adjusting your filters.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {posts.map((post) => (
            <PreviewTweetCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
