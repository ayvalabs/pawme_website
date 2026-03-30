/**
 * Export all seed posts as JSON + Markdown for developer review
 * Run with: npx tsx scripts/export-tweets.ts
 */

// ───────────────────────────────────────────────────────────
// Campaign configuration (copied from seed-posts.ts)
// ───────────────────────────────────────────────────────────
const CAMPAIGN_START = new Date('2026-04-01T00:00:00Z');

function scheduleDate(week: number, day: number, hour: number, minute: number = 0): string {
  const d = new Date(CAMPAIGN_START);
  d.setDate(d.getDate() + (week - 1) * 7 + (day - 1));
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' }) + ' UTC';
}

// Common hashtag sets
const CORE_TAGS = ['PawMe', 'AIpet', 'PetTech', 'RobotCompanion'];
const HARDWARE_TAGS = ['ESP32', 'OpenSource', 'OpenHardware', 'Robotics', 'Maker', 'DIY'];
const LAUNCH_TAGS = ['IAO', 'AYVA', 'VirtualsProtocol', 'Base', 'Web3', 'CryptoLaunch'];
const KICKSTARTER_TAGS = ['Kickstarter', 'Crowdfunding', 'BackUs', 'ComingSoon'];
const BUILD_TAGS = ['BuildInPublic', 'HardwareStartup', 'DeepTech', 'MakerMovement'];

const HANDLES = {
  auki: '@AukiNetwork',
  virtuals: '@virtikiprotocol',
  base: '@base',
  espressif: '@EspressifSystem',
  kickstarter: '@kickstarter',
};

interface SeedPost {
  text: string;
  threadTexts?: string[];
  mediaFiles?: string[];
  mediaTypes?: ('image' | 'video')[];
  threadMediaMap?: number[][];
  videoThumbnailFiles?: string[];
  category: string;
  hashtags: string[];
  mentions: string[];
  campaignWeek: number;
  campaignDay: number;
  scheduledHour: number;
  scheduledMinute?: number;
  platforms: 'x' | 'telegram' | 'both';
  ctaUrl?: string;
}

// ───────────────────────────────────────────────────────────
// All posts (imported inline to avoid firebase dependency)
// ───────────────────────────────────────────────────────────

const posts: SeedPost[] = [

  // ═══════════════════════════════════════════════════════════
  // WEEK 1
  // ═══════════════════════════════════════════════════════════

  {
    text: "There are 1 BILLION+ pets worldwide. By 2030, pets will outnumber children under 5 in most developed nations.\n\nPawMe — the first wheeled AI pet companion robot with open-source hardware, launching on @virtikiprotocol.\n\nTLDR for frens 🧵👇",
    threadTexts: [
      "The opportunity: $200B+ global pet care market. 67% of US households own a pet. Pet spending grows every year.\n\nBut here's the real problem: 63% of pet owners feel guilty leaving their pets alone. Separation anxiety affects 20-40% of dogs.\n\nNo product on the market truly solves this.",
      "PawMe is an AI-powered wheeled robot with a tilting head, LED matrix face, and integrated sensors that keeps your pet company when you're away.\n\nIt rolls, responds, monitors, and learns — built on open-source ESP-32 firmware.\n\nNot a toy. A real companion with real AI.",
      "Core specs:\n• Custom design by industrial designer Ameya Mistry\n• Wheeled base with N20 motors + 18650 battery\n• Tilting servo-controlled head\n• LED matrix face for expression\n• Camera, microphone, speaker (AI voice)\n• 6 integrated sensors: temp, distance, IMU, etc.\n• Wireless charging dock\n• iOS + Android apps live on App Stores",
      "Health + AI on chain:\n• Temperature monitoring detects fever early\n• Behavior pattern AI learns your pet's personality\n• Health prediction engine flags anomalies\n• All powered by $AYVA token on Virtuals Protocol\n• Data stays private, owner-controlled, blockchain-verified\n\nReducing the $35B/year Americans spend on vet care starts with prevention.",
      "Traction:\n• 10 months of documented R&D (Jul 2025 – present)\n• 27 dev videos, 355 build photos\n• Patent filed (Feb 2026)\n• Working prototypes assembled across 3 countries\n• Red Dot Design Award application submitted\n• @AukiNetwork partnership signed\n• Custom manufacturing tooling complete",
      "What's coming:\n• IAO on @virtikiprotocol (May 2026) — $AYVA token launch on @base\n• VIP registration open now at pawmebot.com/vip-upgrade\n• Kickstarter in preparation — VIP members get first access to Proto-One hardware\n• Open-source firmware repo release\n• Token-gated community features\n\nWeb: pawmebot.com",
    ],
    category: 'TLDR',
    hashtags: ['PawMe', 'AIpet', 'VirtualsProtocol', 'Base', 'IAO', 'AYVA', 'DePIN', 'OpenSource', 'ESP32', 'PetTech', 'AIAgent', 'BuildInPublic'],
    mentions: ['@virtikiprotocol', '@AukiNetwork', '@base'],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  {
    text: "Jul 21, 2025 — \"Build a rolling robot like BB-8. Camera, mic, speaker, laser pointer, wireless charger.\"\n\nThat was the brief.\n\nBut we didn't start from renders. We studied the open-source ESP-32 Ball project first as proof of concept.\n\nHere's how we got from inspiration to PawMe 🧵",
    threadTexts: [
      "Jul 24, 2025 — We created a Miro board analyzing every pet robot on the market. LOONA ($2.2M raised). Pebby ($629K scam). Ebo. Furbo. Every crowdfunding pet tech project.\n\nWhat worked? What didn't? What could we learn?",
      "Jul 22-26, 2025 — We studied Sphero's BB-8 patent in detail. The floating head mechanism. The internal drive. The weight distribution.\n\nThen we found Rolling Bot on Kickstarter — a $189 ESP-32 Ball variant. OPEN SOURCE. Schematics, firmware, 3D files all free.\n\nDecision made: understand this first.",
      "Aug-Sep 2025 — Phase 1: Concept Validation\n\nBefore designing PawMe from scratch, we replicated the entire ESP-32 Ball project.\n\nNot just \"looked at code.\" We rebuilt it completely. Filmed every step. Proved the concept worked.\n\nThen we went back to original vision: a custom wheeled robot with tilting head.",
      "Sep 20, 2025 — KEY DECISION: \"We are designing all the mechanical-plastic parts ourselves from scratch.\"\n\nThe ESP-32 Ball was proof of concept. PawMe would be fully custom.\n\nIndustrial designer brought on. CAD from scratch. Custom PCB. Custom firmware. Custom everything.",
    ],
    mediaFiles: [
      '00000040-VIDEO-2025-07-24-13-24-18.mp4',
      '00000049-PHOTO-2025-07-24-19-20-21.jpg',
      '00000052-PHOTO-2025-07-25-20-47-55.jpg',
    ],
    mediaTypes: ['video', 'image', 'image'],
    threadMediaMap: [[0], [1], [2], [], []],
    videoThumbnailFiles: ['thumbnails/thumbnail_00000040.jpg'],
    category: 'Origin Story',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, ...BUILD_TAGS, 'BB8', 'StarWars', 'Inspiration'],
    mentions: [HANDLES.espressif, HANDLES.auki],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 14,
    platforms: 'both',
  },

  {
    text: "We're building PawMe in public.\n\nCustom wheeled robot. Industrial design by Ameya Mistry. Open-source firmware. AI that actually helps pet owners.\n\nEvery week we'll share the real story — 27 dev videos, 355 build photos, the breakthroughs, the failures, the 3AM debugging sessions.\n\nHit follow if you're into hardware + AI 🔔",
    category: 'Community',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS],
    mentions: [],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 20,
    platforms: 'x',
    ctaUrl: 'https://pawmebot.com',
  },
];

// ───────────────────────────────────────────────────────────
// Instead of duplicating all posts, read from seed-posts.ts
// and extract the data. For simplicity, we'll use a different approach:
// parse the actual seed-posts.ts file.
// ───────────────────────────────────────────────────────────

// Actually, let's just import the posts from seed-posts.ts by reading
// the file and extracting the relevant data programmatically.
// But that's complex. Instead, let's use the simplified approach:
// read seed-posts.ts source and output a summary.

import * as fs from 'fs';
import * as path from 'path';

const seedContent = fs.readFileSync(path.resolve(__dirname, 'seed-posts.ts'), 'utf-8');

// Extract posts by parsing the TypeScript AST... too complex.
// Instead, let's just use eval-like approach with the data we already have.
// The simplest reliable approach: use regex to extract key fields.

interface ExportPost {
  postNumber: number;
  scheduledDate: string;
  week: number;
  day: number;
  hour: number;
  category: string;
  platforms: string;
  mainTweet: string;
  threadTweets: string[];
  totalTweets: number;
  mediaFiles: string[];
  mediaTypes: string[];
  threadMediaMap: number[][] | null;
  videoThumbnailFiles: string[];
  hashtags: string[];
  mentions: string[];
  ctaUrl: string | null;
}

// We need to actually evaluate the posts array. The cleanest way is
// to strip the firebase parts and eval the data. Let's do a targeted extraction.

// Find the posts array start and end
const postsStart = seedContent.indexOf('const posts: SeedPost[] = [');
const postsEnd = seedContent.indexOf('];\n\n// ─', postsStart);

if (postsStart === -1 || postsEnd === -1) {
  console.error('Could not find posts array boundaries');
  process.exit(1);
}

// Extract just the posts array content
let postsArrayStr = seedContent.substring(postsStart, postsEnd + 2);

// Replace the type annotation
postsArrayStr = postsArrayStr.replace('const posts: SeedPost[] = ', 'const posts = ');

// Replace spread operators with their values
postsArrayStr = postsArrayStr.replace(/\.\.\.CORE_TAGS/g, `'PawMe', 'AIpet', 'PetTech', 'RobotCompanion'`);
postsArrayStr = postsArrayStr.replace(/\.\.\.HARDWARE_TAGS/g, `'ESP32', 'OpenSource', 'OpenHardware', 'Robotics', 'Maker', 'DIY'`);
postsArrayStr = postsArrayStr.replace(/\.\.\.LAUNCH_TAGS/g, `'IAO', 'AYVA', 'VirtualsProtocol', 'Base', 'Web3', 'CryptoLaunch'`);
postsArrayStr = postsArrayStr.replace(/\.\.\.KICKSTARTER_TAGS/g, `'Kickstarter', 'Crowdfunding', 'BackUs', 'ComingSoon'`);
postsArrayStr = postsArrayStr.replace(/\.\.\.BUILD_TAGS/g, `'BuildInPublic', 'HardwareStartup', 'DeepTech', 'MakerMovement'`);

// Replace HANDLES references
postsArrayStr = postsArrayStr.replace(/HANDLES\.auki/g, `'@AukiNetwork'`);
postsArrayStr = postsArrayStr.replace(/HANDLES\.virtuals/g, `'@virtikiprotocol'`);
postsArrayStr = postsArrayStr.replace(/HANDLES\.base/g, `'@base'`);
postsArrayStr = postsArrayStr.replace(/HANDLES\.espressif/g, `'@EspressifSystem'`);
postsArrayStr = postsArrayStr.replace(/HANDLES\.kickstarter/g, `'@kickstarter'`);

// Remove comments
postsArrayStr = postsArrayStr.replace(/\/\/.*$/gm, '');

// Evaluate it
let parsedPosts: any[];
try {
  parsedPosts = eval('(' + postsArrayStr.replace('const posts = ', '') + ')');
} catch (e) {
  console.error('Failed to parse posts:', e);
  process.exit(1);
}

console.log(`Parsed ${parsedPosts.length} posts\n`);

// Build export data
const exportPosts: ExportPost[] = parsedPosts.map((p: any, i: number) => ({
  postNumber: i + 1,
  scheduledDate: formatDate(scheduleDate(p.campaignWeek, p.campaignDay, p.scheduledHour, p.scheduledMinute)),
  week: p.campaignWeek,
  day: p.campaignDay,
  hour: p.scheduledHour,
  category: p.category,
  platforms: p.platforms,
  mainTweet: p.text,
  threadTweets: p.threadTexts || [],
  totalTweets: 1 + (p.threadTexts?.length || 0),
  mediaFiles: p.mediaFiles || [],
  mediaTypes: p.mediaTypes || [],
  threadMediaMap: p.threadMediaMap || null,
  videoThumbnailFiles: p.videoThumbnailFiles || [],
  hashtags: p.hashtags || [],
  mentions: p.mentions || [],
  ctaUrl: p.ctaUrl || null,
}));

// Write JSON
const jsonPath = path.resolve(__dirname, '..', 'pawme-tweets-export.json');
fs.writeFileSync(jsonPath, JSON.stringify(exportPosts, null, 2));
console.log(`✅ JSON: ${jsonPath}`);

// Write Markdown
let md = `# PawMe Campaign Tweets\n\n`;
md += `**Campaign:** 6 weeks (Apr 1 – May 12, 2026)\n`;
md += `**Total posts:** ${exportPosts.length}\n`;
md += `**Total individual tweets:** ${exportPosts.reduce((s, p) => s + p.totalTweets, 0)}\n`;
md += `**Posts with media:** ${exportPosts.filter(p => p.mediaFiles.length > 0).length}\n`;
md += `**Videos:** ${exportPosts.reduce((s, p) => s + p.mediaTypes.filter(t => t === 'video').length, 0)}\n`;
md += `**Images:** ${exportPosts.reduce((s, p) => s + p.mediaTypes.filter(t => t === 'image').length, 0)}\n\n`;
md += `---\n\n`;

let currentWeek = 0;
for (const p of exportPosts) {
  if (p.week !== currentWeek) {
    currentWeek = p.week;
    md += `## Week ${currentWeek}\n\n`;
  }

  const isThread = p.threadTweets.length > 0;
  md += `### Post #${p.postNumber} — ${p.category}\n`;
  md += `**Scheduled:** ${p.scheduledDate} | **Platform:** ${p.platforms} | **Tweets:** ${p.totalTweets}`;
  if (p.mediaFiles.length > 0) {
    const vids = p.mediaTypes.filter(t => t === 'video').length;
    const imgs = p.mediaTypes.filter(t => t === 'image').length;
    const parts = [];
    if (vids > 0) parts.push(`${vids} video${vids > 1 ? 's' : ''}`);
    if (imgs > 0) parts.push(`${imgs} image${imgs > 1 ? 's' : ''}`);
    md += ` | **Media:** ${parts.join(', ')}`;
  }
  md += `\n\n`;

  // Main tweet
  if (isThread) {
    md += `**🐦 Tweet 1/${p.totalTweets} (Main):**\n`;
  }
  md += `> ${p.mainTweet.split('\n').join('\n> ')}\n\n`;

  // Media for main tweet
  if (p.threadMediaMap && p.threadMediaMap[0]?.length > 0) {
    const mainMedia = p.threadMediaMap[0].map(idx => `\`${p.mediaFiles[idx]}\` (${p.mediaTypes[idx]})`);
    md += `📎 Media: ${mainMedia.join(', ')}\n\n`;
  } else if (!isThread && p.mediaFiles.length > 0) {
    const allMedia = p.mediaFiles.map((f, i) => `\`${f}\` (${p.mediaTypes[i]})`);
    md += `📎 Media: ${allMedia.join(', ')}\n\n`;
  }

  // Thread tweets
  for (let t = 0; t < p.threadTweets.length; t++) {
    md += `**🧵 Tweet ${t + 2}/${p.totalTweets}:**\n`;
    md += `> ${p.threadTweets[t].split('\n').join('\n> ')}\n\n`;

    // Media for this thread tweet
    if (p.threadMediaMap && p.threadMediaMap[t + 1]?.length > 0) {
      const tMedia = p.threadMediaMap[t + 1].map(idx => `\`${p.mediaFiles[idx]}\` (${p.mediaTypes[idx]})`);
      md += `📎 Media: ${tMedia.join(', ')}\n\n`;
    }
  }

  // Hashtags & mentions
  if (p.hashtags.length > 0) {
    md += `**Hashtags:** ${p.hashtags.map(h => `#${h}`).join(' ')}\n`;
  }
  if (p.mentions.length > 0) {
    md += `**Mentions:** ${p.mentions.join(' ')}\n`;
  }
  if (p.ctaUrl) {
    md += `**CTA:** ${p.ctaUrl}\n`;
  }
  md += `\n---\n\n`;
}

const mdPath = path.resolve(__dirname, '..', 'pawme-tweets-export.md');
fs.writeFileSync(mdPath, md);
console.log(`✅ Markdown: ${mdPath}`);

console.log(`\nDone! Files saved to project root.`);
