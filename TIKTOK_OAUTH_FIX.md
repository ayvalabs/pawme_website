# TikTok OAuth PKCE Fix

## Issue
TikTok OAuth was failing with error: `code_challenge` parameter missing. TikTok now requires PKCE (Proof Key for Code Exchange) for OAuth authorization.

## What Was Fixed

### 1. **Added PKCE Generation** (`/api/auth/tiktok/connect/route.ts`)

**Changes:**
- Generate `code_verifier` (128-character random hex string)
- Generate `code_challenge` (SHA-256 hash of code_verifier in hex format)
- Store `code_verifier` and `state` in Firestore for later retrieval
- Add `code_challenge` and `code_challenge_method=S256` to authorization URL

**Code:**
```typescript
function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('hex'); // 128 chars
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('hex');
}
```

### 2. **Updated Authorization URL**

**Before:**
```
https://www.tiktok.com/v2/auth/authorize/
  ?client_key=...
  &scope=...
  &response_type=code
  &redirect_uri=...
  &state=...
```

**After:**
```
https://www.tiktok.com/v2/auth/authorize/
  ?client_key=...
  &scope=...
  &response_type=code
  &redirect_uri=...
  &state=...
  &code_challenge=...          ← NEW
  &code_challenge_method=S256  ← NEW
```

### 3. **Updated Token Exchange** (`/api/auth/tiktok/callback/route.ts`)

**Changes:**
- Retrieve stored `code_verifier` from Firestore using `state` parameter
- Validate `state` matches (CSRF protection)
- Check PKCE data hasn't expired (10-minute window)
- Include `code_verifier` in token exchange request
- Clean up PKCE data after successful exchange

**Token Request:**
```typescript
body: new URLSearchParams({
  client_key: TIKTOK_CLIENT_KEY,
  client_secret: TIKTOK_CLIENT_SECRET,
  code,
  grant_type: 'authorization_code',
  redirect_uri: REDIRECT_URI,
  code_verifier: codeVerifier,  ← NEW
})
```

## How PKCE Works

```
┌─────────────────────────────────────────────────────────┐
│  1. User clicks "Connect TikTok"                        │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  2. Generate PKCE pair:                                 │
│     - code_verifier (random 128-char string)            │
│     - code_challenge (SHA-256 hash of verifier)         │
│                                                          │
│  3. Store in Firestore:                                 │
│     admin-settings/tiktok-pkce                          │
│     {                                                    │
│       state: "random-state",                            │
│       codeVerifier: "...",                              │
│       expiresAt: timestamp + 10min                      │
│     }                                                    │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  4. Redirect to TikTok with:                            │
│     - code_challenge                                    │
│     - code_challenge_method=S256                        │
│     - state                                             │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  5. User authorizes on TikTok                           │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  6. TikTok redirects back with:                         │
│     - code                                              │
│     - state                                             │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  7. Callback retrieves PKCE data:                       │
│     - Validate state matches                            │
│     - Get stored code_verifier                          │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  8. Exchange code for token with:                       │
│     - code                                              │
│     - code_verifier                                     │
│                                                          │
│  TikTok validates:                                      │
│  SHA256(code_verifier) == code_challenge                │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  9. Success! Store access token                         │
│     Clean up PKCE data                                  │
└─────────────────────────────────────────────────────────┘
```

## Security Benefits

1. **Prevents Authorization Code Interception**
   - Even if attacker intercepts the `code`, they can't exchange it without `code_verifier`

2. **CSRF Protection**
   - `state` parameter validates the request originated from our app

3. **Time-Limited**
   - PKCE data expires after 10 minutes

4. **One-Time Use**
   - PKCE data is deleted after successful token exchange

## Files Modified

1. **`src/app/api/auth/tiktok/connect/route.ts`**
   - Added PKCE generation
   - Store code_verifier in Firestore
   - Include code_challenge in auth URL

2. **`src/app/api/auth/tiktok/callback/route.ts`**
   - Retrieve code_verifier from Firestore
   - Validate state parameter
   - Send code_verifier in token exchange
   - Clean up PKCE data

## Testing

1. **Start dev server:**
   ```bash
   pnpm dev
   ```

2. **Navigate to:**
   ```
   http://localhost:3000/dashboard/socials
   ```

3. **Click TikTok tab → "Connect TikTok Account"**

4. **Expected flow:**
   - OAuth popup opens
   - TikTok authorization page loads (no error)
   - After authorizing, popup closes
   - TikTok stats appear in dashboard

## Troubleshooting

### Error: "code_challenge parameter missing"
- **Cause:** Old code without PKCE
- **Fix:** Deploy the updated code

### Error: "pkce_not_found"
- **Cause:** PKCE data expired or wasn't stored
- **Fix:** Try connecting again (PKCE data expires after 10 minutes)

### Error: "state_mismatch"
- **Cause:** State parameter doesn't match stored value
- **Fix:** Possible CSRF attack or stale data - try again

### Error: "code verifier or code challenge is invalid"
- **Cause:** Mismatch between code_verifier and code_challenge
- **Fix:** Check hash generation (should be SHA-256 hex)

## Environment Variables Required

```bash
TIKTOK_CLIENT_KEY=aw2su2yzgvx13mxm
TIKTOK_CLIENT_SECRET=ncBtmlVpgSsx6Dm0HkVMDopz7SapimMs
TIKTOK_APPI_ID=7598282466343880760
TIKTOK_REDIRECT_URI=http://localhost:3000/api/auth/tiktok/callback
```

**Note:** For production, use HTTPS redirect URI.

## What You Get After Connecting

- ✅ Follower count
- ✅ Following count  
- ✅ Total likes
- ✅ Video count
- ✅ Recent videos list
- ✅ Daily metrics snapshot

## References

- [TikTok OAuth Documentation](https://developers.tiktok.com/doc/login-kit-web/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [TikTok API v2](https://developers.tiktok.com/doc/web-api-reference-overview/)
