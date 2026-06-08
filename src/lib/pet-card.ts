import * as admin from 'firebase-admin';

/**
 * Shared core for the public "AI Pet Trading Card" widget.
 *
 * - analyzePetPhoto: mirrors /api/analyze-pet-image (breed/age/stats) but takes
 *   base64 so both the multipart route and other callers can reuse it.
 * - generatePetPortrait: reuses the image-generation core of /api/generate-media
 *   (IMAGE_GEN_MODELS fallback loop) but DECOUPLED from the tweet flow — no
 *   `scheduled-posts` write. Returns a data URL for the client to draw on canvas
 *   (data URLs don't taint the canvas, so Download/Share keep working) and saves
 *   a copy to Storage best-effort for our own gallery/analytics.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const ANALYZE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview'];
const IMAGE_GEN_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
];

export interface PetAnalysis {
  breed: string;
  type: string;
  color: string;
  estimatedAge: string;
  gender: string;
  weight: string;
  careNotes: string;
  confidence: number;
}

export const ANALYZE_FALLBACK: PetAnalysis = {
  breed: 'Mixed breed',
  type: 'dog',
  color: 'Unknown',
  estimatedAge: 'Unknown',
  gender: 'Unknown',
  weight: 'Unknown',
  careNotes: 'A wonderful companion! For specific care advice, talk to your vet.',
  confidence: 0,
};

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

export async function analyzePetPhoto(
  base64: string,
  mimeType = 'image/jpeg',
): Promise<PetAnalysis> {
  if (!GEMINI_API_KEY) return ANALYZE_FALLBACK;

  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const body = JSON.stringify({
    contents: [
      {
        parts: [{ text: BREED_PROMPT }, { inline_data: { mime_type: mimeType, data: clean } }],
      },
    ],
  });

  for (const model of ANALYZE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        return { ...ANALYZE_FALLBACK, ...(JSON.parse(jsonStr) as Partial<PetAnalysis>) };
      } catch {
        return ANALYZE_FALLBACK;
      }
    } catch {
      // try next model
    }
  }
  return ANALYZE_FALLBACK;
}

/** Card art styles offered by the widget. Keep in sync with the client picker. */
export const CARD_STYLES: Record<string, { label: string; prompt: string }> = {
  renaissance: {
    label: 'Renaissance',
    prompt:
      "Repaint this exact pet as a regal Renaissance oil-painting portrait with dramatic chiaroscuro lighting and an ornate background. Keep the pet's breed, coat colour and markings accurate and recognisable.",
  },
  superhero: {
    label: 'Superhero',
    prompt:
      "Transform this exact pet into a heroic comic-book superhero with a flowing cape and a dynamic pose, bold cel-shaded comic art. Keep the pet's breed, coat colour and markings accurate and recognisable.",
  },
  astronaut: {
    label: 'Astronaut',
    prompt:
      "Depict this exact pet as an astronaut in a detailed white space suit, helmet visor reflecting stars, cinematic sci-fi lighting. Keep the pet's breed, coat colour and markings accurate and recognisable.",
  },
  watercolor: {
    label: 'Watercolour',
    prompt:
      "Render this exact pet as a soft watercolour painting with gentle washes and visible paper texture. Keep the pet's breed, coat colour and markings accurate and recognisable.",
  },
};

export interface PortraitResult {
  dataUrl: string;
  model: string;
  storedUrl?: string;
}

export async function generatePetPortrait(
  base64: string,
  mimeType: string,
  styleKey: string,
): Promise<PortraitResult | null> {
  if (!GEMINI_API_KEY) return null;
  const style = CARD_STYLES[styleKey] || CARD_STYLES.renaissance;
  const clean = base64.replace(/^data:image\/[a-z]+;base64,/, '');

  const parts = [
    { inlineData: { mimeType, data: clean } },
    { text: `Using the reference image above, ${style.prompt}` },
  ];

  for (const model of IMAGE_GEN_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          }),
        },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const responseParts = data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = responseParts.find((p: { inlineData?: { mimeType?: string } }) =>
        p.inlineData?.mimeType?.startsWith('image/'),
      );
      if (!imagePart) continue;

      const outMime: string = imagePart.inlineData.mimeType || 'image/png';
      const outData: string = imagePart.inlineData.data;
      const dataUrl = `data:${outMime};base64,${outData}`;

      // Best-effort archive to Storage; never blocks the response.
      let storedUrl: string | undefined;
      try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (bucketName) {
          const ext = outMime.includes('png') ? 'png' : 'jpg';
          const filename = `pet-cards/${styleKey}_${Date.now()}.${ext}`;
          const file = admin.storage().bucket(bucketName).file(filename);
          await file.save(Buffer.from(outData, 'base64'), {
            metadata: { contentType: outMime, metadata: { source: 'pet-card', style: styleKey } },
          });
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
          });
          storedUrl = url;
        }
      } catch {
        // ignore storage failures — the data URL is what the client needs
      }

      return { dataUrl, model, storedUrl };
    } catch {
      // try next model
    }
  }
  return null;
}
