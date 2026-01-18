# Email Templates - Public Folder Fix

## Problem

Email templates in `src/lib/email-assets/` are **not included in Vercel production builds**.

Next.js only includes files from the `public/` folder in deployments. Files in `src/` are only available during the build process, not at runtime.

## Solution

**Move email templates to `public/email-templates/`**

This folder is guaranteed to be included in all Next.js deployments (Vercel, etc.)

---

## Changes Made

### 1. Copied Templates to Public Folder

```bash
mkdir -p public/email-templates
cp src/lib/email-assets/*.html public/email-templates/
```

**New structure:**
```
public/
└── email-templates/
    ├── header.html
    ├── footer.html
    ├── verification-code.html
    ├── welcome.html
    ├── referral-success.html
    ├── password-reset.html
    ├── shipping-notification.html
    └── product-update.html
```

### 2. Updated Path Resolution

`src/app/actions/email.ts` now tries paths in this order:

1. `public/email-templates/` (production)
2. `src/lib/email-assets/` (local dev fallback)
3. `.next/server/public/email-templates/` (build output)
4. `email-templates/` (root fallback)

### 3. Updated Validation Script

`scripts/validate-email-templates.ts` now checks both locations:
- Primary: `public/email-templates/`
- Fallback: `src/lib/email-assets/`

---

## Why This Works

### Development (Local)
- Can use either `src/lib/email-assets/` or `public/email-templates/`
- Both locations work

### Production (Vercel)
- Only `public/` folder is included in deployment
- `src/` folder is not accessible at runtime
- Templates load from `public/email-templates/`

---

## Validation

Run validation to ensure templates are in the right place:

```bash
pnpm run validate-templates
```

Expected output:
```
✅ File exists in public/ (1234 characters)
```

If you see:
```
✅ File exists in src/ (1234 characters)
⚠️  Should copy to public/email-templates for production
```

Then run:
```bash
cp src/lib/email-assets/*.html public/email-templates/
```

---

## Deployment Checklist

Before deploying:

- [ ] All templates exist in `public/email-templates/`
- [ ] Run `pnpm run validate-templates` - all show ✅
- [ ] Templates are committed to git
- [ ] Push to GitHub
- [ ] Vercel auto-deploys
- [ ] Check Vercel logs for template loading

---

## Vercel Logs

After deployment, you'll see detailed logs showing which path worked:

```
🔵 [EMAIL_ACTION] Will try 4 possible paths...
🔵 [EMAIL_ACTION] Trying path 1/4: /var/task/public/email-templates/verification-code.html
✅ [EMAIL_ACTION] Found file at path 1!
✅ [EMAIL_ACTION] Using file path: /var/task/public/email-templates/verification-code.html
```

---

## Keeping Templates in Sync

If you edit templates in `src/lib/email-assets/`, remember to copy to `public/`:

```bash
cp src/lib/email-assets/*.html public/email-templates/
```

Or use a script:
```bash
# Add to package.json
"sync-templates": "cp src/lib/email-assets/*.html public/email-templates/"
```

---

## Why Not Use src/ Folder?

Next.js build process:
1. Compiles TypeScript/React code
2. Bundles JavaScript
3. Copies `public/` folder to output
4. **Does NOT copy arbitrary files from `src/`**

The `src/` folder is for source code that gets compiled, not static assets.

Static assets (images, fonts, templates) must be in `public/`.

---

## Alternative Solutions (Not Used)

### Option 1: Inline Templates
Embed HTML in TypeScript files - makes them harder to edit

### Option 2: Database Storage
Store in Firestore - requires Admin SDK (which we removed)

### Option 3: Custom Webpack Config
Configure Next.js to copy files - complex and fragile

### ✅ Option 4: Use public/ Folder
Standard Next.js approach - simple and reliable

---

## Summary

✅ Templates moved to `public/email-templates/`
✅ Path resolution updated with fallbacks
✅ Validation script updated
✅ Works in both development and production
✅ No build configuration needed
✅ Standard Next.js best practice
