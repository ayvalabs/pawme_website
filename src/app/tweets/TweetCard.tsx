'use client';

import { useState } from 'react';
import type { ScheduledPost } from '@/types/scheduled-post';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import {
  FileText, Clock, CheckCircle2, AlertCircle, Edit2,
  Image as ImageIcon, X as XIcon, MessageCircle, Tag,
  Heart, Repeat2, BarChart3, Bookmark, Share, Play,
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

function MediaGrid({ mediaUrls, mediaTypes, videoThumbnailUrls }: {
  mediaUrls: string[]; mediaTypes: ('image' | 'video')[]; videoThumbnailUrls?: string[];
}) {
  if (!mediaUrls || mediaUrls.length === 0) return null;
  const count = mediaUrls.length;

  if (count === 1) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
        <MediaItem url={mediaUrls[0]} isVideo={mediaTypes?.[0] === 'video'} thumbnail={getVideoThumbnailUrl(0, mediaTypes, videoThumbnailUrls)} className="w-full max-h-[400px] object-cover" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5">
        {mediaUrls.slice(0, 2).map((url, idx) => (
          <div key={idx} className="relative aspect-square">
            <MediaItem url={url} isVideo={mediaTypes?.[idx] === 'video'} thumbnail={getVideoThumbnailUrl(idx, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: '300px' }}>
        <div className="row-span-2">
          <MediaItem url={mediaUrls[0]} isVideo={mediaTypes?.[0] === 'video'} thumbnail={getVideoThumbnailUrl(0, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
        </div>
        {mediaUrls.slice(1, 3).map((url, idx) => (
          <div key={idx}>
            <MediaItem url={url} isVideo={mediaTypes?.[idx + 1] === 'video'} thumbnail={getVideoThumbnailUrl(idx + 1, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: '300px' }}>
      {mediaUrls.slice(0, 4).map((url, idx) => (
        <div key={idx} className="relative">
          <MediaItem url={url} isVideo={mediaTypes?.[idx] === 'video'} thumbnail={getVideoThumbnailUrl(idx, mediaTypes, videoThumbnailUrls)} className="w-full h-full object-cover" />
          {idx === 3 && count > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-2xl font-bold">+{count - 4}</span></div>
          )}
        </div>
      ))}
    </div>
  );
}

function MediaPlaceholder({ filePaths, mediaTypes }: { filePaths: string[]; mediaTypes: ('image' | 'video')[] }) {
  if (!filePaths || filePaths.length === 0) return null;
  const imageCount = mediaTypes?.filter(t => t === 'image').length || filePaths.length;
  const videoCount = mediaTypes?.filter(t => t === 'video').length || 0;
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 p-4">
      <div className="flex items-center justify-center text-gray-400 gap-2">
        {imageCount > 0 && <ImageIcon className="w-5 h-5" />}
        {videoCount > 0 && <Play className="w-5 h-5" />}
        <p className="text-xs">
          {imageCount > 0 && `${imageCount} photo${imageCount > 1 ? 's' : ''}`}
          {imageCount > 0 && videoCount > 0 && ' + '}
          {videoCount > 0 && `${videoCount} video${videoCount > 1 ? 's' : ''}`}
          {' · Media not linked'}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  TWEET CARD — display only, editing via dialog
// ══════════════════════════════════════════════════════════

interface TweetCardProps {
  post: ScheduledPost;
  onEdit: (post: ScheduledPost) => void;
}

export function TweetCard({ post, onEdit }: TweetCardProps) {
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const hasFilePaths = post.mediaFilePaths && post.mediaFilePaths.length > 0;
  const hasThread = post.threadTexts && post.threadTexts.length > 0;
  const [threadExpanded, setThreadExpanded] = useState(false);

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => onEdit(post)}>
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
                <span className="text-gray-500 text-[15px] flex-shrink-0">
                  {post.scheduledAt ? formatTweetDate(post.scheduledAt) : 'No date'}
                </span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Tweet text */}
            <div className="text-[15px] leading-5 text-gray-900 whitespace-pre-wrap break-words mt-0.5">
              {renderTweetText(post.text)}
            </div>

            {/* Thread preview */}
            {hasThread && (
              <div className="mt-2">
                <button onClick={(e) => { e.stopPropagation(); setThreadExpanded(!threadExpanded); }} className="text-blue-500 text-sm font-medium hover:underline">
                  {threadExpanded ? 'Hide thread' : `Show thread (${post.threadTexts!.length} more)`}
                </button>
                {threadExpanded && (
                  <div className="mt-2 border-l-2 border-blue-200 pl-3 space-y-3">
                    {post.threadTexts!.map((tweet, idx) => {
                      const tweetPos = idx + 1;
                      const mediaIndices = post.threadMediaMap?.[tweetPos] || [];
                      const tMediaUrls = mediaIndices.map(i => post.mediaUrls?.[i]).filter((u): u is string => !!u);
                      const tMediaTypes = mediaIndices.map(i => post.mediaTypes?.[i] || 'image') as ('image' | 'video')[];
                      return (
                        <div key={idx}>
                          <span className="text-xs text-gray-400 font-medium">{idx + 2}/{post.threadTexts!.length + 1}</span>
                          <div className="text-[14px] leading-5 text-gray-800 whitespace-pre-wrap break-words">{renderTweetText(tweet)}</div>
                          {tMediaUrls.length > 0 && <MediaGrid mediaUrls={tMediaUrls} mediaTypes={tMediaTypes} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Media */}
            {hasMedia ? (() => {
              if (hasThread && post.threadMediaMap && post.threadMediaMap[0]) {
                const mainIndices = post.threadMediaMap[0] as number[];
                if (mainIndices.length === 0) return null;
                const mUrls = mainIndices.map(i => post.mediaUrls?.[i]).filter((u): u is string => !!u);
                const mTypes = mainIndices.map(i => post.mediaTypes?.[i] || 'image') as ('image' | 'video')[];
                if (mUrls.length === 0) return null;
                return <MediaGrid mediaUrls={mUrls} mediaTypes={mTypes} videoThumbnailUrls={post.videoThumbnailUrls} />;
              }
              return <MediaGrid mediaUrls={post.mediaUrls} mediaTypes={post.mediaTypes} videoThumbnailUrls={post.videoThumbnailUrls} />;
            })() : hasFilePaths ? (
              <MediaPlaceholder filePaths={post.mediaFilePaths} mediaTypes={post.mediaTypes} />
            ) : null}

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600"><Tag className="w-3 h-3" />{post.category}</span>
              )}
              {post.pillar && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-xs text-purple-600">{post.pillar.replace(/_/g, ' ')}</span>
              )}
              {post.campaignWeek && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-600">W{post.campaignWeek}D{post.campaignDay || '?'}</span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${STATUS_COLORS[post.status]}`}>
                {STATUS_ICONS[post.status]}
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </span>
              {post.xPostId && (
                <a href={`https://x.com/pawme_ai/status/${post.xPostId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-500 hover:underline self-center">View on X ↗</a>
              )}
              {post.hashtags && post.hashtags.length > 0 && post.hashtags.map((tag, i) => (
                <span key={`h${i}`} className="px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-600">#{tag}</span>
              ))}
              {post.mentions && post.mentions.length > 0 && post.mentions.map((m, i) => (
                <span key={`m${i}`} className="px-2 py-0.5 rounded-full bg-purple-50 text-xs text-purple-600">@{m}</span>
              ))}
            </div>

            {/* Engagement bar */}
            <div className="flex justify-between items-center mt-2 -ml-2 max-w-[425px]">
              <button className="p-2 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-500" onClick={(e) => e.stopPropagation()}>
                <MessageCircle className="w-[18px] h-[18px]" />
              </button>
              <button className="p-2 rounded-full hover:bg-green-50 text-gray-500 hover:text-green-500" onClick={(e) => e.stopPropagation()}>
                <Repeat2 className="w-[18px] h-[18px]" />
              </button>
              <button className="p-2 rounded-full hover:bg-pink-50 text-gray-500 hover:text-pink-500" onClick={(e) => e.stopPropagation()}>
                <Heart className="w-[18px] h-[18px]" />
              </button>
              <button className="p-2 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-500" onClick={(e) => e.stopPropagation()}>
                <BarChart3 className="w-[18px] h-[18px]" />
              </button>
              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <button className="p-2 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-500"><Bookmark className="w-[18px] h-[18px]" /></button>
                <button className="p-2 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-500"><Share className="w-[18px] h-[18px]" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
