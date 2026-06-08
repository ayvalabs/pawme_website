import { NextRequest, NextResponse } from 'next/server';
import { analyzePetPhoto, ANALYZE_FALLBACK } from '@/lib/pet-card';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

// Analysis is cheaper than image-gen, so allow a generous daily cap per IP.
const DAILY_LIMIT = 30;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB upload

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit('pet-card-analyze', clientIp(request), DAILY_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "You've reached today's free limit. Try again tomorrow!" },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: 'Image file is required.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, message: 'Image too large. Max 10MB.' },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const data = await analyzePetPhoto(base64, mimeType);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[pet-card/analyze] error:', error);
    // Graceful: never break the widget UI on analysis failure.
    return NextResponse.json({ success: true, data: ANALYZE_FALLBACK });
  }
}
