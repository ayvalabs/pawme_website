/**
 * Media Library types for content system
 */

export type MediaType = 'video' | 'image' | 'gif';
export type MediaStatus = 'available' | 'needs_processing' | 'archived';

export interface MediaAsset {
  id: string;
  type: MediaType;
  caption: string;
  path: string;
  thumbnailPath?: string;
  status: MediaStatus;
  usableFor: string[]; // e.g., ['build_in_public', 'product_showcase']
  notes?: string;
  fileSize?: number;
  duration?: number; // for videos, in seconds
  dimensions?: { width: number; height: number };
  createdAt: string;
  tags?: string[];
}

export interface MediaLibraryEntry extends MediaAsset {
  storageUrl?: string;
  thumbnailUrl?: string;
  usageCount?: number;
  lastUsedAt?: string;
}
