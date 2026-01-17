# Admin User Setup Guide

This guide explains how to set up `pawme@ayvalabs.com` as an admin user with proper permissions to upload images and manage the application.

## Problem

You're getting this error when trying to upload reward images:
```
Error: Failed to upload image for "Pet Collar": Unauthorized: Please ensure you are logged in as an admin.
```

This happens because Firebase Storage rules check for admin privileges via custom claims, which need to be set using the Firebase Admin SDK.

## Solution Overview

1. Download Firebase service account key
2. Set admin custom claims using a script
3. Deploy updated security rules
4. Sign out and sign back in

---

## Step 1: Download Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ next to "Project Overview" → **Project settings**
4. Navigate to the **Service accounts** tab
5. Click **Generate new private key**
6. Save the downloaded JSON file as `serviceAccountKey.json` in the root of your project

**⚠️ IMPORTANT:** Add this file to `.gitignore` to prevent committing it to version control!

```bash
echo "serviceAccountKey.json" >> .gitignore
```

---

## Step 2: Set Admin Custom Claims

Run the script to set admin privileges for `pawme@ayvalabs.com`:

```bash
pnpm tsx scripts/setAdminClaim.ts
```

**Expected output:**
```
✅ Successfully set admin claim for pawme@ayvalabs.com
   User ID: abc123xyz...
   Custom claims: { admin: true, role: 'admin' }

⚠️  The user needs to sign out and sign back in for the changes to take effect.

Verified custom claims: { admin: true, role: 'admin' }
```

**If you get an error:**

### Error: User not found
```
❌ Error setting admin claim: There is no user record corresponding to the provided identifier.
```

**Solution:** The user `pawme@ayvalabs.com` needs to sign up in your application first:
1. Go to your website
2. Sign up with `pawme@ayvalabs.com`
3. Complete the email verification
4. Run the script again

### Error: Service account key not found
```
❌ Error: ENOENT: no such file or directory, open '../serviceAccountKey.json'
```

**Solution:** Make sure you've downloaded the service account key and placed it in the project root as `serviceAccountKey.json`.

---

## Step 3: Deploy Updated Security Rules

Deploy the updated Firestore and Storage rules that recognize admin custom claims:

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage
```

The rules now check for **both** custom claims AND email:
- `request.auth.token.admin == true` (custom claim - preferred)
- `request.auth.token.email == 'pawme@ayvalabs.com'` (fallback)

---

## Step 4: Sign Out and Sign Back In

**This is critical!** Custom claims are only applied to new auth tokens.

1. In your application, **sign out** completely
2. **Sign back in** with `pawme@ayvalabs.com`
3. Your new auth token will now include the admin custom claim

---

## Step 5: Test Image Upload

1. Go to **Dashboard** → **Settings** tab
2. Scroll to **Point Rewards** section
3. Try uploading a reward image
4. Click **Save Point Rewards**

**Expected result:** ✅ Image uploads successfully without CORS or authorization errors.

---

## How It Works

### Custom Claims
Firebase custom claims are key-value pairs attached to a user's auth token:

```typescript
{
  admin: true,
  role: 'admin'
}
```

### Security Rules
The updated rules check for admin status:

**Firestore Rules (`firestore.rules`):**
```javascript
function isAdmin() {
  return request.auth != null && 
         (request.auth.token.admin == true || 
          request.auth.token.email == 'pawme@ayvalabs.com');
}
```

**Storage Rules (`storage.rules`):**
```javascript
function isAdmin() {
  return request.auth != null && 
         (request.auth.token.admin == true || 
          request.auth.token.email == 'pawme@ayvalabs.com');
}
```

---

## Troubleshooting

### Still getting "Unauthorized" error after setup

1. **Verify custom claims are set:**
   ```bash
   pnpm tsx scripts/setAdminClaim.ts
   ```

2. **Check if you signed out and back in:**
   - Custom claims only apply to NEW auth tokens
   - You MUST sign out and sign back in

3. **Verify rules are deployed:**
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

4. **Check browser console:**
   - Open DevTools (F12)
   - Look for detailed error messages
   - Check if auth token includes `admin: true`

5. **Force token refresh (if needed):**
   Add this temporarily to your code to verify claims:
   ```typescript
   import { auth } from '@/firebase/config';
   
   const user = auth.currentUser;
   if (user) {
     const tokenResult = await user.getIdTokenResult(true); // Force refresh
     console.log('Custom claims:', tokenResult.claims);
   }
   ```

### CORS errors persist

If you still see CORS errors:
1. Follow the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) to apply CORS configuration
2. Clear browser cache and hard reload
3. Wait 5-10 minutes for changes to propagate

---

## Adding More Admin Users

To add additional admin users:

1. **Edit the script** `scripts/setAdminClaim.ts`:
   ```typescript
   const ADMIN_EMAIL = 'newadmin@example.com'; // Change this
   ```

2. **Run the script:**
   ```bash
   pnpm tsx scripts/setAdminClaim.ts
   ```

3. **Have the user sign out and back in**

**Alternative: Set multiple admins at once:**

Create a new script `scripts/setMultipleAdmins.ts`:
```typescript
import * as admin from 'firebase-admin';

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const ADMIN_EMAILS = [
  'pawme@ayvalabs.com',
  'admin2@example.com',
  'admin3@example.com'
];

async function setMultipleAdmins() {
  for (const email of ADMIN_EMAILS) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, {
        admin: true,
        role: 'admin'
      });
      console.log(`✅ Set admin claim for ${email}`);
    } catch (error: any) {
      console.error(`❌ Failed for ${email}:`, error.message);
    }
  }
  process.exit(0);
}

setMultipleAdmins();
```

---

## Security Best Practices

1. **Never commit `serviceAccountKey.json`** - It has full admin access to your Firebase project
2. **Limit admin users** - Only give admin access to trusted users
3. **Rotate service account keys** - Periodically generate new keys and delete old ones
4. **Monitor admin actions** - Set up Firebase logging to track admin operations
5. **Use environment variables** - For production, store service account credentials securely

---

## Quick Reference

```bash
# 1. Download service account key from Firebase Console
# 2. Save as serviceAccountKey.json in project root

# 3. Run admin setup script
pnpm tsx scripts/setAdminClaim.ts

# 4. Deploy rules
firebase deploy --only firestore:rules,storage

# 5. Sign out and sign back in to your app

# 6. Test image upload in Dashboard > Settings
```

---

## Need Help?

If you're still experiencing issues:
1. Check the browser console for detailed error messages
2. Verify Firebase project configuration in `.env.local`
3. Ensure all Firebase services are enabled in the Firebase Console
4. Check Firebase Console logs for server-side errors
