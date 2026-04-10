import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Image-capable models confirmed on this API key (Apr 2026)
const IMAGE_GEN_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
];

export async function POST(request: NextRequest) {
  try {
    const { tweetId, prompt, referenceImageUrl } = await request.json();

    if (!tweetId || !prompt) {
      return NextResponse.json({ error: 'Missing tweetId or prompt' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Build request parts
    const parts: any[] = [];

    if (referenceImageUrl) {
      try {
        const imgResponse = await fetch(referenceImageUrl);
        if (imgResponse.ok) {
          const imgBuffer = await imgResponse.arrayBuffer();
          const base64 = Buffer.from(imgBuffer).toString('base64');
          const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
          parts.push({ inlineData: { mimeType: contentType, data: base64 } });
          parts.push({ text: `Using the reference image above, ${prompt}` });
        } else {
          parts.push({ text: prompt });
        }
      } catch {
        parts.push({ text: prompt });
      }
    } else {
      parts.push({ text: prompt });
    }

    let imagePart: any = null;
    let usedModel = '';
    const errors: string[] = [];

    for (const model of IMAGE_GEN_MODELS) {
      try {
        console.log(`[generate-media] Trying ${model}...`);
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
              },
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error(`[generate-media] ${model} returned ${geminiResponse.status}:`, errorText.substring(0, 300));
          errors.push(`${model}: ${geminiResponse.status}`);
          continue;
        }

        const geminiData = await geminiResponse.json();
        const responseParts = geminiData?.candidates?.[0]?.content?.parts ?? [];
        imagePart = responseParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

        if (imagePart) {
          usedModel = model;
          console.log(`[generate-media] ✅ ${model} generated image`);
          break;
        } else {
          const textPart = responseParts.find((p: any) => p.text);
          errors.push(`${model}: No image returned${textPart ? ` (got text instead)` : ''}`);
          console.error(`[generate-media] ${model} - no image part`);
        }
      } catch (err: any) {
        console.error(`[generate-media] ${model} exception:`, err.message);
        errors.push(`${model}: ${err.message}`);
      }
    }

    if (!imagePart) {
      return NextResponse.json({
        error: 'No image generated. All models failed.',
        details: errors.join(' | '),
        modelsAttempted: IMAGE_GEN_MODELS,
      }, { status: 500 });
    }

    // Save to Firebase Storage
    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const ext = imagePart.inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
    const filename = `ai_generated_${tweetId}_${Date.now()}.${ext}`;
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(`posts-media/${filename}`);

    await file.save(imageBuffer, {
      metadata: {
        contentType: imagePart.inlineData.mimeType || 'image/jpeg',
        metadata: {
          generatedBy: usedModel,
          prompt: prompt.substring(0, 200),
          tweetId,
        },
      },
    });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
    });

    // Append to existing tweet media
    const tweetDoc = await adminDb.collection('scheduled-posts').doc(tweetId).get();
    const existing = tweetDoc.data();
    const existingUrls = existing?.mediaUrls || [];
    const existingTypes = existing?.mediaTypes || [];
    const existingPaths = existing?.mediaFilePaths || [];

    await adminDb.collection('scheduled-posts').doc(tweetId).update({
      mediaUrls: [...existingUrls, signedUrl],
      mediaTypes: [...existingTypes, 'image'],
      mediaFilePaths: [...existingPaths, filename],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      mediaUrls: [...existingUrls, signedUrl],
      mediaTypes: [...existingTypes, 'image'],
      model: usedModel,
    });
  } catch (error) {
    console.error('Failed to generate media:', error);
    return NextResponse.json(
      { error: 'Failed to generate media', details: String(error) },
      { status: 500 }
    );
  }
}
