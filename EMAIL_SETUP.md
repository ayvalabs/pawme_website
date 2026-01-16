# Email Campaign Integration Guide

## Overview
PawMe's referral system includes automated email notifications sent from **pawme@ayvalabs.com** (Google Workspace).

## Current Implementation Status

### ✅ Email Functions Ready
The backend includes the following email triggers:
1. **Welcome Email** - Sent when a user signs up
2. **Referral Success Email** - Sent when someone uses your referral code
3. **Campaign Emails** - Admin broadcast to all users

### 📧 Email Events

#### 1. Welcome Email (Automatic)
**Trigger:** User signs up
**From:** pawme@ayvalabs.com
**Contains:**
- Welcome message
- Unique referral code
- Referral link
- Rewards information

#### 2. Referral Success Email (Automatic)
**Trigger:** Someone signs up using a referral code
**From:** pawme@ayvalabs.com
**To:** The referrer
**Contains:**
- Success notification
- Updated referral count
- Total points earned
- Encouragement to keep sharing

#### 3. Campaign Emails (Manual - Admin)
**Endpoint:** `/email/send` or `/email/broadcast`
**From:** pawme@ayvalabs.com
**Use cases:**
- Product updates
- Kickstarter launch announcements
- Community milestones

---

## Integration Options

### Option 1: Resend (Recommended - Easiest)

**Why Resend?**
- Simple API
- Good deliverability
- Free tier: 3,000 emails/month
- Custom domain support

**Setup Steps:**

1. **Sign up at [resend.com](https://resend.com)**

2. **Verify your domain (ayvalabs.com)**
   - Add DNS records provided by Resend
   - This allows sending from pawme@ayvalabs.com

3. **Get your API key**

4. **Add environment secret:**
   ```bash
   # In Supabase Dashboard: Settings > Edge Functions > Secrets
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

5. **Uncomment the Resend code in `/supabase/functions/server/index.tsx`**
   - The code is already written, just remove the /* */ comments
   - Install Resend: The npm import will work automatically in Deno

**Code Location:**
Lines in `index.tsx` marked with `// TODO: Integrate with email service`

---

### Option 2: SendGrid

**Setup Steps:**

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Verify pawme@ayvalabs.com sender identity
3. Get API key
4. Add environment secret: `SENDGRID_API_KEY`
5. Use SendGrid's Deno SDK or REST API

**Example Code:**
```typescript
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: 'pawme@ayvalabs.com', name: 'PawMe' },
    subject: subject,
    content: [{ type: 'text/html', value: htmlContent }]
  })
});
```

---

### Option 3: Gmail API (Google Workspace)

**For direct integration with pawme@ayvalabs.com:**

1. **Enable Gmail API** in Google Cloud Console
2. **Create Service Account**
3. **Download credentials JSON**
4. **Grant domain-wide delegation** to the service account
5. **Add credentials as Supabase secret**

**More Complex - Not recommended for simple use case**

---

## Current Behavior (Development)

**Email Logging Mode:**
- All emails are currently logged to console
- Check Supabase Edge Function logs to see email content
- No actual emails are sent yet

**To see email logs:**
1. Go to Supabase Dashboard
2. Navigate to Edge Functions > Logs
3. Look for "EMAIL NOTIFICATION" or "WELCOME EMAIL" headers

---

## Email Templates

### Welcome Email Template
```
Subject: 🐾 Welcome to PawMe! Your referral link is ready

Hi [Name],

Welcome to the PawMe community! We're excited to have you on board.

Your unique referral code: [CODE]

Share this link with friends and family:
[REFERRAL_LINK]

Earn rewards:
- 100 points per successful referral
- Exclusive early bird perks
- Move up the leaderboard

PawMe launches on Kickstarter in March 2026!

Best regards,
The PawMe Team @ Ayva Labs Limited

Follow us: @pawme on all social media
```

### Referral Success Email Template
```
Subject: 🎉 You've earned points! Someone joined using your referral link

Hi [Name],

Great news! Someone just signed up using your referral link.

Your Stats:
- Total Referrals: [COUNT]
- Points Earned: [POINTS]

Keep sharing to unlock more rewards!

Best regards,
The PawMe Team

Follow us: @pawme on all social media
```

---

## Admin Email Campaigns

### Broadcast to All Users
**Endpoint:** `POST /make-server-f2b924d9/email/broadcast`

**Request:**
```json
{
  "subject": "PawMe Kickstarter Launch - 3 Days to Go!",
  "message": "Get ready! PawMe launches on Kickstarter in just 3 days..."
}
```

### Send to Individual User
**Endpoint:** `POST /make-server-f2b924d9/email/send`

**Request:**
```json
{
  "to": "user@example.com",
  "subject": "Special Offer for Early Supporters",
  "message": "As one of our earliest supporters...",
  "type": "campaign"
}
```

---

## Testing Emails

### Option 1: Resend Test Mode
- Resend has a test mode that shows emails in dashboard
- No actual delivery

### Option 2: Mailtrap
- Catches all emails in a fake inbox
- Perfect for testing
- Free tier available

---

## Recommended Next Steps

1. **Sign up for Resend** (simplest option)
2. **Verify ayvalabs.com domain**
3. **Add RESEND_API_KEY to Supabase secrets**
4. **Uncomment email code** in server/index.tsx
5. **Test with your own email** first
6. **Monitor delivery rates** in Resend dashboard

---

## Important Notes

- **Sender Reputation:** Start slow, don't send thousands immediately
- **Unsubscribe Link:** Add to campaign emails (legally required)
- **SPF/DKIM:** Ensure proper DNS setup for deliverability
- **Rate Limiting:** Resend free tier is 3,000/month
- **Compliance:** Follow CAN-SPAM and GDPR guidelines

---

## Contact

For questions about email integration:
- Review Resend docs: https://resend.com/docs
- Check Supabase Edge Function logs for debugging
- Test with small batches first

**All email functions are ready to go - just needs API key configuration!**
