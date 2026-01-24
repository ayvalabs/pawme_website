'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { fetchTikTokVideos } from '@/app/actions/tiktok';

interface TikTokVideo {
  id: string;
  title: string;
  embed_link: string;
  cover_image_url: string;
  video_description: string;
  view_count: number;
  like_count: number;
  share_count: number;
}

export function TikTokFeed() {
  const [mounted, setMounted] = useState(false);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);

  useEffect(() => {
    setMounted(true);
    
    // Fetch TikTok videos
    fetchTikTokVideos().then(setVideos).catch(console.error);
    
    // Load TikTok embed script
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background via-secondary/5 to-background">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            See PawMe in Action
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Check out our most popular TikTok videos and join our growing community of pet lovers
          </p>
          <a
            href="https://www.tiktok.com/@yourhandle"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Follow us on TikTok
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* TikTok Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {videos.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Loading TikTok videos...</p>
            </div>
          ) : (
            videos.map((video: TikTokVideo) => (
              <div
                key={video.id}
                className="relative group rounded-lg overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg transition-all"
              >
                {/* TikTok Embed */}
                <div className="aspect-[9/16] relative">
                  <blockquote
                    className="tiktok-embed"
                    cite={`https://www.tiktok.com/video/${video.id}`}
                    data-video-id={video.id}
                    style={{ maxWidth: '100%', minWidth: '100%' }}
                  >
                    <section>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={video.embed_link}
                        className="flex items-center justify-center h-full bg-accent/50"
                      >
                        <div className="text-center p-4">
                          <p className="text-sm text-muted-foreground">Loading TikTok video...</p>
                        </div>
                      </a>
                    </section>
                  </blockquote>
                </div>

                {/* Caption Overlay */}
                {video.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium">{video.title}</p>
                    <p className="text-white/70 text-xs mt-1">
                      👁️ {video.view_count.toLocaleString()} views
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Love what you see? Join our waitlist and be part of the PawMe journey!
          </p>
        </div>
      </div>
    </section>
  );
}
