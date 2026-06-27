import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to initialize with service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized with service account');
    } 
    // Fallback to default credentials (works in Cloud environments)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('✅ Firebase Admin initialized with application default credentials');
    }
    // For local development without credentials
    else {
      console.warn('⚠️ Firebase Admin SDK: No credentials found. Some features may not work.');
      // Initialize without credentials for basic functionality
      admin.initializeApp();
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

// Drop `undefined` fields on write instead of throwing. Without this, writing a
// doc that has an optional field left unset (e.g. discount.productId on a promo
// code) fails with "Cannot use 'undefined' as a Firestore value". Must run once
// before any Firestore op; guarded so dev hot-reload re-runs don't throw
// "Firestore has already been initialized".
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  /* settings already applied (hot reload) — safe to ignore */
}

export default admin;
