/**
 * Generate AI images for scheduled posts that have no media.
 * Uses Gemini 2.0 Flash image generation (REST API).
 *
 * Run with: pnpm generate-ai-media [--dry-run]
 *
 * Requires: GEMINI_API_KEY in .env.local
 * Output:   Saves .jpg files to the studio directory and updates Firestore mediaFilePaths.
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ─── Load .env.local ────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  let currentKey = '';
  let currentValue = '';
  let inValue = false;

  for (const line of envContent.split('\n')) {
    if (inValue) {
      currentValue += '\n' + line;
      if (
        (currentValue.startsWith("'") && line.trimEnd().endsWith("'")) ||
        (currentValue.startsWith('"') && line.trimEnd().endsWith('"'))
      ) {
        const val = currentValue.slice(1, -1);
        if (!process.env[currentKey]) process.env[currentKey] = val;
        inValue = false;
      }
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    if (
      (value.startsWith("'") && !value.endsWith("'")) ||
      (value.startsWith('"') && !value.endsWith('"'))
    ) {
      currentKey = key;
      currentValue = value;
      inValue = true;
      continue;
    }
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  console.log('✅ Loaded .env.local');
}

// ─── Firebase ───────────────────────────────────────────────
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT env var required');
    process.exit(1);
  }
}

const db = admin.firestore();
const COLLECTION = 'scheduled-posts';

// ─── Config ──────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const STUDIO_DIR = '/Users/ashokjaiswal/Google Drive/My Drive/5. Product/History/WhatsApp Chat - Rolling Robot - Pawme/studio';

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Image prompt builder ────────────────────────────────────
function buildPrompt(category: string, text: string): string {
  const base =
    'Photorealistic tech product photo. PawMe is a small white spherical rolling robot companion for pets. ' +
    'It has a tilting head with glowing blue LED eyes and sits on a smooth white ball base with soft orange tires. ' +
    'Clean studio or home environment, soft lighting, no text or watermarks. Aspect ratio 4:3. ';

  const categoryHints: Record<string, string> = {
    'Market Vision':
      'Show the PawMe robot in a modern living room next to a happy dog, conveying companionship and smart home vibes.',
    'Market Segment':
      'Infographic-style flat design showing pet market growth icons (paw, chart, dollar), minimalist, brand colors white and orange.',
    'Thought Leadership':
      'PawMe robot on a desk with a glowing holographic data visualization of pet health metrics floating around it.',
    'Token Tease':
      'PawMe robot surrounded by subtle glowing blockchain/crypto visual elements and the Virtuals Protocol logo on a dark background.',
    'Post Launch':
      'Celebration scene: PawMe robot with confetti, launch rocket, and community icons.',
    'Closing':
      'Heartwarming final scene: PawMe robot sitting next to a sleeping pet cat, warm golden light.',
  };

  const hint = categoryHints[category] ||
    'PawMe robot in an engaging scene that illustrates: ' + text.substring(0, 120);

  return base + hint;
}

// ─── Gemini image generation ─────────────────────────────────
async function generateImage(prompt: string): Promise<Buffer> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText.substring(0, 300)}`);
  }

  const json = (await response.json()) as any;
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) {
    throw new Error(`No image in Gemini response: ${JSON.stringify(json).substring(0, 300)}`);
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(STUDIO_DIR)) {
    console.error(`❌ Studio directory not found: ${STUDIO_DIR}`);
    process.exit(1);
  }

  console.log(`\n🔍 Querying Firestore for posts without media...\n`);

  const snapshot = await db
    .collection(COLLECTION)
    .orderBy('scheduledAt')
    .get();

  const noMediaDocs = snapshot.docs.filter((doc) => {
    const data = doc.data();
    const hasPaths = data.mediaFilePaths && data.mediaFilePaths.length > 0;
    const hasUrls = data.mediaUrls && data.mediaUrls.length > 0;
    // Only target Apr 1–28 2026 posts
    const inCampaign =
      data.scheduledAt >= '2026-04-01' && data.scheduledAt <= '2026-04-28T23:59:59Z';
    return !hasPaths && !hasUrls && inCampaign;
  });

  console.log(`Found ${noMediaDocs.length} posts without media.\n`);

  if (noMediaDocs.length === 0) {
    console.log('✅ All posts already have media. Nothing to generate.');
    process.exit(0);
  }

  let generated = 0;
  let skipped = 0;

  for (const doc of noMediaDocs) {
    const data = doc.data();
    const dateSlug = data.scheduledAt.substring(0, 16).replace('T', '_').replace(':', 'h');
    const filename = `ai_generated_${dateSlug}.jpg`;
    const outputPath = path.join(STUDIO_DIR, filename);

    console.log(`🎨 [${data.scheduledAt.substring(0, 16)}] ${data.category}`);
    console.log(`   Text: "${String(data.text).substring(0, 80)}..."`);
    console.log(`   → ${filename}`);

    if (DRY_RUN) {
      console.log(`   ⏭  DRY RUN — skipping generation\n`);
      skipped++;
      continue;
    }

    if (fs.existsSync(outputPath)) {
      console.log(`   ⏭  Already exists, skipping generation`);
    } else {
      try {
        const prompt = buildPrompt(data.category, data.text);
        const imageBuffer = await generateImage(prompt);
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`   ✅ Saved (${Math.round(imageBuffer.length / 1024)} KB)`);
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err: any) {
        console.error(`   ❌ Generation failed: ${err.message}`);
        skipped++;
        continue;
      }
    }

    // Update Firestore with the new mediaFilePath
    await doc.ref.update({
      mediaFilePaths: [filename],
      mediaTypes: ['image'],
    });
    console.log(`   📝 Firestore updated\n`);
    generated++;
  }

  console.log(`\n🎉 Done!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`\n⚡ Next: pnpm seed-posts --force → pnpm upload-media → pnpm patch-thread-media`);

  process.exit(0);
}

main().catch((err) => {
  console.error('generate-ai-media failed:', err);
  process.exit(1);
});
