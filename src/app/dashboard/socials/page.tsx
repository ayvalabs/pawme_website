'use client';

import { useState, useEffect, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Globe, Youtube, Music, Instagram, Twitter, Facebook, Users, Video, TrendingUp, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Link as LinkIcon, Unlink, Heart, MessageCircle, Share2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FacebookPageStats, FacebookPost, InstagramStats, InstagramPost } from '@/types/social-media';

interface Signup {
  id: string;
  name: string;
  email: string;
  points: number;
  referralCount: number;
  referredBy: string | null;
  createdAt: string;
  isVip: boolean;
}

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

function SocialsDashboardContent() {
  const [activeTab, setActiveTab] = useState('website');
  const [signups, setSignups] = useState<Signup[]>([]);
  const [totalSignups, setTotalSignups] = useState(0);
  const [youtubeStats, setYoutubeStats] = useState<any>(null);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeChannelTitle, setYoutubeChannelTitle] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [tiktokDisplayName, setTiktokDisplayName] = useState<string | null>(null);
  const [tiktokStats, setTiktokStats] = useState<any>(null);
  const [tiktokVideos, setTiktokVideos] = useState<any[]>([]);
  const [xStats, setXStats] = useState<any>(null);
  const [xTweets, setXTweets] = useState<any[]>([]);
  const [xSortField, setXSortField] = useState<'likes' | 'retweets' | 'replies' | 'views'>('likes');
  const [xSortOrder, setXSortOrder] = useState<'asc' | 'desc'>('desc');
  const [historicalMetrics, setHistoricalMetrics] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<Signup[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [facebookStats, setFacebookStats] = useState<FacebookPageStats | null>(null);
  const [facebookPosts, setFacebookPosts] = useState<FacebookPost[]>([]);
  const [instagramStats, setInstagramStats] = useState<InstagramStats | null>(null);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [loadingFacebook, setLoadingFacebook] = useState(true);
  const [loadingInstagram, setLoadingInstagram] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkYouTubeConnection();
    checkTikTokConnection();
    fetchData();
    fetchHistoricalMetrics();
    createDailySnapshot();
    fetchAllUsers();
    fetchFacebookData();
    // fetchInstagramData(); // Temporarily disabled - focus on Facebook first
  }, []);

  useEffect(() => {
    const error = searchParams.get('error');
    
    if (error) {
      toast.error(`Connection failed: ${error}`);
      router.replace('/socials');
    }
  }, [searchParams]);

  const checkYouTubeConnection = async () => {
    setCheckingConnection(true);
    try {
      const response = await fetch('/api/auth/youtube/status');
      const data = await response.json();
      setYoutubeConnected(data.connected && !data.isExpired);
      setYoutubeChannelTitle(data.channelTitle);
    } catch (error) {
      console.error('Error checking YouTube connection:', error);
      setYoutubeConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleConnectYouTube = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      '/api/auth/youtube/connect',
      'YouTube OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    const checkPopup = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkPopup);
        checkYouTubeConnection();
        fetchData();
      }
    }, 500);
  };

  const handleDisconnectYouTube = async () => {
    try {
      const response = await fetch('/api/auth/youtube/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setYoutubeConnected(false);
        setYoutubeChannelTitle(null);
        toast.success('YouTube disconnected');
      } else {
        toast.error('Failed to disconnect YouTube');
      }
    } catch (error) {
      console.error('Error disconnecting YouTube:', error);
      toast.error('Failed to disconnect YouTube');
    }
  };

  const checkTikTokConnection = async () => {
    try {
      const response = await fetch('/api/auth/tiktok/status');
      const data = await response.json();
      setTiktokConnected(data.connected && !data.isExpired);
      setTiktokDisplayName(data.displayName);
      if (data.connected && !data.isExpired) {
        fetchTikTokData();
      }
    } catch (error) {
      console.error('Error checking TikTok connection:', error);
      setTiktokConnected(false);
    }
  };

  const fetchTikTokData = async () => {
    try {
      const [statsRes, videosRes] = await Promise.all([
        fetch('/api/tiktok?endpoint=stats'),
        fetch('/api/tiktok?endpoint=videos'),
      ]);

      const statsData = await statsRes.json();
      const videosData = await videosRes.json();

      setTiktokStats(statsData.data?.user || null);
      setTiktokVideos(videosData.data?.videos || []);
    } catch (error) {
      console.error('Error fetching TikTok data:', error);
    }
  };

  const handleConnectTikTok = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      '/api/auth/tiktok/connect',
      'TikTok OAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    const checkPopup = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkPopup);
        checkTikTokConnection();
        fetchTikTokData();
      }
    }, 500);
  };

  const handleDisconnectTikTok = async () => {
    try {
      const response = await fetch('/api/auth/tiktok/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setTiktokConnected(false);
        setTiktokDisplayName(null);
        setTiktokStats(null);
        setTiktokVideos([]);
        toast.success('TikTok disconnected');
      } else {
        toast.error('Failed to disconnect TikTok');
      }
    } catch (error) {
      console.error('Error disconnecting TikTok:', error);
      toast.error('Failed to disconnect TikTok');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [signupsRes, youtubeStatsRes, youtubeVideosRes, xStatsRes, xTweetsRes] = await Promise.all([
        fetch('/api/signups'),
        fetch('/api/youtube?endpoint=stats'),
        fetch('/api/youtube?endpoint=videos'),
        fetch('/api/x?endpoint=stats'),
        fetch('/api/x?endpoint=tweets'),
      ]);

      const signupsData = await signupsRes.json();
      const youtubeStatsData = await youtubeStatsRes.json();
      const youtubeVideosData = await youtubeVideosRes.json();
      const xStatsData = await xStatsRes.json();
      const xTweetsData = await xTweetsRes.json();

      setSignups(signupsData.signups || []);
      setTotalSignups(signupsData.totalSignups || 0);
      setYoutubeStats(youtubeStatsData.items?.[0]?.statistics || null);
      setYoutubeVideos(youtubeVideosData.items || []);
      setXStats(xStatsData.data || null);
      setXTweets(xTweetsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacebookData = async () => {
    setLoadingFacebook(true);
    try {
      const [statsRes, postsRes] = await Promise.all([
        fetch('/api/facebook/stats'),
        fetch('/api/facebook/posts?limit=10'),
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setFacebookStats(stats);
      }

      if (postsRes.ok) {
        const posts = await postsRes.json();
        setFacebookPosts(posts);
      }
    } catch (error) {
      console.error('Error fetching Facebook data:', error);
      toast.error('Failed to load Facebook data');
    } finally {
      setLoadingFacebook(false);
    }
  };

  const fetchInstagramData = async () => {
    setLoadingInstagram(true);
    try {
      const [statsRes, postsRes] = await Promise.all([
        fetch('/api/instagram/stats'),
        fetch('/api/instagram/posts?limit=10'),
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setInstagramStats(stats);
      }

      if (postsRes.ok) {
        const posts = await postsRes.json();
        setInstagramPosts(posts);
      }
    } catch (error) {
      console.error('Error fetching Instagram data:', error);
      toast.error('Failed to load Instagram data');
    } finally {
      setLoadingInstagram(false);
    }
  };

  const getSignupChartData = (period: 'daily' | 'weekly' | 'monthly') => {
    if (!signups.length) return [];

    const now = new Date();
    let days = 30;
    if (period === 'daily') days = 7;
    if (period === 'weekly') days = 28;
    if (period === 'monthly') days = 90;

    const dateRange = eachDayOfInterval({
      start: subDays(now, days),
      end: now,
    });

    const signupsByDate = signups.reduce((acc, signup) => {
      if (signup.createdAt) {
        const date = format(startOfDay(parseISO(signup.createdAt)), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    if (period === 'daily') {
      return dateRange.map(date => ({
        date: format(date, 'MMM dd'),
        signups: signupsByDate[format(date, 'yyyy-MM-dd')] || 0,
      }));
    }

    if (period === 'weekly') {
      const weeks: { date: string; signups: number }[] = [];
      for (let i = 0; i < dateRange.length; i += 7) {
        const weekDates = dateRange.slice(i, i + 7);
        const weekSignups = weekDates.reduce((sum, date) => {
          return sum + (signupsByDate[format(date, 'yyyy-MM-dd')] || 0);
        }, 0);
        weeks.push({
          date: `Week ${Math.floor(i / 7) + 1}`,
          signups: weekSignups,
        });
      }
      return weeks;
    }

    const months: { date: string; signups: number }[] = [];
    const monthGroups = dateRange.reduce((acc, date) => {
      const month = format(date, 'MMM yyyy');
      if (!acc[month]) acc[month] = [];
      acc[month].push(date);
      return acc;
    }, {} as Record<string, Date[]>);

    Object.entries(monthGroups).forEach(([month, dates]) => {
      const monthSignups = dates.reduce((sum, date) => {
        return sum + (signupsByDate[format(date, 'yyyy-MM-dd')] || 0);
      }, 0);
      months.push({ date: month, signups: monthSignups });
    });

    return months;
  };

  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [videoSortField, setVideoSortField] = useState<'views' | 'likes' | 'comments'>('views');
  const [videoSortOrder, setVideoSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedVideos = [...youtubeVideos].sort((a, b) => {
    const aValue = parseInt(a.statistics?.[videoSortField === 'views' ? 'viewCount' : videoSortField === 'likes' ? 'likeCount' : 'commentCount'] || '0');
    const bValue = parseInt(b.statistics?.[videoSortField === 'views' ? 'viewCount' : videoSortField === 'likes' ? 'likeCount' : 'commentCount'] || '0');
    return videoSortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const sortedXTweets = [...xTweets].sort((a, b) => {
    const aValue = parseInt(a.public_metrics?.[xSortField === 'likes' ? 'like_count' : xSortField === 'retweets' ? 'retweet_count' : xSortField === 'replies' ? 'reply_count' : 'view_count'] || '0');
    const bValue = parseInt(b.public_metrics?.[xSortField === 'likes' ? 'like_count' : xSortField === 'retweets' ? 'retweet_count' : xSortField === 'replies' ? 'reply_count' : 'view_count'] || '0');
    return xSortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const handleSortVideos = (field: 'views' | 'likes' | 'comments') => {
    if (videoSortField === field) {
      setVideoSortOrder(videoSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setVideoSortField(field);
      setVideoSortOrder('desc');
    }
  };

  const handleSortXPosts = (field: 'likes' | 'retweets' | 'replies' | 'views') => {
    if (xSortField === field) {
      setXSortOrder(xSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setXSortField(field);
      setXSortOrder('desc');
    }
  };

  const fetchHistoricalMetrics = async () => {
    try {
      const response = await fetch('/api/metrics/snapshot');
      const data = await response.json();
      setHistoricalMetrics(data.metrics || []);
      console.log('Historical metrics loaded:', data.metrics?.length || 0, 'days');
    } catch (error) {
      console.error('Error fetching historical metrics:', error);
    }
  };

  const getYouTubeChartData = () => {
    return historicalMetrics
      .filter(m => m.youtube)
      .map(m => ({
        date: format(parseISO(m.date), 'MMM dd'),
        subscribers: m.youtube.subscribers || 0,
        views: m.youtube.views || 0,
        videos: m.youtube.videos || 0,
      }));
  };

  const getTikTokChartData = () => {
    return historicalMetrics
      .filter(m => m.tiktok)
      .map(m => ({
        date: format(parseISO(m.date), 'MMM dd'),
        followers: m.tiktok.followers || 0,
        likes: m.tiktok.likes || 0,
        videos: m.tiktok.videos || 0,
      }));
  };

  const getXChartData = () => {
    return historicalMetrics
      .filter(m => m.x)
      .map(m => ({
        date: format(parseISO(m.date), 'MMM dd'),
        followers: m.x.followers || 0,
        tweets: m.x.tweets || 0,
        likes: m.x.likes || 0,
      }));
  };

  const getFacebookChartData = () => {
    return historicalMetrics
      .filter(m => m.facebook)
      .map(m => ({
        date: format(parseISO(m.date), 'MMM dd'),
        fans: m.facebook.fans || 0,
        engagement: m.facebook.engagement || 0,
      }));
  };

  const getInstagramChartData = () => {
    return historicalMetrics
      .filter(m => m.instagram)
      .map(m => ({
        date: format(parseISO(m.date), 'MMM dd'),
        followers: m.instagram.followers || 0,
        following: m.instagram.following || 0,
        posts: m.instagram.posts || 0,
      }));
  };

  const createDailySnapshot = async () => {
    try {
      const response = await fetch('/api/metrics/snapshot', {
        method: 'POST',
      });
      const data = await response.json();
      console.log('Daily snapshot:', data.message);
    } catch (error) {
      console.error('Error creating daily snapshot:', error);
    }
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/signups');
      const data = await response.json();
      setAllUsers(data.signups || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const getReferralTierIcon = (referralCount: number) => {
    if (referralCount >= 25) return '💎';
    if (referralCount >= 10) return '🥇';
    if (referralCount >= 5) return '🥈';
    if (referralCount >= 1) return '🥉';
    return '';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Social Media Dashboard</h1>
            <p className="text-muted-foreground mt-2">Track your social media presence across all platforms</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Data</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 w-full border-b bg-background h-auto p-0 rounded-none">
            <TabsTrigger value="website" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <Globe className="h-5 w-5" />
              <span className="text-xs">Website</span>
              {totalSignups > 0 && (
                <span className="text-xs font-semibold">{totalSignups}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <Youtube className="h-5 w-5" />
              <span className="text-xs">YouTube</span>
              {youtubeStats && (
                <span className="text-xs font-semibold">{youtubeStats.subscriberCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tiktok" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <Music className="h-5 w-5" />
              <span className="text-xs">TikTok</span>
              {tiktokStats && (
                <span className="text-xs font-semibold">{tiktokStats.follower_count || 0}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <Instagram className="h-5 w-5" />
              <span className="text-xs">Instagram</span>
              {instagramStats && (
                <span className="text-xs font-semibold">{instagramStats.followers_count || 0}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="twitter" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <Twitter className="h-5 w-5" />
              <span className="text-xs">X</span>
              {xStats && (
                <span className="text-xs font-semibold">{xStats.public_metrics?.followers_count || 0}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="facebook" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <Facebook className="h-5 w-5" />
              <span className="text-xs">Facebook</span>
              {facebookStats && (
                <span className="text-xs font-semibold">{facebookStats.fan_count || 0}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="website" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSignups}</div>
                  <p className="text-xs text-muted-foreground">All time registrations</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {signups.reduce((sum, s) => sum + s.referralCount, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Successful referrals</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">VIP Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {signups.filter(s => s.isVip).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Premium subscribers</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Signup Trends</CardTitle>
                    <CardDescription>Track user registrations over time</CardDescription>
                  </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartPeriod('daily')}
                    className={`px-3 py-1 text-sm rounded ${
                      chartPeriod === 'daily' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setChartPeriod('weekly')}
                    className={`px-3 py-1 text-sm rounded ${
                      chartPeriod === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setChartPeriod('monthly')}
                    className={`px-3 py-1 text-sm rounded ${
                      chartPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getSignupChartData(chartPeriod)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="signups" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

            <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users ({showVipOnly ? allUsers.filter(u => u.isVip).length : allUsers.length})</CardTitle>
                  <CardDescription>Manage and email your users</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showVipOnly}
                      onChange={(e) => setShowVipOnly(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">VIP Only 👑</span>
                  </label>
                  <Button
                    onClick={async () => {
                      try {
                        toast.loading('Exporting CSV...');
                        const response = await fetch('/api/export-leads');
                        if (!response.ok) throw new Error('Export failed');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `pawme-leads-${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        toast.dismiss();
                        toast.success('CSV exported successfully!');
                      } catch (error) {
                        toast.dismiss();
                        toast.error('Failed to export CSV');
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </Button>
                  {selectedUsers.size > 0 && (
                    <Button
                      onClick={() => setShowEmailDialog(true)}
                      size="sm"
                      className="gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-12 py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.size === (showVipOnly ? allUsers.filter(u => u.isVip) : allUsers).length && allUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const usersToSelect = showVipOnly ? allUsers.filter(u => u.isVip) : allUsers;
                              setSelectedUsers(new Set(usersToSelect.map(u => u.id)));
                            } else {
                              setSelectedUsers(new Set());
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-center py-3 px-4 font-medium">Points</th>
                      <th className="text-center py-3 px-4 font-medium">Referrals</th>
                      <th className="text-center py-3 px-4 font-medium">Tier</th>
                      <th className="text-center py-3 px-4 font-medium">VIP</th>
                      <th className="text-center py-3 px-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-3 px-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-48"></div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-12 mx-auto"></div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-12 mx-auto"></div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-8 mx-auto"></div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-8 mx-auto"></div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-8 mx-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      (showVipOnly ? allUsers.filter(u => u.isVip) : allUsers).map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedUsers);
                                if (e.target.checked) {
                                  newSelected.add(user.id);
                                } else {
                                  newSelected.delete(user.id);
                                }
                                setSelectedUsers(newSelected);
                              }}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="py-3 px-4 font-medium">{user.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                          <td className="py-3 px-4 text-center">{user.points}</td>
                          <td className="py-3 px-4 text-center">{user.referralCount || 0}</td>
                          <td className="py-3 px-4 text-center text-xl">
                            {getReferralTierIcon(user.referralCount || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">{user.isVip ? '👑' : ''}</td>
                          <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                            {user.createdAt ? format(parseISO(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                    {allUsers.length === 0 && !loadingUsers && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                    {showVipOnly && allUsers.filter(u => u.isVip).length === 0 && !loadingUsers && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          No VIP users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="youtube" className="space-y-6 mt-6">
            {!youtubeConnected && !checkingConnection && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Youtube className="h-16 w-16 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Connect YouTube Analytics</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Connect your YouTube account to view detailed analytics including daily subscriber growth, video performance trends, and engagement metrics.
                    </p>
                  </div>
                  <Button onClick={handleConnectYouTube} size="lg" className="gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Connect YouTube Account
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ View daily subscriber growth</p>
                    <p>✓ Track video performance over time</p>
                    <p>✓ Access detailed analytics reports</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {youtubeConnected && (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium">YouTube Connected</p>
                    {youtubeChannelTitle && (
                      <p className="text-xs text-muted-foreground">{youtubeChannelTitle}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectYouTube}
                  className="gap-2"
                >
                  <Unlink className="h-3 w-3" />
                  Disconnect
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {youtubeStats?.subscriberCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Total subscribers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Videos</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {youtubeStats?.videoCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Published videos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {youtubeStats?.viewCount ? parseInt(youtubeStats.viewCount).toLocaleString() : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">All time views</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Views/Video</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {youtubeStats?.viewCount && youtubeStats?.videoCount
                      ? Math.round(parseInt(youtubeStats.viewCount) / parseInt(youtubeStats.videoCount))
                      : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Per video average</p>
                </CardContent>
              </Card>
            </div>

            {getYouTubeChartData().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Growth Trends</CardTitle>
                  <CardDescription>Historical data from daily snapshots</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getYouTubeChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="subscribers" stroke="#8884d8" strokeWidth={2} name="Subscribers" />
                      <Line yAxisId="right" type="monotone" dataKey="views" stroke="#82ca9d" strokeWidth={2} name="Total Views" />
                      <Line yAxisId="left" type="monotone" dataKey="videos" stroke="#ffc658" strokeWidth={2} name="Videos" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Videos</CardTitle>
                    <CardDescription>Latest uploads and their performance</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={videoSortField === 'views' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortVideos('views')}
                      className="gap-1"
                    >
                      Views
                      {videoSortField === 'views' && (
                        videoSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant={videoSortField === 'likes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortVideos('likes')}
                      className="gap-1"
                    >
                      Likes
                      {videoSortField === 'likes' && (
                        videoSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant={videoSortField === 'comments' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortVideos('comments')}
                      className="gap-1"
                    >
                      Comments
                      {videoSortField === 'comments' && (
                        videoSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedVideos.map((video) => (
                  <div key={video.id.videoId} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-all">
                    <img
                      src={video.snippet.thumbnails.high.url}
                      alt={video.snippet.title}
                      className="w-40 h-24 object-cover rounded"
                    />
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold line-clamp-2">{video.snippet.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {video.snippet.description}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>👁️ {parseInt(video.statistics?.viewCount || '0').toLocaleString()} views</span>
                        <span>👍 {parseInt(video.statistics?.likeCount || '0').toLocaleString()} likes</span>
                        <span>💬 {parseInt(video.statistics?.commentCount || '0').toLocaleString()} comments</span>
                        <span>📅 {format(parseISO(video.snippet.publishedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiktok" className="space-y-6 mt-6">
          {!tiktokConnected && !checkingConnection && (
            <>
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Music className="h-16 w-16 text-muted-foreground" />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Connect TikTok Analytics</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Connect your TikTok account to view analytics including follower growth, video performance, and engagement metrics.
                    </p>
                  </div>
                  <Button onClick={handleConnectTikTok} size="lg" className="gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Connect TikTok Account
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ View follower statistics</p>
                    <p>✓ Track video performance</p>
                    <p>✓ Monitor engagement metrics</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-green-500">✓</span> Available with API Connection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Current Stats</p>
                        <p className="text-xs text-muted-foreground">Follower count, following count, total likes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Video className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Video Metrics</p>
                        <p className="text-xs text-muted-foreground">Views, likes, comments, shares per video</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Recent Videos</p>
                        <p className="text-xs text-muted-foreground">Up to 20 latest uploads with thumbnails</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Profile Info</p>
                        <p className="text-xs text-muted-foreground">Display name, avatar, bio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-amber-500">⚠</span> Requires Research API
                    </CardTitle>
                    <CardDescription className="text-xs">
                      These features require TikTok Research API (special approval needed)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 opacity-60">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Historical Data</p>
                        <p className="text-xs text-muted-foreground">Daily follower growth over time</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 opacity-60">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Time-Series Analytics</p>
                        <p className="text-xs text-muted-foreground">View trends, engagement patterns</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 opacity-60">
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Audience Demographics</p>
                        <p className="text-xs text-muted-foreground">Age, gender, location breakdown</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 opacity-60">
                      <Video className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Advanced Video Analytics</p>
                        <p className="text-xs text-muted-foreground">Watch time, retention, traffic sources</p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-xs font-medium mb-1">How to get Research API access:</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Apply at TikTok for Developers</li>
                        <li>Describe your research use case</li>
                        <li>Wait for approval (can take weeks)</li>
                        <li>Additional fees may apply</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>💡</span> Current Setup Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">TikTok API Keys</span>
                    </div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Configured ✓</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="font-medium">OAuth Connection</span>
                    </div>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Not Connected</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="font-medium">Research API</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Not Available</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    <strong>Next step:</strong> Click "Connect TikTok Account" above to authenticate and start viewing your current stats and video performance.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {tiktokConnected && (
            <>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium">TikTok Connected</p>
                    {tiktokDisplayName && (
                      <p className="text-xs text-muted-foreground">{tiktokDisplayName}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectTikTok}
                  className="gap-2"
                >
                  <Unlink className="h-3 w-3" />
                  Disconnect
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Followers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {tiktokStats?.follower_count?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Total followers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Videos</CardTitle>
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {tiktokStats?.video_count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Published videos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {tiktokStats?.likes_count?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">All time likes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Following</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {tiktokStats?.following_count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Accounts following</p>
                  </CardContent>
                </Card>
              </div>

              {getTikTokChartData().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Trends</CardTitle>
                    <CardDescription>Historical data from daily snapshots</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getTikTokChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="followers" stroke="#8884d8" strokeWidth={2} name="Followers" />
                        <Line type="monotone" dataKey="likes" stroke="#82ca9d" strokeWidth={2} name="Total Likes" />
                        <Line type="monotone" dataKey="videos" stroke="#ffc658" strokeWidth={2} name="Videos" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {tiktokVideos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Videos</CardTitle>
                    <CardDescription>Latest uploads and their performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tiktokVideos.map((video: any) => (
                        <div key={video.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-all">
                          <img
                            src={video.cover_image_url}
                            alt={video.title || 'TikTok video'}
                            className="w-32 h-48 object-cover rounded"
                          />
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold line-clamp-2">{video.title || video.video_description}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {video.video_description}
                            </p>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>👁️ {video.view_count?.toLocaleString() || 0} views</span>
                              <span>❤️ {video.like_count?.toLocaleString() || 0} likes</span>
                              <span>💬 {video.comment_count?.toLocaleString() || 0} comments</span>
                              <span>🔄 {video.share_count?.toLocaleString() || 0} shares</span>
                            </div>
                            {video.share_url && (
                              <a
                                href={video.share_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                View on TikTok →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="instagram" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instagram Analytics</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-4">
                  <Instagram className="h-16 w-16 mx-auto opacity-50" />
                  <p className="text-lg">Instagram integration coming soon</p>
                  <p className="text-sm">Monitor your Instagram followers, posts, and stories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="twitter" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {xStats?.public_metrics?.followers_count?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total followers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Following</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {xStats?.public_metrics?.following_count || 0}
                </div>
                <p className="text-xs text-muted-foreground">Accounts following</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Posts</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {xStats?.public_metrics?.tweet_count || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total posts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Likes</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {xStats?.public_metrics?.like_count || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total likes given</p>
              </CardContent>
            </Card>
          </div>

          {getXChartData().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Growth Trends</CardTitle>
                <CardDescription>Historical data from daily snapshots</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getXChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="followers" stroke="#8884d8" strokeWidth={2} name="Followers" />
                    <Line type="monotone" dataKey="tweets" stroke="#82ca9d" strokeWidth={2} name="Posts" />
                    <Line type="monotone" dataKey="likes" stroke="#ffc658" strokeWidth={2} name="Likes" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {xTweets.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Posts</CardTitle>
                    <CardDescription>Latest posts from @{xStats?.username || 'pawme_ai'}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={xSortField === 'likes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortXPosts('likes')}
                      className="gap-1"
                    >
                      Likes
                      {xSortField === 'likes' && (
                        xSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant={xSortField === 'retweets' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortXPosts('retweets')}
                      className="gap-1"
                    >
                      Reposts
                      {xSortField === 'retweets' && (
                        xSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant={xSortField === 'replies' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortXPosts('replies')}
                      className="gap-1"
                    >
                      Replies
                      {xSortField === 'replies' && (
                        xSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant={xSortField === 'views' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortXPosts('views')}
                      className="gap-1"
                    >
                      Views
                      {xSortField === 'views' && (
                        xSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...xTweets].sort((a, b) => {
                    const aValue = xSortField === 'likes' ? (a.public_metrics?.like_count || 0) :
                                   xSortField === 'retweets' ? (a.public_metrics?.retweet_count || 0) :
                                   xSortField === 'replies' ? (a.public_metrics?.reply_count || 0) :
                                   (a.public_metrics?.impression_count || 0);
                    const bValue = xSortField === 'likes' ? (b.public_metrics?.like_count || 0) :
                                   xSortField === 'retweets' ? (b.public_metrics?.retweet_count || 0) :
                                   xSortField === 'replies' ? (b.public_metrics?.reply_count || 0) :
                                   (b.public_metrics?.impression_count || 0);
                    return xSortOrder === 'desc' ? bValue - aValue : aValue - bValue;
                  }).map((tweet: any) => (
                    <div key={tweet.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-all">
                      {tweet.media && tweet.media.length > 0 && (
                        <div className="flex-shrink-0">
                          {tweet.media[0].type === 'photo' && (
                            <img
                              src={tweet.media[0].url}
                              alt="Post media"
                              className="w-32 h-32 object-cover rounded"
                            />
                          )}
                          {tweet.media[0].type === 'video' && (
                            <img
                              src={tweet.media[0].preview_image_url}
                              alt="Video thumbnail"
                              className="w-32 h-32 object-cover rounded"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm mb-3">{tweet.text}</p>
                        <div className="flex gap-6 text-xs text-muted-foreground">
                          <span>💬 {tweet.public_metrics?.reply_count || 0} replies</span>
                          <span>🔄 {tweet.public_metrics?.retweet_count || 0} reposts</span>
                          <span>❤️ {tweet.public_metrics?.like_count || 0} likes</span>
                          <span>👁️ {tweet.public_metrics?.impression_count?.toLocaleString() || 0} views</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {tweet.created_at && format(new Date(tweet.created_at), 'MMM dd, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!xStats && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Twitter className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Loading X data...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="facebook" className="space-y-6 mt-6">
          {loadingFacebook ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Facebook className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading Facebook data...</p>
              </CardContent>
            </Card>
          ) : facebookStats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Page Name</CardTitle>
                    <Facebook className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{facebookStats.name}</div>
                    <p className="text-xs text-muted-foreground">Facebook Page</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Page Likes</CardTitle>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{facebookStats.fan_count.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total fans</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {facebookStats.talking_about_count?.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">People talking about this</p>
                  </CardContent>
                </Card>
              </div>

              {getFacebookChartData().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Trends</CardTitle>
                    <CardDescription>Historical data from daily snapshots</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getFacebookChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="fans" stroke="#8884d8" strokeWidth={2} name="Page Likes" />
                        <Line type="monotone" dataKey="engagement" stroke="#82ca9d" strokeWidth={2} name="Engagement" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Recent Posts</CardTitle>
                  <CardDescription>Latest posts from your Facebook page</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {facebookPosts.map((post) => (
                      <div key={post.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex gap-4">
                          {post.full_picture && (
                            <div className="flex-shrink-0">
                              <img
                                src={post.full_picture}
                                alt="Post"
                                className="w-32 h-32 object-cover rounded"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            {post.message && (
                              <p className="text-sm mb-3 line-clamp-3">{post.message}</p>
                            )}
                            <div className="flex gap-6 text-xs text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {post.likes?.summary?.total_count || 0} likes
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {post.comments?.summary?.total_count || 0} comments
                              </span>
                              {post.shares && (
                                <span className="flex items-center gap-1">
                                  <Share2 className="h-3 w-3" />
                                  {post.shares.count} shares
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(post.created_time), 'MMM dd, yyyy • h:mm a')}
                              </p>
                              <a
                                href={post.permalink_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                View on Facebook →
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {facebookPosts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No posts available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Facebook className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Failed to load Facebook data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="instagram" className="space-y-6 mt-6">
          {loadingInstagram ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Instagram className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading Instagram data...</p>
              </CardContent>
            </Card>
          ) : instagramStats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Username</CardTitle>
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">@{instagramStats.username}</div>
                    <p className="text-xs text-muted-foreground">Instagram handle</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Followers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{instagramStats.followers_count.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total followers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Following</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{instagramStats.follows_count.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Accounts followed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Posts</CardTitle>
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{instagramStats.media_count.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total media</p>
                  </CardContent>
                </Card>
              </div>

              {getInstagramChartData().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Trends</CardTitle>
                    <CardDescription>Historical data from daily snapshots</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getInstagramChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="followers" stroke="#8884d8" strokeWidth={2} name="Followers" />
                        <Line type="monotone" dataKey="following" stroke="#82ca9d" strokeWidth={2} name="Following" />
                        <Line type="monotone" dataKey="posts" stroke="#ffc658" strokeWidth={2} name="Posts" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Recent Posts</CardTitle>
                  <CardDescription>Latest posts from your Instagram account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {instagramPosts.map((post) => (
                      <div key={post.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative aspect-square">
                          {post.media_type === 'VIDEO' ? (
                            <div className="relative w-full h-full">
                              <img
                                src={post.media_url}
                                alt={post.caption || 'Instagram post'}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Video className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={post.media_url}
                              alt={post.caption || 'Instagram post'}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="p-4">
                          {post.caption && (
                            <p className="text-sm mb-3 line-clamp-2">{post.caption}</p>
                          )}
                          <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {post.like_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {post.comments_count || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(post.timestamp), 'MMM dd, yyyy')}
                            </p>
                            <a
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                    {instagramPosts.length === 0 && (
                      <p className="col-span-full text-center text-muted-foreground py-8">No posts available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Instagram className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Failed to load Instagram data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="old-facebook-placeholder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Facebook Analytics</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-4">
                  <Facebook className="h-16 w-16 mx-auto opacity-50" />
                  <p className="text-lg">Facebook integration coming soon</p>
                  <p className="text-sm">Track your page likes, posts, and reach</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

        {/* Email Dialog */}
        {showEmailDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEmailDialog(false)}>
            <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Send Email to {selectedUsers.size} User{selectedUsers.size > 1 ? 's' : ''}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Message (use {'{'}{'{'} name {'}'}{'}'}  for personalization)
                  </label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Hi {{name}},&#10;&#10;Your message here..."
                    rows={10}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmailDialog(false);
                      setEmailSubject('');
                      setEmailContent('');
                    }}
                    disabled={sendingEmail}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!emailSubject || !emailContent) {
                        toast.error('Please fill in subject and message');
                        return;
                      }
                      setSendingEmail(true);
                      try {
                        const selectedUserData = allUsers.filter(u => selectedUsers.has(u.id));
                        const recipients = selectedUserData.map(u => ({ email: u.email, name: u.name }));
                        
                        const response = await fetch('/api/send-bulk-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recipients,
                            subject: emailSubject,
                            htmlContent: emailContent.replace(/\n/g, '<br>'),
                          }),
                        });
                        
                        const data = await response.json();
                        if (data.success) {
                          toast.success(`Email sent to ${data.sent} user${data.sent > 1 ? 's' : ''}!`);
                          setShowEmailDialog(false);
                          setEmailSubject('');
                          setEmailContent('');
                          setSelectedUsers(new Set());
                        } else {
                          toast.error(data.message || 'Failed to send emails');
                        }
                      } catch (error) {
                        toast.error('Failed to send emails');
                      } finally {
                        setSendingEmail(false);
                      }
                    }}
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SocialsDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    }>
      <SocialsDashboardContent />
    </Suspense>
  );
}
