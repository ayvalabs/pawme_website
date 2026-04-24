#!/usr/bin/env node
/**
 * Gemini sanity check: lists every model the current API key can reach.
 *
 *   node tools/gemini-check-key.mjs
 *
 * Uses GEMINI_API_KEY from .env.local if present, otherwise from the
 * current environment. Prints: status, available model names, whether the
 * list includes the models pawme-gemini.ts is configured to use.
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
  console.error('❌ GEMINI_API_KEY not found in env or .env.local');
  process.exit(1);
}
console.log(`Using GEMINI_API_KEY (starts with ${KEY.slice(0, 6)}…, length ${KEY.length})\n`);

const EXPECTED = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`;

try {
  const start = Date.now();
  const res = await fetch(url);
  const ms = Date.now() - start;
  console.log(`GET /v1beta/models → ${res.status} in ${ms}ms`);
  if (!res.ok) {
    const text = await res.text();
    console.error('\n❌ API rejected the key/request:\n');
    console.error(text.slice(0, 2000));
    process.exit(1);
  }

  const data = await res.json();
  const models = (data.models || []).map((m) => String(m.name || '').replace(/^models\//, ''));
  console.log(`\nFound ${models.length} model(s) accessible to this key:\n`);
  for (const name of models.sort()) {
    const supportsGenerate = (data.models.find((m) => m.name?.endsWith(name))?.supportedGenerationMethods || []).includes('generateContent');
    console.log(`  ${supportsGenerate ? '✅' : '⚪️'} ${name}`);
  }

  console.log('\n--- pawme-gemini expected models ---');
  for (const name of EXPECTED) {
    const present = models.some((m) => m === name || m.endsWith(`/${name}`));
    console.log(`  ${present ? '✅' : '❌'} ${name}${present ? '' : '  (not reachable with this key)'}`);
  }
} catch (err) {
  console.error('❌ fetch threw:', err?.message || err);
  process.exit(1);
}
