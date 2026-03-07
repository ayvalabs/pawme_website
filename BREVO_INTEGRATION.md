# Brevo CRM Integration Documentation

## Overview
PawMe automatically syncs all new signups and VIP conversions to Brevo for email marketing automation.

## Configuration

### Environment Variables
Add to `.env.local`:
```
BREVO_API_KEY=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
```

### Brevo Settings
- **API Key**: `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`
- **List ID**: `3`
- **List Name**: PawMe VIP Campaign
- **Sender Email**: pawme@ayvalabs.com

## Integration Points

### 1. New User Signup
**When**: User completes signup via email verification
**Where**: `src/app/context/AuthContext.tsx` (line 264-281)
**Data Sent**:
```json
{
  "email": "user@example.com",
  "attributes": {
    "FIRSTNAME": "John Doe",
    "SIGNUP_DATE": "2026-03-07",
    "VIP_STATUS": false,
    "SOURCE": "pawme-website"
  },
  "listIds": [3],
  "updateEnabled": true
}
```

### 2. VIP Conversion (Webhook)
**When**: Stripe webhook fires after successful $1 VIP payment
**Where**: `src/app/api/webhooks/stripe/route.ts` (line 47-63)
**Data Sent**:
```json
{
  "email": "user@example.com",
  "attributes": {
    "FIRSTNAME": "John Doe",
    "SIGNUP_DATE": "2026-02-19",
    "VIP_STATUS": true,
    "SOURCE": "pawme-website"
  },
  "listIds": [3],
  "updateEnabled": true
}
```

### 3. VIP Conversion (Fallback)
**When**: Payment verification runs on `/thanks` page (if webhook missed)
**Where**: `src/app/actions/stripe.ts` (line 147-162)
**Same data as webhook**

## Files Created/Modified

### New Files
1. **`src/lib/brevo.ts`** - Brevo API utility functions
2. **`src/app/api/brevo-sync/route.ts`** - API endpoint for manual Brevo sync
3. **`BREVO_INTEGRATION.md`** - This documentation

### Modified Files
1. **`src/app/context/AuthContext.tsx`** - Added Brevo sync on signup
2. **`src/app/api/webhooks/stripe/route.ts`** - Added Brevo sync on VIP payment webhook
3. **`src/app/actions/stripe.ts`** - Added Brevo sync on payment verification fallback

## API Endpoints

### Brevo Sync API
**Endpoint**: `POST /api/brevo-sync`

**Request**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "isVip": false,
  "signupDate": "2026-03-07",
  "source": "pawme-website"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Contact added to Brevo"
}
```

**Response (Update)**:
```json
{
  "success": true,
  "message": "Contact updated in Brevo"
}
```

## Data Field Mapping

| CRM Field | Brevo Attribute | Example | Required |
|-----------|----------------|---------|----------|
| Email | email | user@example.com | Yes |
| Name | FIRSTNAME | John Doe | Yes |
| createdAt | SIGNUP_DATE | 2026-03-07 | Yes |
| isVip | VIP_STATUS | true/false | Yes |
| - | SOURCE | pawme-website | Yes |

## Testing

### Test New Signup
1. Sign up a new user on the website
2. Check console logs for: `✅ [SIGNUP] Contact synced to Brevo`
3. Verify contact appears in Brevo List #3 with `VIP_STATUS: false`

### Test VIP Conversion
1. Complete $1 VIP payment
2. Check webhook logs for: `✅ VIP status synced to Brevo`
3. Verify contact in Brevo updated to `VIP_STATUS: true`

### Manual API Test
```bash
curl -X POST http://localhost:3000/api/brevo-sync \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "isVip": false,
    "signupDate": "2026-03-07",
    "source": "pawme-website"
  }'
```

## Error Handling

- **Brevo sync failures do NOT block signup or payment**
- All errors are logged but don't affect user experience
- Failed syncs can be retried via `/api/brevo-sync` endpoint

## Brevo Response Codes

- **201 Created** - New contact added successfully
- **204 No Content** - Existing contact updated
- **400 Bad Request** - Invalid payload (check email format)
- **401 Unauthorized** - Invalid API key

## Next Steps for Ashok

1. ✅ **Integration Complete** - Code is ready
2. **Export Existing Leads** - Export ~80 existing leads as CSV:
   - Columns: Name, Email, Status (VIP/Free), Joined Date
   - Send to Saahil for bulk import
3. **Test with Dummy Contacts** - Create 2-3 test signups to verify sync
4. **Activate Email Automations** - Notify Saahil to enable 12-email sequence
5. **Go Live** - Deploy to production

## Production URLs

- **Brevo API**: `https://api.brevo.com/v3/contacts`
- **Sync Endpoint**: `https://www.ayvalabs.com/api/brevo-sync`
- **Brevo Dashboard**: https://app.brevo.com/

## Support

For issues or questions:
- **Email Marketing**: Saahil @ ZippyScale
- **Technical**: Check console logs for detailed error messages
- **Brevo Docs**: https://developers.brevo.com/reference/createcontact
