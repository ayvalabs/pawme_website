#!/usr/bin/env node
/**
 * Sends a real pet image to every configured Gemini vision model and prints
 * exactly what comes back per model. This is the fastest way to see whether
 * the "Unknown breed" fallback is an API-key problem, a model-availability
 * problem, or a prompt/parse problem.
 *
 * Usage:
 *   node tools/gemini-test-vision.mjs <path-to-image.jpg>
 *
 *   # Or just use the repo's bundled pawme-api-test-fixture if present:
 *   node tools/gemini-test-vision.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvLocal();

const KEY = process.env.GEMINI_API_KEY || '';
if (!KEY) {
  console.error('❌ GEMINI_API_KEY not set (checked env + .env.local)');
  process.exit(1);
}

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-pro',
];
const MODELS =
  (process.env.GEMINI_VISION_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
    .length > 0
    ? process.env.GEMINI_VISION_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
    : DEFAULT_MODELS;

const imagePath = process.argv[2] || path.resolve(process.cwd(), '..', 'pawme_app', 'pawme-api-test-fixture-vaccine-card.jpg');

if (!fs.existsSync(imagePath)) {
  console.error(`❌ Image not found: ${imagePath}`);
  console.error('   Pass a path as the first argument, e.g.');
  console.error('   node tools/gemini-test-vision.mjs ~/Downloads/puppy.jpg');
  process.exit(1);
}

const bytes = fs.readFileSync(imagePath);
const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
const base64 = bytes.toString('base64');

console.log(`Image: ${imagePath}`);
console.log(`Size : ${bytes.length} bytes (${base64.length} base64 chars)`);
console.log(`Type : ${mimeType}`);
console.log(`Key  : starts with ${KEY.slice(0, 6)}…`);
console.log(`Models: ${MODELS.join(', ')}`);
console.log('');

const PROMPT = `You are a veterinary AI expert. Analyze this pet photo and respond in JSON ONLY (no markdown fences, no prose), shaped exactly like:
{"breed":"specific breed","type":"dog"|"cat"|"bird"|"rabbit"|"other","color":"...","estimatedAge":"...","gender":"Male or Female","weight":"...","careNotes":"2-3 sentences","confidence":0.0-1.0}`;

for (const model of MODELS) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
  };

  console.log(`\n=== ${model} ===`);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ms = Date.now() - start;
    console.log(`  HTTP ${res.status} (${ms}ms)`);
    const text = await res.text();

    if (!res.ok) {
      console.log(`  ❌ Error body: ${text.slice(0, 600)}`);
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.log(`  ❌ Could not JSON.parse the full response`);
      continue;
    }

    const feedback = parsed.promptFeedback?.blockReason;
    if (feedback) {
      console.log(`  ⚠️  Prompt blocked: ${feedback}`);
    }

    const finish = parsed.candidates?.[0]?.finishReason;
    const modelText = parsed.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('\n') || '';
    console.log(`  finishReason: ${finish || 'n/a'}`);
    if (!modelText) {
      console.log(`  ⚠️  Empty response text (candidates length: ${parsed.candidates?.length || 0})`);
      console.log('  raw candidate:', JSON.stringify(parsed.candidates?.[0]?.content || {}, null, 2).slice(0, 600));
      continue;
    }

    const cleaned = modelText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log(`  text preview: ${cleaned.slice(0, 240)}${cleaned.length > 240 ? '…' : ''}`);
    try {
      const asJson = JSON.parse(cleaned);
      console.log(`  ✅ Parsed JSON → breed="${asJson.breed}" confidence=${asJson.confidence}`);
    } catch {
      console.log(`  ⚠️  Text is not valid JSON — model needs response_mime_type or a stricter prompt.`);
    }
  } catch (err) {
    console.log(`  ❌ fetch threw: ${err?.message || err}`);
  }
}
