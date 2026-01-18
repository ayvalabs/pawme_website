# Email Template ID to Filename Mapping

## Overview

Email templates use **camelCase** IDs in code but **kebab-case** filenames on disk.

The conversion function:
```typescript
function templateIdToFilename(templateId: string): string {
  return templateId.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
```

---

## Complete Mapping Table

| Template ID          | Filename                      | Purpose                           |
|----------------------|-------------------------------|-----------------------------------|
| `header`             | `header.html`                 | Email header with branding        |
| `footer`             | `footer.html`                 | Email footer with links           |
| `verificationCode`   | `verification-code.html`      | Email verification code           |
| `welcome`            | `welcome.html`                | Welcome email after signup        |
| `referralSuccess`    | `referral-success.html`       | Referral success notification     |
| `passwordReset`      | `password-reset.html`         | Password reset (not used)         |
| `shippingNotification` | `shipping-notification.html` | Reward shipping notification      |
| `productUpdate`      | `product-update.html`         | Product update announcement       |

---

## File Locations

All template files are located in:
```
src/lib/email-assets/
├── header.html
├── footer.html
├── verification-code.html
├── welcome.html
├── referral-success.html
├── password-reset.html
├── shipping-notification.html
└── product-update.html
```

---

## Template Variables

Each template uses specific variables that must be present in the HTML:

### `header.html`
- `{{emailTitle}}` - Email subject line

### `footer.html`
- `{{unsubscribeLink}}` - Unsubscribe URL

### `verification-code.html`
- `{{userName}}` - User's name
- `{{code}}` - 4-digit verification code

### `welcome.html`
- `{{userName}}` - User's name
- `{{referralCode}}` - User's referral code
- `{{referralLink}}` - Full referral URL

### `referral-success.html`
- `{{referrerName}}` - Referrer's name
- `{{newReferralCount}}` - Updated referral count
- `{{newPoints}}` - Updated points total

### `password-reset.html`
- `{{userName}}` - User's name
- `{{link}}` - Password reset link

### `shipping-notification.html`
- `{{userName}}` - User's name
- `{{rewardTitle}}` - Reward name
- `{{trackingCode}}` - Shipping tracking number

### `product-update.html`
- `{{userName}}` - User's name

---

## Validation

Run the validation script to check all templates:

```bash
pnpm run validate-templates
```

This will:
- ✅ Check that all template files exist
- ✅ Verify filename mapping is correct
- ✅ Ensure required variables are present
- ✅ List any extra or missing files

---

## Adding a New Template

1. **Add metadata to `src/lib/email-templates.ts`:**
   ```typescript
   myNewTemplate: {
     id: 'myNewTemplate',
     name: 'My New Template',
     subject: 'Subject Line',
     variables: ['userName', 'customVar'],
   }
   ```

2. **Create HTML file with kebab-case name:**
   ```
   src/lib/email-assets/my-new-template.html
   ```

3. **Use variables in HTML:**
   ```html
   <p>Hi {{userName}},</p>
   <p>{{customVar}}</p>
   ```

4. **Validate:**
   ```bash
   pnpm run validate-templates
   ```

5. **Use in code:**
   ```typescript
   await renderAndSend('myNewTemplate', email, {
     userName: 'John',
     customVar: 'value'
   });
   ```

---

## Debugging Template Loading

When a template fails to load, check the logs for:

```
🔵 [EMAIL_ACTION] ========== LOADING TEMPLATE: 'verificationCode' ==========
🔵 [EMAIL_ACTION] Step 1: Looking up metadata...
✅ [EMAIL_ACTION] Found metadata
🔵 [EMAIL_ACTION] Step 2: Converting template ID to filename...
✅ [EMAIL_ACTION] Template ID 'verificationCode' → filename 'verification-code.html'
🔵 [EMAIL_ACTION] Step 3: Building file path...
🔵 [EMAIL_ACTION] Current working directory: /var/task
🔵 [EMAIL_ACTION] Full file path: /var/task/src/lib/email-assets/verification-code.html
🔵 [EMAIL_ACTION] Step 4: Checking if file exists...
✅ [EMAIL_ACTION] File exists and is accessible
🔵 [EMAIL_ACTION] Step 5: Reading file contents...
✅ [EMAIL_ACTION] Successfully read file: 1234 characters
✅ [EMAIL_ACTION] ========== TEMPLATE LOADED SUCCESSFULLY ==========
```

If a file is missing, you'll see:
```
❌ [EMAIL_ACTION] File does NOT exist or is not accessible
📁 [EMAIL_ACTION] Files in email-assets directory: [list of actual files]
```

---

## Common Issues

### ❌ "Template 'verificationCode' is missing"

**Cause:** File doesn't exist or path is wrong

**Fix:**
1. Check file exists: `ls src/lib/email-assets/verification-code.html`
2. Verify filename is kebab-case, not camelCase
3. Run validation: `pnpm run validate-templates`

### ❌ "File does NOT exist or is not accessible"

**Cause:** File path is incorrect or file wasn't included in build

**Fix:**
1. Check logs for exact path being accessed
2. Verify file is in `src/lib/email-assets/`
3. Ensure file is committed to git
4. Check Vercel build logs to confirm file is included

### ⚠️ "Missing: {{variableName}}"

**Cause:** Template HTML doesn't include required variable

**Fix:**
1. Open the template HTML file
2. Add `{{variableName}}` where needed
3. Run validation to confirm

---

## Production Checklist

Before deploying:

- [ ] Run `pnpm run validate-templates` locally
- [ ] All templates show ✅ in validation
- [ ] No extra or missing files
- [ ] All required variables present
- [ ] Files committed to git
- [ ] Test email sending locally with `pnpm run dev`
- [ ] Check Vercel build logs after deployment
- [ ] Test signup flow on production
- [ ] Verify email arrives with correct formatting
