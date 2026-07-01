import * as admin from 'firebase-admin';

/**
 * Lazy Firebase Admin.
 *
 * IMPORTANT: the Auth/Firestore clients are created on FIRST USE, not at import.
 * ~57 route/page modules import this file; if we created the clients eagerly at
 * module scope, `next build` (which imports every module while collecting page
 * data, across parallel workers) would spin up dozens of heavy gRPC clients at
 * once and get OOM-killed (SIGKILL). Deferring to first access keeps build-time
 * imports cheap while behaving identically at runtime.
 */

let initialized = false;

function ensureInit(): void {
  if (initialized) return;
  initialized = true;

  if (!admin.apps.length) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('✅ Firebase Admin initialized with service account');
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
        console.log('✅ Firebase Admin initialized with application default credentials');
      } else {
        console.warn('⚠️ Firebase Admin SDK: No credentials found. Some features may not work.');
        admin.initializeApp();
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
    }
  }

  // Drop `undefined` fields on write instead of throwing. Must run once before
  // any Firestore op; guarded so hot-reload re-runs don't throw.
  try {
    admin.firestore().settings({ ignoreUndefinedProperties: true });
  } catch {
    /* settings already applied — safe to ignore */
  }
}

/**
 * Stable reference that initializes admin + resolves the real client on first
 * property access, binding methods so Firestore/Auth `this` stays correct.
 */
function lazyClient<T extends object>(factory: () => T): T {
  let inst: T | null = null;
  const resolve = (): T => {
    if (!inst) {
      ensureInit();
      inst = factory();
    }
    return inst;
  };
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const target = resolve() as any;
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    has(_target, prop) {
      return prop in (resolve() as any);
    },
  });
}

export const adminAuth: admin.auth.Auth = lazyClient(() => admin.auth());
export const adminDb: admin.firestore.Firestore = lazyClient(() => admin.firestore());

export default admin;
