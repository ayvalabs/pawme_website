# Vercel Cost Optimization Guide

## Current Usage Analysis

**Problem:** Exceeded Fast Data Transfer (113.14 GB / 100 GB free tier)

### Root Cause
Your public assets total **~118 MB**, with unoptimized images and video:

| Asset | Current Size | Optimized Size | Savings |
|-------|-------------|----------------|---------|
| `pawme-demo.mp4` | 30 MB | Move to YouTube | 100% |
| `portrait-dog-golden.png` | 25 MB | ~2-3 MB | 88-90% |
| `portrait-cat.png` | 10 MB | ~1 MB | 90% |
| `portrait-dog-white.png` | 7.6 MB | ~800 KB | 90% |
| `portrait-corgi.png` | 7.9 MB | ~800 KB | 90% |
| `hero-slide-2.png` | 6.3 MB | ~600 KB | 90% |
| `hero-slide-3.png` | 5.6 MB | ~550 KB | 90% |
| `hero-slide-4.png` | 6.2 MB | ~600 KB | 90% |
| `hero-slide-5.png` | 6.3 MB | ~600 KB | 90% |
| `founder.png` | 3.3 MB | ~300 KB | 91% |

**Total reduction: 118 MB → ~12-15 MB (87% smaller)**

### Why This Matters
- 113 GB ÷ 118 MB = ~957 full page loads
- Each visitor downloads 30MB video + 88MB images
- With optimization: Each visitor downloads ~12-15 MB
- **Projected usage after optimization: ~15-20 GB/month** (well within free tier)

## Optimization Steps

### 1. Optimize Images (IMMEDIATE - Run Now)

```bash
# Run the optimization script
node scripts/optimize-images.js
```

This will:
- ✅ Resize images to appropriate dimensions
- ✅ Compress PNGs with 80-85% quality
- ✅ Generate WebP versions (better compression)
- ✅ Backup originals as `.backup` files
- ✅ Reduce total image size by ~87%

### 2. Move Video to External Hosting (CRITICAL)

**Current:** 30MB `pawme-demo.mp4` served from Vercel
**Solution:** Upload to YouTube/Vimeo and embed

#### Option A: YouTube (Recommended - Free)
1. Upload `pawme-demo.mp4` to YouTube
2. Set as unlisted if you don't want it public
3. Get embed code
4. Replace video tag with YouTube iframe

#### Option B: Cloudflare Stream ($5/month for 1000 minutes)
- Better player controls
- No YouTube branding
- Faster loading

**Savings:** 30 MB × 957 loads = 28.7 GB saved

### 3. Update Next.js Image Usage

Replace all `<img>` tags with Next.js `<Image>` component:

```tsx
// Before
<img src="/hero-slide-1.png" alt="Hero" />

// After
import Image from 'next/image';
<Image 
  src="/hero-slide-1.webp" 
  alt="Hero" 
  width={1920} 
  height={1080}
  quality={85}
  priority={false}
  loading="lazy"
/>
```

**Benefits:**
- Automatic format selection (WebP for supported browsers)
- Lazy loading (only loads when visible)
- Responsive images (serves smaller sizes on mobile)
- Built-in optimization

### 4. Add Caching Headers

Update `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 5. Implement Progressive Loading

For hero images, use blur placeholders:

```tsx
<Image
  src="/hero-slide-1.webp"
  alt="Hero"
  width={1920}
  height={1080}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // tiny base64 image
/>
```

## Expected Results

### Before Optimization
- Page size: ~118 MB
- Data transfer: 113 GB/month
- Cost: Over free tier

### After Optimization
- Page size: ~12-15 MB (87% reduction)
- Data transfer: ~15-20 GB/month
- Cost: **FREE** (well within 100 GB limit)

## Additional Recommendations

### 1. Use CDN for Static Assets (Optional)
If you still exceed limits, move images to:
- **Cloudflare R2** (free egress)
- **Cloudinary** (free tier: 25 GB/month)
- **imgix** (optimized image delivery)

### 2. Monitor Usage
Add Vercel Analytics to track:
- Which pages use most bandwidth
- Image load times
- User geography (serve from closer edge locations)

### 3. Lazy Load Everything
```tsx
// Lazy load components not immediately visible
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### 4. Compress Fonts
Your fonts are 3.4 MB. Consider:
- Using system fonts for body text
- Only loading font weights you actually use
- Converting to WOFF2 format (better compression)

## Implementation Checklist

- [ ] Run `node scripts/optimize-images.js`
- [ ] Upload video to YouTube/Vimeo
- [ ] Replace video tag with embed
- [ ] Update all `<img>` to `<Image>` components
- [ ] Use `.webp` versions where possible
- [ ] Add caching headers to `next.config.ts`
- [ ] Test page load speed
- [ ] Deploy to production
- [ ] Monitor Vercel usage for 1 week
- [ ] Verify usage drops to <20 GB/month

## Quick Wins (Do These First)

1. **Move video to YouTube** → Save 28.7 GB immediately
2. **Run image optimization script** → Save 50-60 GB
3. **Use Next.js Image component** → Save 20-30 GB

**Total savings: ~100 GB → Well within free tier**

## Questions?

If you need help with any step, let me know. The most critical actions are:
1. Optimize images (script provided)
2. Move video to external hosting
3. Use Next.js Image component everywhere
