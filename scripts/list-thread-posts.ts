/** List all posts that have both threads and media — for mapping threadMediaMap */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.substring(0, eq).trim();
    let v = t.substring(eq + 1).trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('scheduled-posts').orderBy('scheduledAt', 'asc').get();

  console.log('\nPosts with threads AND media:\n');
  snap.docs.forEach(d => {
    const data = d.data();
    const hasThreads = (data.threadTexts?.length || 0) > 0;
    const mediaPaths: string[] = data.mediaFilePaths || data.mediaFiles || [];
    const mediaUrls: string[] = data.mediaUrls || [];
    const mediaTypes: string[] = data.mediaTypes || [];
    const mediaCount = Math.max(mediaPaths.length, mediaUrls.length);
    if (hasThreads && mediaCount > 0) {
      console.log(`scheduledAt: ${data.scheduledAt}`);
      console.log(`  text: "${(data.text || '').substring(0, 80)}"`);
      for (let i = 0; i < mediaCount; i++) {
        const p = mediaPaths[i] ? mediaPaths[i].split('/').pop() : '(no path)';
        const t = mediaTypes[i] || '?';
        const u = mediaUrls[i] ? '✓url' : '✗url';
        console.log(`  [${i}] ${t}  ${u}  ${p}`);
      }
      console.log(`  threadTexts[0..${(data.threadTexts?.length||0)-1}]: ${(data.threadTexts||[]).map((t: string) => '"' + t.substring(0, 40) + '"').join(', ')}`);
      console.log(`  map: ${JSON.stringify(data.threadMediaMap || null)}`);
      console.log('');
    }
  });

  console.log('\nAll posts (scheduledAt + text preview):\n');
  snap.docs.forEach(d => {
    const data = d.data();
    const hasThreads = (data.threadTexts?.length || 0) > 0;
    const mediaCount = (data.mediaUrls?.length || data.mediaFilePaths?.length || data.mediaFiles?.length || 0);
    console.log(`${data.scheduledAt}  t=${hasThreads ? data.threadTexts.length : 0}  m=${mediaCount}  "${(data.text || '').substring(0, 50)}"`);
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
