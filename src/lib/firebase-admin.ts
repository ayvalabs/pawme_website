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
export default admin;
