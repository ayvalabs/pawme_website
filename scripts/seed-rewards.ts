import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function seedRewards() {
  try {
    const rewardsDataPath = path.join(__dirname, 'seed-rewards.json');
    const rewardsData = JSON.parse(fs.readFileSync(rewardsDataPath, 'utf-8'));

    const docRef = db.collection('appSettings').doc('config');
    
    await docRef.set(rewardsData, { merge: true });
    
    console.log('✅ Successfully seeded rewards data to Firestore!');
    console.log('\nSeeded Data:');
    console.log(`- Referral Tiers: ${rewardsData.referralTiers.length}`);
    console.log(`- Reward Tiers: ${rewardsData.rewardTiers.length}`);
    console.log(`- VIP Spots: ${rewardsData.vipConfig.totalSpots}`);
    
    console.log('\n📋 Referral Tiers:');
    rewardsData.referralTiers.forEach((tier: any) => {
      console.log(`  ${tier.icon} ${tier.tier} (${tier.count}+ referrals): ${tier.reward}`);
    });
    
    console.log('\n🎁 Reward Tiers:');
    rewardsData.rewardTiers.forEach((reward: any) => {
      console.log(`  ${reward.title} - ${reward.requiredPoints} points`);
    });
    
    console.log('\n⚠️  IMPORTANT: You need to manually add reward images to /public/images/rewards/');
    console.log('Required images:');
    rewardsData.rewardTiers.forEach((reward: any) => {
      console.log(`  - ${reward.image}`);
    });
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding rewards:', error.message);
    process.exit(1);
  }
}

seedRewards();
