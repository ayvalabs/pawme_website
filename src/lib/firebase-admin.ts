import * as admin from 'firebase-admin';

let app: admin.app.App;

export function getAdminApp() {
  if (app) {
    return app;
  }

  if (admin.apps.length > 0) {
    console.log('🔵 [Firebase Admin] Re-using existing app instance.');
    app = admin.apps[0] as admin.app.App;
    return app;
  }

  console.log('🔵 [Firebase Admin] Initializing new app instance...');
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    console.log('🔵 [Firebase Admin] Found FIREBASE_SERVICE_ACCOUNT_KEY. Initializing with service account credentials.');
    try {
      const credentials = JSON.parse(serviceAccount);
      app = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log('✅ [Firebase Admin] Successfully initialized with service account.');
      return app;
    } catch (error) {
      console.error('❌ [Firebase Admin] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Check if the environment variable is a valid JSON string.', error);
      throw new Error('Invalid Firebase service account configuration');
    }
  } else {
    console.warn('⚠️ [Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY not found. Attempting to use Application Default Credentials.');
    console.warn('⚠️ [Firebase Admin] This is expected for local development with `firebase emulators:start` or on Google Cloud environments (GCE, GKE, Cloud Functions). It will likely FAIL on Vercel without the service account key.');
    try {
        app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        console.log('✅ [Firebase Admin] Successfully initialized with Application Default Credentials.');
        return app;
    } catch(error) {
        console.error('❌ [Firebase Admin] CRITICAL: Failed to initialize with Application Default Credentials. This is a fatal error for server-side operations on Vercel. Please set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable.', error);
        throw new Error('Firebase Admin SDK initialization failed. Missing credentials.');
    }
  }
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export function getAdminStorage() {
  return getAdminApp().storage();
}
