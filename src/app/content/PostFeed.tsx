'use client';

import { useState } from 'react';
import { Play, Heart, MessageCircle, Repeat2, BarChart3, Bookmark, Share, Tag, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import type { ScheduledPost, PostStatus } from '@/types/scheduled-post';

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
  } catch {
    return dateStr;
  }
}

function renderTweetText(text: string) {
  const parts = text.split(/([@#]\w+|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') || part.startsWith('#')) {
      return <span key={i} className="text-blue-500 hover:underline cursor-pointer">{part}</span>;
    }
    if (part.startsWith('http')) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {part.replace(/^https?:\/\//, '').slice(0, 30)}...
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function getVideoThumbnailUrl(mediaIdx: number, mediaTypes: ('image' | 'video')[], videoThumbnailUrls?: string[]): string | undefined {
  if (!videoThumbnailUrls || videoThumbnailUrls.length === 0) return undefined;
  let videoIdx = 0;
  for (let i = 0; i < mediaIdx; i++) {
    if (mediaTypes?.[i] === 'video') videoIdx++;
  }
  return videoThumbnailUrls[videoIdx] || undefined;
}

function VideoItem({ url, thumbnail, className }: { url: string; thumbnail?: string; className: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <video
        src={url}
        className={`${className} bg-black`}
        controls
        autoPlay
        preload="auto"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <div className="relative w-full h-full cursor-pointer" onClick={() => setPlaying(true)}>
      {thumbnail ? (
        <img src={thumbnail} alt="Video thumbnail" className={className} loading="lazy" />
      ) : (
        <video src={url} className={`${className} bg-black`} preload="metadata" />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/60 rounded-full p-3 hover:bg-black/80 transition-colors">
          <Play className="w-6 h-6 text-white fill-white" />
        </div>
      </div>
    </div>
  );
}

function MediaGrid({ mediaUrls, mediaTypes, videoThumbnailUrls }: {
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
  videoThumbnailUrls?: string[];
}) {
  if (!mediaUrls || mediaUrls.length === 0) return null;
  const count = mediaUrls.length;

  const renderItem = (url: string, idx: number, className: string) => {
    const isVideo = mediaTypes?.[idx] === 'video';
    const thumb = getVideoThumbnailUrl(idx, mediaTypes, videoThumbnailUrls);
    if (isVideo) return <VideoItem url={url} thumbnail={thumb} className={className} />;
    return <img src={url} alt="Post media" className={className} loading="lazy" />;
  };

  if (count === 1) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
        {renderItem(mediaUrls[0], 0, 'w-full max-h-[400px] object-cover')}
      </div>
    );
  }
  if (count === 2) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5">
        {mediaUrls.slice(0, 2).map((url, idx) => (
          <div key={idx} className="relative aspect-square">
            {renderItem(url, idx, 'w-full h-full object-cover')}
          </div>
        ))}
      </div>
    );
  }
  if (count === 3) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: 300 }}>
        <div className="row-span-2 relative">{renderItem(mediaUrls[0], 0, 'w-full h-full object-cover')}</div>
        {mediaUrls.slice(1, 3).map((url, idx) => (
          <div key={idx} className="relative">{renderItem(url, idx + 1, 'w-full h-full object-cover')}</div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 grid grid-cols-2 gap-0.5" style={{ height: 300 }}>
      {mediaUrls.slice(0, 4).map((url, idx) => (
        <div key={idx} className="relative">
          {renderItem(url, idx, 'w-full h-full object-cover')}
          {idx === 3 && count > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">+{count - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TweetCard({ post }: { post: ScheduledPost }) {
  const [threadExpanded, setThreadExpanded] = useState(false);
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const hasThread = post.threadTexts && post.threadTexts.length > 0;

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              <img
                src="/favicon.svg"
                alt="PawMe"
                className="w-7 h-7"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold text-[15px] text-gray-900 truncate">PawMe</span>
              <svg viewBox="0 0 22 22" className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.272 1.893.143.634-.131 1.22-.434 1.69-.88.445-.47.75-1.055.88-1.69.131-.634.084-1.292-.139-1.9.584-.272 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
              </svg>
              <span className="text-gray-500 text-[15px] truncate">@pawme_ai</span>
              <span className="text-gray-500 text-[15px]">·</span>
              <span className="text-gray-500 text-[15px] flex-shrink-0">
                {post.scheduledAt ? formatTweetDate(post.scheduledAt) : ''}
              </span>
            </div>

            {/* Tweet text */}
            <div className="text-[15px] leading-5 text-gray-900 whitespace-pre-wrap break-words mt-0.5">
              {renderTweetText(post.text)}
            </div>

            {/* Thread */}
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
                      const tVideoThumbs = mediaIndices
                        .filter(i => post.mediaTypes?.[i] === 'video')
                        .map(i => getVideoThumbnailUrl(i, post.mediaTypes || [], post.videoThumbnailUrls))
                        .filter((t): t is string => !!t);
                      return (
                        <div key={idx}>
                          <span className="text-xs text-gray-400 font-medium">{idx + 2}/{post.threadTexts!.length + 1}</span>
                          <div className="text-[14px] leading-5 text-gray-800 whitespace-pre-wrap break-words">
                            {renderTweetText(tweet)}
                          </div>
                          {tMediaUrls.length > 0 && (
                            <MediaGrid mediaUrls={tMediaUrls} mediaTypes={tMediaTypes} videoThumbnailUrls={tVideoThumbs} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Media — if threadMediaMap exists, only show media mapped to main tweet (position 0) */}
            {hasMedia && (() => {
              if (hasThread && post.threadMediaMap && post.threadMediaMap[0]) {
                const mainMediaIndices = post.threadMediaMap[0] as number[];
                if (mainMediaIndices.length === 0) return null;
                const mUrls = mainMediaIndices.map(i => post.mediaUrls?.[i]).filter((u): u is string => !!u);
                const mTypes = mainMediaIndices.map(i => post.mediaTypes?.[i] || 'image') as ('image' | 'video')[];
                const mThumbs = mainMediaIndices
                  .filter(i => post.mediaTypes?.[i] === 'video')
                  .map(i => getVideoThumbnailUrl(i, post.mediaTypes || [], post.videoThumbnailUrls))
                  .filter((t): t is string => !!t);
                if (mUrls.length === 0) return null;
                return <MediaGrid mediaUrls={mUrls} mediaTypes={mTypes} videoThumbnailUrls={mThumbs} />;
              }
              return <MediaGrid mediaUrls={post.mediaUrls} mediaTypes={post.mediaTypes} videoThumbnailUrls={post.videoThumbnailUrls} />;
            })()}

            {/* Category badge */}
            {post.category && (
              <div className="flex gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
                  <Tag className="w-3 h-3" />
                  {post.category}
                </span>
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

export function PostFeed({ posts }: { posts: ScheduledPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No posts yet</p>
        <p className="text-sm mt-1">Content will appear here when published.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 border border-gray-200 rounded-2xl overflow-hidden bg-white">
      {posts.map((post) => (
        <TweetCard key={post.id} post={post} />
      ))}
    </div>
  );
}
