# Firebase Deployment Guide

This guide explains how to deploy the updated Firebase configuration, storage rules, and Firestore rules to fix CORS errors and enable proper image uploads for the rewards system.

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged in to Firebase CLI (`firebase login`)
- Admin access to the Firebase project

## Files Updated

The following files have been updated to fix CORS errors and improve security:

1. **`cors.json`** - Fixed JSON syntax error and added required CORS headers
2. **`storage.rules`** - Added admin-only write access for reward images
3. **`firestore.rules`** - Added rules for `appSettings` collection
4. **`src/app/services/adminService.ts`** - Enhanced with retry logic and better error handling

## Deployment Steps

### 1. Deploy CORS Configuration to Firebase Storage

The CORS configuration needs to be applied to your Firebase Storage bucket using the `gsutil` command-line tool.

```bash
# Install Google Cloud SDK if not already installed
# Visit: https://cloud.google.com/sdk/docs/install

# Set your Firebase project ID
export PROJECT_ID="your-firebase-project-id"

# Apply CORS configuration to the storage bucket
gsutil cors set cors.json gs://${PROJECT_ID}.appspot.com
```

**Alternative method using Firebase Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to Cloud Storage > Browser
4. Select your bucket
5. Click "Edit bucket permissions"
6. Add CORS configuration manually

### 2. Deploy Firestore Rules

Deploy the updated Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

This will deploy the rules from `firestore.rules` which now includes:
- Admin-only access to `emailTemplates` collection
- Public read access to `appSettings` collection
- Admin-only write access to `appSettings` collection

### 3. Deploy Storage Rules

Deploy the updated Firebase Storage security rules:

```bash
firebase deploy --only storage
```

This will deploy the rules from `storage.rules` which now includes:
- Public read access to reward images
- Admin-only write access (restricted to `pawme@ayvalabs.com`)

### 4. Verify Deployment

After deployment, verify that everything is working:

1. **Test CORS Configuration:**
   ```bash
   gsutil cors get gs://${PROJECT_ID}.appspot.com
   ```
   
2. **Test Storage Rules:**
   - Log in as admin (`pawme@ayvalabs.com`)
   - Go to the Dashboard > Settings tab
   - Try uploading a reward image
   - Verify the upload succeeds without CORS errors

3. **Test Firestore Rules:**
   - Verify you can save reward tiers and app settings as admin
   - Check browser console for any permission errors

## Troubleshooting

### CORS Errors Persist

If you still see CORS errors after deployment:

1. **Clear browser cache** and hard reload (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. **Verify CORS is applied:**
   ```bash
   gsutil cors get gs://${PROJECT_ID}.appspot.com
   ```
3. **Check Firebase Storage bucket name** matches your project
4. **Wait 5-10 minutes** for changes to propagate

### Unauthorized Errors

If you see "Unauthorized" errors when uploading:

1. Ensure you're logged in as `pawme@ayvalabs.com`
2. Check that storage rules are deployed: `firebase deploy --only storage`
3. Verify your Firebase Auth token is valid (try logging out and back in)

### Image Upload Fails

If image uploads fail:

1. Check browser console for detailed error messages
2. Verify file size is reasonable (< 5MB recommended)
3. Ensure file type is a valid image format (jpg, png, gif, webp)
4. Check Firebase Storage quota hasn't been exceeded

## Enhanced Features

The updated `adminService.ts` now includes:

- **Retry Logic**: Automatically retries failed uploads up to 3 times with exponential backoff
- **Better Error Messages**: Provides clear, actionable error messages
- **File Sanitization**: Cleans filenames to prevent issues with special characters
- **Metadata Tracking**: Adds upload timestamp and admin identifier to uploaded files
- **Progress Tracking**: New `uploadRewardImage()` function supports upload progress callbacks

## Security Notes

- Only the admin user (`pawme@ayvalabs.com`) can upload images to Firebase Storage
- All users can read reward images (required for public display)
- Only admin can modify app settings in Firestore
- All users can read app settings (required for displaying referral tiers and rewards)

## Next Steps

After successful deployment:

1. Test the reward image upload functionality in the dashboard
2. Monitor Firebase Console for any errors or unusual activity
3. Consider setting up Firebase Storage size limits and quotas
4. Set up automated backups for Firestore data

## Support

If you encounter issues not covered in this guide:

1. Check Firebase Console logs
2. Review browser console for client-side errors
3. Check Firebase CLI version: `firebase --version` (should be >= 11.0.0)
4. Verify all environment variables are set correctly in `.env.local`
