import { NextRequest, NextResponse } from 'next/server';
import { CARD_STYLES, generatePetPortrait } from '@/lib/pet-card';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

// Image generation is the expensive call — gate it harder than analysis.
const DAILY_LIMIT = 8;
const MAX_BYTES = 10 * 1024 * 1024;

// Allow extra time for image generation.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit('pet-card-portrait', clientIp(request), DAILY_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "You've created your free portraits for today. Come back tomorrow for more!",
        },
        { status: 429 },
      );
    }

    const { imageBase64, mimeType, style } = await request.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ success: false, message: 'imageBase64 is required.' }, { status: 400 });
    }
    if (!style || !CARD_STYLES[style]) {
      return NextResponse.json(
        { success: false, message: `Unknown style. Options: ${Object.keys(CARD_STYLES).join(', ')}` },
        { status: 400 },
      );
    }
    // Rough size guard (base64 is ~4/3 of the byte size).
    if (imageBase64.length > MAX_BYTES * 1.4) {
      return NextResponse.json({ success: false, message: 'Image too large. Max 10MB.' }, { status: 413 });
    }

    const result = await generatePetPortrait(imageBase64, mimeType || 'image/jpeg', style);
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Could not generate a portrait right now. Please try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      imageDataUrl: result.dataUrl,
      model: result.model,
      remaining: rl.remaining,
    });
  } catch (error) {
    console.error('[pet-card/portrait] error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate portrait.' },
      { status: 500 },
    );
  }
}
