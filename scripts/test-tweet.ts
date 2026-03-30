/**
 * Quick test: post a tweet to @pawme_ai then print the URL so you can delete it
 * Run with: npx tsx scripts/test-tweet.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local BEFORE importing x-publisher (which reads env at module load)
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

async function main() {
  // Dynamic import so env vars are set first
  const { postTweet } = await import('../src/lib/x-publisher');

  console.log('🐦 Sending test tweet from @pawme_ai...\n');

  try {
    const result = await postTweet('🐾 PawMe systems check — beep boop! This is a test tweet. 🤖');

    console.log('✅ Tweet posted successfully!');
    console.log(`   Tweet ID: ${result.id}`);
    console.log(`   URL: https://x.com/pawme_ai/status/${result.id}`);
    console.log(`\n🗑️  Delete it at: https://x.com/pawme_ai/status/${result.id}`);
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

main();
