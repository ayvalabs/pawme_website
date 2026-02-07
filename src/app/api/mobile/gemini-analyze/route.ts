import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_ENDPOINTS = [
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
  `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
];

const BREED_PROMPT = `You are a veterinary AI expert. Analyze this pet photo and provide the following information in JSON format ONLY (no markdown, no code blocks, just raw JSON):

{
  "breed": "specific breed name",
  "type": "dog" or "cat" or "bird" or "rabbit" or "other",
  "color": "coat/fur color description (e.g. Gray Tabby, Golden, Black & White)",
  "estimatedAge": "estimated age (e.g. 2 Years, 6 Months)",
  "gender": "Male or Female (best guess based on appearance)",
  "weight": "estimated weight in kg (e.g. 4.5 kg)",
  "careNotes": "2-3 sentences of breed-specific care advice",
  "confidence": 0.0 to 1.0
}

Be specific about the breed. If you can't determine something, make your best educated guess.`;

const FALLBACK_RESULT = {
  breed: 'Unknown',
  type: 'other',
  color: 'Unknown',
  estimatedAge: 'Unknown',
  gender: 'Unknown',
  weight: 'Unknown',
  careNotes: 'Please consult your veterinarian for specific care advice.',
  confidence: 0,
};

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, message: 'imageBase64 is required.' },
        { status: 400 },
      );
    }

    if (!GEMINI_API_KEY) {
      console.error('[gemini-analyze] GEMINI_API_KEY not configured');
      return NextResponse.json(
        { success: true, data: FALLBACK_RESULT },
        { status: 200 },
      );
    }

    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { text: BREED_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          ],
        },
      ],
    });

    let lastError = '';
    for (const url of GEMINI_ENDPOINTS) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[gemini-analyze] Endpoint failed:', url, errorText);
          lastError = errorText;
          if (errorText.includes('location') || errorText.includes('not supported')) continue;
          // For other errors, still try next endpoint
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
          const parsed = JSON.parse(jsonStr);
          return NextResponse.json({ success: true, data: parsed });
        } catch {
          console.error('[gemini-analyze] Failed to parse response:', text);
          return NextResponse.json({ success: true, data: FALLBACK_RESULT });
        }
      } catch (error: any) {
        console.warn('[gemini-analyze] Request error:', error.message);
        lastError = error.message;
      }
    }

    console.error('[gemini-analyze] All endpoints failed:', lastError);
    return NextResponse.json({ success: true, data: FALLBACK_RESULT });
  } catch (error: any) {
    console.error('[gemini-analyze] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to analyze image.' },
      { status: 500 },
    );
  }
}
