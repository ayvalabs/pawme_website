# Email Template Loading Fix

## Problem Identified

The verification email was failing with error: **"Email template 'verificationCode' is missing."**

### Root Causes:

1. **Filename Mismatch**: Template files use kebab-case (`verification-code.html`) but code was looking for camelCase (`verificationCode.html`)
2. **Missing Header/Footer**: `header.html` and `footer.html` files didn't exist
3. **Insufficient Logging**: Hard to debug where the failure occurred

---

## Fixes Applied

### 1. **Added Filename Conversion Function**

Created `templateIdToFilename()` to convert camelCase template IDs to kebab-case filenames:

```typescript
function templateIdToFilename(templateId: string): string {
  // Convert camelCase to kebab-case: verificationCode -> verification-code
  return templateId.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
```

**Mapping:**
- `verificationCode` → `verification-code.html` ✅
- `referralSuccess` → `referral-success.html` ✅
- `passwordReset` → `password-reset.html` ✅
- `shippingNotification` → `shipping-notification.html` ✅
- `productUpdate` → `product-update.html` ✅

### 2. **Created Missing Template Files**

**Created `src/lib/email-assets/header.html`:**
- Professional email header with PawMe branding
- Purple gradient background
- Responsive design
- Uses `{{emailTitle}}` variable

**Created `src/lib/email-assets/footer.html`:**
- Social media links
- Unsubscribe link using `{{unsubscribeLink}}` variable
- Privacy policy link
- Copyright notice

### 3. **Added Comprehensive Logging**

Added step-by-step logging throughout the email sending process:

**Step 1: Template Loading**
```
🔵 Looking up metadata for template ID: 'verificationCode'
✅ Found metadata for 'verificationCode'
🔵 Attempting to read file: /path/to/verification-code.html
✅ Successfully read template file 'verification-code.html' (1234 characters)
```

**Step 2: Variable Replacement**
```
🔵 Processing template variables...
🔵 Variables provided: ['userName', 'code', 'emailTitle']
✅ Variables replaced in subject and body
```

**Step 3: Header/Footer Loading**
```
🔵 Loading header and footer templates...
✅ Header (2500 chars) and footer (1200 chars) loaded
```

**Step 4: HTML Assembly**
```
🔵 Assembling final email HTML...
🔵 App URL: https://www.ayvalabs.com
✅ Final HTML assembled (5000 total characters)
```

**Step 5: Sending via Resend**
```
🔵 Sending email via Resend API...
🔵 Template: verificationCode
🔵 To: user@example.com
🔵 From: PawMe <pawme@ayvalabs.com>
🔵 Subject: Your PawMe Verification Code
✅ SUCCESS! Email sent via Resend. Email ID: abc123
```

---

## Files Modified

1. **`src/app/actions/email.ts`**
   - Added `templateIdToFilename()` function
   - Updated `getTemplateFromFile()` to use kebab-case filenames
   - Added detailed logging at each step
   - Fixed header/footer loading to use file-based templates

2. **`src/lib/email-assets/header.html`** (NEW)
   - Professional email header template

3. **`src/lib/email-assets/footer.html`** (NEW)
   - Professional email footer template

---

## Template Files Structure

```
src/lib/email-assets/
├── header.html                    ✅ (NEW)
├── footer.html                    ✅ (NEW)
├── verification-code.html         ✅ (existing)
├── welcome.html                   ✅ (existing)
├── referral-success.html          ✅ (existing)
├── password-reset.html            ✅ (existing)
├── shipping-notification.html     ✅ (existing)
└── product-update.html            ✅ (existing)
```

---

## Testing

### Local Testing:
```bash
pnpm run dev
```

Try to sign up with a new account - you should see detailed logs in the terminal showing each step of the email sending process.

### Production Testing (Vercel):

After deploying, check Vercel logs:
```bash
vercel logs --follow
```

Look for the step-by-step logs to identify exactly where any failure occurs.

---

## Expected Log Output (Success)

```
🔵 [ACTION] Initiating verification code send for: user@example.com
✅ [ACTION] Name and email are present.
✅ [ACTION] Email is not from a disposable provider.
🔵 [ACTION] Generated code 1234 for user@example.com
🔵 [ACTION] (1/2) Storing verification document in Firestore...
✅ [ACTION] (1/2) Verification document created successfully
🔵 [ACTION] (2/2) Sending verification email via Resend...
🔵 [EMAIL_ACTION] sendVerificationCodeEmail called for: user@example.com
🔵 [EMAIL_ACTION] Starting renderAndSend for template: verificationCode
🔵 [EMAIL_ACTION] Environment check - RESEND_API_KEY exists: true
🔵 [EMAIL_ACTION] Step 1: Loading template 'verificationCode'...
🔵 [EMAIL_ACTION] Looking up metadata for template ID: 'verificationCode'
✅ [EMAIL_ACTION] Found metadata for 'verificationCode'
🔵 [EMAIL_ACTION] Attempting to read file: /var/task/src/lib/email-assets/verification-code.html
✅ [EMAIL_ACTION] Successfully read template file 'verification-code.html' (1234 characters)
✅ [EMAIL_ACTION] Step 1 complete: Template loaded successfully
🔵 [EMAIL_ACTION] Step 2: Processing template variables...
🔵 [EMAIL_ACTION] Variables provided: ['userName', 'code', 'emailTitle']
✅ [EMAIL_ACTION] Step 2 complete: Variables replaced
🔵 [EMAIL_ACTION] Step 3: Loading header and footer templates...
✅ [EMAIL_ACTION] Step 3 complete: Header (2500 chars) and footer (1200 chars) loaded
🔵 [EMAIL_ACTION] Step 4: Assembling final email HTML...
🔵 [EMAIL_ACTION] App URL: https://www.ayvalabs.com
✅ [EMAIL_ACTION] Step 4 complete: Final HTML assembled (5000 total characters)
🔵 [EMAIL_ACTION] Step 5: Sending email via Resend API...
✅ [EMAIL_ACTION] ✅ SUCCESS! Email sent via Resend. Email ID: abc123
✅ [EMAIL_ACTION] Verification email completed successfully
✅ [ACTION] (2/2) Verification email sent successfully.
```

---

## Troubleshooting

### If you still see "Email template 'verificationCode' is missing":

1. **Check file exists:**
   ```bash
   ls -la src/lib/email-assets/verification-code.html
   ```

2. **Check logs for specific error:**
   - Look for `❌ [EMAIL_ACTION] Failed to read template file`
   - Check the error code (ENOENT = file not found, EACCES = permission denied)

3. **Verify build includes template files:**
   - Ensure `src/lib/email-assets/*.html` is not in `.gitignore`
   - Check Vercel build logs to confirm files are included

### If Resend API fails:

1. **Check environment variable:**
   - Verify `RESEND_API_KEY` is set in Vercel
   - Should start with `re_`

2. **Check domain verification:**
   - Go to https://resend.com/domains
   - Ensure `ayvalabs.com` shows as "Verified"

3. **Check from email:**
   - Must use `pawme@ayvalabs.com` (verified domain)

---

## Summary

✅ **Fixed**: Template filename mismatch (camelCase → kebab-case)
✅ **Created**: Missing header and footer template files
✅ **Added**: Comprehensive step-by-step logging
✅ **Ready**: For production deployment

The verification email should now work correctly on ayvalabs.com!
