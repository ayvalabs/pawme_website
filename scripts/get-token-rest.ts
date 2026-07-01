/**
 * Get Firebase ID Token via REST API (no browser needed)
 *
 * Usage:
 *   FIREBASE_EMAIL=you@example.com FIREBASE_PASSWORD=yourpassword \
 *     pnpm tsx scripts/get-token-rest.ts
 *
 * This signs in via Firebase Auth REST API and prints the ID token.
 * The token is valid for ~1 hour.
 */

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC8oFq2FeOBvJsA7q7p4cBUAHZL7COKAoY';
const EMAIL = process.env.FIREBASE_EMAIL || '';
const PASSWORD = process.env.FIREBASE_PASSWORD || '';

if (!EMAIL || !PASSWORD) {
  console.error('❌ Set FIREBASE_EMAIL and FIREBASE_PASSWORD env vars.');
  process.exit(1);
}

async function getToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Sign-in failed:', data.error?.message || JSON.stringify(data));
    process.exit(1);
  }

  console.log('✅ Token retrieved successfully!');
  console.log('');
  console.log('ID_TOKEN:');
  console.log(data.idToken);
  console.log('');
  console.log('Local ID (UID):', data.localId);
  console.log('Expires in:', data.expiresIn, 'seconds (~1 hour)');
  console.log('');
  console.log('Use it like this:');
  console.log(`  FIREBASE_ID_TOKEN=${data.idToken} pnpm tsx scripts/test-mobile-apis-prod.ts`);
}

getToken().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
