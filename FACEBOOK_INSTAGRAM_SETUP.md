# Facebook & Instagram API Setup Requirements

## Current Issues
1. **Facebook Posts**: "Invalid OAuth 2.0 Access Token" - Token expired or missing permissions
2. **Instagram**: Missing permissions or incorrect setup

---

## Required Facebook App Setup

### 1. Facebook App Configuration

**Your team needs to:**

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app (or create one if it doesn't exist)
3. Navigate to **App Settings** → **Basic**
4. Add these **App Domains**:
   - `localhost` (for development)
   - Your production domain

### 2. Required Products & Permissions

**Add these products to your Facebook App:**

#### **Facebook Login**
- Enable "Facebook Login" product
- Add OAuth Redirect URIs if needed

#### **Instagram Basic Display** OR **Instagram Graph API**
- For business accounts, use **Instagram Graph API** (recommended)
- For personal accounts, use **Instagram Basic Display**

### 3. Required API Permissions

**Your Access Token MUST have these permissions:**

#### For Facebook Page:
- ✅ `pages_show_list` - View list of Pages
- ✅ `pages_read_engagement` - Read Page engagement data
- ✅ `pages_read_user_content` - Read Page posts and content
- ✅ `read_insights` - Read Page insights (optional but recommended)

#### For Instagram Business Account:
- ✅ `instagram_basic` - Basic Instagram data
- ✅ `instagram_manage_insights` - Instagram insights
- ✅ `pages_show_list` - Required to link IG to FB Page
- ✅ `pages_read_engagement` - Required for IG engagement data

### 4. Instagram Business Account Requirements

**CRITICAL - Instagram account MUST be:**

1. **Converted to Business Account**
   - Go to Instagram app → Settings → Account → Switch to Professional Account
   - Choose "Business" (not Creator)

2. **Connected to Facebook Page**
   - Instagram Settings → Business → Linked Accounts → Facebook
   - Connect to the Facebook Page ID: `838494172690482`

3. **Verify Connection**
   - The Instagram Business Account ID should be: `17841478852355305`
   - Verify this in Facebook Page Settings → Instagram → Connected Account

---

## How to Generate a New Access Token

### Option 1: Graph API Explorer (Quick Test)

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click "Generate Access Token"
4. Select these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `instagram_basic`
   - `instagram_manage_insights`
5. Click "Generate Access Token"
6. Copy the token and update `.env.local`

**⚠️ WARNING**: This token expires in 1-2 hours. For production, use Option 2.

### Option 2: Long-Lived Page Access Token (Production)

1. **Get User Access Token** (from Graph API Explorer with permissions above)

2. **Exchange for Long-Lived User Token**:
   ```bash
   curl -i -X GET "https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_USER_TOKEN"
   ```

3. **Get Page Access Token**:
   ```bash
   curl -i -X GET "https://graph.facebook.com/v24.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN"
   ```
   - Find your page (ID: 838494172690482) in the response
   - Copy the `access_token` for that page

4. **This Page Access Token never expires** (as long as the app is active)

5. Update `.env.local`:
   ```bash
   FB_ACCESS_TOKEN=YOUR_LONG_LIVED_PAGE_ACCESS_TOKEN
   ```

---

## Verification Steps

### Test Facebook API:
```bash
curl -i -X GET "https://graph.facebook.com/v24.0/838494172690482?fields=name,fan_count,followers_count&access_token=YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "name": "PawMe",
  "fan_count": 274,
  "followers_count": 274,
  "id": "838494172690482"
}
```

### Test Instagram API:
```bash
curl -i -X GET "https://graph.facebook.com/v24.0/17841478852355305?fields=id,username,followers_count,follows_count,media_count&access_token=YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "id": "17841478852355305",
  "username": "pawme.ai",
  "followers_count": 123,
  "follows_count": 45,
  "media_count": 67
}
```

### Test Instagram Posts:
```bash
curl -i -X GET "https://graph.facebook.com/v24.0/17841478852355305/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=10&access_token=YOUR_TOKEN"
```

---

## Common Issues & Solutions

### Issue: "Invalid OAuth 2.0 Access Token"
**Solution**: Token expired. Generate new long-lived token using Option 2 above.

### Issue: "Object does not exist or missing permissions"
**Solution**: 
1. Verify Instagram account is Business account (not Personal or Creator)
2. Verify Instagram is connected to Facebook Page
3. Verify access token has `instagram_basic` and `pages_show_list` permissions

### Issue: "Unsupported get request"
**Solution**:
1. Make sure you're using the Instagram Business Account ID, not the Instagram User ID
2. Verify the account is properly linked to the Facebook Page

### Issue: Instagram data not loading
**Solution**:
1. Check that `NEXT_PUBLIC_IG_BUSINESS_ACCOUNT_ID` is the Business Account ID (starts with 17...)
2. Verify permissions include both Facebook Page AND Instagram permissions
3. Test the API directly with curl commands above

---

## Required Environment Variables

```bash
# Facebook Page ID (found in Page Settings → About)
NEXT_PUBLIC_FB_PAGE_ID=838494172690482

# Instagram Business Account ID (found in Page Settings → Instagram)
NEXT_PUBLIC_IG_BUSINESS_ACCOUNT_ID=17841478852355305

# Long-lived Page Access Token (generated using steps above)
FB_ACCESS_TOKEN=YOUR_LONG_LIVED_PAGE_ACCESS_TOKEN

# Graph API Version
GRAPH_API_VERSION=v24.0
```

---

## Summary for Your Team

**Tell your team to:**

1. ✅ Convert Instagram account to **Business Account** (not Creator)
2. ✅ Link Instagram Business Account to Facebook Page (ID: 838494172690482)
3. ✅ Generate a **Long-Lived Page Access Token** with these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `instagram_basic`
   - `instagram_manage_insights`
4. ✅ Provide you with the new access token
5. ✅ Verify the Instagram Business Account ID is: `17841478852355305`

**Test the setup** using the curl commands in the "Verification Steps" section above.
