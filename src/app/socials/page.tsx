'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Globe, Youtube, Music, Instagram, Twitter, Facebook, Users, Video, TrendingUp, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { Header } from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { Button } from '@/app/components/ui/button';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [signupsRes, youtubeStatsRes, youtubeVideosRes] = await Promise.all([
        fetch('/api/signups'),
        fetch('/api/youtube?endpoint=stats'),
        fetch('/api/youtube?endpoint=videos'),
      ]);

      const signupsData = await signupsRes.json();
      const youtubeStatsData = await youtubeStatsRes.json();
      const youtubeVideosData = await youtubeVideosRes.json();

      setSignups(signupsData.signups || []);
      setTotalSignups(signupsData.totalSignups || 0);
      setYoutubeStats(youtubeStatsData.items?.[0]?.statistics || null);
      setYoutubeVideos(youtubeVideosData.items || []);
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

  const toggleSort = (field: 'views' | 'likes' | 'comments') => {
    if (videoSortField === field) {
      setVideoSortOrder(videoSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setVideoSortField(field);
      setVideoSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
          <TabsList className="grid grid-cols-6 w-full max-w-5xl">
            <TabsTrigger value="website" className="flex flex-col items-center gap-1 py-3">
              <Globe className="h-5 w-5" />
              <span className="text-xs">Website</span>
              {totalSignups > 0 && (
                <span className="text-xs font-semibold">{totalSignups}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex flex-col items-center gap-1 py-3">
              <Youtube className="h-5 w-5" />
              <span className="text-xs">YouTube</span>
              {youtubeStats && (
                <span className="text-xs font-semibold">{youtubeStats.subscriberCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tiktok" className="flex flex-col items-center gap-1 py-3 opacity-60">
              <Music className="h-5 w-5" />
              <span className="text-xs">TikTok</span>
              <span className="text-xs text-muted-foreground">Soon</span>
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex flex-col items-center gap-1 py-3 opacity-60">
              <Instagram className="h-5 w-5" />
              <span className="text-xs">Instagram</span>
              <span className="text-xs text-muted-foreground">Soon</span>
            </TabsTrigger>
            <TabsTrigger value="twitter" className="flex flex-col items-center gap-1 py-3 opacity-60">
              <Twitter className="h-5 w-5" />
              <span className="text-xs">Twitter</span>
              <span className="text-xs text-muted-foreground">Soon</span>
            </TabsTrigger>
            <TabsTrigger value="facebook" className="flex flex-col items-center gap-1 py-3 opacity-60">
              <Facebook className="h-5 w-5" />
              <span className="text-xs">Facebook</span>
              <span className="text-xs text-muted-foreground">Soon</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="website" className="space-y-6">
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

          <TabsContent value="youtube" className="space-y-6">
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
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSort('views')}
                      className="gap-1"
                    >
                      Views
                      {videoSortField === 'views' && (
                        videoSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSort('likes')}
                      className="gap-1"
                    >
                      Likes
                      {videoSortField === 'likes' && (
                        videoSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSort('comments')}
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

        <TabsContent value="tiktok" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>TikTok Analytics</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-4">
                  <Music className="h-16 w-16 mx-auto opacity-50" />
                  <p className="text-lg">TikTok integration coming soon</p>
                  <p className="text-sm">Track your TikTok followers, views, and engagement</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

        <TabsContent value="twitter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Twitter Analytics</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-4">
                  <Twitter className="h-16 w-16 mx-auto opacity-50" />
                  <p className="text-lg">Twitter integration coming soon</p>
                  <p className="text-sm">Analyze your tweets, followers, and engagement</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
