# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these environment variables in your Vercel project settings:
**Project Settings → Environment Variables**

### 🔥 Firebase Configuration (Client SDK)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 🔐 Firebase Admin SDK (Server-side)

**CRITICAL:** This must be the **entire JSON content** of your service account key file, not a file path.

```bash
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**How to get this:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Copy the **entire contents** of the JSON file
5. Paste it as the value for `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel

### 📧 Resend Email Service

```bash
RESEND_API_KEY=re_your_resend_api_key
```

**How to get this:**
1. Go to https://resend.com/api-keys
2. Create a new API key
3. Copy the key (starts with `re_`)

**IMPORTANT:** You must also verify your sending domain in Resend:
- Go to https://resend.com/domains
- Add and verify `ayvalabs.com`
- Update DNS records as instructed

### 🌐 App URL

```bash
NEXT_PUBLIC_APP_URL=https://www.ayvalabs.com
```

### 🔍 Google Gemini AI (Optional - for AI features)

```bash
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

---

## Vercel Deployment Checklist

- [ ] All Firebase client SDK variables added (7 variables starting with `NEXT_PUBLIC_FIREBASE_`)
- [ ] Firebase Admin service account JSON added as `FIREBASE_SERVICE_ACCOUNT_KEY`
- [ ] Resend API key added as `RESEND_API_KEY`
- [ ] Domain verified in Resend dashboard
- [ ] App URL set as `NEXT_PUBLIC_APP_URL`
- [ ] Environment variables set for **Production**, **Preview**, and **Development** environments
- [ ] Redeployed after adding environment variables

---

## Common Issues & Solutions

### ❌ "Could not send verification code"

**Possible causes:**
1. **Missing RESEND_API_KEY** - Check Vercel env vars
2. **Domain not verified in Resend** - Verify ayvalabs.com in Resend dashboard
3. **Invalid from email** - Must use `pawme@ayvalabs.com` (verified domain)

**Check Vercel logs:**
```bash
vercel logs your-deployment-url --follow
```

Look for:
- `❌ [EMAIL_ACTION] FATAL: RESEND_API_KEY is not set`
- `❌ [EMAIL_ACTION] Resend API returned an error`
- Domain verification errors

### ❌ Firebase Admin errors

**Possible causes:**
1. **Invalid service account JSON** - Ensure entire JSON is copied correctly
2. **Newlines in private key** - The `\n` characters must be preserved
3. **Missing environment variable** - Check `FIREBASE_SERVICE_ACCOUNT_KEY` exists

**Check Vercel logs for:**
- `❌ [EMAIL_ACTION] Environment check - FIREBASE_SERVICE_ACCOUNT_KEY exists: false`
- Firebase Admin initialization errors

### ❌ Firestore permission denied

**Solution:**
1. Deploy updated `firestore.rules` from your project
2. Run: `firebase deploy --only firestore:rules`
3. Ensure admin user has custom claims set: `pnpm run set-admin`

---

## Viewing Logs in Production

### Method 1: Vercel Dashboard
1. Go to your project in Vercel
2. Click on the deployment
3. Click "Functions" tab
4. View real-time logs

### Method 2: Vercel CLI
```bash
vercel logs --follow
```

### Method 3: Browser Console
Open browser console on ayvalabs.com and check for client-side errors

---

## Testing After Deployment

1. **Test signup flow:**
   - Go to https://www.ayvalabs.com
   - Click "Join Waitlist"
   - Enter email and create account
   - Check if verification code email arrives

2. **Check Vercel logs immediately** if signup fails

3. **Verify email in inbox** (check spam folder too)

---

## Environment Variable Format Examples

### ✅ Correct FIREBASE_SERVICE_ACCOUNT_KEY format:
```json
{"type":"service_account","project_id":"pawme-bc0a0","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@pawme-bc0a0.iam.gserviceaccount.com"}
```

### ❌ Wrong format (file path):
```
./serviceAccountKey.json
```

### ❌ Wrong format (missing quotes):
```
{type:service_account,project_id:pawme-bc0a0}
```

---

## Need Help?

If you're still seeing errors after following this guide:

1. Check Vercel function logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure domain is verified in Resend
4. Test locally first with `pnpm run dev`
5. Check that Firebase rules are deployed
