/**
 * Apple Wallet pass generator — per PRD-pet-passport-wallet.md (iOS Phase A).
 *
 * Wraps `passkit-generator` to sign a per-pet generic .pkpass. Returns 503
 * when env vars / cert haven't been provisioned yet so the app gracefully
 * shows "coming soon" instead of crashing.
 *
 * Provisioning blockers (USER):
 *   - Apple Developer → Identifiers → Pass Type IDs → New
 *     identifier: pass.ai.ayvalabs.pawme.passport
 *   - Generate .p12 cert + password
 *   - APPLE_PASS_TYPE_ID, APPLE_PASS_CERT_P12_BASE64, APPLE_PASS_KEY_PASSWORD env
 *   - Public assets at /public/wallet-assets/icon.png + logo.png + icon@2x.png
 *
 * Until those land, this lib throws a 503 from the route — no 500s.
 */

import { PKPass } from 'passkit-generator';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const TEAM_ID = 'UX38Y8876X';

export interface PassportPassInput {
  uid: string;
  petId: string;
  petName: string;
  breed?: string | null;
  species?: string | null;
  ageLabel?: string | null;
  weightLabel?: string | null;
  passportIdNo?: string | null;
  publicPassportUrl: string;          // QR target
  photoUrl?: string | null;           // optional pet photo (used as strip image)
  careNotes?: string | null;
  allergens?: string[];
}

export function walletConfigState(): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.APPLE_PASS_TYPE_ID) missing.push('APPLE_PASS_TYPE_ID');
  if (!process.env.APPLE_PASS_CERT_P12_BASE64) missing.push('APPLE_PASS_CERT_P12_BASE64');
  if (!process.env.APPLE_PASS_KEY_PASSWORD) missing.push('APPLE_PASS_KEY_PASSWORD');
  const assetsDir = path.join(process.cwd(), 'public', 'wallet-assets');
  if (!existsSync(path.join(assetsDir, 'icon.png'))) missing.push('public/wallet-assets/icon.png');
  if (!existsSync(path.join(assetsDir, 'logo.png'))) missing.push('public/wallet-assets/logo.png');
  return { ready: missing.length === 0, missing };
}

/**
 * Generate a signed .pkpass for the given pet. Throws if not configured —
 * caller should check `walletConfigState().ready` first and 503 if false.
 */
export async function generateApplePassportPass(input: PassportPassInput): Promise<Buffer> {
  const state = walletConfigState();
  if (!state.ready) {
    const err = new Error(`Apple Wallet not configured. Missing: ${state.missing.join(', ')}`) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }

  const assetsDir = path.join(process.cwd(), 'public', 'wallet-assets');
  const certP12 = Buffer.from(process.env.APPLE_PASS_CERT_P12_BASE64!, 'base64');
  const signerKeyPassword = process.env.APPLE_PASS_KEY_PASSWORD!;
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID!;
  const passEmoji = (input.species || '').toLowerCase() === 'cat' ? '🐱' : '🐶';

  const allergensLine = input.allergens?.length
    ? input.allergens.slice(0, 6).join(', ')
    : null;

  const pass = new PKPass(
    {
      'icon.png': readFileSync(path.join(assetsDir, 'icon.png')),
      'icon@2x.png': existsSync(path.join(assetsDir, 'icon@2x.png'))
        ? readFileSync(path.join(assetsDir, 'icon@2x.png'))
        : readFileSync(path.join(assetsDir, 'icon.png')),
      'logo.png': readFileSync(path.join(assetsDir, 'logo.png')),
    },
    {
      signerCert: certP12,
      signerKey: certP12,
      wwdr: readFileSync(path.join(assetsDir, 'wwdr.pem')), // user provides WWDR cert
      signerKeyPassphrase: signerKeyPassword,
    },
    {
      formatVersion: 1,
      passTypeIdentifier,
      teamIdentifier: TEAM_ID,
      organizationName: 'PawMe',
      // Deterministic serial: one pass per pet per user — re-issuing replaces.
      serialNumber: `${input.uid}_${input.petId}`,
      description: `${input.petName}'s PawMe Passport`,
      foregroundColor: 'rgb(30, 24, 16)',
      backgroundColor: 'rgb(250, 246, 242)',
      labelColor: 'rgb(122, 109, 95)',
      logoText: `PawMe ${passEmoji}`,
    },
  );

  pass.type = 'generic';
  pass.headerFields.push({ key: 'pet', label: 'PET', value: input.petName });
  pass.primaryFields.push({ key: 'name', label: 'NAME', value: input.petName });
  pass.secondaryFields.push({ key: 'breed', label: 'BREED', value: input.breed || '—' });
  if (input.ageLabel) pass.secondaryFields.push({ key: 'age', label: 'AGE', value: input.ageLabel });
  pass.auxiliaryFields.push({ key: 'weight', label: 'WEIGHT', value: input.weightLabel || '—' });
  if (input.passportIdNo) pass.auxiliaryFields.push({ key: 'pid', label: 'PASSPORT', value: input.passportIdNo });

  // Back fields: care notes + allergens (only shown when user flips the pass).
  if (input.careNotes) pass.backFields.push({ key: 'care', label: 'Care notes', value: input.careNotes });
  if (allergensLine) pass.backFields.push({ key: 'avoid', label: 'DO NOT FEED', value: allergensLine });
  pass.backFields.push({
    key: 'view',
    label: 'Open digital passport',
    value: input.publicPassportUrl,
  });

  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: input.publicPassportUrl,
    messageEncoding: 'iso-8859-1',
    altText: `Scan to view ${input.petName}'s passport`,
  });

  return pass.getAsBuffer();
}
