export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type PostPlatform = 'x' | 'telegram' | 'both';
export type ApprovalStatus = 'draft' | 'flagged' | 'approved' | 'published';
export type ContentPillar = 'build_in_public' | 'product_showcase' | 'founder_voice' | 'community_prompt' | 'market_context';

export interface ScheduledPost {
  id: string;
  /** Tweet/post text content (first tweet if thread) */
  text: string;
  /** Thread tweets — array of follow-up tweets posted as replies. Empty = single tweet. */
  threadTexts?: string[];
  /** Media URLs (Firebase Storage URLs) */
  mediaUrls: string[];
  /** Original media file paths (for reference) */
  mediaFilePaths: string[];
  /** Media types corresponding to mediaUrls */
  mediaTypes: ('image' | 'video')[];
  /** Per-thread-tweet media mapping: threadMediaMap[i] = indices into mediaUrls for tweet i (0=main tweet) */
  threadMediaMap?: number[][];
  /** Video thumbnail URLs (Firebase Storage URLs) — one per video in mediaUrls */
  videoThumbnailUrls?: string[];
  /** Original thumbnail file paths (for reference) */
  videoThumbnailFiles?: string[];
  /** When to publish (ISO string) */
  scheduledAt: string;
  /** Current status */
  status: PostStatus;
  /** Which platforms to post to */
  platforms: PostPlatform;
  /** Post category for organization (legacy - use pillar instead) */
  category: string;
  /** Content pillar (new editorial system) */
  pillar?: ContentPillar;
  /** Hashtags (stored separately for easy editing) */
  hashtags: string[];
  /** Accounts to tag/mention */
  mentions: string[];
  /** Call to action URL */
  ctaUrl?: string;
  /** Week number in the campaign (1-6) */
  campaignWeek: number;
  /** Day within the campaign */
  campaignDay: number;
  /** Risk score from content validation (0-100) */
  riskScore?: number;
  /** Duplicate similarity score vs recent posts (0-100) */
  duplicateScore?: number;
  /** Approval workflow status */
  approvalStatus?: ApprovalStatus;
  /** Source label for numerical claims */
  sourceLabel?: string;
  /** Source URL for numerical claims */
  sourceUrl?: string;
  /** Media library asset IDs (references to media-library collection) */
  mediaLibraryIds?: string[];
  /** X post ID after publishing (main tweet) */
  xPostId?: string;
  /** X post IDs for thread replies */
  threadPostIds?: string[];
  /** Telegram message ID after publishing */
  telegramMessageId?: number;
  /** Error message if publishing failed */
  errorMessage?: string;
  /** Timestamp when actually published */
  publishedAt?: string;
  /** Created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

export interface PostMetrics {
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  bookmarks: number;
}

export interface CreatePostInput {
  text: string;
  threadTexts?: string[];
  mediaUrls?: string[];
  mediaFilePaths?: string[];
  mediaTypes?: ('image' | 'video')[];
  threadMediaMap?: number[][];
  videoThumbnailUrls?: string[];
  videoThumbnailFiles?: string[];
  scheduledAt: string;
  platforms?: PostPlatform;
  category?: string;
  hashtags?: string[];
  mentions?: string[];
  ctaUrl?: string;
  campaignWeek?: number;
  campaignDay?: number;
}
