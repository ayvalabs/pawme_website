'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Globe, Youtube, Music, Instagram, Twitter, Facebook, Users, Video, TrendingUp, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Link as LinkIcon, Unlink } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function SocialsDashboard() {
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
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkYouTubeConnection();
    checkTikTokConnection();
    fetchData();
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6 pt-24">
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
            <TabsTrigger value="instagram" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none opacity-60">
              <Instagram className="h-5 w-5" />
              <span className="text-xs">Instagram</span>
              <span className="text-xs text-muted-foreground">Soon</span>
            </TabsTrigger>
            <TabsTrigger value="twitter" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <Twitter className="h-5 w-5" />
              <span className="text-xs">X</span>
              {xStats && (
                <span className="text-xs font-semibold">{xStats.public_metrics?.followers_count || 0}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="facebook" className="flex flex-col items-center gap-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none opacity-60">
              <Facebook className="h-5 w-5" />
              <span className="text-xs">Facebook</span>
              <span className="text-xs text-muted-foreground">Soon</span>
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
                <CardTitle>Recent Signups</CardTitle>
                <CardDescription>Latest user registrations</CardDescription>
              </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Name</th>
                        <th className="text-left py-2 px-4">Email</th>
                        <th className="text-left py-2 px-4">Points</th>
                        <th className="text-left py-2 px-4">Referrals</th>
                        <th className="text-left py-2 px-4">Status</th>
                        <th className="text-left py-2 px-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signups.slice(0, 20).map((signup) => (
                        <tr key={signup.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{signup.name}</td>
                          <td className="py-2 px-4 text-sm text-muted-foreground">{signup.email}</td>
                          <td className="py-2 px-4 font-semibold">{signup.points}</td>
                          <td className="py-2 px-4">{signup.referralCount}</td>
                          <td className="py-2 px-4">
                            {signup.isVip ? (
                              <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                                VIP
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-700 dark:text-green-400">
                                Free
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-sm text-muted-foreground">
                            {signup.createdAt ? format(parseISO(signup.createdAt), 'MMM dd, yyyy') : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

            <Card>
              <CardHeader>
                <CardTitle>Subscriber Growth</CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
                  <Calendar className="h-4 w-4" />
                  Coming Soon - Daily tracking not yet available
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-12 w-12 mx-auto opacity-50" />
                  <p>Historical data tracking will be available soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

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

        <TabsContent value="facebook" className="space-y-6">
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
      </div>
      <Footer />
    </div>
  );
}
