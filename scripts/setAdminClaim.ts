import * as admin from 'firebase-admin';

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const ADMIN_EMAIL = 'pawme@ayvalabs.com';

async function setAdminClaim() {
  try {
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: 'admin'
    });
    
    console.log(`✅ Successfully set admin claim for ${ADMIN_EMAIL}`);
    console.log(`   User ID: ${user.uid}`);
    console.log(`   Custom claims: { admin: true, role: 'admin' }`);
    console.log('\n⚠️  The user needs to sign out and sign back in for the changes to take effect.');
    
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\nVerified custom claims:', updatedUser.customClaims);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error setting admin claim:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error(`\nUser ${ADMIN_EMAIL} not found. Please ensure:`);
      console.error('1. The user has signed up in your application');
      console.error('2. The email address is correct');
    }
    
    process.exit(1);
  }
}

setAdminClaim();
