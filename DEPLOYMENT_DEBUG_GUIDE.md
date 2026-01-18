# Deployment Debugging Guide

## Enhanced Server-Side Logging

When email templates fail to load on Vercel, the logs will now show:

### 1. Environment Information
```
🔵 [EMAIL_ACTION] Current working directory: /var/task
🔵 [EMAIL_ACTION] __dirname would be: /var/task/.next/server/app/actions
🔵 [EMAIL_ACTION] Environment: production
🔵 [EMAIL_ACTION] Vercel: YES
```

### 2. Path Attempts
```
🔵 [EMAIL_ACTION] Will try 4 possible paths...
🔵 [EMAIL_ACTION] Trying path 1/4: /var/task/public/email-templates/verification-code.html
❌ [EMAIL_ACTION] Not found at path 1
🔵 [EMAIL_ACTION] Trying path 2/4: /var/task/src/lib/email-assets/verification-code.html
❌ [EMAIL_ACTION] Not found at path 2
...
```

### 3. Directory Structure Exploration (if all paths fail)
```
❌ [EMAIL_ACTION] File NOT found in any of the 4 paths!
❌ [EMAIL_ACTION] Searched paths:
   1. /var/task/public/email-templates/verification-code.html
   2. /var/task/src/lib/email-assets/verification-code.html
   3. /var/task/.next/server/public/email-templates/verification-code.html
   4. /var/task/email-templates/verification-code.html

🔵 [EMAIL_ACTION] Attempting to explore directory structure...

📁 [EMAIL_ACTION] Root directory (/var/task):
   Files/folders: ['.next', 'public', 'package.json', 'node_modules', ...]

📁 [EMAIL_ACTION] Public directory (/var/task/public):
   Files/folders: ['favicon.png', 'hero-slide-1.png', 'hero-slide-2.png', ...]
   ⚠️  'email-templates' folder NOT found in public/

📁 [EMAIL_ACTION] Src directory (/var/task/src):
   ❌ Cannot read src/: ENOENT: no such file or directory

📁 [EMAIL_ACTION] .next directory (/var/task/.next):
   Files/folders: ['server', 'static', 'cache', ...]
```

## What to Look For

### ✅ Success Case
```
✅ [EMAIL_ACTION] Found file at path 1!
✅ [EMAIL_ACTION] Using file path: /var/task/public/email-templates/verification-code.html
✅ [EMAIL_ACTION] Successfully read file: 1234 characters
```

### ❌ Missing Templates Folder
```
📁 [EMAIL_ACTION] Public directory (/var/task/public):
   Files/folders: ['favicon.png', 'hero-slide-1.png', ...]
   ⚠️  'email-templates' folder NOT found in public/
```

**Fix:** Templates not committed or not in public folder
```bash
git add public/email-templates/
git commit -m "Add email templates to public folder"
git push
```

### ❌ Templates Folder Exists But Empty
```
📁 [EMAIL_ACTION] Email templates directory (/var/task/public/email-templates):
   Template files: []
```

**Fix:** Files not copied to public folder
```bash
cp src/lib/email-assets/*.html public/email-templates/
git add public/email-templates/
git commit -m "Add email template files"
git push
```

### ❌ Wrong Filenames
```
📁 [EMAIL_ACTION] Email templates directory (/var/task/public/email-templates):
   Template files: ['verificationCode.html', 'welcomeEmail.html']
```

**Fix:** Files should be kebab-case, not camelCase
```bash
# Should be:
verification-code.html (not verificationCode.html)
welcome.html (not welcomeEmail.html)
```

## Viewing Vercel Logs

### Method 1: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click your project
3. Click latest deployment
4. Click "Functions" tab
5. Find the function that handles signup
6. View real-time logs

### Method 2: Vercel CLI
```bash
vercel logs --follow
```

### Method 3: Filter for Email Logs
```bash
vercel logs --follow | grep EMAIL_ACTION
```

## Common Issues

### Issue 1: Templates Not Deployed
**Symptom:**
```
⚠️  'email-templates' folder NOT found in public/
```

**Cause:** Files not committed to git

**Fix:**
```bash
git status
git add public/email-templates/
git commit -m "Add email templates"
git push
```

### Issue 2: Wrong Directory Structure
**Symptom:**
```
📁 Public directory: ['email-assets', 'templates', ...]
```

**Cause:** Templates in wrong folder

**Fix:** Must be in `public/email-templates/` exactly

### Issue 3: Build Excludes Files
**Symptom:**
```
📁 Public directory: ['favicon.png', 'hero-slide-1.png']
   (email-templates not listed)
```

**Cause:** `.gitignore` or `.vercelignore` excluding files

**Fix:** Check ignore files don't exclude `public/email-templates/`

## Validation Before Deploy

```bash
# 1. Check files exist locally
ls -la public/email-templates/

# 2. Run validation
pnpm run validate-templates

# 3. Check git status
git status

# 4. Ensure files are staged
git add public/email-templates/

# 5. Commit and push
git commit -m "Add email templates to public folder"
git push

# 6. Watch Vercel deployment
vercel logs --follow
```

## Expected Log Flow (Success)

```
🔵 [EMAIL_ACTION] ========== LOADING TEMPLATE: 'verificationCode' ==========
🔵 [EMAIL_ACTION] Step 1: Looking up metadata for template ID: 'verificationCode'
✅ [EMAIL_ACTION] Found metadata: { id: 'verificationCode', subject: '...', variables: [...] }
🔵 [EMAIL_ACTION] Step 2: Converting template ID to filename...
✅ [EMAIL_ACTION] Template ID 'verificationCode' → filename 'verification-code.html'
🔵 [EMAIL_ACTION] Step 3: Building file path...
🔵 [EMAIL_ACTION] Current working directory: /var/task
🔵 [EMAIL_ACTION] Environment: production
🔵 [EMAIL_ACTION] Vercel: YES
🔵 [EMAIL_ACTION] Will try 4 possible paths...
🔵 [EMAIL_ACTION] Step 4: Checking which path has the file...
🔵 [EMAIL_ACTION] Trying path 1/4: /var/task/public/email-templates/verification-code.html
✅ [EMAIL_ACTION] Found file at path 1!
✅ [EMAIL_ACTION] Using file path: /var/task/public/email-templates/verification-code.html
🔵 [EMAIL_ACTION] Step 5: Reading file contents...
✅ [EMAIL_ACTION] Successfully read file: 1234 characters
✅ [EMAIL_ACTION] ========== TEMPLATE LOADED SUCCESSFULLY ==========
```

## Troubleshooting Steps

1. **Check Vercel logs** - See exact directory structure
2. **Verify files exist** - `ls public/email-templates/`
3. **Check git status** - Ensure files are committed
4. **Validate locally** - `pnpm run validate-templates`
5. **Redeploy** - Push to trigger new deployment
6. **Watch logs** - `vercel logs --follow`
7. **Test signup** - Try creating account on production

## Quick Fix Checklist

- [ ] Files exist in `public/email-templates/`
- [ ] Files use kebab-case names (`verification-code.html`)
- [ ] All 8 template files present
- [ ] Files committed to git (`git status`)
- [ ] Pushed to GitHub (`git push`)
- [ ] Vercel auto-deployed
- [ ] Logs show templates found
- [ ] Signup works on production
