// This file is intentionally left empty.
// The dependency on firebase-admin has been removed to ensure the application
// can be deployed and run without requiring a service account key, which
// is blocked by the user's organization policy.

// All server-side logic that previously used the Admin SDK has been
// refactored to either use the client SDK with appropriate Firestore rules
// or has been adjusted to use alternative methods (e.g., embedded email templates).
