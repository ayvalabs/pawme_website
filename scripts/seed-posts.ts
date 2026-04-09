/**
 * Seed script: Pre-compose all scheduled posts for PawMe IAO campaign
 * Run with: pnpm seed-posts [--force]
 *
 * Campaign: April 1–28, 2026 | 2 posts/day at 09:00 and 18:00 HKT
 * IAO: April 28, 2026 on Virtuals Protocol ($AYVA token)
 * Total: 60 posts across market_vision, build_in_public, product_showcase, token_tease types
 *
 * Media IDs from Virtuals team mapped to existing studio videos and WhatsApp photos.
 * ~22 no-media posts to be filled by Gemini image generation (pnpm generate-ai-media).
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local (Next.js doesn't load it for standalone scripts)
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

    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  console.log('✅ Loaded .env.local');
}

// Initialize Firebase
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error('FIREBASE_SERVICE_ACCOUNT env var required');
    process.exit(1);
  }
}

const db = admin.firestore();
const COLLECTION = 'scheduled-posts';

// ───────────────────────────────────────────────────────────
// Scheduling helper — all times in HKT (UTC+8)
// ───────────────────────────────────────────────────────────
function at(date: string, hour: number, minute = 0): string {
  return new Date(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`
  ).toISOString();
}

// Common hashtag sets
const MARKET_TAGS = ['PawMe', 'PetTech', 'PetEconomy', 'AIpet'];
const BUILD_TAGS  = ['BuildInPublic', 'HardwareStartup', 'Robotics', 'PawMe'];
const TOKEN_TAGS  = ['AYVA', 'VirtualsIAO', 'Virtuals', 'PawMe', 'Base'];
const RECAP_TAGS  = ['PawMe', 'BuildInPublic', 'AYVA', 'VirtualsIAO'];
const LAUNCH_TAGS = ['VirtualsIAO', 'PawMe', 'AYVA', 'Virtuals', 'Base'];

// ───────────────────────────────────────────────────────────
// Post data
// ───────────────────────────────────────────────────────────

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
  scheduledAt: string;
  platforms: 'x' | 'telegram' | 'both';
  ctaUrl?: string;
}

const posts: SeedPost[] = [

  // ═══════════════════════════════════════════════════════════
  // WEEK 1: Apr 1–7 | Market Vision, Build in Public, Market Segments
  // ═══════════════════════════════════════════════════════════

  // Apr 1 09:00 — Market Vision (2-tweet thread)
  {
    text: "By 2030 there will be 1.3 billion pets worldwide.\n\nThe global pet economy is heading toward $500 billion.\n\nYet millions of pets suffer from separation anxiety and undetected health issues when we're at work.\n\nWe built PawMe — the first autonomous AI robot companion that follows, monitors health, and reduces anxiety. 🧵 #PawMe #VirtualsIAO",
    threadTexts: [
      "Pet tech alone is projected to reach $17–26 billion by 2030.\n\nPawMe sits at the intersection of health monitoring, entertainment, and actionable data insights.\n\nReal hardware prototypes. Real revenue potential on @virtuals_io.",
    ],
    mediaFiles: [
      '00001359-PHOTO-2026-01-28-00-30-09.jpg',
      'normalized_06 - 5 2   Running.mp4',
    ],
    mediaTypes: ['image', 'video'],
    threadMediaMap: [[0], [1]],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_06.jpg'],
    category: 'Market Vision',
    hashtags: [...MARKET_TAGS, 'VirtualsIAO', 'RobotCompanion'],
    mentions: ['@virtuals_io'],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 9,
    scheduledAt: at('2026-04-01', 9),
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 1 18:00 — Build in Public
  {
    text: "8 months ago this was just an idea and a few sketches.\n\nToday we have 10 fully functional rolling prototypes.\n\nHere's one of our very first 3D-printed heads. The journey from concept to reality starts here. #BuildInPublic",
    mediaFiles: ['normalized_14 - components and 3d parts.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_14.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'MakerMovement', 'OpenHardware'],
    mentions: [],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 18,
    scheduledAt: at('2026-04-01', 18),
    platforms: 'both',
  },

  // Apr 2 09:00 — Market Segment (no media — Gemini gen pending)
  {
    text: "Pet food market alone will reach ~$145 billion by 2030.\n\nBut smarter feeding needs real activity and stress data.\n\nPawMe tracks your pet 24/7 and helps owners make better nutrition decisions while reducing waste.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'PetFood', 'PetHealth'],
    mentions: [],
    campaignWeek: 1, campaignDay: 2, scheduledHour: 9,
    scheduledAt: at('2026-04-02', 9),
    platforms: 'both',
  },

  // Apr 2 18:00 — Product Showcase
  {
    text: "PawMe in action: autonomous room-to-room tracking, expressive LED eyes that show emotion, two-way audio, laser play, night vision, and real-time health alerts.\n\n10 working units already built and pet-tested.",
    mediaFiles: ['normalized_23 - testing robot.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_23.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'RobotCompanion', 'PetTech', 'SmartHome'],
    mentions: [],
    campaignWeek: 1, campaignDay: 2, scheduledHour: 18,
    scheduledAt: at('2026-04-02', 18),
    platforms: 'both',
  },

  // Apr 3 09:00 — Thought Leadership (no media)
  {
    text: "Veterinary care and pet health services are among the fastest growing segments in the $500B pet economy by 2030.\n\nMost issues are caught too late.\n\nPawMe's AI vision learns your pet's normal behavior and flags anomalies early — potentially cutting vet costs dramatically.",
    category: 'Thought Leadership',
    hashtags: [...MARKET_TAGS, 'VetCare', 'PetHealth', 'AIHealth'],
    mentions: [],
    campaignWeek: 1, campaignDay: 3, scheduledHour: 9,
    scheduledAt: at('2026-04-03', 9),
    platforms: 'both',
  },

  // Apr 3 18:00 — Build in Public (PCB/wheel)
  {
    text: "Custom PCB design with ESP32-S3, motor drivers, sensors, and power management — all from scratch.\n\nEvery mechanical part designed and iterated in-house.\n\nHere's a close-up of the wheel assembly that gives PawMe smooth, pet-safe movement.",
    mediaFiles: ['normalized_32 - showcase of components pcb.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_32.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'ESP32', 'PCBDesign', 'OpenHardware'],
    mentions: [],
    campaignWeek: 1, campaignDay: 3, scheduledHour: 18,
    scheduledAt: at('2026-04-03', 18),
    platforms: 'both',
  },

  // Apr 4 09:00 — Market Segment (no media)
  {
    text: "Pet insurance is exploding toward $24–30 billion globally by 2030.\n\nEarly detection means fewer claims and lower premiums.\n\nPawMe provides continuous health monitoring that can feed directly into smarter insurance models.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'PetInsurance', 'InsurTech', 'PetHealth'],
    mentions: [],
    campaignWeek: 1, campaignDay: 4, scheduledHour: 9,
    scheduledAt: at('2026-04-04', 9),
    platforms: 'both',
  },

  // Apr 4 18:00 — Product Showcase (docking)
  {
    text: "Docking station keeps PawMe charged and ready 24/7.\n\nAuto-return capability + clean industrial design.\n\nBuilt to live seamlessly in your home like a real family member.",
    mediaFiles: ['normalized_27 - robot power up.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_27.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'SmartHome', 'PetTech', 'RobotCompanion'],
    mentions: [],
    campaignWeek: 1, campaignDay: 4, scheduledHour: 18,
    scheduledAt: at('2026-04-04', 18),
    platforms: 'both',
  },

  // Apr 5 09:00 — Thought Leadership (no media)
  {
    text: "Why pet health data matters in robotics.\n\nAnonymous aggregated insights from thousands of PawMe units can help vets, researchers, and brands improve care at scale.\n\nToken holders will share in this network revenue via buybacks and burns on Virtuals.",
    category: 'Thought Leadership',
    hashtags: [...TOKEN_TAGS, 'PetHealth', 'DataDriven', 'AIagent'],
    mentions: ['@virtuals_io'],
    campaignWeek: 1, campaignDay: 5, scheduledHour: 9,
    scheduledAt: at('2026-04-05', 9),
    platforms: 'both',
  },

  // Apr 5 18:00 — Build in Public (size test)
  {
    text: "Size testing complete.\n\nPawMe is compact enough for any home but sturdy enough for daily play.\n\nReal-world validation with shoe and hand for scale.",
    mediaFiles: ['00001547-PHOTO-2026-02-22-15-30-19.jpg'],
    mediaTypes: ['image'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'IndustrialDesign', 'Prototype'],
    mentions: [],
    campaignWeek: 1, campaignDay: 5, scheduledHour: 18,
    scheduledAt: at('2026-04-05', 18),
    platforms: 'both',
  },

  // Apr 6 09:00 — Weekly Recap W1
  {
    text: "Week 1 Recap 🔥\n• 2030 pet economy vision ($500B, 1.3B pets)\n• First build story\n• Market segments (food, vet, insurance)\n• Product highlights\n\nMomentum building toward $AYVA IAO on Virtuals. More coming daily. #PawMe",
    mediaFiles: ['normalized_01 - 6 1   Final Video Cut.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_01.jpg'],
    category: 'Weekly Recap',
    hashtags: [...RECAP_TAGS, 'PetTech', 'AIpet'],
    mentions: ['@virtuals_io'],
    campaignWeek: 1, campaignDay: 6, scheduledHour: 9,
    scheduledAt: at('2026-04-06', 9),
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 6 18:00 — Token Tease (no media)
  {
    text: "Soon $AYVA will launch on @virtuals_io.\n\nNot just hardware — a community-owned AI agent that earns real revenue from premium features and anonymized health insights.\n\nEarly supporters get priority on the upcoming Kickstarter too.",
    category: 'Token Tease',
    hashtags: [...TOKEN_TAGS, 'AIagent', 'Web3', 'Kickstarter'],
    mentions: ['@virtuals_io'],
    campaignWeek: 1, campaignDay: 6, scheduledHour: 18,
    scheduledAt: at('2026-04-06', 18),
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 7 09:00 — Market Segment (no media)
  {
    text: "By 2030 pet insurance could hit $24–30B globally.\n\nPawMe's continuous monitoring provides data that helps insurers offer better plans and lower premiums for responsible pet parents.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'PetInsurance', 'PetHealth', 'InsurTech'],
    mentions: [],
    campaignWeek: 1, campaignDay: 7, scheduledHour: 9,
    scheduledAt: at('2026-04-07', 9),
    platforms: 'both',
  },

  // Apr 7 18:00 — Build in Public (firmware)
  {
    text: "Open-source firmware is a core part of PawMe.\n\nWe want the community to improve it, add features, and make it even better for all pets.\n\nGitHub repo coming soon — contributions welcome!",
    mediaFiles: ['normalized_43 - Firmware flashing.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_43.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'OpenSource', 'ESP32', 'Firmware', 'GitHub'],
    mentions: [],
    campaignWeek: 1, campaignDay: 7, scheduledHour: 18,
    scheduledAt: at('2026-04-07', 18),
    platforms: 'both',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 2: Apr 8–14 | Product Features, Market Segments, Token
  // ═══════════════════════════════════════════════════════════

  // Apr 8 09:00 — Product Showcase (LED eyes)
  {
    text: "Expressive LED eyes are more than cute — they communicate emotions and status to your pet and you.\n\nHappy, curious, alert, or low battery — PawMe speaks visually.",
    mediaFiles: ['normalized_30 - open ai qa feature live.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_30.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'RobotCompanion', 'LEDeyes', 'PetTech'],
    mentions: [],
    campaignWeek: 2, campaignDay: 1, scheduledHour: 9,
    scheduledAt: at('2026-04-08', 9),
    platforms: 'both',
  },

  // Apr 8 18:00 — Thought Leadership (embodied AI)
  {
    text: "Robotics + AI is transforming pet care.\n\nPawMe is embodied AI — not just software, but a physical companion that lives with your pet every day.",
    mediaFiles: ['normalized_36 - intro.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_36.jpg'],
    category: 'Thought Leadership',
    hashtags: ['PawMe', 'EmbodiedAI', 'Robotics', 'AIpet', 'PetTech'],
    mentions: [],
    campaignWeek: 2, campaignDay: 1, scheduledHour: 18,
    scheduledAt: at('2026-04-08', 18),
    platforms: 'both',
  },

  // Apr 9 09:00 — Build in Public (laser play)
  {
    text: "Laser play module built and tested.\n\nKeeps pets entertained while we're away — reducing boredom and anxiety.",
    mediaFiles: ['normalized_05 - 5 3   open ai qa test and toggling.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_05.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'LaserPlay', 'PetEntertainment'],
    mentions: [],
    campaignWeek: 2, campaignDay: 2, scheduledHour: 9,
    scheduledAt: at('2026-04-09', 9),
    platforms: 'both',
  },

  // Apr 9 18:00 — Market Segment (no media)
  {
    text: "Vet costs are one of the biggest pain points for pet owners.\n\nPawMe aims to cut unnecessary visits through early detection and daily health insights.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'VetCare', 'PetHealth', 'EarlyDetection'],
    mentions: [],
    campaignWeek: 2, campaignDay: 2, scheduledHour: 18,
    scheduledAt: at('2026-04-09', 18),
    platforms: 'both',
  },

  // Apr 10 09:00 — Product Showcase (audio)
  {
    text: "Two-way audio lets you talk to your pet and hear them in real time — from anywhere in the world.",
    mediaFiles: ['normalized_31 - speaker.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_31.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'TwoWayAudio', 'PetTech', 'SmartHome'],
    mentions: [],
    campaignWeek: 2, campaignDay: 3, scheduledHour: 9,
    scheduledAt: at('2026-04-10', 9),
    platforms: 'both',
  },

  // Apr 10 18:00 — Token Tease (no media)
  {
    text: "$AYVA token holders will share in revenue from premium AI features and anonymized pet health data sales.\n\nReal utility. Real flywheel.",
    category: 'Token Tease',
    hashtags: [...TOKEN_TAGS, 'TokenUtility', 'Web3', 'AIagent'],
    mentions: ['@virtuals_io'],
    campaignWeek: 2, campaignDay: 3, scheduledHour: 18,
    scheduledAt: at('2026-04-10', 18),
    platforms: 'both',
  },

  // Apr 11 09:00 — Weekly Recap W2
  {
    text: "Week 2 Recap 🔥\n• Deep dives into pet food, insurance & vet segments\n• Wheel & docking hardware details\n• Expressive eyes & audio features\n\nBuilding toward $AYVA IAO. Stay tuned!",
    mediaFiles: ['normalized_09 - 3 2   Electronics design.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_09.jpg'],
    category: 'Weekly Recap',
    hashtags: [...RECAP_TAGS, 'PetTech'],
    mentions: ['@virtuals_io'],
    campaignWeek: 2, campaignDay: 4, scheduledHour: 9,
    scheduledAt: at('2026-04-11', 9),
    platforms: 'both',
  },

  // Apr 11 18:00 — Build in Public (night vision)
  {
    text: "Night vision tested — PawMe keeps watching even in complete darkness.",
    mediaFiles: ['normalized_22 - testing.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_22.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'NightVision', 'ComputerVision', 'PetSafety'],
    mentions: [],
    campaignWeek: 2, campaignDay: 4, scheduledHour: 18,
    scheduledAt: at('2026-04-11', 18),
    platforms: 'both',
  },

  // Apr 12 09:00 — Thought Leadership (no media)
  {
    text: "Open-source firmware means developers worldwide can add new features, integrations, and improvements for PawMe.\n\nTrue community-driven robotics.",
    category: 'Thought Leadership',
    hashtags: [...BUILD_TAGS, 'OpenSource', 'CommunityDriven', 'Firmware'],
    mentions: [],
    campaignWeek: 2, campaignDay: 5, scheduledHour: 9,
    scheduledAt: at('2026-04-12', 9),
    platforms: 'both',
  },

  // Apr 12 18:00 — Product Showcase (health detection)
  {
    text: "Health anomaly detection is live in testing.\n\nPawMe learns your pet's baseline and alerts you to changes early.",
    mediaFiles: ['normalized_29 - open ai qa.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_29.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'PetHealth', 'AIHealth', 'EarlyDetection'],
    mentions: [],
    campaignWeek: 2, campaignDay: 5, scheduledHour: 18,
    scheduledAt: at('2026-04-12', 18),
    platforms: 'both',
  },

  // Apr 13 09:00 — Market Segment (no media)
  {
    text: "With 1.3B pets by 2030, the demand for smart companionship is massive.\n\nPawMe turns passive cameras into active, intelligent companions.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'SmartCompanion', 'ComputerVision'],
    mentions: [],
    campaignWeek: 2, campaignDay: 6, scheduledHour: 9,
    scheduledAt: at('2026-04-13', 9),
    platforms: 'both',
  },

  // Apr 13 18:00 — Build in Public (painted prototypes)
  {
    text: "Final painted prototypes look clean and home-friendly.\n\nIndustrial design by Ameya Mistry — ready for real living rooms.",
    mediaFiles: ['00001547-PHOTO-2026-02-22-15-30-19.jpg'],
    mediaTypes: ['image'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'IndustrialDesign', 'Prototype', 'ProductDesign'],
    mentions: [],
    campaignWeek: 2, campaignDay: 6, scheduledHour: 18,
    scheduledAt: at('2026-04-13', 18),
    platforms: 'both',
  },

  // Apr 14 09:00 — Token Tease (no media)
  {
    text: "Token holders get early access and discounts on the May Kickstarter.\n\nBe part of the community that brings PawMe to thousands of homes.",
    category: 'Token Tease',
    hashtags: [...TOKEN_TAGS, 'Kickstarter', 'Crowdfunding', 'EarlyAccess'],
    mentions: ['@virtuals_io'],
    campaignWeek: 2, campaignDay: 7, scheduledHour: 9,
    scheduledAt: at('2026-04-14', 9),
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 14 18:00 — Product Showcase (360 movement)
  {
    text: "360° smooth movement with soft orange tires — safe around pets and furniture.",
    mediaFiles: ['normalized_21 - toggling back.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_21.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'RobotMovement', 'PetSafety', 'PetTech'],
    mentions: [],
    campaignWeek: 2, campaignDay: 7, scheduledHour: 18,
    scheduledAt: at('2026-04-14', 18),
    platforms: 'both',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 3: Apr 15–21 | Embodied AI, Health, Token Utility
  // ═══════════════════════════════════════════════════════════

  // Apr 15 09:00 — Thought Leadership (no media)
  {
    text: "The future of pet care is proactive, not reactive.\n\nPawMe + on-chain AI agents = continuous care with shared economic upside.",
    category: 'Thought Leadership',
    hashtags: ['PawMe', 'EmbodiedAI', 'AIagent', 'Virtuals', 'PetHealth'],
    mentions: ['@virtuals_io'],
    campaignWeek: 3, campaignDay: 1, scheduledHour: 9,
    scheduledAt: at('2026-04-15', 9),
    platforms: 'both',
  },

  // Apr 15 18:00 — Weekly Recap W3
  {
    text: "Week 3 Recap 🔥\n• Open-source & firmware focus\n• Health detection & night vision\n• Token holder perks\n\nOnly 2 weeks until $AYVA IAO. The build is real.",
    mediaFiles: ['00001359-PHOTO-2026-01-28-00-30-09.jpg'],
    mediaTypes: ['image'],
    category: 'Weekly Recap',
    hashtags: [...RECAP_TAGS, 'BuildInPublic'],
    mentions: ['@virtuals_io'],
    campaignWeek: 3, campaignDay: 1, scheduledHour: 18,
    scheduledAt: at('2026-04-15', 18),
    platforms: 'both',
  },

  // Apr 16 09:00 — Market Segment (no media)
  {
    text: "Premium pet products are booming.\n\nPawMe is the premium companion hardware that pairs perfectly with premium food, insurance, and care.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'PremiumPets', 'PetLifestyle'],
    mentions: [],
    campaignWeek: 3, campaignDay: 2, scheduledHour: 9,
    scheduledAt: at('2026-04-16', 9),
    platforms: 'both',
  },

  // Apr 16 18:00 — Build in Public (handheld)
  {
    text: "Handheld size check — PawMe is lightweight and easy to move around the house.",
    mediaFiles: ['normalized_08 - 3 1   Firmware dev.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_08.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'Prototype', 'IndustrialDesign'],
    mentions: [],
    campaignWeek: 3, campaignDay: 2, scheduledHour: 18,
    scheduledAt: at('2026-04-16', 18),
    platforms: 'both',
  },

  // Apr 17 09:00 — Product Showcase (multimodal AI)
  {
    text: "Multimodal AI: sees, hears, speaks, and moves — all in one compact robot.",
    mediaFiles: ['normalized_05 - 5 3   open ai qa test and toggling.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_05.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'MultimodalAI', 'AIpet', 'Robotics', 'PetTech'],
    mentions: [],
    campaignWeek: 3, campaignDay: 3, scheduledHour: 9,
    scheduledAt: at('2026-04-17', 9),
    platforms: 'both',
  },

  // Apr 17 18:00 — Token Tease (no media)
  {
    text: "Launching on Virtuals means PawMe becomes part of the agent economy — earning and sharing value autonomously.",
    category: 'Token Tease',
    hashtags: [...TOKEN_TAGS, 'AIagent', 'AgentEconomy', 'Web3'],
    mentions: ['@virtuals_io'],
    campaignWeek: 3, campaignDay: 3, scheduledHour: 18,
    scheduledAt: at('2026-04-17', 18),
    platforms: 'both',
  },

  // Apr 18 09:00 — Thought Leadership (embodied AI)
  {
    text: "Embodied AI is the next frontier.\n\nSoftware agents are great, but physical robots like PawMe live with your pet every day.",
    mediaFiles: ['normalized_36 - intro.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_36.jpg'],
    category: 'Thought Leadership',
    hashtags: ['PawMe', 'EmbodiedAI', 'PhysicalAI', 'Robotics', 'AIagent'],
    mentions: [],
    campaignWeek: 3, campaignDay: 4, scheduledHour: 9,
    scheduledAt: at('2026-04-18', 9),
    platforms: 'both',
  },

  // Apr 18 18:00 — Build in Public (final black accents)
  {
    text: "All prototypes now have the final black accents and polished look.",
    mediaFiles: ['normalized_35 - mechanical assembly 1.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_35.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'IndustrialDesign', 'Prototype', 'ProductDesign'],
    mentions: [],
    campaignWeek: 3, campaignDay: 4, scheduledHour: 18,
    scheduledAt: at('2026-04-18', 18),
    platforms: 'both',
  },

  // Apr 19 09:00 — Market Segment (no media)
  {
    text: "1.3 billion pets by 2030 means huge demand for companionship tech.\n\nPawMe is ready to scale with the market.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'PetCompanion', 'PetLifestyle'],
    mentions: [],
    campaignWeek: 3, campaignDay: 5, scheduledHour: 9,
    scheduledAt: at('2026-04-19', 9),
    platforms: 'both',
  },

  // Apr 19 18:00 — Product Showcase (app control)
  {
    text: "App control from anywhere — live view, commands, alerts, all in one place.",
    mediaFiles: ['normalized_24 - settings.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_24.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'PetApp', 'SmartHome', 'PetTech'],
    mentions: [],
    campaignWeek: 3, campaignDay: 5, scheduledHour: 18,
    scheduledAt: at('2026-04-19', 18),
    platforms: 'both',
  },

  // Apr 20 09:00 — Weekly Recap W4
  {
    text: "Week 4 Recap 🔥\n• Open-source push\n• Health & insurance angles\n• Final prototype polish\n\nOne week until IAO. The hardware is ready.",
    mediaFiles: ['normalized_02 - Manufacturing and Assembly.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_02.jpg'],
    category: 'Weekly Recap',
    hashtags: [...RECAP_TAGS, 'Manufacturing'],
    mentions: ['@virtuals_io'],
    campaignWeek: 3, campaignDay: 6, scheduledHour: 9,
    scheduledAt: at('2026-04-20', 9),
    platforms: 'both',
  },

  // Apr 20 18:00 — Token Tease (no media)
  {
    text: "Fair launch on Virtuals — no pre-mine, bonding curve, community first.\n\nThis is how real projects should launch.",
    category: 'Token Tease',
    hashtags: [...TOKEN_TAGS, 'FairLaunch', 'BondingCurve', 'CryptoLaunch'],
    mentions: ['@virtuals_io'],
    campaignWeek: 3, campaignDay: 6, scheduledHour: 18,
    scheduledAt: at('2026-04-20', 18),
    platforms: 'both',
  },

  // Apr 21 09:00 — Thought Leadership (no media)
  {
    text: "Data privacy first — all health insights are anonymized before any aggregation.",
    category: 'Thought Leadership',
    hashtags: ['PawMe', 'DataPrivacy', 'PetHealth', 'AIpet', 'ResponsibleAI'],
    mentions: [],
    campaignWeek: 3, campaignDay: 7, scheduledHour: 9,
    scheduledAt: at('2026-04-21', 9),
    platforms: 'both',
  },

  // Apr 21 18:00 — Build in Public (quality check)
  {
    text: "Final quality checks on all 10 units complete.\n\nReady for the next phase.",
    mediaFiles: ['normalized_44 - speaker.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_44.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'QualityControl', 'Manufacturing'],
    mentions: [],
    campaignWeek: 3, campaignDay: 7, scheduledHour: 18,
    scheduledAt: at('2026-04-21', 18),
    platforms: 'both',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 4: Apr 22–27 | Final Push + IAO Countdown
  // ═══════════════════════════════════════════════════════════

  // Apr 22 09:00 — Product Showcase (anxiety reduction)
  {
    text: "PawMe reduces anxiety through consistent companionship and play — even when you're away.",
    mediaFiles: ['normalized_06 - 5 2   Running.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_06.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'PetAnxiety', 'PetWellness', 'PetTech'],
    mentions: [],
    campaignWeek: 4, campaignDay: 1, scheduledHour: 9,
    scheduledAt: at('2026-04-22', 9),
    platforms: 'both',
  },

  // Apr 22 18:00 — Market Segment (no media)
  {
    text: "The $500B pet economy by 2030 needs innovative hardware like PawMe to keep growing sustainably.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'PetEconomy', 'HardwareTech'],
    mentions: [],
    campaignWeek: 4, campaignDay: 1, scheduledHour: 18,
    scheduledAt: at('2026-04-22', 18),
    platforms: 'both',
  },

  // Apr 23 09:00 — Token Tease (no media)
  {
    text: "Revenue share for $AYVA holders from day one via Virtuals Agent Commerce Protocol.",
    category: 'Token Tease',
    hashtags: [...TOKEN_TAGS, 'RevenueShare', 'AgentEconomy', 'Web3'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 2, scheduledHour: 9,
    scheduledAt: at('2026-04-23', 9),
    platforms: 'both',
  },

  // Apr 23 18:00 — Build in Public (founder perspective)
  {
    text: "Founder perspective: Why I spent 8 months building this instead of just software.",
    mediaFiles: ['normalized_52 - Talk to Axar founder - Part 1.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_52.jpg'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'FounderStory', 'Entrepreneurship'],
    mentions: [],
    campaignWeek: 4, campaignDay: 2, scheduledHour: 18,
    scheduledAt: at('2026-04-23', 18),
    platforms: 'both',
  },

  // Apr 24 09:00 — Thought Leadership
  {
    text: "Embodied AI agents on Virtuals + real hardware = the future of consumer robotics.",
    mediaFiles: ['normalized_01 - 6 1   Final Video Cut.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_01.jpg'],
    category: 'Thought Leadership',
    hashtags: ['PawMe', 'EmbodiedAI', 'ConsumerRobotics', 'Virtuals', 'AIagent'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 3, scheduledHour: 9,
    scheduledAt: at('2026-04-24', 9),
    platforms: 'both',
  },

  // Apr 24 18:00 — Product Showcase (sensors)
  {
    text: "All sensors calibrated — ready for real pet homes.",
    mediaFiles: ['normalized_47 - camera.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_47.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'Sensors', 'PetTech', 'SmartHome'],
    mentions: [],
    campaignWeek: 4, campaignDay: 3, scheduledHour: 18,
    scheduledAt: at('2026-04-24', 18),
    platforms: 'both',
  },

  // Apr 25 09:00 — Weekly Recap W5
  {
    text: "Week 5 Recap 🔥\n• Final prototypes polished\n• Revenue model explained\n• Embodied AI vision\n\nIAO in 3 days. This is happening.",
    mediaFiles: ['normalized_03 - Assembly.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_03.jpg'],
    category: 'Weekly Recap',
    hashtags: [...RECAP_TAGS, 'Manufacturing', 'Assembly'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 4, scheduledHour: 9,
    scheduledAt: at('2026-04-25', 9),
    platforms: 'both',
  },

  // Apr 25 18:00 — Token Tease (no media)
  {
    text: "Join the $AYVA community and help shape the future of pet companionship.",
    category: 'Token Tease',
    hashtags: [...TOKEN_TAGS, 'Community', 'PetTech', 'Web3'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 4, scheduledHour: 18,
    scheduledAt: at('2026-04-25', 18),
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 26 09:00 — Market Segment (no media)
  {
    text: "With pet numbers exploding to 1.3B by 2030, lonely pets need companions like PawMe more than ever.",
    category: 'Market Segment',
    hashtags: [...MARKET_TAGS, 'PetCompanion', 'PetWellness'],
    mentions: [],
    campaignWeek: 4, campaignDay: 5, scheduledHour: 9,
    scheduledAt: at('2026-04-26', 9),
    platforms: 'both',
  },

  // Apr 26 18:00 — Build in Public (documentation)
  {
    text: "Every screw, wire, and line of code documented for transparency.",
    mediaFiles: ['00000393-PHOTO-2025-09-16-18-31-00.jpg'],
    mediaTypes: ['image'],
    category: 'Build in Public',
    hashtags: [...BUILD_TAGS, 'OpenSource', 'Transparency', 'OpenHardware'],
    mentions: [],
    campaignWeek: 4, campaignDay: 5, scheduledHour: 18,
    scheduledAt: at('2026-04-26', 18),
    platforms: 'both',
  },

  // Apr 27 09:00 — Product Showcase (daily companion)
  {
    text: "PawMe is more than a gadget — it's a daily companion that grows with your pet.",
    mediaFiles: ['normalized_06 - 5 2   Running.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_06.jpg'],
    category: 'Product Showcase',
    hashtags: ['PawMe', 'AIpet', 'PetCompanion', 'PetWellness', 'PetTech'],
    mentions: [],
    campaignWeek: 4, campaignDay: 6, scheduledHour: 9,
    scheduledAt: at('2026-04-27', 9),
    platforms: 'both',
  },

  // Apr 27 18:00 — Final Tease
  {
    text: "Tomorrow we launch $AYVA on @virtuals_io.\n\nReal robot hardware + tokenized AI agent with revenue flywheel.\n\nFair launch. No pre-mine. Community first.\n\nGet ready. 🚀",
    mediaFiles: ['normalized_01 - 6 1   Final Video Cut.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_01.jpg'],
    category: 'Final Tease',
    hashtags: [...LAUNCH_TAGS, 'CryptoLaunch', 'AIagent'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 6, scheduledHour: 18,
    scheduledAt: at('2026-04-27', 18),
    platforms: 'both',
    ctaUrl: 'https://app.virtuals.io',
  },

  // ═══════════════════════════════════════════════════════════
  // APR 28: IAO LAUNCH DAY (6 posts)
  // ═══════════════════════════════════════════════════════════

  // Apr 28 09:00 — IAO Launch
  {
    text: "IT'S LIVE.\n\n$AYVA IAO is now open on @virtuals_io\n\nPawMe — the first embodied pet health AI agent with 10 real working prototypes.\n\nBonding curve open. Fair launch. Revenue from premium AI + pet insights.\n\nLink: app.virtuals.io\n\nLet's give every pet a best friend. #VirtualsIAO #PawMe",
    mediaFiles: ['normalized_01 - 6 1   Final Video Cut.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_01.jpg'],
    category: 'IAO Launch',
    hashtags: [...LAUNCH_TAGS, 'IAO', 'CryptoLaunch', 'AIagent', 'PetTech'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 7, scheduledHour: 9,
    scheduledAt: at('2026-04-28', 9),
    platforms: 'both',
    ctaUrl: 'https://app.virtuals.io',
  },

  // Apr 28 09:30 — Post Launch Followup (no media)
  {
    text: "Early $AYVA holders — watch for Kickstarter priority details coming soon.\n\nYour support helps us manufacture at scale.",
    category: 'Post Launch',
    hashtags: [...TOKEN_TAGS, 'Kickstarter', 'EarlyAccess'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 7, scheduledHour: 9, scheduledMinute: 30,
    scheduledAt: at('2026-04-28', 9, 30),
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 28 10:00 — Post Launch Tease
  {
    text: "The agent is now live on-chain.\n\nWatch PawMe start interacting autonomously soon.",
    mediaFiles: ['normalized_36 - intro.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_36.jpg'],
    category: 'Post Launch',
    hashtags: [...TOKEN_TAGS, 'AIagent', 'OnChain', 'EmbodiedAI'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 7, scheduledHour: 10,
    scheduledAt: at('2026-04-28', 10),
    platforms: 'both',
  },

  // Apr 28 18:00 — Post Launch (celebration)
  {
    text: "Thank you to everyone who joined the $AYVA IAO today.\n\nThe bonding curve is live and the community is growing fast.\n\nNext: scaling production and bringing PawMe into more homes.",
    mediaFiles: ['00001721-PHOTO-2026-03-29-00-00-06.jpg'],
    mediaTypes: ['image'],
    category: 'Post Launch',
    hashtags: [...LAUNCH_TAGS, 'Community', 'ThankYou'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 7, scheduledHour: 18,
    scheduledAt: at('2026-04-28', 18),
    platforms: 'both',
  },

  // Apr 28 18:30 — Post Launch Community
  {
    text: "What feature would you like to see next in PawMe?\n\nReply below — your input shapes the open-source roadmap.",
    mediaFiles: ['normalized_30 - open ai qa feature live.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_30.jpg'],
    category: 'Post Launch',
    hashtags: ['PawMe', 'OpenSource', 'Community', 'BuildInPublic', 'AIpet'],
    mentions: [],
    campaignWeek: 4, campaignDay: 7, scheduledHour: 18, scheduledMinute: 30,
    scheduledAt: at('2026-04-28', 18, 30),
    platforms: 'both',
  },

  // Apr 28 19:00 — Closing
  {
    text: "From 3D-printed prototypes to tokenized embodied AI in one journey.\n\nThank you for following the build.\n\n$PawMe / $AYVA — the future of pet companionship starts now. ❤️",
    mediaFiles: ['normalized_49 - Ending timelapse.mp4'],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_49.jpg'],
    category: 'Closing',
    hashtags: [...LAUNCH_TAGS, 'ThankYou', 'PetTech', 'BuildInPublic'],
    mentions: ['@virtuals_io'],
    campaignWeek: 4, campaignDay: 7, scheduledHour: 19,
    scheduledAt: at('2026-04-28', 19),
    platforms: 'both',
    ctaUrl: 'https://app.virtuals.io',
  },

];

// ───────────────────────────────────────────────────────────
// Seed script execution
// ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  if (force) {
    console.log('🔥 --force flag detected. Clearing existing posts...');
    const snapshot = await db.collection(COLLECTION).get();
    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }
    console.log(`   Cleared ${snapshot.size} posts`);
  }

  console.log(`\n📅 Seeding ${posts.length} posts for PawMe IAO campaign (Apr 1–28, 2026)\n`);

  let count = 0;
  for (const post of posts) {
    const doc: Record<string, any> = {
      text: post.text,
      category: post.category,
      hashtags: post.hashtags,
      mentions: post.mentions,
      campaignWeek: post.campaignWeek,
      campaignDay: post.campaignDay,
      scheduledHour: post.scheduledHour,
      scheduledMinute: post.scheduledMinute || 0,
      scheduledAt: post.scheduledAt,
      status: 'scheduled',
      platforms: post.platforms,
      createdAt: new Date().toISOString(),
    };

    if (post.threadTexts && post.threadTexts.length > 0) {
      doc.threadTexts = post.threadTexts;
    }
    if (post.ctaUrl) {
      doc.ctaUrl = post.ctaUrl;
    }
    if (post.mediaFiles && post.mediaFiles.length > 0) {
      doc.mediaFilePaths = post.mediaFiles;
    }
    if (post.mediaTypes && post.mediaTypes.length > 0) {
      doc.mediaTypes = post.mediaTypes;
    }
    if (post.videoThumbnailFiles && post.videoThumbnailFiles.length > 0) {
      doc.videoThumbnailFiles = post.videoThumbnailFiles;
    }
    if (post.threadMediaMap && post.threadMediaMap.length > 0) {
      doc.threadMediaMap = JSON.stringify(post.threadMediaMap);
    }

    await db.collection(COLLECTION).add(doc);
    count++;

    const threadLabel = post.threadTexts ? ` [${post.threadTexts.length + 1}-tweet thread]` : '';
    const mediaLabel = post.mediaFiles ? ` 📎${post.mediaFiles.length}` : '';
    console.log(
      `   ✅ ${post.scheduledAt.substring(0, 16)} — ${post.category}${threadLabel}${mediaLabel}: "${post.text.substring(0, 50)}..."`
    );
  }

  const videoCount = posts.reduce((sum, p) => sum + (p.mediaTypes?.filter(t => t === 'video').length || 0), 0);
  const imageCount = posts.reduce((sum, p) => sum + (p.mediaTypes?.filter(t => t === 'image').length || 0), 0);
  const noMediaCount = posts.filter(p => !p.mediaFiles || p.mediaFiles.length === 0).length;

  console.log(`\n🎉 Seeded ${count} posts successfully!`);
  console.log(`   - Single tweets: ${posts.filter(p => !p.threadTexts).length}`);
  console.log(`   - Threads: ${posts.filter(p => p.threadTexts).length}`);
  console.log(`   - Posts with media: ${posts.filter(p => p.mediaFiles && p.mediaFiles.length > 0).length}`);
  console.log(`   - Posts without media (Gemini gen pending): ${noMediaCount}`);
  console.log(`   - Total videos: ${videoCount}`);
  console.log(`   - Total images: ${imageCount}`);
  console.log(`\n📅 Campaign: Apr 1 – Apr 28, 2026 | IAO: Apr 28, 2026`);
  console.log(`\n⚡ Next: pnpm upload-media → pnpm patch-thread-media`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});

