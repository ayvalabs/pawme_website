# Vercel Cron Job Setup - Daily Metrics Snapshot

## ✅ What Was Configured

A Vercel Cron Job has been set up to automatically capture daily social media metrics every day at midnight UTC.

---

## 📁 Files Created/Modified

### 1. `vercel.json` (NEW)
```json
{
  "crons": [
    {
      "path": "/api/metrics/snapshot",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedule:** `0 0 * * *` = Every day at 00:00 UTC (midnight)

### 2. `src/app/api/metrics/snapshot/route.ts` (UPDATED)
Added authentication to prevent unauthorized access:
- Vercel Cron requests are automatically authenticated
- Manual requests require `CRON_SECRET` in Authorization header

---

## 🚀 Deployment Steps

### 1. Add Environment Variable (Optional but Recommended)

In your Vercel Dashboard:
1. Go to **Project Settings** → **Environment Variables**
2. Add:
   - **Name:** `CRON_SECRET`
   - **Value:** Generate a random secret (e.g., `openssl rand -base64 32`)
   - **Environments:** Production, Preview, Development

This allows you to manually trigger the cron job if needed.

### 2. Deploy to Vercel

```bash
git add vercel.json src/app/api/metrics/snapshot/route.ts
git commit -m "Add Vercel cron job for daily metrics snapshot"
git push
```

Vercel will automatically detect `vercel.json` and set up the cron job.

### 3. Verify Cron Job

After deployment:
1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Crons**
3. You should see:
   - **Path:** `/api/metrics/snapshot`
   - **Schedule:** `0 0 * * *`
   - **Status:** Active

---

## 📊 What Gets Captured Daily

The cron job automatically saves metrics for:

- **Website:** Total signups
- **YouTube:** Subscribers, views, videos
- **X (Twitter):** Followers, tweets, likes
- **TikTok:** Followers, videos, likes
- **Facebook:** Page fans, followers
- **Instagram:** Followers, following, posts

**Storage:** Firestore collection `daily-metrics/{YYYY-MM-DD}`

---

## 🕐 Schedule Details

- **Frequency:** Once per day
- **Time:** 00:00 UTC (midnight)
- **Timezone Conversion:**
  - 8:00 AM SGT (Singapore)
  - 7:00 PM EST (New York, previous day)
  - 4:00 PM PST (Los Angeles, previous day)

**Want a different time?** Change the schedule in `vercel.json`:
- `0 8 * * *` = 8:00 AM UTC
- `0 12 * * *` = 12:00 PM UTC (noon)
- `0 16 * * *` = 4:00 PM UTC

---

## 🔒 Security

The API route now checks:
1. **Vercel Cron:** Automatically authenticated via `user-agent` header
2. **Manual Requests:** Require `Authorization: Bearer {CRON_SECRET}` header

This prevents unauthorized users from triggering the snapshot.

---

## 🧪 Manual Testing

### Test Locally (Development):
```bash
curl -X POST http://localhost:3000/api/metrics/snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test Production (After Deploy):
```bash
curl -X POST https://your-domain.com/api/metrics/snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📈 Monitoring

### Check Cron Logs:
1. Vercel Dashboard → Your Project
2. **Deployments** → Select latest deployment
3. **Functions** → Find `/api/metrics/snapshot`
4. View logs to see cron execution

### Check Saved Data:
1. Firebase Console → Firestore
2. Navigate to `daily-metrics` collection
3. Each document = one day's metrics

---

## 🔄 How It Works

```
┌─────────────────────────────────────────┐
│  Vercel Cron Scheduler                  │
│  Runs daily at 00:00 UTC                │
└──────────────┬──────────────────────────┘
               │
               │ Automatic POST Request
               ▼
┌─────────────────────────────────────────┐
│  /api/metrics/snapshot                  │
│                                         │
│  1. Authenticate request                │
│  2. Check if today's snapshot exists    │
│  3. Fetch all platform APIs             │
│  4. Save to Firestore                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Firestore: daily-metrics               │
│  └─ 2026-01-25: { all metrics }        │
└─────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

1. **Free Tier Limits:** Vercel Free plan includes cron jobs, but has execution limits
2. **Duplicate Protection:** The API checks if today's snapshot exists before saving
3. **API Rate Limits:** Be aware of rate limits on YouTube, X, Facebook, Instagram APIs
4. **Token Expiration:** Facebook/Instagram tokens may expire - monitor for errors

---

## 🐛 Troubleshooting

### Cron not running?
- Check Vercel Dashboard → Settings → Crons
- Verify `vercel.json` is in project root
- Redeploy the project

### Getting 401 Unauthorized?
- Vercel Cron should work automatically
- For manual requests, ensure `CRON_SECRET` is set and header is correct

### No data being saved?
- Check Vercel Function logs for errors
- Verify all environment variables are set (API keys, tokens)
- Test API endpoints individually

### Metrics missing for a platform?
- Check if API credentials are valid
- Review error logs in Vercel Dashboard
- Verify platform-specific environment variables

---

## 📝 Summary

✅ **Automated:** Runs daily at midnight UTC without user interaction  
✅ **Secure:** Protected against unauthorized access  
✅ **Reliable:** Duplicate prevention ensures one snapshot per day  
✅ **Complete:** Captures all 6 social media platforms + website  
✅ **Monitored:** Logs available in Vercel Dashboard  

**Next Step:** Deploy to Vercel and verify the cron job appears in Settings → Crons!
