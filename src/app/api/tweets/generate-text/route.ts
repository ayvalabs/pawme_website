import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Models confirmed available on this API key (Apr 2026)
const TEXT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
];

export async function POST(request: NextRequest) {
  try {
    const { tweetId, context, pillar, tone } = await request.json();

    if (!tweetId) {
      return NextResponse.json({ error: 'Missing tweetId' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Fetch current tweet for context
    const tweetDoc = await adminDb.collection('scheduled-posts').doc(tweetId).get();
    const tweet = tweetDoc.data();

    const systemPrompt = `You are a social media expert writing tweets for @pawme_ai — a startup building PawMe, an AI-powered autonomous pet companion robot. PawMe started from an open-source ESP-ROLL project and has been developed into a commercial product launching on Kickstarter in early June 2026.

Key facts:
- PawMe is a spherical self-balancing robot with camera, mic, speaker, laser pointer, LED eyes
- It uses ESP32 + AI (Gemini) to monitor pets, detect health anomalies, play with them, and reduce separation anxiety
- 10 working prototypes already built and pet-tested
- Team has been building for 9+ months (since July 2025)
- Early-bird Kickstarter price: $149-$249 range
- First 1000 backers get half the Kickstarter price
- Website: pawmebot.com (waitlist + VIP list)
- Twitter: @pawme_ai

Content pillar: ${pillar || 'general'}
Desired tone: ${tone || 'authentic, passionate, technical-but-accessible'}

Rules:
- Maximum 280 characters per tweet (threads can have multiple tweets)
- Use relevant hashtags naturally
- Be authentic, not salesy
- Include specific technical details when relevant
- Reference real development milestones
- For threads, separate each tweet with "---"
- Include image generation prompt suggestions prefixed with [IMAGE_PROMPT:]`;

    const userPrompt = context
      ? `Write a tweet (or thread if needed) about: ${context}\n\nExisting tweet text for reference: ${tweet?.text || 'none'}`
      : `Improve or rewrite this tweet:\n\n${tweet?.text || 'No text yet'}\n\nThreads: ${(tweet?.threadTexts || []).join('\n')}\n\nMake it more engaging, authentic, and optimized for Twitter/X engagement.`;

    // Try each model in sequence
    let lastError = '';
    for (const model of TEXT_MODELS) {
      try {
        console.log(`[generate-text] Trying ${model}...`);
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
              ],
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error(`[generate-text] ${model} returned ${geminiResponse.status}:`, errorText.substring(0, 200));
          lastError = `${model}: ${geminiResponse.status} - ${errorText.substring(0, 100)}`;
          continue;
        }

        const geminiData = await geminiResponse.json();
        const textPart = geminiData?.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.text
        );

        if (!textPart) {
          lastError = `${model}: No text in response`;
          continue;
        }

        const generatedText = textPart.text;
        console.log(`[generate-text] ✅ ${model} succeeded (${generatedText.length} chars)`);

        // Parse out main tweet, threads, and image prompt
        const sections = generatedText.split('---').map((s: string) => s.trim()).filter(Boolean);
        const mainText = sections[0] || generatedText;
        const threadTexts = sections.slice(1).filter((s: string) => !s.startsWith('[IMAGE_PROMPT:'));

        const imagePromptMatch = generatedText.match(/\[IMAGE_PROMPT:\s*(.*?)\]/s);
        const imagePrompt = imagePromptMatch ? imagePromptMatch[1].trim() : null;

        return NextResponse.json({
          success: true,
          mainText,
          threadTexts,
          imagePrompt,
          rawGenerated: generatedText,
          model,
        });
      } catch (err: any) {
        console.error(`[generate-text] ${model} exception:`, err.message);
        lastError = `${model}: ${err.message}`;
        continue;
      }
    }

    return NextResponse.json(
      { error: 'All text generation models failed', details: lastError },
      { status: 500 }
    );
  } catch (error) {
    console.error('Failed to generate tweet text:', error);
    return NextResponse.json(
      { error: 'Failed to generate text', details: String(error) },
      { status: 500 }
    );
  }
}
