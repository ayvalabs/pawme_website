# Environment Variable Setup for Firebase Admin SDK

## Add Firebase Service Account to .env.local

You need to add your Firebase service account credentials to `.env.local` to enable server-side Firebase operations.

### Option 1: Using Service Account JSON (Recommended for Development)

1. **Download your service account key** from Firebase Console:
   - Go to: https://console.firebase.google.com/project/pawme-bc0a0/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Save the JSON file

2. **Convert the JSON to a single-line string:**
   ```bash
   # On Mac/Linux:
   cat path/to/serviceAccountKey.json | jq -c . | pbcopy
   
   # Or manually: Remove all newlines and extra spaces from the JSON
   ```

3. **Add to `.env.local`:**
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"pawme-bc0a0",...}'
   ```

### Option 2: Using Application Default Credentials (For Production)

For production deployments (like Firebase Hosting or Google Cloud), you can use Application Default Credentials instead:

1. **Remove or comment out** `FIREBASE_SERVICE_ACCOUNT_KEY` from `.env.local`
2. The system will automatically use Application Default Credentials

### Complete .env.local Example

Your `.env.local` should look like this:

```bash
# Firebase Client SDK (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pawme-bc0a0.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://pawme-bc0a0.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pawme-bc0a0
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pawme-bc0a0.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin SDK (add this)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"pawme-bc0a0","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-...@pawme-bc0a0.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

# Other environment variables
RESEND_API_KEY=your-resend-api-key
```

### After Adding the Environment Variable

1. **Restart your development server:**
   ```bash
   # Stop the current dev server (Ctrl+C)
   pnpm dev
   ```

2. **Test the settings update:**
   - Go to Dashboard > Settings
   - Upload a reward image
   - Click "Save Point Rewards"
   - Should now work without errors!

### Troubleshooting

**Error: "Invalid Firebase service account configuration"**
- Check that the JSON is valid (no syntax errors)
- Ensure the entire JSON is wrapped in single quotes
- Make sure there are no line breaks in the JSON string

**Error: "Failed to parse service account key"**
- The JSON might be malformed
- Try using `jq -c .` to compact the JSON properly
- Verify all escape characters are correct (especially in private_key)

**Still getting 500 errors?**
- Check the server console/logs for detailed error messages
- Verify the service account has the correct permissions in Firebase Console
- Make sure you restarted the dev server after adding the env var
