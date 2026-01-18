# Running Without Firebase Admin SDK

## Overview

This project has been refactored to work **without Firebase Admin SDK** and its service account private key. All server-side operations now use either:
- Firebase Client SDK (for Firestore operations)
- Static file-based email templates
- Built-in Firebase Auth methods

---

## What Changed

### ✅ **Removed Dependencies**

1. **Firebase Admin SDK** - No longer required
2. **Service Account Private Key** - Not needed
3. **`FIREBASE_SERVICE_ACCOUNT_KEY` environment variable** - Can be removed

### ✅ **Refactored Files**

#### **1. `src/app/actions/email.ts`**
- ❌ Removed: `getAdminFirestore()` calls
- ❌ Removed: Dynamic template fetching from Firestore
- ✅ Now uses: Static template files from `src/lib/email-assets/`
- ✅ Now uses: `defaultTemplates` metadata from `src/lib/email-templates.ts`

**Impact:** Email templates are now loaded from the filesystem only. To update templates, edit the HTML files in `src/lib/email-assets/`.

#### **2. `src/app/actions/users.ts`**
- ❌ Removed: `getAdminAuth()` and `getAdminFirestore()` imports
- ✅ Now uses: Client SDK `query()` with `where('email', '==', email)` to find users
- ✅ Now uses: Client SDK `updateDoc()` for unsubscribe functionality

**Impact:** Unsubscribe still works, but uses Firestore queries instead of Auth lookups.

#### **3. `src/app/context/AuthContext.tsx`**
- ❌ Removed: `sendCustomPasswordResetEmail()` server action
- ✅ Now uses: Firebase Auth's built-in `sendPasswordResetEmail(auth, email)`

**Impact:** Password reset emails are now sent directly by Firebase (using Firebase's default template), not custom templates.

#### **4. `src/app/actions/settings.ts`**
- ✅ Already using client SDK - No changes needed!

---

## Required Environment Variables (Updated)

### **For Local Development (`.env.local`):**

```bash
# Firebase Client SDK (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Resend Email Service (Required)
RESEND_API_KEY=re_your_resend_api_key

# App URL (Required for production)
NEXT_PUBLIC_APP_URL=https://www.ayvalabs.com

# Google Gemini AI (Optional)
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

### **For Vercel (Production):**

Same as above - add all variables in Vercel Dashboard → Settings → Environment Variables

**⚠️ REMOVED:** `FIREBASE_SERVICE_ACCOUNT_KEY` is no longer needed!

---

## Firestore Security Rules

Since you're using the client SDK, your Firestore security rules are **critical** for security.

### **Current Rules Must Allow:**

1. **Users collection:**
   - Users can read/write their own document
   - Queries by email for unsubscribe functionality

2. **App Settings collection:**
   - Public read access for settings
   - Admin write access (using custom claims or email check)

3. **Verifications collection:**
   - Write access for creating verification codes
   - Read access for verifying codes

### **Deploy Your Rules:**

```bash
firebase deploy --only firestore:rules
```

---

## Email Templates

### **How It Works Now:**

1. Templates are stored as HTML files in `src/lib/email-assets/`
2. Metadata is defined in `src/lib/email-templates.ts`
3. Server actions read templates from the filesystem at runtime

### **Available Templates:**

- `verificationCode.html` - Email verification code
- `welcome.html` - Welcome email after signup
- `referralSuccess.html` - Referral success notification
- `shippingNotification.html` - Reward shipping notification
- `header.html` - Email header (logo, branding)
- `footer.html` - Email footer (unsubscribe, social links)

### **To Update a Template:**

1. Edit the HTML file in `src/lib/email-assets/`
2. Use `{{variableName}}` for dynamic content
3. Redeploy to Vercel

**No Firestore updates needed!**

---

## What Still Works

✅ **User Signup with Email Verification**
✅ **Referral System**
✅ **Points & Rewards**
✅ **Email Sending (via Resend)**
✅ **Leaderboard**
✅ **Dashboard Admin Functions**
✅ **VIP System**
✅ **Unsubscribe Functionality**
✅ **Password Reset** (using Firebase's default email)

---

## What Changed (Limitations)

### ❌ **Custom Password Reset Emails**

**Before:** Custom HTML template with your branding
**Now:** Firebase's default password reset email

**Why:** Firebase Admin SDK is required to generate custom password reset links. The client SDK only supports Firebase's built-in template.

**Workaround:** You can customize Firebase's default email template in Firebase Console:
1. Go to Firebase Console → Authentication → Templates
2. Edit "Password reset" template
3. Customize the text and styling

### ❌ **Dynamic Email Templates from Firestore**

**Before:** Could update email templates via dashboard and store in Firestore
**Now:** Templates are static files that require code deployment to update

**Why:** Admin SDK was used to fetch templates from Firestore with elevated permissions.

**Workaround:** Edit HTML files in `src/lib/email-assets/` and redeploy.

### ❌ **Setting Custom User Claims**

**Before:** Could set admin roles via `setAdminClaim.ts` script
**Now:** Not possible without Admin SDK

**Why:** Custom claims require Admin SDK.

**Workaround:** Use Firestore-based role checking:
- Store `isAdmin: true` in user document
- Check this field in security rules and client code
- Update `firestore.rules` to check `request.resource.data.isAdmin == true`

---

## Security Considerations

### ⚠️ **Important:**

Without Admin SDK, you rely entirely on:
1. **Firestore Security Rules** - Must be correctly configured
2. **Client SDK permissions** - Limited by Firebase Auth
3. **Server Actions** - Still server-side, but no elevated privileges

### ✅ **Best Practices:**

1. **Deploy strict Firestore rules:**
   ```javascript
   match /users/{userId} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```

2. **Never trust client data:**
   - Validate all inputs in server actions
   - Use Firestore transactions for atomic operations

3. **Use Firebase Auth features:**
   - Email verification
   - Password reset
   - Google Sign-In

---

## Deployment Checklist

- [ ] Remove `FIREBASE_SERVICE_ACCOUNT_KEY` from Vercel (optional cleanup)
- [ ] Ensure `RESEND_API_KEY` is set in Vercel
- [ ] Verify domain in Resend dashboard (ayvalabs.com)
- [ ] Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- [ ] Test signup flow on production
- [ ] Test password reset on production
- [ ] Test email sending on production

---

## Troubleshooting

### ❌ "Could not send verification code"

**Check:**
1. `RESEND_API_KEY` is set in Vercel
2. Domain `ayvalabs.com` is verified in Resend
3. From email is `pawme@ayvalabs.com` (verified domain)

**View logs:**
```bash
vercel logs --follow
```

### ❌ "Permission denied" in Firestore

**Check:**
1. Firestore rules are deployed
2. User is authenticated
3. Rules allow the operation

**Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

### ❌ Email templates not found

**Check:**
1. Files exist in `src/lib/email-assets/`
2. Filenames match template IDs in `defaultTemplates`
3. Files are included in build (not in `.gitignore`)

---

## Migration Notes

If you previously had Firebase Admin SDK set up:

1. **Remove these files (optional):**
   - `serviceAccountKey.json`
   - `scripts/setAdminClaim.ts`
   - `src/lib/firebase-admin.ts`

2. **Remove from package.json:**
   - `firebase-admin` dependency
   - `set-admin` script

3. **Update documentation:**
   - Remove references to service account key
   - Update deployment guides

---

## Summary

Your PawMe project now runs entirely on:
- ✅ Firebase Client SDK (free tier friendly)
- ✅ Resend for email sending
- ✅ Static file-based templates
- ✅ Vercel serverless functions

**No service account key required!**
**No Firebase Admin SDK billing!**
**Simpler deployment process!**
