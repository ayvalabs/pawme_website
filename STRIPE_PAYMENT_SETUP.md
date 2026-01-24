# Stripe Payment Integration Setup Guide

## Overview
This guide will help you set up Stripe to accept $1 VIP deposits that will be paid out to your Hong Kong DBS bank account.

**Bank Details:**
- Account Name: Axar Soft Limited
- Bank: DBS Bank (Hong Kong) Limited
- Account Number: 795033519
- Bank Code: 016
- Branch Code: 478
- SWIFT: DHBKHKHH
- Location: Hong Kong SAR

---

## Step 1: Create Stripe Account

### 1.1 Sign Up for Stripe
1. Go to https://stripe.com/hk
2. Click "Sign up" or "Start now"
3. Choose **Hong Kong** as your country
4. Enter your business email (use your company email)

### 1.2 Complete Business Verification
Stripe will ask for:
- **Business name**: Axar Soft Limited
- **Business type**: Company/Corporation
- **Business registration number**: Your Hong Kong company registration
- **Business address**: Your registered business address in Hong Kong
- **Website**: https://www.ayvalabs.com (or your PawMe domain)
- **Business description**: "Pet technology and AI companion devices"

### 1.3 Add Bank Account for Payouts
1. In Stripe Dashboard, go to **Settings** → **Bank accounts and scheduling**
2. Click **Add bank account**
3. Enter your DBS Hong Kong account details:
   - **Account holder name**: Axar Soft Limited
   - **Account number**: 795033519
   - **Bank code**: 016-478 (Bank code - Branch code)
   - **Currency**: HKD or USD (your choice)

**Note**: Stripe will make a small test deposit to verify the account (usually takes 1-2 business days).

---

## Step 2: Get Stripe API Keys

### 2.1 Get Test Keys (for development)
1. In Stripe Dashboard, toggle to **Test mode** (top right)
2. Go to **Developers** → **API keys**
3. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 2.2 Get Live Keys (for production)
1. Toggle to **Live mode**
2. Go to **Developers** → **API keys**
3. Copy:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

---

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx  # Use sk_live_ for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx  # Use pk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # Get this in Step 4
```

---

## Step 4: Set Up Webhooks

Webhooks allow Stripe to notify your server when payments succeed.

### 4.1 For Local Development (using Stripe CLI)

1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to localhost:9008/api/webhooks/stripe
   ```
   
   This will output a webhook signing secret like `whsec_xxxxx`. Add this to `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### 4.2 For Production

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your production URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`) and add to your production environment variables

---

## Step 5: Enable Payment Methods

### 5.1 Enable Card Payments
1. In Stripe Dashboard, go to **Settings** → **Payment methods**
2. Ensure **Cards** is enabled (should be by default)

### 5.2 Enable Asian Payment Methods (Optional but Recommended)
For better conversion in Hong Kong/Asia, enable:
- **Alipay** (very popular in Hong Kong/China)
- **WeChat Pay** (popular in China)
- **FPS (Faster Payment System)** (Hong Kong's instant payment system)

To enable:
1. Go to **Settings** → **Payment methods**
2. Click **+ Add payment method**
3. Select and enable each method
4. Complete any additional verification required

---

## Step 6: Configure Payout Schedule

1. In Stripe Dashboard, go to **Settings** → **Bank accounts and scheduling**
2. Set your payout schedule:
   - **Daily** (recommended for regular cash flow)
   - **Weekly** (every Monday, for example)
   - **Monthly** (on the 1st of each month)

**Note**: First payout may take 7-14 days as Stripe verifies your account.

---

## Step 7: Test the Integration

### 7.1 Test in Development
1. Start your dev server:
   ```bash
   pnpm dev
   ```

2. Start Stripe webhook forwarding (in another terminal):
   ```bash
   stripe listen --forward-to localhost:9008/api/webhooks/stripe
   ```

3. Go to your website and click "Become VIP"

4. Use Stripe test card:
   - **Card number**: 4242 4242 4242 4242
   - **Expiry**: Any future date
   - **CVC**: Any 3 digits
   - **ZIP**: Any 5 digits

5. Complete payment and verify:
   - User is marked as VIP in Firestore
   - VIP receipt email is sent
   - Webhook logs show successful processing

### 7.2 Test Alipay/WeChat Pay (if enabled)
Use Stripe's test accounts:
- **Alipay**: Use test account credentials from Stripe docs
- **WeChat Pay**: Use test QR codes from Stripe docs

---

## Step 8: Go Live

### 8.1 Pre-launch Checklist
- [ ] Business verification completed in Stripe
- [ ] Bank account verified and added
- [ ] Live API keys obtained
- [ ] Production webhook endpoint configured
- [ ] Payment methods enabled (Cards, Alipay, WeChat Pay)
- [ ] Payout schedule configured
- [ ] Test transactions completed successfully

### 8.2 Update Environment Variables
Replace test keys with live keys in your production environment:
```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # From production webhook
```

### 8.3 Deploy
```bash
pnpm build
# Deploy to your hosting platform
```

---

## Payment Flow

Here's what happens when a user becomes VIP:

1. **User clicks "Become VIP"** on your website
2. **Server creates Stripe Checkout Session** (server action)
3. **User redirects to Stripe Checkout** (hosted payment page)
4. **User enters payment details** and completes payment
5. **Stripe processes payment** and charges $1.00
6. **Stripe sends webhook** to your server
7. **Your webhook handler**:
   - Verifies payment
   - Updates user to VIP in Firestore
   - Sends VIP receipt email
8. **User redirects back** to dashboard with success message
9. **Stripe pays out** to your DBS account (based on schedule)

---

## Fees and Pricing

### Stripe Hong Kong Fees
- **Card payments**: 3.4% + HK$2.35 per transaction
- **Alipay/WeChat Pay**: 3.4% + HK$2.35 per transaction
- **No monthly fees**
- **No setup fees**

### Example for $1 USD payment:
- Customer pays: $1.00 USD
- Stripe fee: ~$0.07 USD
- You receive: ~$0.93 USD
- Payout to DBS account: ~$0.93 USD (or HKD equivalent)

---

## Currency Options

You can choose to charge in:
- **USD** (recommended for international audience)
- **HKD** (for Hong Kong customers)

To change currency, update in `src/app/actions/stripe.ts`:
```typescript
currency: 'hkd', // Change from 'usd' to 'hkd'
unit_amount: 780, // $1 USD ≈ 7.80 HKD (adjust based on exchange rate)
```

---

## Refund Policy

Your VIP deposits are refundable until Kickstarter launch. To process refunds:

### Via Dashboard
1. Go to Stripe Dashboard → **Payments**
2. Find the payment
3. Click **Refund**
4. Enter amount and reason
5. Confirm refund

### Via Code (automated)
Use the `refundVipDeposit` function in `src/app/actions/stripe.ts`:
```typescript
import { refundVipDeposit } from '@/app/actions/stripe';

await refundVipDeposit(paymentIntentId, 'requested_by_customer');
```

---

## Security Best Practices

1. **Never commit API keys** to git (they're in `.env.local` which is gitignored)
2. **Use test keys** for development
3. **Verify webhook signatures** (already implemented)
4. **Use HTTPS** in production (required by Stripe)
5. **Monitor for fraud** in Stripe Dashboard

---

## Troubleshooting

### Payment fails
- Check Stripe Dashboard logs
- Verify API keys are correct
- Ensure webhook endpoint is accessible
- Check Firestore security rules

### Webhook not receiving events
- Verify webhook URL is correct
- Check webhook signing secret
- Ensure endpoint is publicly accessible (for production)
- Check server logs for errors

### Bank payout not received
- Verify bank account details are correct
- Check payout schedule in Stripe Dashboard
- First payout may take 7-14 days
- Check for any verification requirements

---

## Support

- **Stripe Support**: https://support.stripe.com/
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Status**: https://status.stripe.com/

---

## Next Steps

1. ✅ Create Stripe account
2. ✅ Complete business verification
3. ✅ Add DBS bank account
4. ✅ Get API keys
5. ✅ Configure webhooks
6. ✅ Test with test cards
7. ✅ Go live with real payments

Your payment integration is ready! Users can now pay $1 to become VIP members, and funds will be automatically deposited to your DBS Hong Kong account.
