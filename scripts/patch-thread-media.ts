/**
 * Patch threadMediaMap for posts that have both threads and media.
 *
 * threadMediaMap[i] = array of indices into mediaUrls for tweet i
 *   - i=0 → main tweet
 *   - i=1 → threadTexts[0] (first reply)
 *   - i=2 → threadTexts[1]
 *   - ...
 *
 * Run with: npx tsx scripts/patch-thread-media.ts
 * Use --dry-run to preview without writing
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  console.log('✅ Loaded .env.local');
}

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT env var required');
    process.exit(1);
  }
}

const db = admin.firestore();
const COLLECTION = 'scheduled-posts';

/**
 * threadMediaMap keyed by post scheduledAt ISO string.
 *
 * Each entry maps tweet position → array of mediaUrls indices:
 *   [0] = main tweet
 *   [1] = threadTexts[0]
 *   [2] = threadTexts[1]
 *   ...
 *
 * Media indices reference the post's mediaUrls (or mediaFilePaths) array in order.
 */
const THREAD_MEDIA_MAP: Record<string, number[][]> = {

  // Apr 8, 14:00 — BB-8 Inspiration (W1D1 h14)
  // mediaFiles: [0=video040(Jul24), 1=photo049(Miro board), 2=photo052(research),
  //              3=photo111(Aug22 assembly), 4=photo443(Sep20 key decision)]
  // Main tweet: Jul24 robot video
  // Thread 1 "Jul 24 Miro board": photo049
  // Thread 2 "Jul 22-26 Sphero patent": photo052
  // Thread 3 "Aug-Sep concept validation": photo111 (first assembly photo)
  // Thread 4 "Sep 20 key decision": photo443 (exact date photo)
  '2026-04-08T14:00:00.000Z': [[0], [1], [2], [3], [4]],

  // Apr 9, 15:00 — ESP-32 Ball Concept Validation (W1D2 h15)
  // mediaFiles: [0=video099(Aug22 audio), 1=video076(Jul29 AI), 2=video091(Aug22 RollBot),
  //              3=photo397(Sep17 tolerance), 4=photo447(Sep23 demo ready)]
  // Main tweet: intro (no media)
  // Thread 1 "Aug 22 team + firmware": video091 (RollBot intro)
  // Thread 2 "Aug 22 audio + Sep 4 transcription": video099 + video076
  // Thread 3 "Sep 17 tolerance issues": photo397 (exact date)
  // Thread 4 "Sep 18 demo ready": photo447 (Sep23, closest available)
  '2026-04-09T15:00:00.000Z': [[], [2], [0, 1], [3], [4]],

  // Apr 10, 10:00 — Custom Design Decision (W1D3 h10)
  // mediaFiles: [0=video1233(Dec31 teaser), 1=photo1130(Dec24), 2=photo1131(Dec24),
  //              3=photo472(Oct2 early design), 4=photo1359(Jan28 first 3D model)]
  // Main tweet: Dec31 teaser video
  // Thread 1 "Oct 2025 Ameya designer": photo472 (Oct 2 design phase)
  // Thread 2 "Nov 6 video shoot": no media
  // Thread 3 "Dec iterations, final design": photo1130 + photo1131
  // Thread 4 "Jan 2026 mechanical design + dummy model": photo1359 (first 3D model!)
  '2026-04-10T10:00:00.000Z': [[0], [3], [], [1, 2], [4]],

  // Apr 10, 14:00 — PCB & Electronics Design (W1D3 h14)
  // mediaFiles: [0=photo396(Sep17 PCB), 1=photo410(Sep17 component), 2=normalized_32(PCB showcase),
  //              3=photo393(Sep16 breadboard), 4=photo1424(Feb1 PCB assembly)]
  // Main tweet: PCB showcase video
  // Thread 1 "Sep 16 breadboard → PCB design": photo396
  // Thread 2 "Sep 27 layout done": photo410
  // Thread 3 "Key design decisions": photo393 (Sep16 breadboard stage context)
  // Thread 4 "Jan 23 PCB finalized, Feb 22 display tested": photo1424 (Feb1 assembly)
  '2026-04-10T14:00:00.000Z': [[2], [0], [1], [3], [4]],

  // Apr 12, 10:00 — Open-Source Firmware (W1D5 h10)
  // mediaFiles: [0=normalized_43(firmware flashing), 1=normalized_13(firmware concept),
  //              2=normalized_08(firmware dev)]
  // Main tweet: intro (no media)
  // Thread 1 "Our firmware stack": firmware concept video [1]
  // Thread 2 "SDK challenge + Sep 6 first build": firmware flashing [0]
  // Thread 3 "Feb 2026 fully integrated": firmware dev video [2]
  // Thread 4 "Learned from Pebby": no media
  '2026-04-12T10:00:00.000Z': [[], [1], [0], [2], []],

  // Apr 15, 10:00 — 3D Printing & Iteration (W2D1 h10)
  // mediaFiles: [0=video1458(Feb3 servo), 1=video1475(Feb9 prototype), 2=video1565(Feb25 assembly),
  //              3=photo1359(Jan28 first 3D model), 4=photo1547(Feb22 face stickers)]
  // Main tweet: intro (no media)
  // Thread 1 "Jan 28 dummy model": photo1359 (exact date!)
  // Thread 2 "Feb 3 servo + Feb 9 prototype": video1458 + video1475
  // Thread 3 "Feb 22 face stickers": photo1547 (exact date!)
  // Thread 4 "Feb 24-25 FULL ASSEMBLY": video1565
  '2026-04-15T10:00:00.000Z': [[], [3], [0, 1], [4], [2]],

  // Apr 15, 14:00 — Patent & Design Awards (W2D1 h14)
  // mediaFiles: [0=photo1568(Feb25 assembled product), 1=photo1494(Feb12 patent),
  //              2=photo1505(Feb17 awards)]
  // Main tweet "Feb 11 patent exploded view": photo1568 (show the real product)
  // Thread 1 "Patent filed": photo1494 (Feb 12 patent documentation)
  // Thread 2 "Feb 15-20 design awards strategy": photo1505 (Feb 17 award submissions)
  // Thread 3 "Designer Ameya Mistry's work": no media
  '2026-04-15T14:00:00.000Z': [[0], [1], [2], []],

  // Apr 16, 10:00 — App Launch (W2D2 h10)
  // mediaFiles: [0=photo1554(Feb22 screenshot), 1=photo1555(Feb22 screenshot),
  //              2=iPhone-16-pro-1.png, 3=iPhone-16-pro-2.png, 4=iPhone-16-pro-3.png, 5=iPhone-16-pro-4.png]
  // Main tweet "PawMe app live iOS+Android": iPhone mockups 1+2 as visual hook
  // Thread 1 "What the app does": real app screenshots [0, 1]
  // Thread 2 "WiFi AP, no cloud, encrypted": iPhone mockup 3 (interface shot)
  // Thread 3 "Health dashboard, baselines": iPhone mockup 4 (health/data shot)
  '2026-04-16T10:00:00.000Z': [[2, 3], [0, 1], [4], [5]],

  // Apr 18, 10:00 — ayvalabs.com Launch (W2D4 h10)
  // mediaFiles: [0=normalized_10(mechanical design video), 1=normalized_09(electronics design video),
  //              2=photo1500(Feb13 product/research photo)]
  // Main tweet "ayvalabs.com live, patent docs, schematics": photo1500 (product from launch period)
  // Thread 1 "What's published: PCB, CAD, patent, BOM": mechanical design video [0]
  // Thread 2 "Why build in public: Pebby lesson": electronics design video [1]
  '2026-04-18T10:00:00.000Z': [[2], [0], [1]],

  // Apr 20, 15:00 — Founder Story (W2D6 h15)
  // mediaFiles: [0=video(founder Part 1), 1=video(founder Part 2)]
  // Main tweet: intro (no media)
  // Thread 1 "The team came together": Part 1 [0]
  // Thread 2 "We spent 10 months documenting": Part 2 [1]
  '2026-04-20T15:00:00.000Z': [[], [0], [1]],

  // Apr 23, 10:00 — Firmware Architecture (W3D2 h10)
  // mediaFiles: [0=normalized_07(setup & testing), 1=normalized_37(firmware dev), 2=normalized_29(OpenAI QA)]
  // Main tweet "firmware stack open-source": setup/testing video as visual hook
  // Thread 1 "Layer 1: Drivers": firmware dev video [1]
  // Thread 2 "Layer 2: Real-time core": no media
  // Thread 3 "Layer 3: Sensor integration": no media (wait for sensor fusion post)
  // Thread 4 "Layer 4: Cloud + OpenAI": OpenAI QA video [2]
  // Thread 5 "GitHub, MIT licensed": no media
  '2026-04-23T10:00:00.000Z': [[0], [1], [], [2], [], []],

  // Apr 29, 10:00 — AYVA Token Announcement (W4D1 h10)
  // mediaFiles: [0=video1623(Mar9 demo), 1=video1624(Mar9 demo), 2=video1566(Feb25 robot live)]
  // Main tweet: intro (no media)
  // Thread 1 "$AYVA powers AI health engine": video1623 [0]
  // Thread 2 "Community governance": video1624 [1]
  // Thread 3 "Economic model": robot video1566 [2] — show the real product powering the economy
  // Thread 4 "Price support / deflationary": no media
  '2026-04-29T10:00:00.000Z': [[], [0], [1], [2], []],

  // May 2, 10:00 — Tokenomics Deep Dive (W4D4 h10)
  // mediaFiles: [0=video1664(Mar14 sound engine), 1=video1666(Mar14 eyes/expression)]
  // Main tweet: intro (no media)
  // Thread 1 "Total supply distribution": video1664 [0]
  // Thread 2 "Team vesting": no media
  // Thread 3 "Revenue sharing": no media
  // Thread 4 "Utility + deflationary mechanics": video1666 [1]
  '2026-05-02T10:00:00.000Z': [[], [0], [], [], [1]],
};

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) console.log('🔍 DRY RUN — no writes will happen\n');

  const targets = Object.keys(THREAD_MEDIA_MAP);
  console.log(`📋 Patching threadMediaMap for ${targets.length} posts\n`);

  let patched = 0;
  let skipped = 0;
  let notFound = 0;

  for (const scheduledAt of targets) {
    const snapshot = await db
      .collection(COLLECTION)
      .where('scheduledAt', '==', scheduledAt)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log(`⚠️  Not found: ${scheduledAt}`);
      notFound++;
      continue;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const newMap = THREAD_MEDIA_MAP[scheduledAt];
    const mediaCount = (data.mediaUrls || data.mediaFilePaths || data.mediaFiles || []).length;

    // Validate indices don't exceed media array length
    const allIndices = newMap.flat();
    const invalid = allIndices.filter(i => i >= mediaCount);
    if (invalid.length > 0 && mediaCount > 0) {
      console.log(`⚠️  Index out of bounds for ${scheduledAt}: indices ${invalid.join(',')} but only ${mediaCount} media items`);
    }

    const preview = (data.text || '').substring(0, 60);
    console.log(`✏️  ${scheduledAt}`);
    console.log(`   Post: "${preview}..."`);
    console.log(`   Media count: ${mediaCount}`);
    console.log(`   threadMediaMap: ${JSON.stringify(newMap)}`);

    if (!isDryRun) {
      await doc.ref.update({
        threadMediaMap: JSON.stringify(newMap),
        updatedAt: new Date().toISOString(),
      });
      console.log(`   ✅ Updated\n`);
      patched++;
    } else {
      console.log(`   (dry run — not written)\n`);
      skipped++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Patched: ${patched}`);
  console.log(`   Dry-run skipped: ${skipped}`);
  console.log(`   Not found: ${notFound}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
