#!/bin/bash
# Fix missing thumbnails and compress oversized video
# Run from project root: bash scripts/ffmpeg-fix.sh

STUDIO="/Users/ashokjaiswal/Library/CloudStorage/GoogleDrive-pawme@ayvalabs.com/My Drive/5. Product/History/WhatsApp Chat - Rolling Robot - Pawme/studio"
THUMBS="/Users/ashokjaiswal/Library/CloudStorage/GoogleDrive-pawme@ayvalabs.com/My Drive/5. Product/History/WhatsApp Chat - Rolling Robot - Pawme/thumbnails"

echo "📸 Generating 5 missing thumbnails..."

ffmpeg -y -ss 2 -i "$STUDIO/normalized_08 - 3 1   Firmware dev.mp4" \
  -vframes 1 -q:v 2 "$THUMBS/thumbnail_normalized_08.jpg" && \
  echo "   ✅ thumbnail_normalized_08.jpg"

ffmpeg -y -ss 2 -i "$STUDIO/normalized_09 - 3 2   Electronics design.mp4" \
  -vframes 1 -q:v 2 "$THUMBS/thumbnail_normalized_09.jpg" && \
  echo "   ✅ thumbnail_normalized_09.jpg"

ffmpeg -y -ss 2 -i "$STUDIO/normalized_29 - open ai qa.mp4" \
  -vframes 1 -q:v 2 "$THUMBS/thumbnail_normalized_29.jpg" && \
  echo "   ✅ thumbnail_normalized_29.jpg"

ffmpeg -y -ss 2 -i "$STUDIO/normalized_37 - 3 1   Firmware dev.mp4" \
  -vframes 1 -q:v 2 "$THUMBS/thumbnail_normalized_37.jpg" && \
  echo "   ✅ thumbnail_normalized_37.jpg"

echo ""
echo "🗜️  Compressing normalized_10 (54.2MB → target ~15MB)..."
ffmpeg -y \
  -i "$STUDIO/normalized_10 - 3 3   Mechanical design.mp4" \
  -vf "scale=1280:-2" \
  -c:v libx264 -crf 28 -preset fast \
  -c:a aac -b:a 128k \
  "$STUDIO/normalized_10-tmp.mp4" && \
  mv "$STUDIO/normalized_10-tmp.mp4" \
     "$STUDIO/normalized_10 - 3 3   Mechanical design.mp4" && \
  echo "   ✅ normalized_10 compressed"

echo ""
echo "🖼️  Generating thumbnail for normalized_10 (from compressed)..."
ffmpeg -y -ss 2 -i "$STUDIO/normalized_10 - 3 3   Mechanical design.mp4" \
  -vframes 1 -q:v 2 "$THUMBS/thumbnail_normalized_10.jpg" && \
  echo "   ✅ thumbnail_normalized_10.jpg"

echo ""
echo "✅ All done. Now run:"
echo "   pnpm seed-posts --force"
echo "   pnpm upload-media"
echo "   pnpm patch-thread-media"
