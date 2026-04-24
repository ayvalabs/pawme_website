#!/usr/bin/env node
/**
 * Posts a real image to the /api/mobile/gemini-analyze route on localhost.
 * Mirrors what the mobile app's analyzeBreedWithGemini sends.
 *
 * Usage:
 *   node tools/gemini-test-analyze-route.mjs <path-to-image.jpg>
 *
 *   # Or, with a different base URL:
 *   API_BASE=http://localhost:3000 node tools/gemini-test-analyze-route.mjs ./puppy.jpg
 */
import fs from 'node:fs';
import path from 'node:path';

const imagePath = process.argv[2];
if (!imagePath || !fs.existsSync(imagePath)) {
  console.error('❌ Pass a valid image path: node tools/gemini-test-analyze-route.mjs ./puppy.jpg');
  process.exit(1);
}

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const bytes = fs.readFileSync(imagePath);
const base64 = bytes.toString('base64');

console.log(`POST ${API_BASE}/api/mobile/gemini-analyze`);
console.log(`  image: ${imagePath} (${bytes.length} bytes, ${base64.length} base64 chars)\n`);

const start = Date.now();
try {
  const res = await fetch(`${API_BASE}/api/mobile/gemini-analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `tool-${Math.random().toString(36).slice(2, 10)}`,
    },
    body: JSON.stringify({ imageBase64: base64 }),
  });

  const ms = Date.now() - start;
  console.log(`HTTP ${res.status} in ${ms}ms`);
  console.log(`x-request-id: ${res.headers.get('x-request-id') || '(none)'}`);

  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    console.log('\n--- Response ---');
    console.log(JSON.stringify(parsed, null, 2));

    const breed = parsed?.data?.breed || parsed?.breed;
    const confidence = parsed?.data?.confidence ?? parsed?.confidence;
    if (breed === 'Unknown' && confidence === 0) {
      console.log('\n⚠️  Route returned the fallback. Check the Next.js server');
      console.log('   terminal for [pawme-api] and [pawme-gemini] logs on');
      console.log(`   requestId ${res.headers.get('x-request-id') || '(see above)'}`);
    }
  } catch {
    console.log('\nNon-JSON response:');
    console.log(text.slice(0, 1500));
  }
} catch (err) {
  console.error('❌ fetch threw:', err?.message || err);
  process.exit(1);
}
