/**
 * src/lib/ga4.ts
 *
 * Minimal, dependency-free client for the GA4 Data API (v1beta).
 *
 * Auth: reuses the SAME service account JSON in `FIREBASE_SERVICE_ACCOUNT`
 * (the one firebase-admin already uses). We mint a short-lived OAuth2 access
 * token scoped to `analytics.readonly` by signing a JWT with the service
 * account's private key (RS256) and exchanging it at Google's token endpoint.
 * No google-auth-library / @google-analytics/data needed.
 *
 * PREREQUISITE: the service account's email must be granted at least
 * "Viewer" on the GA4 property (Admin → Property Access Management).
 * Property id comes from GA4_PROPERTY_ID (defaults to the PawMe property).
 */

import crypto from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || '520086205';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT missing client_email / private_key');
  }
  // JSON.parse already turns \n into real newlines, but guard against the
  // double-escaped case where the value was stored with literal backslash-n.
  sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

let cached: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const sa = loadServiceAccount();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(sa.private_key);
  const assertion = `${signingInput}.${signature.toString('base64url')}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `GA4 token exchange failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  cached = {
    token: json.access_token as string,
    expiresAt: now + (Number(json.expires_in) || 3600),
  };
  return cached.token;
}

export interface Ga4Row {
  dims: string[];
  mets: string[];
}

/** Run a single GA4 report and return normalised rows. */
export async function ga4RunReport(body: Record<string, unknown>): Promise<Ga4Row[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `GA4 runReport failed (${res.status}): ${JSON.stringify(json).slice(0, 400)}`,
    );
  }
  return ((json.rows as any[]) || []).map((r) => ({
    dims: (r.dimensionValues || []).map((d: any) => d.value as string),
    mets: (r.metricValues || []).map((m: any) => m.value as string),
  }));
}

export function dateRange(days: number) {
  return { startDate: `${Math.max(1, days)}daysAgo`, endDate: 'today' };
}
