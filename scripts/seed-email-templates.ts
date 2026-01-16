#!/usr/bin/env tsx

/**
 * Script to seed email templates to Firestore
 * 
 * This script saves the default email templates from src/lib/email-templates.ts
 * to the Firestore database under the 'emailTemplates' collection.
 * 
 * Usage:
 *   pnpm tsx scripts/seed-email-templates.ts
 * 
 * Note: You must be authenticated as pawme@ayvalabs.com to run this script.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as readline from 'readline';
import { defaultTemplates } from '../src/lib/email-templates';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function seedTemplates() {
  try {
    console.log('🔐 Firebase Email Template Seeder');
    console.log('================================\n');

    // Check if environment variables are set
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error('❌ Firebase configuration not found in environment variables.');
      console.error('Make sure your .env.local file is properly configured.');
      process.exit(1);
    }

    // Authenticate as admin
    console.log('Please sign in with admin credentials (pawme@ayvalabs.com):\n');
    const email = await question('Email: ');
    const password = await question('Password: ');
    console.log('');

    if (email !== 'pawme@ayvalabs.com') {
      console.error('❌ Only pawme@ayvalabs.com can seed email templates.');
      rl.close();
      process.exit(1);
    }

    console.log('🔑 Authenticating...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Authenticated successfully!\n');

    // Get templates collection reference
    const templatesRef = collection(db, 'emailTemplates');

    console.log('📧 Seeding email templates to Firestore...\n');

    // Save each template
    for (const [templateId, template] of Object.entries(defaultTemplates)) {
      console.log(`  📝 Saving template: ${template.name} (${templateId})`);
      
      const templateDoc = doc(templatesRef, templateId);
      await setDoc(templateDoc, {
        id: template.id,
        name: template.name,
        subject: template.subject,
        html: template.html,
        variables: template.variables,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      console.log(`  ✅ Saved: ${template.name}`);
    }

    console.log('\n🎉 All email templates have been successfully seeded to Firestore!');
    console.log(`\nTotal templates saved: ${Object.keys(defaultTemplates).length}`);
    console.log('\nTemplates saved:');
    Object.values(defaultTemplates).forEach(t => {
      console.log(`  - ${t.name} (${t.id})`);
    });

    rl.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error seeding templates:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the seeder
seedTemplates();
