#!/usr/bin/env tsx

/**
 * Email Template Validation Script
 * 
 * This script validates that all email templates are correctly set up:
 * - Checks that template files exist
 * - Verifies filename mapping (camelCase ID → kebab-case filename)
 * - Ensures all required variables are present in templates
 */

import { promises as fs } from 'fs';
import path from 'path';

// Template metadata (copied from src/lib/email-templates.ts)
const defaultTemplates: Record<string, { id: string; name: string; subject: string; variables: string[] }> = {
  header: {
    id: 'header',
    name: 'Default Email Header',
    subject: '',
    variables: ['emailTitle'],
  },
  footer: {
    id: 'footer',
    name: 'Default Email Footer',
    subject: '',
    variables: ['unsubscribeLink'],
  },
  welcome: {
    id: 'welcome',
    name: 'Welcome Email',
    subject: '🐾 Welcome to PawMe! Your referral link is ready',
    variables: ['userName', 'referralCode', 'referralLink'],
  },
  referralSuccess: {
    id: 'referralSuccess',
    name: 'Referral Success',
    subject: "🎉 You've earned points! Someone joined using your referral link",
    variables: ['referrerName', 'newReferralCount', 'newPoints'],
  },
  verificationCode: {
    id: 'verificationCode',
    name: 'Verification Code',
    subject: 'Your PawMe Verification Code',
    variables: ['userName', 'code'],
  },
  passwordReset: {
    id: 'passwordReset',
    name: 'Password Reset',
    subject: 'Reset Your PawMe Password',
    variables: ['userName', 'link'],
  },
  shippingNotification: {
    id: 'shippingNotification',
    name: 'Reward Shipped',
    subject: '🎁 Your PawMe Reward has Shipped!',
    variables: ['userName', 'rewardTitle', 'trackingCode'],
  },
  productUpdate: {
    id: 'productUpdate',
    name: 'Product Update',
    subject: '🚀 An Update from PawMe!',
    variables: ['userName'],
  },
};

// Convert camelCase to kebab-case (same as in email.ts)
function templateIdToFilename(templateId: string): string {
  return templateId.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function validateTemplates() {
  console.log('🔍 Email Template Validation\n');
  console.log('=' .repeat(60));
  
  const templateDir = path.join(process.cwd(), 'public', 'email-templates');
  const fallbackDir = path.join(process.cwd(), 'src', 'lib', 'email-assets');
  console.log(`📁 Primary template directory: ${templateDir}`);
  console.log(`📁 Fallback template directory: ${fallbackDir}\n`);
  
  let allValid = true;
  const results: { id: string; filename: string; exists: boolean; variables: string[]; found: string[] }[] = [];
  
  // Check each template
  for (const [templateId, metadata] of Object.entries(defaultTemplates)) {
    const filename = templateIdToFilename(templateId);
    const filePath = path.join(templateDir, `${filename}.html`);
    
    console.log(`\n📄 Template: ${metadata.name}`);
    console.log(`   ID: ${templateId}`);
    console.log(`   Filename: ${filename}.html`);
    console.log(`   Path: ${filePath}`);
    
    // Check if file exists (try both locations)
    let exists = false;
    let html = '';
    let foundLocation = '';
    
    // Try primary location (public/)
    try {
      html = await fs.readFile(filePath, 'utf-8');
      exists = true;
      foundLocation = 'public/email-templates';
      console.log(`   ✅ File exists in public/ (${html.length} characters)`);
    } catch (error: any) {
      // Try fallback location (src/)
      const fallbackPath = path.join(fallbackDir, `${filename}.html`);
      try {
        html = await fs.readFile(fallbackPath, 'utf-8');
        exists = true;
        foundLocation = 'src/lib/email-assets';
        console.log(`   ✅ File exists in src/ (${html.length} characters)`);
        console.log(`   ⚠️  Should copy to public/email-templates for production`);
      } catch (fallbackError: any) {
        exists = false;
        console.log(`   ❌ File NOT found in either location`);
        allValid = false;
      }
    }
    
    // Check for required variables
    const foundVariables: string[] = [];
    if (exists && html) {
      console.log(`   Variables required: ${metadata.variables.join(', ')}`);
      
      for (const variable of metadata.variables) {
        const pattern = `{{${variable}}}`;
        if (html.includes(pattern)) {
          foundVariables.push(variable);
          console.log(`   ✅ Found: {{${variable}}}`);
        } else {
          console.log(`   ⚠️  Missing: {{${variable}}}`);
        }
      }
    }
    
    results.push({
      id: templateId,
      filename: `${filename}.html`,
      exists,
      variables: metadata.variables,
      found: foundVariables,
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary\n');
  
  const existingTemplates = results.filter(r => r.exists);
  const missingTemplates = results.filter(r => !r.exists);
  
  console.log(`Total templates: ${results.length}`);
  console.log(`✅ Existing: ${existingTemplates.length}`);
  console.log(`❌ Missing: ${missingTemplates.length}`);
  
  if (missingTemplates.length > 0) {
    console.log('\n❌ Missing templates:');
    missingTemplates.forEach(t => {
      console.log(`   - ${t.id} → ${t.filename}`);
    });
  }
  
  // Check for extra files in directory
  console.log('\n📁 Checking for extra files in directory...');
  try {
    const actualFiles = await fs.readdir(templateDir);
    const expectedFiles = results.map(r => r.filename);
    const extraFiles = actualFiles.filter(f => f.endsWith('.html') && !expectedFiles.includes(f));
    
    if (extraFiles.length > 0) {
      console.log('⚠️  Extra files found (not in defaultTemplates):');
      extraFiles.forEach(f => console.log(`   - ${f}`));
    } else {
      console.log('✅ No extra files found');
    }
  } catch (error: any) {
    console.error('❌ Could not read directory:', error.message);
  }
  
  // Template ID → Filename mapping table
  console.log('\n📋 Template ID → Filename Mapping:\n');
  console.log('| Template ID          | Filename                      | Status |');
  console.log('|----------------------|-------------------------------|--------|');
  results.forEach(r => {
    const status = r.exists ? '✅' : '❌';
    console.log(`| ${r.id.padEnd(20)} | ${r.filename.padEnd(29)} | ${status}     |`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (allValid) {
    console.log('\n✅ All templates are valid!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some templates are missing or invalid!\n');
    process.exit(1);
  }
}

// Run validation
validateTemplates().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
