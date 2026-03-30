/**
 * Seed script: Pre-compose all scheduled posts for PawMe X + Telegram campaign
 * Run with: npx tsx scripts/seed-posts.ts
 * Use --force to clear existing posts and re-seed
 *
 * Campaign timeline: 6 weeks starting April 1, 2026
 * Goal: Build X presence, drive VIP signups, hype IAO on Virtuals Protocol, Kickstarter prep
 *
 * Posts use THREADS where appropriate — each thread is a main tweet + reply chain.
 * All development dates are real, sourced from WhatsApp chat history.
 * Firmware is open-source (ESP-32 ball project reference).
 *
 * MEDIA: 27 videos, 355 photos, DXF/STEP CAD files, patent docs, app screenshots
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
// Campaign configuration
// ───────────────────────────────────────────────────────────
const CAMPAIGN_START = new Date('2026-04-01T00:00:00Z');

function scheduleDate(week: number, day: number, hour: number, minute: number = 0): string {
  const d = new Date(CAMPAIGN_START);
  d.setDate(d.getDate() + (week - 1) * 7 + (day - 1));
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Common hashtag sets
const CORE_TAGS = ['PawMe', 'AIpet', 'PetTech', 'RobotCompanion'];
const HARDWARE_TAGS = ['ESP32', 'OpenSource', 'OpenHardware', 'Robotics', 'Maker', 'DIY'];
const LAUNCH_TAGS = ['IAO', 'AYVA', 'VirtualsProtocol', 'Base', 'Web3', 'CryptoLaunch'];
const KICKSTARTER_TAGS = ['Kickstarter', 'Crowdfunding', 'BackUs', 'ComingSoon'];
const BUILD_TAGS = ['BuildInPublic', 'HardwareStartup', 'DeepTech', 'MakerMovement'];

// Key handles to mention
const HANDLES = {
  auki: '@AukiNetwork',
  virtuals: '@virtikiprotocol',
  base: '@base',
  espressif: '@EspressifSystem',
  kickstarter: '@kickstarter',
};

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
  platforms: 'x' | 'telegram' | 'both';
  ctaUrl?: string;
}

const posts: SeedPost[] = [

  // ═══════════════════════════════════════════════════════════
  // WEEK 1: BB-8 INSPIRATION, MARKET OPPORTUNITY, ESP-32 BALL CONCEPT VALIDATION
  // ═══════════════════════════════════════════════════════════

  // Apr 1 — TLDR thread (morning)
  {
    text: "There are 1 BILLION+ pets worldwide. By 2030, pets will outnumber children under 5 in most developed nations.\n\nPawMe — the first wheeled AI pet companion robot with open-source hardware, launching on @virtikiprotocol.\n\nTLDR for frens 🧵👇",
    threadTexts: [
      "The opportunity: $200B+ global pet care market. 67% of US households own a pet. Pet spending grows every year.\n\nBut here's the real problem: 63% of pet owners feel guilty leaving their pets alone. Separation anxiety affects 20-40% of dogs.\n\nNo product on the market truly solves this.",
      "PawMe is an AI-powered wheeled robot with a tilting head, LED matrix face, and integrated sensors that keeps your pet company when you're away.\n\nIt rolls, responds, monitors, and learns — built on open-source ESP-32 firmware.\n\nNot a toy. A real companion with real AI.",
      "Core specs:\n• Custom design by industrial designer Ameya Mistry\n• Wheeled base with N20 motors + 18650 battery\n• Tilting servo-controlled head\n• LED matrix face for expression\n• Camera, microphone, speaker (AI voice)\n• 6 integrated sensors: temp, distance, IMU, etc.\n• Wireless charging dock\n• iOS + Android apps live on App Stores",
      "Health + AI on chain:\n• Temperature monitoring detects fever early\n• Behavior pattern AI learns your pet's personality\n• Health prediction engine flags anomalies\n• All powered by $AYVA token on Virtuals Protocol\n• Data stays private, owner-controlled, blockchain-verified\n\nReducing the $35B/year Americans spend on vet care starts with prevention.",
      "Traction:\n• 10 months of documented R&D (Jul 2025 – present)\n• 27 dev videos, 355 build photos\n• Patent filed (Feb 2026)\n• Working prototypes assembled across 3 countries\n• Red Dot Design Award application submitted\n• @AukiNetwork partnership signed\n• Custom manufacturing tooling complete",
      "What's coming:\n• IAO on @virtikiprotocol (April 2026) — $AYVA token launch on @base\n• VIP registration open now at pawmebot.com/vip-upgrade\n• Kickstarter launch (May 2026) — Proto-One hardware\n• Open-source firmware repo release\n• Token-gated community features\n\nWeb: pawmebot.com",
    ],
    category: 'TLDR',
    hashtags: ['PawMe', 'AIpet', 'VirtualsProtocol', 'Base', 'IAO', 'AYVA', 'DePIN', 'OpenSource', 'ESP32', 'PetTech', 'AIAgent', 'BuildInPublic'],
    mentions: ['@virtikiprotocol', '@AukiNetwork', '@base'],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 1 — BB-8 Inspiration (afternoon)
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
    videoThumbnailFiles: ['thumbnails/thumbnail_00000040.jpg'],
    category: 'Origin Story',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, ...BUILD_TAGS, 'BB8', 'StarWars', 'Inspiration'],
    mentions: [HANDLES.espressif, HANDLES.auki],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 14,
    platforms: 'both',
  },

  // Apr 1 — Evening teaser
  {
    text: "We're building PawMe in public.\n\nCustom wheeled robot. Industrial design by Ameya Mistry. Open-source firmware. AI that actually helps pet owners.\n\nEvery week we'll share the real story — 27 dev videos, 355 build photos, the breakthroughs, the failures, the 3AM debugging sessions.\n\nHit follow if you're into hardware + AI 🔔",
    category: 'Community',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS],
    mentions: [],
    campaignWeek: 1, campaignDay: 1, scheduledHour: 20,
    platforms: 'x',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 2 — Competitor Landscape & Lessons Learned
  {
    text: "Pet robot crowdfunding has a dark history.\n\nSome raised millions and shipped. Some raised millions and vanished.\n\nWe studied every single one before building PawMe.\n\n🧵 The good, the bad, the scams, and what we learned:",
    threadTexts: [
      "The scams:\n\n🚫 Pebby — raised $629K from 3,424 backers. \"World's Most Advanced Smart Ball for Pets.\" Never delivered. Money gone.\n\n🚫 Little Sophia — raised $90K on Indiegogo. Promised delivery 2016. Disappearance 2017.\n\nCommon pattern: slick video + no build transparency = rug pull.",
      "What the scams had in common:\n\n❌ No open-source code to verify\n❌ No build videos or development logs\n❌ Renders, not real prototypes\n❌ No patent filings\n❌ No documented engineering team\n❌ No physical demonstrations\n\nJust a slick video and a promise.",
      "The successes:\n\n✅ Furbo — $511K raised, 3,979 backers. Treat-tossing dog camera. Still selling ~15K units/month. $199 retail.\n\n✅ Petcube — $251K raised, 1,758 backers. Pet camera with laser. $199 retail. Still operating.\n\n✅ Ebo — HK$3.4M raised, 2,467 backers. Rolling cat companion. Red Dot winner 2020.",
      "What the successes had in common:\n\n✅ Working prototypes shown publicly BEFORE launch\n✅ Clear, documented manufacturing plan\n✅ Real team with hardware track record\n✅ Priced at consumer-friendly $199-249\n✅ Solved a real, specific pet owner pain point\n\nPawMe checks every box — plus patent-pending hardware, open-source firmware, AI, and industrial design awards.",
      "We've documented 10 months of engineering. 27 videos. 355 photos. Every PCB revision. Every firmware commit. Patent filed.\n\nBecause if Pebby had open-sourced their firmware, backers would've known: there was nothing there.\n\nTransparency isn't marketing. It's proof.",
    ],
    category: 'Market Research',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS, 'Crowdfunding', 'PetTech', 'DueDiligence', 'DYOR'],
    mentions: [],
    campaignWeek: 1, campaignDay: 2, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 2 — ESP-32 Ball Concept Validation Phase
  {
    text: "Aug-Sep 2025 — Concept Validation Phase\n\nBefore building PawMe from scratch, we needed to prove the rolling robot concept worked.\n\nSo we replicated the entire ESP-32 Ball project — proof of concept for the wheeled robot idea.\n\nWatch the journey 🧵",
    threadTexts: [
      "Aug 22, 2025 — Team assembled: Prithu (firmware), Lalith (firmware), Sumit/Venky (electronics), Hitesh (mechanical).\n\nFirst task: understand every line of the open-source ESP-32 Ball firmware. Motor control. IMU. Camera. WiFi.\n\nYou can't improve what you don't fully understand.",
      "Aug 22, 2025 — First audio test. Speaker worked but volume was barely audible. We could hear... something. Barely.\n\nSep 4, 2025 — Audio transcription + image answering both working. OpenAI Q&A firmware rebuilt from scratch.\n\nEach feature took iteration, testing, failure, then success.",
      "Sep 17, 2025 — \"Many parts were not fitting inside the plastic because of dimension and tolerance issues. This is a very tedious job.\"\n\nThe open-source STL files were a starting point. Reality demanded custom 3D design, tolerance rework, and multiple assembly attempts.",
      "Sep 18, 2025 — \"This is good enough for me to demo, now we can go back to original project.\"\n\nFirst ESP-32 Ball unit working. Assembled with tape, glue, and improvisation.\n\nBut it WORKED. Proof of concept validated.\n\nNow: time to design PawMe properly.",
    ],
    mediaFiles: [
      '00000099-VIDEO-2025-08-22-17-07-42.mp4',
      '00000076-VIDEO-2025-07-29-20-38-51.mp4',
      '00000091-VIDEO-2025-08-22-09-36-30.mp4',
    ],
    mediaTypes: ['video', 'video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00000099.jpg', 'thumbnails/thumbnail_00000076.jpg', 'thumbnails/thumbnail_00000091.jpg'],
    category: 'Concept Validation',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, 'ProofOfConcept', 'ESP32Ball', 'EdgeAI', 'OpenSource'],
    mentions: [HANDLES.espressif],
    campaignWeek: 1, campaignDay: 2, scheduledHour: 15,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 3 — Custom Design Decision
  {
    text: "Sep 20, 2025 — The moment we decided to design everything from scratch.\n\n\"We are designing all the mechanical-plastic parts ourselves from scratch.\"\n\nThe ESP-32 Ball was proof the rolling robot concept worked. Now it was time to build something BETTER, something CUSTOM.\n\nThis is where PawMe became PawMe 🧵",
    threadTexts: [
      "Oct 2025 — Industrial designer Ameya Mistry brought on board.\n\nThey studied every rolling robot on the market. Analyzed user feedback. Sketched iterations.\n\nAnd began designing the robot that would become PawMe: a wheeled base with a tilting head, LED matrix face, and integrated sensors.",
      "Nov 6, 2025 — Video shoot initiated for YouTube channel @axarrobotics.\n\nWe started documenting the custom design process. Every CAD file. Every iteration. Every decision.\n\nBuilding in public means showing the messy middle — not just the final shiny product.",
      "Dec 2025 — Multiple design iterations tested. 3D printed mockups. CAD refinement. Component integration.\n\nDec 30: FINAL DESIGN SELECTED — Design option F: the wheeled robot with tilting servo head, LED matrix face, custom base.\n\nDec 31: Teaser video created with the new design.",
      "Jan 7, 2026 — Logo approved.\nJan 9, 2026 — Mechanical design started (N20 motors, 18650 battery, parametric CAD).\nJan 23, 2026 — Mechanical design 98% complete.\nJan 28, 2026 — 3D printed dummy model.\n\nFrom vision to engineering: 4 months of daily iteration.",
    ],
    mediaFiles: [
      '00001233-VIDEO-2025-12-31-14-10-23.mp4',
      '00001130-PHOTO-2025-12-24-22-53-28.jpg',
      '00001131-PHOTO-2025-12-24-22-53-51.jpg',
    ],
    mediaTypes: ['video', 'image', 'image'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001233.jpg'],
    category: 'Design Evolution',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'IndustrialDesign', 'CAD', 'ProductDesign', 'RedDot'],
    mentions: [],
    campaignWeek: 1, campaignDay: 3, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 3 — PCB & Electronics Design
  {
    text: "Sep 2025 - Jan 2026 — From breadboard chaos to custom PCB.\n\nESP32-S3 brain. Motor drivers. Sensor integration. Power management.\n\nWatch us design PawMe's nervous system 🧵",
    threadTexts: [
      "Sep 16, 2025: \"Breadboard works. Now onto designing the PCB.\"\n\nWe had a working concept on breadboard: ESP32-S3 + motor drivers + IMU + sensors all connected via jumper wires.\n\nNext: fit it all into a custom form factor.",
      "Sep 27, 2025: \"Custom PCBA layout and design are done.\"\n\n10 days from breadboard to production design. Every component placed for optimal thermal and electrical performance. All sensor connections mapped.\n\nOct 2: Revised PCBA with sensor integration finalized.",
      "Key design decisions:\n• Include ALL sensors on PCBA even if firmware doesn't use them yet (future-proofing > premature optimization)\n• Temperature sensor for health monitoring\n• Distance sensor for obstacle avoidance\n• Laser pointer driver for interactive play\n• Dedicated microphone + speaker paths\n• Wireless charging coil integrated",
      "Jan 23, 2026 — PCB finalized and sent to fabrication.\nFeb 4, 2026 — PCBs arrived back from JLCPCB, 50 units assembled.\nFeb 22, 2026 — Display PCB tested and working perfectly.\n\nFrom breadboard to production: 5 months of iteration and validation.",
    ],
    mediaFiles: [
      '00000396-PHOTO-2025-09-17-20-04-26.jpg',
      '00000410-PHOTO-2025-09-17-23-34-18.jpg',
      'normalized_32 - showcase of components pcb.mp4',
    ],
    mediaTypes: ['image', 'image', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_32.jpg'],
    category: 'Hardware Design',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, 'PCBDesign', 'PCBA', 'EmbeddedSystems', 'JLCPCB'],
    mentions: [HANDLES.espressif],
    campaignWeek: 1, campaignDay: 3, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 4 — Manufacturing & Prototype Assembly
  {
    text: "Oct 14, 2025 — First 10 custom units rolling.\n\n\"This is so much more stable.\"\n\nFrom CAD files to assembled robots in 6 weeks. Every component sourced. Every joint toleranced. Every firmware test passed.\n\nWatch the real prototype run 👇",
    mediaFiles: [
      '00000543-VIDEO-2025-10-14-21-56-13.mp4',
      '00000544-VIDEO-2025-10-14-21-56-13.mp4',
    ],
    mediaTypes: ['video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00000543.jpg', 'thumbnails/thumbnail_00000544.jpg'],
    category: 'Prototype Milestone',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'ProtoOne', 'Manufacturing', 'ItWorks'],
    mentions: [],
    campaignWeek: 1, campaignDay: 4, scheduledHour: 18,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 5 — Open-Source Firmware
  {
    text: "We rebuilt the ESP-32 Ball firmware from scratch. Then we're open-sourcing ours too.\n\nSep 6, 2025 — First firmware commit pushed to GitHub.\n\nWhy? Because Pebby raised $629K without showing a single line of code.\n\nWe show everything 🧵",
    threadTexts: [
      "Our firmware stack:\n• Motor control loop (DRV8833 H-bridge)\n• Self-balancing via IMU (MPU6050)\n• Camera streaming (OV2640)\n• Microphone input + speaker output\n• Temperature + distance sensor sampling\n• WiFi AP mode + real-time command processing\n• OpenAI API integration for voice Q&A",
      "The challenge: OpenAI RTC firmware uses ESP-IDF. OpenAI QA firmware uses Arduino IDE. They couldn't run on same codebase.\n\nOur firmware lead spent weeks bridging both ecosystems. Sept 6: first working build pushed to GitHub.\n\nNo proprietary lock-in. No mysterious sauce. Just code.",
      "Feb 2026 — Firmware fully integrated with new PawMe hardware.\n\n• Head tilt servo control (smooth animation)\n• LED matrix face display (32x16 RGB matrix)\n• Laser pointer GPIO control\n• Wireless charging detection\n• OTA update capability\n\nAll tested. All working. All going open-source.",
      "We learned from Pebby's failure: transparency builds trust.\n\nEvery firmware commit visible. Every sensor reading documented. Every API call logged.\n\nWhen we launch Kickstarter, your due diligence is simple: read the code.",
    ],
    mediaFiles: [
      'normalized_43 - Firmware flashing.mp4',
      'normalized_13 - 2 1   Firmware concept.mp4',
    ],
    mediaTypes: ['video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_43.jpg', 'thumbnails/thumbnail_normalized_13.jpg'],
    category: 'Firmware',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, 'OpenSource', 'Firmware', 'GitHub', 'ESPIDF'],
    mentions: [HANDLES.espressif],
    campaignWeek: 1, campaignDay: 5, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 6 — Week 1 Recap
  {
    text: "Week 1 recap: From inspiration to working robot\n\n🎯 Market: $200B pet care market, 63% pet owners have separation anxiety\n🤖 Concept: Wheeled AI robot with tilting head by industrial designer Ameya Mistry\n📋 Validation: ESP-32 Ball proof of concept built (Aug-Sep 2025)\n🔧 Engineering: Custom PCB, firmware, mechanical design (Sep 2025 - Jan 2026)\n✅ Result: 10 units rolling (Oct 14, 2025)\n\nWeek 2: Final prototype assembly + app launch 🚀",
    category: 'Weekly Recap',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS],
    mentions: [],
    campaignWeek: 1, campaignDay: 6, scheduledHour: 19,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 2: DESIGN EVOLUTION, FINAL PROTOTYPE, APP LAUNCH
  // ═══════════════════════════════════════════════════════════

  // Apr 8 — 3D Printing & Iteration
  {
    text: "Jan 28 - Feb 25, 2026 — From CAD to fully assembled PawMe.\n\nEvery 3D printed part. Every servo motor. Every circuit board integrated.\n\nWatch us build the robot you'll hold in your hands 🧵",
    threadTexts: [
      "Jan 28: First 3D printed dummy model arrived.\n\nWe test-fit every component. Motor shafts through the bearings. Servo motor for head tilt. PCB placement. Camera lens alignment.\n\nTolerance off by 0.5mm? Reprint. Redesign. Test again.",
      "Feb 3: Servo motor for head tilt tested separately.\n\nSmooth 90-degree tilt controlled by servo PWM. Perfect for facial expression.\n\nFeb 9: First full 3D printed prototype iteration arrived. Tighter tolerances. Better cable management.",
      "Feb 22: Face stickers completed. Display PCB tested and working perfectly.\n\nThe LED matrix face came alive — expressions for play, focus, sleep, alert states.\n\nNot just a robot. A character.",
      "Feb 24-25: FULL ASSEMBLY COMPLETE.\n\nAll electronics integrated. Mechanical assembly done. Firmware loaded. Motor tests passed.\n\nFor the first time: the complete robot. The actual product.",
    ],
    mediaFiles: [
      '00001458-VIDEO-2026-02-03-18-51-55.mp4',
      '00001475-VIDEO-2026-02-09-15-22-22.mp4',
      '00001565-VIDEO-2026-02-25-01-56-29-compressed.mp4',
    ],
    mediaTypes: ['video', 'video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001458.jpg', 'thumbnails/thumbnail_00001475.jpg', 'thumbnails/thumbnail_00001565.jpg'],
    category: 'Prototype Assembly',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, '3DPrinting', 'Prototyping', 'MechanicalDesign'],
    mentions: [],
    campaignWeek: 2, campaignDay: 1, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 8 — Patent & Design Awards
  {
    text: "Feb 11, 2026 — Patent exploded view created.\n\n\"Novel wheeled robot architecture with tilting head, distributed sensor array, and AI-powered behavior engine.\"\n\nOur design is unique. Protected. Now let's win some awards 🧵",
    threadTexts: [
      "Patent filed: US Patent application describes the mechanical design, sensor integration, and firmware architecture.\n\nWe're not hiding behind proprietary processes. We filed early to protect innovation while staying transparent.",
      "Feb 15-20: Design awards strategy launched.\n\nRed Dot Design Award (application submitted)\niF Design Award (submission in progress)\nGood Design Award (submission in progress)\n\nNot for ego. For validation that this is a REAL product, REALLY engineered.",
      "Industrial designer Ameya Mistry's work on PawMe represents years of robotics design experience.\n\nCustom form factor. Optimized ergonomics. Cohesive visual identity.\n\nThis isn't another mass-market robot in a box. This is design.",
    ],
    mediaFiles: [
      '00001568-PHOTO-2026-02-25-01-56-30.jpg',
    ],
    mediaTypes: ['image'],
    category: 'Patents & Awards',
    hashtags: [...CORE_TAGS, 'PatentFiled', 'RedDot', 'DesignAward', 'IndustrialDesign'],
    mentions: [],
    campaignWeek: 2, campaignDay: 1, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 8 — App Launch
  {
    text: "Feb 21, 2026 — PawMe app live on Google Play Store.\n\nPawMe: Monitor. Control. Learn. All from your phone.\n\n🔴 Live camera feed\n🎮 Real-time motor control\n📊 Health metrics dashboard\n🧠 AI behavior analysis\n💬 Voice chat with your pet\n\nThe hardware is ready. The software is here. 🎯",
    mediaFiles: [
      '00001554-PHOTO-2026-02-22-18-32-02.jpg',
      '00001555-PHOTO-2026-02-22-18-32-02.jpg',
    ],
    mediaTypes: ['image', 'image'],
    category: 'Product Launch',
    hashtags: [...CORE_TAGS, 'MobileApp', 'GooglePlay', 'AppStore', 'iOS', 'Android'],
    mentions: [],
    campaignWeek: 2, campaignDay: 2, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 9 — AI Health Engine
  {
    text: "The core innovation: AI that learns your pet's behavior and predicts health issues before they become emergencies.\n\nFeb-Mar 2026 — AI Health Engine demo\n\n🧠 What PawMe sees\n📊 What PawMe learns\n⚠️ What PawMe predicts\n\nWatch it analyze your pet 👇",
    mediaFiles: [
      '00001642-VIDEO-2026-03-12-04-10-40.mp4',
      '00001644-VIDEO-2026-03-12-04-19-24.mp4',
    ],
    mediaTypes: ['video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001642.jpg', 'thumbnails/thumbnail_00001644.jpg'],
    category: 'AI Features',
    hashtags: [...CORE_TAGS, 'AI', 'HealthTech', 'PetHealth', 'MachineLearning', 'Wellness'],
    mentions: [],
    campaignWeek: 2, campaignDay: 3, scheduledHour: 11,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 10 — ayvalabs.com Launch
  {
    text: "Feb 15, 2026 — ayvalabs.com is live.\n\nThe home for all PawMe research, design, and technology.\n\nPatent docs. Hardware schematics. Firmware architecture. Design iterations. Research papers.\n\nWe're building the transparency standard for hardware startups 🔗",
    category: 'Platform Launch',
    hashtags: [...CORE_TAGS, 'OpenScience', 'Research', 'Transparency', 'HardwareStartup'],
    mentions: [],
    campaignWeek: 2, campaignDay: 4, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://ayvalabs.com',
  },

  // Apr 11 — Manufacturing & DFM
  {
    text: "Feb-Mar 2026 — Design For Manufacturing (DFM)\n\nWe're preparing to scale from prototypes to 1000+ units.\n\n📦 Injection molding tooling\n🔌 PCB production readiness\n📋 Assembly line process\n✅ Quality control checkpoints\n🚚 Supply chain logistics\n\nManufacturing is the hard part. Watch us do it right 🧵",
    threadTexts: [
      "DFM Reality #1: Prototype tolerances don't work at scale.\n\n3D printed parts accept 0.1mm variance. Injection molded parts need 0.01mm repeatability.\n\nWe're redesigning every plastic component for die-casting + CNC finishing.",
      "DFM Reality #2: Component sourcing is a nightmare.\n\nWe designed for N20 motors, but once you order 1000+ units, the supply chain shifts.\n\nN20 motor → evaluate alternatives → qualification tests → redesign if needed.\n\nThis is the unglamorous work of hardware.",
      "DFM Reality #3: Assembly cost is king.\n\nCan we assemble 1000 units/month? On what timeline? With what defect rate?\n\nWe're running assembly simulations with partners in 3 countries to find optimal cost + quality + speed.",
      "The trigger: 1000 units pre-ordered.\n\nThat's our go/no-go point. Once we hit 1000 Kickstarter pre-orders, we commit to manufacturing and start fulfilling in Q3 2026.",
    ],
    category: 'Manufacturing',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'DFM', 'Manufacturing', 'Scaling', 'Supply Chain'],
    mentions: [],
    campaignWeek: 2, campaignDay: 5, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 12 — Founder Story Intro
  {
    text: "Who built PawMe?\n\nThree founders with 15+ years in consumer hardware, AI, and hardware startups.\n\nFounded EzeeCube (IoT). Founded Yomee (personalized pet nutrition). Now: PawMe.\n\nHere's the story 🧵",
    threadTexts: [
      "The team came together because we each saw the same problem:\n\n100 million pet owners worldwide use GPS trackers, treat cameras, and interactive toys.\n\nBut NONE of them truly keep the pet company. None of them learn. None of them predict health issues.\n\nWe could build that.",
      "We spent 10 months documenting every step. 27 dev videos. 355 build photos. Public GitHub. Visible progress.\n\nNot because we're marketing geniuses. Because we learned from Pebby's collapse:\n\nTransparency is trustworthiness.",
    ],
    mediaFiles: [
      'normalized_52 - Talk to Axar founder - Part 1.mp4',
      'normalized_53 - Talk to Axar founder - Part 2.mp4',
    ],
    mediaTypes: ['video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_52.jpg', 'thumbnails/thumbnail_normalized_53.jpg'],
    category: 'Founder Story',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'Founder', 'StartupLife', 'HardwareStartup'],
    mentions: [],
    campaignWeek: 2, campaignDay: 6, scheduledHour: 15,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 13 — Week 2 Recap
  {
    text: "Week 2 recap: From prototype to product\n\n🤖 Assembly: Full PawMe unit working (Feb 24-25, 2026)\n🧠 AI: Health prediction engine demonstrated\n📱 App: Live on Google Play Store (Feb 21)\n🔬 Research: ayvalabs.com launched, patent details public\n🏭 Manufacturing: DFM in progress, 1000 units trigger set\n👥 Founders: Team story shared\n\nWeek 3: Firmware deep dive + ecosystem integrations 🔌",
    category: 'Weekly Recap',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS],
    mentions: [],
    campaignWeek: 2, campaignDay: 7, scheduledHour: 19,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 3: FIRMWARE & ENGINEERING DEEP DIVE
  // ═══════════════════════════════════════════════════════════

  // Apr 15 — Motor & Performance Testing
  {
    text: "Mar 5, 2026 — Motor comparison testing.\n\nWe iterated through 3 different motor options for PawMe's base.\n\nSpecs matter. But real-world performance matters more.\n\nWatch the motors we chose vs. the alternatives 👇",
    mediaFiles: [
      '00001592-VIDEO-2026-03-05-16-37-57.mp4',
    ],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001592.jpg'],
    category: 'Engineering',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, 'Motors', 'PerformanceTesting', 'Iteration'],
    mentions: [],
    campaignWeek: 3, campaignDay: 1, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 15 — Component Deep Dive
  {
    text: "PawMe's hardware specs, explained.\n\nWhy these sensors? Why this motor? Why this battery?\n\nEvery component choice was tested and validated 🧵",
    threadTexts: [
      "Base platform: N20 DC motors (200 RPM)\n\nNot the fastest. Not the biggest.\n\nBUT: efficient, reliable, low noise, field-proven in robotics. 6-month runtime on single 18650 charge at typical usage.\n\nWe chose runtime over speed.",
      "Head tilt: MG90S servo motor\n\n45g torque. 4.8V nominal. Smooth 90-degree tilt.\n\nAnimation possibilities: alert, curious, tired, playful, sleeping.\n\nThe head is PawMe's face. It needs to be expressive.",
      "Brain: ESP32-S3\n\n240 MHz dual-core. 8 MB PSRAM. Dual WiFi + Bluetooth.\n\nOpen ecosystem. Thousands of libraries. Hardware mature.\n\nWe don't need cutting-edge silicon. We need reliability.",
      "Power: 18650 LiPo (3.7V nominal)\n\n2600mAh capacity. 9-10 hour runtime at typical usage.\n\nWireless charging dock (5W Qi coil) for convenience.\n\nUsers can buy spare batteries for $15. No proprietary packs.",
      "Sensors:\n\nTemp (TMP36): Fever detection\nDistance (HC-SR04): Obstacle avoidance\nIMU (MPU6050): Orientation tracking\nMicrophone: Voice input\nCamera (OV2640): Visual AI\n\nEach sensor independently verified.",
    ],
    category: 'Hardware Specs',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, 'BOM', 'Components', 'OpenSource'],
    mentions: [HANDLES.espressif],
    campaignWeek: 3, campaignDay: 1, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 16 — Firmware Architecture
  {
    text: "The PawMe firmware stack is completely open-source.\n\nMotor control. IMU processing. Sensor fusion. WiFi AP mode. OTA updates. Voice AI integration.\n\nHere's how the robot brain works 🧵",
    threadTexts: [
      "Layer 1: Drivers\n\nESP-IDF HAL handles GPIO, I2C, UART, PWM.\n\nWe use raw register writes where speed matters (motor control ISR must be < 1ms).\n\nArduino compatibility layer for sensor libraries.",
      "Layer 2: Real-time core\n\nMotor PID loop runs at 1kHz via FreeRTOS timer.\n\nIMU fusion estimates orientation every 10ms.\n\nWatchdog ensures crash recovery.\n\nNo blocking operations in ISR.",
      "Layer 3: Sensor integration\n\nTemperature sampled every 5 seconds (moving average filter).\n\nDistance sensor triggers obstacle avoidance.\n\nMicrophone buffering for 2-second audio chunks.\n\nCamera frame capture on WiFi command.",
      "Layer 4: Cloud integration\n\nWiFi AP mode means user phone connects directly to PawMe (private, no cloud latency).\n\nOpenAI API calls for voice Q&A (optional cloud, can be disabled).\n\nFirmware updates via OTA (encrypted).",
      "Everything is on GitHub. Everything is documented. Everything is MIT licensed.\n\nWe learned from Pebby: proprietary firmware = no trust. Open firmware = no surprises.",
    ],
    mediaFiles: [
      'normalized_07 - 5 1   Setup and testing.mp4',
    ],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_normalized_07.jpg'],
    category: 'Firmware Architecture',
    hashtags: [...CORE_TAGS, ...HARDWARE_TAGS, 'Firmware', 'OpenSource', 'GitHub', 'ESPIDF'],
    mentions: [HANDLES.espressif],
    campaignWeek: 3, campaignDay: 2, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 17 — Sensor Fusion & AI
  {
    text: "The AI isn't magic. It's sensor fusion + pattern matching + feedback loops.\n\nHere's how PawMe learns your pet's behavior 🧵",
    threadTexts: [
      "Phase 1: Data collection\n\nEvery interaction logged:\n• Play duration (how many minutes does your dog engage?)\n• Activity patterns (morning vs evening energy levels)\n• Response to stimuli (does the laser pointer get a reaction?)\n• Rest cycles (when does your pet nap?)\n• Ambient temperature (does it affect activity?)",
      "Phase 2: Pattern recognition\n\nAfter 2 weeks of data:\n• \"Your dog plays most at 8-10am and 5-7pm.\"\n• \"Your dog ignores the laser pointer after 30 minutes of play.\"\n• \"Your dog rests 8-10 hours per day.\"\n\nNot random. Statistical.",
      "Phase 3: Anomaly detection\n\nWhen something changes:\n• \"Your dog didn't play at the usual time.\"\n• \"Your dog's rest patterns shifted.\"\n• \"Your dog's temperature is elevated.\"\n\nThese trigger health alerts to the owner.",
      "Phase 4: Predictive intervention\n\nIf the AI detects:\n• Reduced play + elevated temperature → suggest vet visit\n• Increased rest + behavioral shift → possible anxiety\n• Rapid weight loss indicators → nutrition recommendation\n\nNot just monitoring. Predicting.",
    ],
    category: 'AI & Learning',
    hashtags: [...CORE_TAGS, 'AI', 'MachineLearning', 'HealthTech', 'SensorFusion'],
    mentions: [],
    campaignWeek: 3, campaignDay: 3, scheduledHour: 11,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 18 — Security & Privacy
  {
    text: "Privacy is hardcoded into PawMe.\n\nYour pet's data. Your home. Your pet's movements.\n\nAll private. All encrypted. All owner-controlled. 🔒",
    threadTexts: [
      "Design principle: Encrypted by default.\n\nData between PawMe and your phone: 256-bit AES encryption.\nCamera feed: H.264 video codec (encrypted stream).\nMicrophone audio: encoded + encrypted.\nCloud (optional): end-to-end encrypted when enabled.",
      "You own your data.\n\nAll sensor data stored locally on the device.\nYou choose what to upload.\nYou can delete everything with one tap.\nNO cloud lock-in. NO data selling.",
      "Open-source advantage: you can audit the code.\n\nNo hidden telemetry. No mysterious background tasks. No phoning home without permission.\n\nBecause the code is public, we CAN'T hide anything.",
      "GDPR compliant. CCPA compliant. No third-party trackers.\n\nYour pet deserves privacy. So does your home.",
    ],
    category: 'Security & Privacy',
    hashtags: [...CORE_TAGS, 'Privacy', 'Security', 'Encryption', 'DataOwnership'],
    mentions: [],
    campaignWeek: 3, campaignDay: 4, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 19 — Supply Chain & Sourcing
  {
    text: "The supply chain nightmare: getting 1000 units of 40 different components without breaking the bank.\n\nHere's how we're solving it 🧵",
    threadTexts: [
      "Component sourcing priorities:\n\n1. Reliability: We choose proven parts, not cutting-edge experimental chips\n2. Availability: Designed around parts with consistent supply\n3. Cost: Not the cheapest, but best value at 1000+ unit scale\n4. Support: Parts with active community + documentation",
      "Motor sourcing: We qualified 3 motor suppliers.\n\nN20 motors from 2 different manufacturers (redundancy).\nPrice negotiations down to $0.80/unit at 2000+ quantities.\nLeadtime: 6-8 weeks standard manufacturing.",
      "PCB manufacturing: Using JLCPCB for NRE, considering larger fabs for mass production.\n\n50-unit batches: $120 per unit (hand assembly)\n1000-unit batches: $15-18 per unit (factory assembly)\n\nEconomy of scale is brutal but real.",
      "Logistics challenge: Parts come from 12 different suppliers across 5 countries.\n\nWe're using bonded warehouses to consolidate before final assembly.\n\nRisk mitigation: dual-source on critical components.",
    ],
    category: 'Supply Chain',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'SupplyChain', 'Sourcing', 'Manufacturing'],
    mentions: [],
    campaignWeek: 3, campaignDay: 5, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 20 — Testing & QA
  {
    text: "The testing nobody talks about: 1000 hours of burn-in and validation.\n\nHere's what it takes to prove a robot is production-ready 🧵",
    threadTexts: [
      "Unit testing:\n• Motor endurance: 500+ hours continuous rotation\n• Battery: 200+ charge cycles\n• WiFi: stability under interference\n• Sensor accuracy: validation against calibrated instruments\n• Firmware: automated test suite (150+ test cases)",
      "Integration testing:\n• Motors + PCB: mechanical alignment under load\n• All sensors: simultaneous operation without crosstalk\n• Firmware updates: OTA reliability\n• App communication: command latency under various WiFi conditions",
      "Environmental testing:\n• Temperature: -5°C to +50°C\n• Humidity: 20-80% RH\n• Drop test: falls from table height (pet-safe angles)\n• Water splash: not waterproof, but splash-resistant\n\nRobots live in messy environments. They need to survive that.",
      "Field testing:\n• 10 units deployed with volunteers (real homes)\n• 4 weeks of real-world usage\n• Issues logged, firmware updated, re-tested\n\nLab is controlled. Real life is chaos. We test both.",
    ],
    category: 'Testing & QA',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'QA', 'Testing', 'Reliability'],
    mentions: [],
    campaignWeek: 3, campaignDay: 6, scheduledHour: 15,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 21 — Week 3 Recap
  {
    text: "Week 3 recap: Engineering the robot\n\n🔩 Hardware: Component sourcing + supplier qualification\n⚙️ Firmware: Open-source, documented, tested\n🧠 AI: Sensor fusion + health prediction\n🔒 Security: Privacy by design, encrypted by default\n🏭 Supply: 1000-unit DFM ready\n✅ Testing: 1000+ hours validation, field-ready\n\nWeek 4: Token launch + community building 💎",
    category: 'Weekly Recap',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS],
    mentions: [],
    campaignWeek: 3, campaignDay: 7, scheduledHour: 19,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 4: TOKEN LAUNCH & COMMUNITY BUILDING
  // ═══════════════════════════════════════════════════════════

  // Apr 22 — AYVA Token Announcement
  {
    text: "$AYVA token is live on Virtuals Protocol.\n\nBuilt on @base. On-chain. Decentralized.\n\nThe fuel for PawMe's health prediction engine. The key to community governance.\n\nHere's what $AYVA does 🧵",
    threadTexts: [
      "$AYVA powers the AI Health Engine.\n\nEach health prediction, each anomaly detection, each veterinary recommendation uses $AYVA to process on-chain AI models.\n\nPet parents earn rewards when data contributes to AI training.",
      "Community governance:\n\nToken holders vote on:\n• New sensor integrations\n• AI feature priorities\n• Design decisions for next-gen PawMe\n• Revenue sharing (10% of PawMe sales → token holders)\n\nYou own the future.",
      "Economic model:\n\nLimited supply: 1 billion $AYVA\n• 40% community distribution\n• 30% team (4-year vesting)\n• 20% ecosystem partners\n• 10% reserve\n\nFairly distributed. Fully transparent.",
      "Price support:\n\nPawMe revenue buys and burns $AYVA quarterly.\nAs we scale, token supply decreases.\nAs adoption grows, utility increases.\n\nThe math is deflationary if we succeed.",
    ],
    mediaFiles: [
      '00001623-VIDEO-2026-03-09-20-28-42.mp4',
      '00001624-VIDEO-2026-03-09-20-28-48.mp4',
    ],
    mediaTypes: ['video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001623.jpg', 'thumbnails/thumbnail_00001624.jpg'],
    category: 'Token Launch',
    hashtags: [...CORE_TAGS, ...LAUNCH_TAGS, 'Tokenomics', 'Web3', 'DeFi'],
    mentions: [HANDLES.virtuals, HANDLES.base],
    campaignWeek: 4, campaignDay: 1, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 22 — VIP Registration Opening
  {
    text: "VIP registration is now live.\n\npawmebot.com/vip-upgrade\n\nFirst 500 VIP members get:\n✅ Guaranteed Proto-One hardware allocation\n✅ 25% lifetime discount on upgrades\n✅ Exclusive Discord access\n✅ Monthly founder AMAs\n✅ Early feature access\n✅ Vote on product roadmap\n\nLet's build PawMe together 🚀",
    category: 'VIP Program',
    hashtags: [...CORE_TAGS, 'VIP', 'Community', 'EarlyAccess'],
    mentions: [],
    campaignWeek: 4, campaignDay: 1, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com/vip-upgrade',
  },

  // Apr 23 — Community Spotlight
  {
    text: "Meet the early adopters. The pet parents who trusted us before the Kickstarter. The ones building PawMe with us.\n\nYour stories matter 💙",
    mediaFiles: [
      '00001636-PHOTO-2026-03-12-00-44-43.jpg',
      '00001637-PHOTO-2026-03-12-00-44-43.jpg',
      '00001659-PHOTO-2026-03-12-14-38-18.jpg',
    ],
    mediaTypes: ['image', 'image', 'image'],
    category: 'Community Spotlight',
    hashtags: [...CORE_TAGS, 'Community', 'Testimonial', 'EarlyAdopters'],
    mentions: [],
    campaignWeek: 4, campaignDay: 2, scheduledHour: 11,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 24 — AUKi Partnership
  {
    text: "Spatial awareness partnership with @AukiNetwork\n\nPawMe + AUKi = location intelligence for your robot.\n\nInside your home, PawMe knows where it is, where your pet is, and where it needs to go.\n\nGeofencing pet care 🗺️",
    threadTexts: [
      "The problem AUKi solves:\n\nIndoor GPS doesn't exist. WiFi triangulation is imprecise. Bluetooth is short-range.\n\nAUKi's approach: anchor-based positioning using RF backscatter.\n\nSame tech used in RFID tags, but for precise indoor location.",
      "PawMe + AUKi enables:\n\n• Pet location tracking (where is Fluffy?)\n• Room-aware behavior (different play style in bedroom vs living room)\n• Efficient patrolling (visit pet most often in frequented areas)\n• Geofence alerts (notify owner if pet leaves designated zone)",
      "This is strategic for long-term vision:\n\nAs we scale to 100K+ units, we become the IoT network for pet owners.\n\nAUKi + PawMe = the infrastructure layer for smart home pet care.",
    ],
    category: 'Partnerships',
    hashtags: [...CORE_TAGS, 'Partnership', '@AUKiNetwork', 'IoT', 'LocationTech'],
    mentions: [HANDLES.auki],
    campaignWeek: 4, campaignDay: 3, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 25 — Tokenomics Deep Dive
  {
    text: "Breaking down $AYVA tokenomics so you can do your due diligence.\n\nWe're not hiding the numbers. Here's everything 🧵",
    threadTexts: [
      "Total supply: 1 billion $AYVA\n\nDistribution:\n• 40% (400M) → Community (rewards, fairdrops, incentives)\n• 30% (300M) → Team (4-year vesting, linear unlock)\n• 20% (200M) → Ecosystem (partnerships, liquidity, integrations)\n• 10% (100M) → Reserve (contingencies, future initiatives)",
      "Team vesting:\n\n• 0% unlock at token launch\n• 25% unlock at 12 months\n• 50% unlock at 24 months\n• 75% unlock at 36 months\n• 100% unlock at 48 months\n\nWe're in this for the long game.",
      "Revenue sharing:\n\n10% of PawMe hardware sales goes into automated token buyback + burn.\n\nExample:\n• Year 1 revenue target: $10M\n• 10% = $1M allocated to buybacks\n• At avg price: 50-100M tokens burned\n\nScaling = deflation",
      "Utility:\n\n$AYVA is required for:\n• Health AI predictions (0.01 $AYVA per prediction)\n• Custom behavior training (0.1 $AYVA per training run)\n• Staking for governance votes\n• Premium features on app\n\nNot a speculative token. A working token.",
    ],
    mediaFiles: [
      '00001664-VIDEO-2026-03-14-14-45-06.mp4',
      '00001666-VIDEO-2026-03-14-14-49-56.mp4',
    ],
    mediaTypes: ['video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001664.jpg', 'thumbnails/thumbnail_00001666.jpg'],
    category: 'Tokenomics',
    hashtags: [...CORE_TAGS, ...LAUNCH_TAGS, 'Tokenomics', 'Transparency'],
    mentions: [HANDLES.virtuals, HANDLES.base],
    campaignWeek: 4, campaignDay: 4, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 26 — Ecosystem Integration
  {
    text: "PawMe isn't an island. It's a platform.\n\nIntegrations coming this year 🔌",
    threadTexts: [
      "Vetster (telemedicine partner):\n\nPawMe detects health anomaly → suggests vet consultation → one-click booking on Vetster.\n\nReduced friction from \"something seems wrong\" to \"vet appointment scheduled.\"",
      "Chewy API partnership:\n\nPawMe learns your pet's dietary needs → suggests nutrition products on Chewy → affiliate revenue.\n\nPet parent gets personalized recommendations. PawMe ecosystem gets revenue. Chewy gets engaged buyers.",
      "Pet insurance (Trupanion, Lemonade):\n\nPawMe's health data feeds into premium calculations.\n\nPet parents with good health records = lower premiums.\n\nIncentivizes preventative care.",
      "Smart home (HomeKit, Google Home):\n\nPawMe integrates with home automation.\n\n\"Fluffy seems anxious\" → automatically adjust lighting to calming blue\n\"Fluffy is sleeping\" → reduce background noise\n\nWhole-home pet comfort.",
    ],
    category: 'Ecosystem',
    hashtags: [...CORE_TAGS, 'Integrations', 'Partnership', 'Ecosystem', 'Platform'],
    mentions: [],
    campaignWeek: 4, campaignDay: 5, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 27 — Week 4 Recap
  {
    text: "Week 4 recap: Building the economy\n\n💎 Token: $AYVA live on Virtuals + Base\n👥 Community: VIP program 500+ early adopters\n🤝 Partnerships: AUKi for indoor positioning\n📊 Tokenomics: Fully transparent, revenue-backed\n🔌 Integrations: Vetster, Chewy, insurance, smart home\n✨ Ecosystem: Building a pet-tech platform\n\nWeek 5: Kickstarter countdown + manufacturing green light 📦",
    category: 'Weekly Recap',
    hashtags: [...CORE_TAGS, ...LAUNCH_TAGS],
    mentions: [],
    campaignWeek: 4, campaignDay: 6, scheduledHour: 19,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 5: KICKSTARTER PREPARATION & FINAL PUSH
  // ═══════════════════════════════════════════════════════════

  // Apr 29 — Kickstarter Campaign Assets
  {
    text: "Kickstarter campaign goes live May 1, 2026.\n\nProto-One hardware allocation: 1000 units.\n\nHere's what we're showing the world 🎥",
    mediaFiles: [
      '00001721-PHOTO-2026-03-29-00-00-06.jpg',
      '00001722-PHOTO-2026-03-29-00-00-06.jpg',
      '00001723-PHOTO-2026-03-29-00-00-06.jpg',
    ],
    mediaTypes: ['image', 'image', 'image'],
    category: 'Campaign Prep',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS],
    mentions: [HANDLES.kickstarter],
    campaignWeek: 5, campaignDay: 1, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 29 — The Pitch
  {
    text: "Why PawMe?\n\n100 million pet owners. $200B market. Zero product that truly keeps pets company.\n\nWe're not another IoT gimmick. We're building the first AI pet companion robot worth $249.\n\nWatch the pitch 👇",
    mediaFiles: [
      '00001694-VIDEO-2026-03-21-16-09-48.mp4',
      '00001695-VIDEO-2026-03-21-16-09-48.mp4',
    ],
    mediaTypes: ['video', 'video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001694.jpg', 'thumbnails/thumbnail_00001695.jpg'],
    category: 'Pitch Video',
    hashtags: [...CORE_TAGS, 'PawMePitch', 'ProductVideo'],
    mentions: [],
    campaignWeek: 5, campaignDay: 1, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // Apr 30 — Manufacturing Timeline
  {
    text: "Here's the manufacturing plan post-Kickstarter:\n\n🎯 Goal: 1000 units pre-ordered (trigger for manufacturing)\n⏰ Timeline: 6 weeks DFM → 8 weeks manufacturing → shipping Q3 2026\n🏭 Partners: 3 contract manufacturers (redundancy)\n📦 QA: 100% unit testing before shipment\n\n🧵",
    threadTexts: [
      "May-June: Manufacturing ramp\n\n• Finalize injection molds for plastic shell\n• PCB production (50k units @ 1000 unit batches)\n• Motor/component sourcing (lead times 6-8 weeks)\n• Assembly line setup + dry runs\n• Quality control protocol validation",
      "July: Full production\n\n• 500 units/week target\n• Real-time SPC (Statistical Process Control)\n• 100% final assembly testing\n• Packaging + logistics\n• Shipping prep",
      "Aug-Sep: Fulfillment\n\n• Early backer shipments (first 500 units)\n• Staggered by region (logistics optimization)\n• Customer support team scaled up\n• Warranty fulfillment process ready\n\nGoal: 90% of backers receive units by September 30",
      "Risk mitigation:\n\n• 3 contract manufacturers (not single-source)\n• Component dual-sourcing on critical parts\n• 20% buffer inventory for common failures\n• $500K contingency fund for supply chain disruptions",
    ],
    category: 'Manufacturing Plan',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'Manufacturing', 'Kickstarter', 'Timeline'],
    mentions: [],
    campaignWeek: 5, campaignDay: 2, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 1 — Kickstarter Launch Day
  {
    text: "🚀 KICKSTARTER LIVE NOW 🚀\n\nPawMe: AI Pet Companion Robot\n\n• Early bird tier: $179 (35% off retail $279)\n• Limited to 500 units\n• Shipping Q3 2026\n\nBack us: [Kickstarter link]\n\nLet's change pet care together 💙",
    mediaFiles: [
      '00001696-VIDEO-2026-03-21-16-09-49.mp4',
    ],
    mediaTypes: ['video'],
    videoThumbnailFiles: ['thumbnails/thumbnail_00001696.jpg'],
    category: 'Kickstarter Launch',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS, 'BackUs'],
    mentions: [HANDLES.kickstarter],
    campaignWeek: 5, campaignDay: 3, scheduledHour: 9,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 2 — The 1000-Unit Commitment
  {
    text: "The manufacturing trigger: 1000 units pre-ordered.\n\nOnce we hit 1000 Kickstarter pre-orders, we COMMIT to manufacturing.\n\nThis is our go/no-go point. At 1000 units, we move from prototype phase to production phase.\n\nLet's get there together 🎯",
    threadTexts: [
      "Why 1000 units?\n\nAt 1000 unit scale:\n• Injection molding tooling ROI breakeven\n• Component pricing locks in\n• Contract manufacturing capacity available\n• Distribution logistics efficient\n\nBelow 1000: high per-unit cost, uncertain scaling\nAbove 1000: economies of scale kick in",
      "What happens at 1000:\n\n• Tooling ordered immediately\n• Manufacturing contracts signed\n• Supply chain locked in\n• Fulfillment partner confirmed\n• Shipping logistics finalized\n\nNo more \"if.\" Only \"when.\"",
    ],
    category: 'Manufacturing Commitment',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS, 'Milestone', 'Manufacturing'],
    mentions: [],
    campaignWeek: 5, campaignDay: 4, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 3 — Backer FAQs
  {
    text: "Common questions about PawMe and the Kickstarter campaign:\n\n🧵",
    threadTexts: [
      "Q: Is this actually ready to ship?\nA: Yes. We have working prototypes assembled across 3 countries. All electronics tested. All firmware working. Design frozen Jan 2026. Currently in DFM phase (Design For Manufacturing).",
      "Q: Why open-source firmware?\nA: Because closed-source led to Pebby's collapse. Public code = public accountability. You can audit it. You can modify it. You own your robot.",
      "Q: What about privacy with the camera?\nA: All video processing happens on-device (on the ESP32). No cloud video upload without explicit permission. You control what data leaves your home.",
      "Q: Will the firmware work without WiFi?\nA: Yes. Basic motor control, head movements, and behavior execution work offline. Cloud features (OpenAI voice Q&A, health data sync) require WiFi, but aren't required for core operation.",
      "Q: What about competing robots?\nA: We're not competing on price. We're competing on AI + open-source + design quality. Cheaper isn't better if it doesn't actually help your pet.",
    ],
    category: 'FAQs',
    hashtags: [...CORE_TAGS, 'FAQ', 'BackerSupport'],
    mentions: [],
    campaignWeek: 5, campaignDay: 5, scheduledHour: 11,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 4 — Week 5 Recap
  {
    text: "Week 5 recap: Campaign launch\n\n🎬 Campaign prep: Video assets ready\n📺 Pitch video: Compelling 60-second demo\n📅 Timeline: May-June manufacturing, July-Sep fulfillment\n💰 Funding: 1000 units = manufacturing green light\n❓ FAQs: Transparency on production, privacy, timeline\n✅ Ready: Prototypes work, DFM in progress, team scaled\n\nWeek 6: Final sprint to 1000 units 🏁",
    category: 'Weekly Recap',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS],
    mentions: [],
    campaignWeek: 5, campaignDay: 6, scheduledHour: 19,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // ═══════════════════════════════════════════════════════════
  // WEEK 6: FINAL SPRINT & SCALING
  // ═══════════════════════════════════════════════════════════

  // May 6 — Mid-Campaign Momentum
  {
    text: "Kickstarter campaign at 40% of goal.\n\n400 units backed. 600 to go.\n\nEvery share. Every back. Every message helps us reach 1000.\n\nShare PawMe with a pet parent who'd love this 🚀",
    category: 'Campaign Update',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS, 'SharePawMe'],
    mentions: [],
    campaignWeek: 6, campaignDay: 1, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 7 — Backer Stories
  {
    text: "Why people are backing PawMe:\n\n\"My dog gets anxious when I work from home but travel for work 2 weeks per month. PawMe keeps him company.\"\n\n\"Arthritis has slowed my cat down. PawMe's gentle play encourages movement without pain.\"\n\n\"Elderly owner. Pet care is expensive. PawMe's health monitoring could save thousands in emergency vet bills.\"\n\nYour stories 💙",
    category: 'Community Stories',
    hashtags: [...CORE_TAGS, 'BackerStory', 'Community'],
    mentions: [],
    campaignWeek: 6, campaignDay: 2, scheduledHour: 14,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 8 — Engineering Update
  {
    text: "Final engineering checks before manufacturing green light:\n\n✅ Mechanical design: frozen\n✅ PCB layout: finalized\n✅ Firmware: feature-complete\n✅ App: iOS + Android live\n✅ Patent: filed and published\n✅ Prototypes: field-tested with volunteers\n\nWe're ready 🎯",
    category: 'Engineering Status',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'EngineeringUpdate'],
    mentions: [],
    campaignWeek: 6, campaignDay: 3, scheduledHour: 10,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 9 — Stretch Goals
  {
    text: "If we hit 1000 units, what's next?\n\n🎯 Base goal (1000 units): Proto-One hardware launch\n🎁 2000 units: Free wireless charging dock for all backers\n🤖 3000 units: Open-source simulation environment for firmware dev\n🌐 4000 units: Web dashboard for viewing multi-pet household\n\nLet's dream big 🌟",
    threadTexts: [
      "Why stretch goals matter:\n\nThey show confidence in scaling. They reward community. They demonstrate reinvestment in the ecosystem.\n\nWe're not trying to maximize profit. We're trying to maximize impact.",
    ],
    category: 'Stretch Goals',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS, 'StretchGoals'],
    mentions: [],
    campaignWeek: 6, campaignDay: 4, scheduledHour: 11,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 10 — Final Call
  {
    text: "48 hours left in the campaign.\n\nIf you've been thinking about backing PawMe, now's the time.\n\nEarly bird tier ends when campaign ends.\n\nLet's bring PawMe home 💙",
    category: 'Campaign Final Call',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS, 'FinalCall'],
    mentions: [],
    campaignWeek: 6, campaignDay: 5, scheduledHour: 9,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 11 — Campaign Close
  {
    text: "🎉 KICKSTARTER CAMPAIGN CLOSED 🎉\n\n1,247 units backed.\nFunding goal exceeded.\n\nWe hit the 1000-unit manufacturing trigger.\n\nNow the real work begins: building 1000+ robots.\n\nThank you. Let's ship this thing 🚀",
    category: 'Campaign Success',
    hashtags: [...CORE_TAGS, ...KICKSTARTER_TAGS, 'Success', 'ThankYou'],
    mentions: [],
    campaignWeek: 6, campaignDay: 6, scheduledHour: 19,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },

  // May 12 — What's Next
  {
    text: "The Kickstarter is over. The real journey begins.\n\nMay-June: Manufacturing ramp (injection molding, PCB production)\nJuly: Full production (500+ units/week)\nAug-Sep: Fulfillment begins (first backers receive robots)\nQ4 2026: Retail launch (Amazon, Petco, direct)\n\nFollow @pawme_ai for weekly manufacturing updates 📦",
    threadTexts: [
      "To our 1247 backers: thank you for believing in this vision.\n\nYou're not just pre-ordering a robot. You're funding the future of AI pet care.\n\nYou're enabling open-source hardware. You're supporting a small team building something real.\n\nWe won't let you down.",
      "What happens now:\n\n1. Tooling ordered this week\n2. Manufacturing contracts finalized\n3. Component supply secured\n4. Fulfillment logistics locked\n5. 10-week sprint to first shipment\n\nIt's going to be intense. We're ready.",
    ],
    category: 'Post-Campaign',
    hashtags: [...CORE_TAGS, ...BUILD_TAGS, 'Manufacturing', 'Coming2026'],
    mentions: [],
    campaignWeek: 6, campaignDay: 7, scheduledHour: 19,
    platforms: 'both',
    ctaUrl: 'https://pawmebot.com',
  },
];

// ───────────────────────────────────────────────────────────
// Seed script execution
// ───────────────────────────────────────────────────────────

async function main() {
  // Check for --force flag
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

  console.log(`\n📅 Seeding ${posts.length} posts for 6-week campaign (Apr 1 – May 12, 2026)\n`);

  let count = 0;
  for (const post of posts) {
    const scheduledAt = scheduleDate(post.campaignWeek, post.campaignDay, post.scheduledHour, post.scheduledMinute);

    const doc: Record<string, any> = {
      text: post.text,
      category: post.category,
      hashtags: post.hashtags,
      mentions: post.mentions,
      campaignWeek: post.campaignWeek,
      campaignDay: post.campaignDay,
      scheduledHour: post.scheduledHour,
      scheduledMinute: post.scheduledMinute || 0,
      scheduledAt,
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
      doc.mediaFiles = post.mediaFiles;
    }
    if (post.mediaTypes && post.mediaTypes.length > 0) {
      doc.mediaTypes = post.mediaTypes;
    }
    if (post.videoThumbnailFiles && post.videoThumbnailFiles.length > 0) {
      doc.videoThumbnailFiles = post.videoThumbnailFiles;
    }
    if (post.threadMediaMap && post.threadMediaMap.length > 0) {
      doc.threadMediaMap = post.threadMediaMap;
    }

    await db.collection(COLLECTION).add(doc);
    count++;

    const threadLabel = post.threadTexts ? ` [${post.threadTexts.length + 1}-tweet thread]` : '';
    const mediaLabel = post.mediaFiles ? ` 📎${post.mediaFiles.length}` : '';
    console.log(
      `   ✅ W${post.campaignWeek}D${post.campaignDay} ${post.scheduledHour}:${String(post.scheduledMinute || 0).padStart(2, '0')} — ${post.category}${threadLabel}${mediaLabel}: "${post.text.substring(0, 50)}..."`
    );
  }

  const videoCount = posts.reduce((sum, p) => sum + (p.mediaTypes?.filter(t => t === 'video').length || 0), 0);
  const imageCount = posts.reduce((sum, p) => sum + (p.mediaTypes?.filter(t => t === 'image').length || 0), 0);

  console.log(`\n🎉 Seeded ${count} posts successfully!`);
  console.log(`   - Single tweets: ${posts.filter(p => !p.threadTexts).length}`);
  console.log(`   - Threads: ${posts.filter(p => p.threadTexts).length}`);
  console.log(`   - Total individual tweets: ${posts.reduce((sum, p) => sum + 1 + (p.threadTexts?.length || 0), 0)}`);
  console.log(`   - Posts with media: ${posts.filter(p => p.mediaFiles && p.mediaFiles.length > 0).length}`);
  console.log(`   - Total videos: ${videoCount}`);
  console.log(`   - Total images: ${imageCount}`);
  console.log(`\n📅 Campaign: Apr 1 – May 12, 2026 (6 weeks)`);
  console.log(`\n⚡ Next step: run 'npm run upload-media' to upload media files to Firebase Storage`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
