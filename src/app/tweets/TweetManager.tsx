'use client';

import { useState, useRef } from 'react';
import type { ScheduledPost } from '@/types/scheduled-post';
import { TweetCard } from './TweetCard';
import { CalendarView } from './CalendarView';
import { EditTweetDialog } from './EditTweetDialog';
import { MediaGenerationModal } from './MediaGenerationModal';
import { Plus, Filter, List, CalendarDays } from 'lucide-react';

interface TweetManagerProps {
  initialTweets: ScheduledPost[];
}

export function TweetManager({ initialTweets }: TweetManagerProps) {
  const [tweets, setTweets] = useState(initialTweets);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [mediaModalPost, setMediaModalPost] = useState<ScheduledPost | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'unscheduled' | 'published'>('all');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const filteredTweets = tweets.filter((tweet) => {
    if (filter === 'scheduled' && tweet.status !== 'scheduled') return false;
    if (filter === 'unscheduled' && tweet.status !== 'draft' && tweet.status === 'scheduled') return false;
    if (filter === 'published' && tweet.status !== 'published') return false;
    if (filter === 'unscheduled' && tweet.status === 'published') return false;
    if (pillarFilter !== 'all' && tweet.pillar !== pillarFilter) return false;
    if (weekFilter !== 'all' && tweet.campaignWeek !== parseInt(weekFilter)) return false;
    return true;
  });

  const handleScheduleToggle = async (tweetId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'scheduled' ? 'draft' : 'scheduled';
    const response = await fetch('/api/tweets/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweetId, status: newStatus }),
    });
    if (response.ok) {
      setTweets((prev) => prev.map((t) => (t.id === tweetId ? { ...t, status: newStatus as any } : t)));
      // Update the editing post if it's the same one
      if (editingPost?.id === tweetId) {
        setEditingPost((prev) => prev ? { ...prev, status: newStatus as any } : null);
      }
    }
  };

  const handleUpdate = (tweetId: string, updates: Partial<ScheduledPost>) => {
    setTweets((prev) => prev.map((t) => (t.id === tweetId ? { ...t, ...updates } : t)));
    // Keep the editing dialog in sync
    if (editingPost?.id === tweetId) {
      setEditingPost((prev) => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleMediaGenerated = (tweetId: string, mediaUrls: string[], mediaTypes: ('image' | 'video')[]) => {
    handleUpdate(tweetId, { mediaUrls, mediaTypes });
    setMediaModalPost(null);
  };

  const handleOpenMediaModal = (post: ScheduledPost) => {
    setMediaModalPost(post);
  };

  const handleEditPost = (post: ScheduledPost) => {
    // Get fresh version from state
    const fresh = tweets.find(t => t.id === post.id) || post;
    setEditingPost(fresh);
  };

  const handleCreateTweet = async () => {
    setIsCreating(true);
    try {
      const newTweet = {
        text: 'New tweet — click to edit',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        platforms: 'x',
        category: 'General',
        pillar: 'build_in_public',
        hashtags: ['PawMe', 'PetTech'],
        mentions: [],
        campaignWeek: Math.ceil((Date.now() - new Date('2026-04-09').getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
        campaignDay: 1,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTweet),
      });

      if (response.ok) {
        const data = await response.json();
        const created: ScheduledPost = {
          id: data.id,
          ...newTweet,
          threadTexts: [],
          mediaUrls: [],
          mediaFilePaths: [],
          mediaTypes: [],
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ScheduledPost;
        setTweets((prev) => [created, ...prev]);
        // Open the edit dialog immediately for the new tweet
        setEditingPost(created);
      }
    } catch (error) {
      console.error('Failed to create tweet:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Calendar AI text generation — generates and saves, then opens dialog
  const handleCalendarGenerateText = async (tweet: ScheduledPost) => {
    try {
      const response = await fetch('/api/tweets/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId: tweet.id, pillar: tweet.pillar, tone: 'authentic, passionate, technical-but-accessible' }),
      });
      if (response.ok) {
        const data = await response.json();
        const updates: Partial<ScheduledPost> = { text: data.mainText, updatedAt: new Date().toISOString() };
        if (data.threadTexts?.length > 0) updates.threadTexts = data.threadTexts;
        await fetch('/api/tweets/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tweetId: tweet.id, updates }),
        });
        handleUpdate(tweet.id, updates);
      }
    } catch (error) {
      console.error('Failed to generate text:', error);
    }
  };

  const pillars = ['all', 'build_in_public', 'product_showcase', 'founder_voice', 'community_prompt', 'market_context'];
  const weeks = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const statusCounts = {
    all: tweets.length,
    scheduled: tweets.filter(t => t.status === 'scheduled').length,
    unscheduled: tweets.filter(t => t.status !== 'scheduled' && t.status !== 'published').length,
    published: tweets.filter(t => t.status === 'published').length,
  };

  return (
    <>
      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{tweets.length}</div>
          <div className="text-xs text-gray-500">Total Tweets</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.scheduled}</div>
          <div className="text-xs text-gray-500">Scheduled</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-gray-600">{statusCounts.unscheduled}</div>
          <div className="text-xs text-gray-500">Drafts</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{statusCounts.published}</div>
          <div className="text-xs text-gray-500">Published</div>
        </div>
      </div>

      {/* Filters, View Toggle & Create */}
      <div className="mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
          {(['all', 'scheduled', 'unscheduled', 'published'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({statusCounts[f]})
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={pillarFilter} onChange={(e) => setPillarFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm">
            {pillars.map((p) => <option key={p} value={p}>{p === 'all' ? 'All Pillars' : p.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm">
            {weeks.map((w) => <option key={w} value={w}>{w === 'all' ? 'All Weeks' : `Week ${w}`}</option>)}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
          <button onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <List className="w-4 h-4" /> List
          </button>
          <button onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <CalendarDays className="w-4 h-4" /> Calendar
          </button>
        </div>

        <button onClick={handleCreateTweet} disabled={isCreating}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all text-sm">
          <Plus className="w-4 h-4" /> {isCreating ? 'Creating...' : 'New Tweet'}
        </button>
      </div>

      {/* Content */}
      {view === 'calendar' ? (
        <CalendarView
          tweets={filteredTweets}
          onSelectTweet={handleEditPost}
          onGenerateText={handleCalendarGenerateText}
          onGenerateImage={handleOpenMediaModal}
        />
      ) : (
        <div className="grid gap-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filteredTweets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No tweets match your filters.</div>
          ) : (
            filteredTweets.map((tweet) => (
              <TweetCard key={tweet.id} post={tweet} onEdit={handleEditPost} />
            ))
          )}
        </div>
      )}

      {/* Edit Dialog */}
      {editingPost && (
        <EditTweetDialog
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onUpdate={handleUpdate}
          onOpenMediaModal={handleOpenMediaModal}
          onScheduleToggle={handleScheduleToggle}
        />
      )}

      {/* Media Generation Modal */}
      {mediaModalPost && (
        <MediaGenerationModal
          tweet={mediaModalPost}
          onClose={() => setMediaModalPost(null)}
          onMediaGenerated={handleMediaGenerated}
        />
      )}
    </>
  );
}
