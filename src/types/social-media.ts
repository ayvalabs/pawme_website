export interface FacebookPageStats {
  name: string;
  fan_count: number;
  engagement?: {
    count: number;
  };
  talking_about_count?: number;
  id: string;
}

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
  likes: {
    summary: {
      total_count: number;
    };
  };
  comments: {
    summary: {
      total_count: number;
    };
  };
  shares?: {
    count: number;
  };
}

export interface InstagramStats {
  id: string;
  username: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

export interface SocialMediaData {
  facebook: {
    stats: FacebookPageStats;
    posts: FacebookPost[];
  };
  instagram: {
    stats: InstagramStats;
    posts: InstagramPost[];
  };
}
