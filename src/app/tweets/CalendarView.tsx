'use client';

import { useState, useMemo } from 'react';
import type { ScheduledPost } from '@/types/scheduled-post';
import {
  ChevronLeft, ChevronRight, Play, Sparkles, Wand2,
  Image as ImageIcon, Clock, CheckCircle2, FileText, AlertCircle,
} from 'lucide-react';

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-400',
  scheduled: 'bg-blue-500',
  published: 'bg-green-500',
  failed: 'bg-red-500',
};

const PILLAR_COLORS: Record<string, string> = {
  build_in_public: 'border-l-orange-400',
  product_showcase: 'border-l-blue-400',
  founder_voice: 'border-l-purple-400',
  community_prompt: 'border-l-green-400',
  market_context: 'border-l-cyan-400',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarViewProps {
  tweets: ScheduledPost[];
  onSelectTweet: (tweet: ScheduledPost) => void;
  onGenerateText: (tweet: ScheduledPost) => void;
  onGenerateImage: (tweet: ScheduledPost) => void;
}

function getTweetMedia(tweet: ScheduledPost): { type: 'image' | 'video' | 'none'; url?: string } {
  if (tweet.mediaUrls && tweet.mediaUrls.length > 0) {
    const firstType = tweet.mediaTypes?.[0] || 'image';
    if (firstType === 'video') {
      const thumb = tweet.videoThumbnailUrls?.[0];
      return { type: 'video', url: thumb || undefined };
    }
    return { type: 'image', url: tweet.mediaUrls[0] };
  }
  return { type: 'none' };
}

export function CalendarView({ tweets, onSelectTweet, onGenerateText, onGenerateImage }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    // Start on the month of the first tweet, or current month
    if (tweets.length > 0) {
      const first = new Date(tweets[0].scheduledAt);
      return new Date(first.getFullYear(), first.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Group tweets by date string (YYYY-MM-DD)
  const tweetsByDate = useMemo(() => {
    const map: Record<string, ScheduledPost[]> = {};
    tweets.forEach((t) => {
      try {
        const d = new Date(t.scheduledAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      } catch {}
    });
    return map;
  }, [tweets]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    // Previous month fill
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: daysInPrevMonth - i, month: month - 1, year: month === 0 ? year - 1 : year, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, month, year, isCurrentMonth: true });
    }

    // Next month fill
    const remaining = 42 - days.length; // 6 rows
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, month: month + 1, year: month === 11 ? year + 1 : year, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">{MONTHS[month]} {year}</h2>
          <button onClick={goToToday} className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goToPrevMonth} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={goToNextMonth} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dateKey = `${day.month === -1 ? day.year : (day.month > 11 ? day.year : day.year)}-${String((day.month < 0 ? day.month + 12 : day.month > 11 ? day.month - 11 : day.month) + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;

          // Normalize the key properly
          const actualMonth = day.month < 0 ? day.month + 12 : day.month > 11 ? day.month - 12 : day.month;
          const actualYear = day.month < 0 ? day.year : day.month > 11 ? day.year : day.year;
          const normalizedKey = `${actualYear}-${String(actualMonth + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;

          const dayTweets = tweetsByDate[normalizedKey] || [];
          const isToday = normalizedKey === todayKey;

          return (
            <div
              key={i}
              className={`min-h-[140px] border-b border-r p-1.5 transition-colors ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
            >
              {/* Date number */}
              <div className={`text-right mb-1 ${day.isCurrentMonth ? '' : 'opacity-40'}`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}>
                  {day.date}
                </span>
              </div>

              {/* Tweet cards */}
              <div className="space-y-1">
                {dayTweets.slice(0, 3).map((tweet) => {
                  const media = getTweetMedia(tweet);
                  const pillarBorder = PILLAR_COLORS[tweet.pillar || ''] || 'border-l-gray-300';

                  return (
                    <div
                      key={tweet.id}
                      onClick={() => onSelectTweet(tweet)}
                      className={`group relative rounded-md border-l-[3px] ${pillarBorder} bg-white shadow-sm hover:shadow-md cursor-pointer transition-all overflow-hidden`}
                    >
                      <div className="flex gap-1.5 p-1.5">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-gray-100">
                          {media.type === 'image' && media.url ? (
                            <img src={media.url} alt="" className="w-full h-full object-cover" />
                          ) : media.type === 'video' ? (
                            <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
                              {media.url ? (
                                <img src={media.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Play className="w-4 h-4 text-white" />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-3 h-3 text-white drop-shadow" fill="white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Text preview */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] leading-tight text-gray-800 line-clamp-2">
                            {tweet.text.substring(0, 60)}{tweet.text.length > 60 ? '...' : ''}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[tweet.status]}`} />
                            <span className="text-[9px] text-gray-400">{tweet.status}</span>
                            {tweet.threadTexts && tweet.threadTexts.length > 0 && (
                              <span className="text-[9px] text-blue-400 ml-1">🧵{tweet.threadTexts.length + 1}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI action buttons — appear on hover */}
                      <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); onGenerateText(tweet); }}
                          title="AI Write"
                          className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700 shadow-sm"
                        >
                          <Wand2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onGenerateImage(tweet); }}
                          title="AI Image"
                          className="p-1 bg-pink-600 text-white rounded hover:bg-pink-700 shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {dayTweets.length > 3 && (
                  <div className="text-[10px] text-gray-400 text-center py-0.5">
                    +{dayTweets.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 border-t bg-gray-50 text-[10px] text-gray-500">
        <span className="font-medium text-gray-600">Pillars:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400" /> Build in Public</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400" /> Product</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-400" /> Founder</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400" /> Community</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-400" /> Market</span>
        <span className="ml-4 font-medium text-gray-600">Status:</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Draft</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Scheduled</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Published</span>
      </div>
    </div>
  );
}
