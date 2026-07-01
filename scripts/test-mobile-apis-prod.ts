/**
 * Production Mobile API Smoke Test
 *
 * Usage:
 *   1. Log into https://www.ayvalabs.com (same Firebase project as the app)
 *   2. Open browser DevTools console and paste the snippet from
 *      scripts/get-firebase-token.js to copy your ID token
 *   3. Set the token as an env var and run:
 *
 *      FIREBASE_ID_TOKEN=eyJ... pnpm tsx scripts/test-mobile-apis-prod.ts
 *
 *   Or pass a petId to test pet-scoped endpoints:
 *      FIREBASE_ID_TOKEN=eyJ... PET_ID=abc123 pnpm tsx scripts/test-mobile-apis-prod.ts
 *
 *   Or test a specific endpoint only:
 *      FIREBASE_ID_TOKEN=eyJ... pnpm tsx scripts/test-mobile-apis-prod.ts --only gemini-chat
 */

import fs from 'fs';
import path from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TOKEN = process.env.FIREBASE_ID_TOKEN || '';
const PET_ID = process.env.PET_ID || '';

// QA assets live in the pawme_app repo, two levels up from this repo
const QA_ASSETS = path.resolve(__dirname, '../../pawme_app/qa_assets');

const ONLY = (() => {
  const idx = process.argv.indexOf('--only');
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

if (!TOKEN) {
  console.error('❌  Set FIREBASE_ID_TOKEN env var.');
  console.error('   Paste the token you copied from the browser console after logging into www.ayvalabs.com');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
};

async function test(name: string, fn: () => Promise<Response>, needsAuth = true) {
  if (ONLY && !name.includes(ONLY)) return;

  try {
    const res = await fn();
    const bodyText = await res.text();
    const body = (() => {
      try {
        return JSON.parse(bodyText);
      } catch {
        return bodyText.slice(0, 500);
      }
    })();

    const ok = res.ok && (body?.success !== false);
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${name} — HTTP ${res.status}`);
    if (!ok) {
      console.log('   Response:', typeof body === 'object' ? JSON.stringify(body, null, 2).slice(0, 400) : body);
    } else if (body?.data) {
      const preview = JSON.stringify(body.data).slice(0, 200);
      console.log('   Preview:', preview + (JSON.stringify(body.data).length > 200 ? '...' : ''));
    }
    if (res.headers.get('x-request-id')) {
      console.log('   x-request-id:', res.headers.get('x-request-id'));
    }
  } catch (e) {
    console.log(`❌ ${name} — ERROR:`, (e as Error).message);
  }
}

function imgToBase64(relPath: string): string {
  const fullPath = path.join(QA_ASSETS, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`QA asset not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath).toString('base64');
}

async function run() {
  console.log('🔥 PawMe Mobile API Production Smoke Test');
  console.log('==========================================');
  console.log(`Base URL: ${API_BASE}`);
  console.log(`PET_ID:   ${PET_ID || '(not set — pet-scoped tests skipped)'}`);
  console.log(`ONLY:     ${ONLY || '(all)'}`);
  console.log();

  // ── Auth-optional (no token needed, but we send one anyway) ──

  await test('GET /api/mobile/shop/products (anonymous query)', () =>
    fetch(`${API_BASE}/api/mobile/shop/products?species=dog&lifeStage=adult&breedSize=medium&limit=3`),
    false);

  await test('GET /api/mobile/shop/products (authed + petId)', () =>
    fetch(`${API_BASE}/api/mobile/shop/products?petId=${PET_ID}&limit=3`, { headers }),
    true);

  await test('GET /api/mobile/shop/redirect?asin=B08N5WRWNW', () =>
    fetch(`${API_BASE}/api/mobile/shop/redirect?asin=B08N5WRWNW`), false);

  await test('POST /api/mobile/food/scan (barcode)', () =>
    fetch(`${API_BASE}/api/mobile/food/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcode: '077000120449',
        petContext: { name: 'Bailey', species: 'dog', breed: 'Labrador', age: '3 years', weight: '28 kg' },
      }),
    }), false);

  // ── Auth-required ──

  await test('POST /api/mobile/gemini-chat', () =>
    fetch(`${API_BASE}/api/mobile/gemini-chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'What food is best for a 2-year-old golden retriever?',
        petContext: PET_ID
          ? null
          : { name: 'Bailey', species: 'dog', breed: 'Golden Retriever', ageYears: 2, weightKg: 28 },
        petId: PET_ID || undefined,
        messages: [{ role: 'user', content: 'What food is best for a 2-year-old golden retriever?' }],
      }),
    }), true);

  await test('POST /api/mobile/gemini-nutrition', () =>
    fetch(`${API_BASE}/api/mobile/gemini-nutrition`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        petContext: PET_ID
          ? null
          : { name: 'Whiskers', species: 'cat', breed: 'Persian', ageYears: 1, weightKg: 4 },
        petId: PET_ID || undefined,
      }),
    }), true);

  await test('POST /api/mobile/gemini-photo-scan (body scan with breed image)', () => {
    const base64 = imgToBase64('breeds/dogs/na/labrador_retriever.png');
    return fetch(`${API_BASE}/api/mobile/gemini-photo-scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64,
        scanType: 'body',
        petId: PET_ID || undefined,
        petContext: PET_ID ? null : { name: 'Bailey', species: 'dog', breed: 'Labrador Retriever', ageYears: 3 },
      }),
    });
  }, true);

  await test('POST /api/mobile/gemini-photo-scan (coat scan with cat image)', () => {
    const base64 = imgToBase64('breeds/cats/na/persian.png');
    return fetch(`${API_BASE}/api/mobile/gemini-photo-scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64,
        scanType: 'coat',
        petId: PET_ID || undefined,
        petContext: PET_ID ? null : { name: 'Whiskers', species: 'cat', breed: 'Persian', ageYears: 2 },
      }),
    });
  }, true);

  await test('POST /api/mobile/food/scan (image — dog safe food)', () => {
    const base64 = imgToBase64('natural_food/dogs/safe/chicken_breast.png');
    return fetch(`${API_BASE}/api/mobile/food/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        petContext: { name: 'Bailey', species: 'dog', breed: 'Labrador', ageYears: 3, weightKg: 28 },
      }),
    });
  }, false);

  await test('POST /api/mobile/gemini-analyze (breed photo)', () => {
    const base64 = imgToBase64('breeds/dogs/na/labrador_retriever.png');
    return fetch(`${API_BASE}/api/mobile/gemini-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });
  }, false);

  await test('POST /api/mobile/gemini-symptoms', () =>
    fetch(`${API_BASE}/api/mobile/gemini-symptoms`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        description: 'My dog has been vomiting and showing lethargy for the past 2 days.',
        petContext: PET_ID
          ? null
          : { name: 'Bailey', species: 'dog', breed: 'Labrador', ageYears: 3, weightKg: 28 },
        petId: PET_ID || undefined,
      }),
    }), true);

  await test('POST /api/mobile/gemini-training', () =>
    fetch(`${API_BASE}/api/mobile/gemini-training`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        goal: 'stop jumping on guests',
        petContext: PET_ID
          ? null
          : { name: 'Bailey', species: 'dog', breed: 'Labrador', ageYears: 3 },
        petId: PET_ID || undefined,
      }),
    }), true);

  await test('POST /api/mobile/gemini-training-plan', () =>
    fetch(`${API_BASE}/api/mobile/gemini-training-plan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        skill: 'loose leash walking',
        petContext: PET_ID
          ? null
          : { name: 'Bailey', species: 'dog', breed: 'Labrador', ageYears: 3 },
        petId: PET_ID || undefined,
      }),
    }), true);

  await test('POST /api/mobile/gemini-training-critique', () => {
    const base64 = imgToBase64('breeds/dogs/na/labrador_retriever.png');
    return fetch(`${API_BASE}/api/mobile/gemini-training-critique`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        skill: 'sit',
        frames: [{ base64, mimeType: 'image/png', label: 'frame-1' }],
        petContext: PET_ID
          ? null
          : { name: 'Bailey', species: 'dog', breed: 'Labrador', ageYears: 3 },
        petId: PET_ID || undefined,
      }),
    });
  }, true);

  await test('POST /api/mobile/gemini-tracker-extract', () => {
    const base64 = imgToBase64('breeds/dogs/na/labrador_retriever.png');
    return fetch(`${API_BASE}/api/mobile/gemini-tracker-extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64,
        petContext: PET_ID
          ? null
          : { name: 'Bailey', species: 'dog', breed: 'Labrador', ageYears: 3 },
        petId: PET_ID || undefined,
      }),
    });
  }, true);

  await test('POST /api/mobile/gemini-record-extract', () => {
    const base64 = imgToBase64('breeds/dogs/na/labrador_retriever.png');
    return fetch(`${API_BASE}/api/mobile/gemini-record-extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64,
        petContext: PET_ID
          ? null
          : { name: 'Bailey', species: 'dog', breed: 'Labrador', ageYears: 3 },
        petId: PET_ID || undefined,
      }),
    });
  }, true);

  // ── Pet-scoped endpoints (require PET_ID) ──

  if (PET_ID) {
    await test('GET /api/mobile/passport/order/list', () =>
      fetch(`${API_BASE}/api/mobile/passport/order/list`, { headers }), true);

    await test('POST /api/mobile/passport/create', () =>
      fetch(`${API_BASE}/api/mobile/passport/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          petId: PET_ID,
          ownerName: 'Test Owner',
          petName: 'Bailey',
        }),
      }), true);

    await test('POST /api/mobile/shop/order/create (physical order)', () =>
      fetch(`${API_BASE}/api/mobile/shop/order/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          petId: PET_ID,
          items: [{ productId: 'test-product-1', quantity: 1 }],
          shippingAddress: {
            name: 'Test User',
            line1: '123 Test St',
            city: 'Test City',
            country: 'US',
            postalCode: '12345',
          },
        }),
      }), true);
  } else {
    console.log('⏭️  Skipping pet-scoped tests (set PET_ID env var to run them)');
  }

  // ── Misc endpoints ──

  await test('POST /api/mobile/contact-us', () =>
    fetch(`${API_BASE}/api/mobile/contact-us`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'This is a test message from the API smoke test script.',
      }),
    }), true);

  await test('GET /api/mobile/nearby-places?lat=40.7128&lng=-74.0060&type=vet', () =>
    fetch(`${API_BASE}/api/mobile/nearby-places?lat=40.7128&lng=-74.0060&type=vet&radius=5000`, { headers }), true);

  console.log();
  console.log('🏁 Smoke test complete.');
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
