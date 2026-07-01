/**
 * Browser Console Snippet — Get Firebase ID Token
 *
 * 1. Open https://www.ayvalabs.com in your browser
 * 2. Log in with the same account you use in the PawMe app
 * 3. Open DevTools → Console
 * 4. Temporarily expose the auth instance by adding this line to
 *    src/firebase/config.ts (after `const auth = getAuth(app);`):
 *       if (typeof window !== 'undefined') (window as any).__pawmeAuth = auth;
 *    Then save the file and wait for the dev server (or production build) to refresh.
 * 5. Paste this snippet in the console and press Enter
 * 6. The token is copied to your clipboard
 *
 * Note: The token expires in ~1 hour. If tests fail with 401, refresh and re-run.
 */

(async () => {
  const auth = window.__pawmeAuth;
  if (!auth) {
    console.error('❌ __pawmeAuth not found on window.');
    console.error('   Add this line to src/firebase/config.ts after getAuth(app):');
    console.error('     if (typeof window !== \'undefined\') (window as any).__pawmeAuth = auth;');
    console.error('   Save, refresh the page, and try again.');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No user is currently signed in. Log in first.');
    return;
  }

  try {
    const token = await user.getIdToken(true);
    await navigator.clipboard.writeText(token);
    console.log('✅ Firebase ID token copied to clipboard!');
    console.log('Token (first 60 chars):', token.slice(0, 60) + '...');
    console.log('Expires in ~1 hour. If tests fail with 401, refresh and re-run this snippet.');
    console.log('');
    console.log('Paste this into your terminal as:');
    console.log(`  FIREBASE_ID_TOKEN=${token} pnpm tsx scripts/test-mobile-apis-prod.ts`);
  } catch (err) {
    console.error('❌ Failed to get token:', err);
  }
})();
