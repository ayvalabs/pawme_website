import * as admin from 'firebase-admin';

let app: admin.app.App;

export function getAdminApp() {
  if (!app) {
    if (admin.apps.length === 0) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccount) {
        try {
          const credentials = JSON.parse(serviceAccount);
          app = admin.initializeApp({
            credential: admin.credential.cert(credentials),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
        } catch (error) {
          console.error('Failed to parse service account key:', error);
          throw new Error('Invalid Firebase service account configuration');
        }
      } else {
        app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      }
    } else {
      app = admin.apps[0] as admin.app.App;
    }
  }
  return app;
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
