const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_TEXT_ENDPOINTS = [
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
];

const GEMINI_VISION_ENDPOINTS = [
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
];

function cleanGeminiText(text: string) {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function runGeminiRequest(endpoints: string[], body: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  let lastError = 'Unknown Gemini error';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = errorText || `Gemini returned ${response.status}`;
        console.warn('[pawme-gemini] Endpoint failed:', url, lastError.substring(0, 300));
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part?.text || '').join('\n') || '';
      if (text) {
        return text;
      }

      lastError = 'Gemini returned an empty response';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn('[pawme-gemini] Request error:', lastError);
    }
  }

  throw new Error(lastError);
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });

  return runGeminiRequest(GEMINI_TEXT_ENDPOINTS, body);
}

export async function generateGeminiVisionText(
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const cleanBase64 = imageBase64.replace(/^data:.+;base64,/, '');
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
  });

  return runGeminiRequest(GEMINI_VISION_ENDPOINTS, body);
}

export async function generateGeminiJson<T>(
  prompt: string,
  imageBase64?: string,
  mimeType?: string,
): Promise<T> {
  const text = imageBase64
    ? await generateGeminiVisionText(prompt, imageBase64, mimeType)
    : await generateGeminiText(prompt);

  return JSON.parse(cleanGeminiText(text)) as T;
}
