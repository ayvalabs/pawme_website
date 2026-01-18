# Firebase Admin SDK Setup Guide

## Why Do You Need This?

Firebase Admin SDK is used for **server-side operations** that require elevated privileges:
- Sending emails (accessing Firestore for templates)
- Setting custom user claims (admin roles)
- Server actions that need to bypass security rules
- Updating app settings from the dashboard

**Without this, your production deployment will fail** when trying to send verification emails or perform admin operations.

---

## Step-by-Step Setup

### 1. Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Settings** → **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Confirm and download the JSON file

**The file looks like this:**
```json
{
  "type": "service_account",
  "project_id": "pawme-bc0a0",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@pawme-bc0a0.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

### 2. Local Development Setup

**Option A: Using the JSON file directly (for scripts)**

1. Save the downloaded file as `serviceAccountKey.json` in your project root
2. This is used by scripts like `pnpm run set-admin` and `pnpm run seed-rewards`
3. ✅ Already in `.gitignore` - won't be committed

**Option B: Using environment variable (for Next.js app)**

1. Open or create `.env.local` in your project root
2. Add this line (replace with your actual JSON):

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"pawme-bc0a0","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@pawme-bc0a0.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}'
```

**⚠️ Important:**
- Copy the **entire JSON content** as a **single line**
- Wrap it in **single quotes** `'...'`
- Keep the `\n` characters in the private key - they're important!

3. Restart your dev server: `pnpm run dev`

---

### 3. Vercel (Production) Setup

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (ayvalabs.com)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the entire JSON content (can be multi-line or single-line)
   - **Environments:** Select all (Production, Preview, Development)
6. Click **Save**
7. Go to **Deployments** tab
8. Click **⋯** on the latest deployment → **Redeploy**

---

## Verification

### Check if it's working locally:

```bash
pnpm run dev
```

Look for this in the console:
```
✅ [Firebase Admin] Successfully initialized with service account.
```

If you see this instead:
```
⚠️ [Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY not found
```

Then the environment variable is not set correctly.

### Check if it's working on Vercel:

1. Deploy your changes
2. Try to sign up on ayvalabs.com
3. Check Vercel logs:
   ```bash
   vercel logs --follow
   ```
4. Look for:
   ```
   🔵 [EMAIL_ACTION] Environment check - FIREBASE_SERVICE_ACCOUNT_KEY exists: true
   ✅ [Firebase Admin] Successfully initialized with service account.
   ```

---

## Common Issues

### ❌ "Invalid Firebase service account configuration"

**Cause:** JSON is malformed or has syntax errors

**Solution:**
1. Make sure you copied the **entire** JSON file
2. Check that all quotes are preserved
3. Ensure `\n` characters in the private key are kept
4. Try wrapping in single quotes instead of double quotes

### ❌ "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY"

**Cause:** The JSON string is not valid JSON

**Solution:**
1. Validate your JSON at https://jsonlint.com/
2. Make sure there are no extra characters or line breaks
3. In Vercel, you can paste the JSON as-is (multi-line is OK)

### ❌ "Permission denied" errors in Firestore

**Cause:** Service account doesn't have proper permissions

**Solution:**
1. Go to Firebase Console → Firestore → Rules
2. Deploy your `firestore.rules` file:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Ensure the service account has "Firebase Admin SDK Administrator Service Agent" role

---

## Security Best Practices

✅ **DO:**
- Keep `serviceAccountKey.json` in `.gitignore`
- Use environment variables for the key
- Rotate keys periodically (every 90 days)
- Use different service accounts for dev/prod if possible

❌ **DON'T:**
- Commit the JSON file to Git
- Share the key in Slack/email
- Hardcode the key in your source code
- Use the same key across multiple projects

---

## Need Help?

If you're still having issues:

1. Check the logs for specific error messages
2. Verify the JSON is valid
3. Ensure all environment variables are set in Vercel
4. Redeploy after adding environment variables
5. Check Firebase Console for service account permissions
