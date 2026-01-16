# Scripts

This directory contains utility scripts for managing the PawMe application.

## Email Template Seeder

**File:** `seed-email-templates.ts`

Seeds the default email templates from `src/lib/email-templates.ts` to the Firestore database.

### Prerequisites

- You must have the `.env.local` file configured with Firebase credentials
- You must authenticate as `pawme@ayvalabs.com` (admin account)
- The Firestore rules must allow admin access to the `emailTemplates` collection

### Usage

```bash
pnpm tsx scripts/seed-email-templates.ts
```

The script will:
1. Prompt you for admin credentials
2. Authenticate with Firebase
3. Save all email templates to Firestore under the `emailTemplates` collection
4. Display a summary of saved templates

### Templates Saved

- **Welcome Email** (`welcome`) - Sent to new users upon signup
- **Reward Shipped** (`shippingNotification`) - Sent when a reward is shipped

### Database Structure

Each template is saved with the following structure:

```typescript
{
  id: string;           // Template ID (e.g., 'welcome')
  name: string;         // Display name (e.g., 'Welcome Email')
  subject: string;      // Email subject line
  html: string;         // HTML email content
  variables: string[];  // List of template variables (e.g., ['userName', 'referralCode'])
  createdAt: string;    // ISO timestamp of creation
  updatedAt: string;    // ISO timestamp of last update
}
```

### Security

- Only the admin user (`pawme@ayvalabs.com`) can read and write email templates
- Firestore security rules enforce this at the database level
