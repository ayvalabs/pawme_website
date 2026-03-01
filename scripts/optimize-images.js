const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

const imagesToOptimize = [
  // Portrait images - displayed at 200px, resize to 400px for retina
  { input: 'portrait-dog-golden.png', quality: 85, resize: { width: 400 } },
  { input: 'portrait-cat.png', quality: 85, resize: { width: 400 } },
  { input: 'portrait-dog-white.png', quality: 85, resize: { width: 400 } },
  { input: 'portrait-corgi.png', quality: 85, resize: { width: 400 } },
  
  // Hero slides - displayed at ~1200px, resize to 1920px for retina
  { input: 'hero-slide-1.png', quality: 85, resize: { width: 1920 } },
  { input: 'hero-slide-2.png', quality: 85, resize: { width: 1920 } },
  { input: 'hero-slide-3.png', quality: 85, resize: { width: 1920 } },
  { input: 'hero-slide-4.png', quality: 85, resize: { width: 1920 } },
  { input: 'hero-slide-5.png', quality: 85, resize: { width: 1920 } },
  
  // Feature screenshots - displayed at ~600px, resize to 1200px for retina
  { input: 'feed.png', quality: 85, resize: { width: 1200 } },
  { input: 'health.png', quality: 85, resize: { width: 1200 } },
  { input: 'moments.png', quality: 85, resize: { width: 1200 } },
  
  // Other images
  { input: 'founder.png', quality: 85, resize: { width: 800 } },
  { input: 'bot-hero.png', quality: 85, resize: { width: 800 } },
  { input: 'remote.png', quality: 85, resize: { width: 600 } },
];

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  for (const img of imagesToOptimize) {
    const inputPath = path.join(publicDir, img.input);
    const backupPath = path.join(publicDir, `${img.input}.backup`);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${img.input} (not found)`);
      continue;
    }

    try {
      const stats = fs.statSync(inputPath);
      const originalSize = (stats.size / 1024 / 1024).toFixed(2);

      // Backup original
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(inputPath, backupPath);
      }

      // Optimize
      await sharp(inputPath)
        .resize(img.resize.width, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: img.quality })
        .toFile(inputPath.replace('.png', '.webp'));

      // Also create optimized PNG version
      await sharp(inputPath)
        .resize(img.resize.width, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .png({ quality: img.quality, compressionLevel: 9 })
        .toFile(inputPath + '.optimized');

      // Replace original with optimized
      fs.renameSync(inputPath + '.optimized', inputPath);

      const newStats = fs.statSync(inputPath);
      const newSize = (newStats.size / 1024 / 1024).toFixed(2);
      const savings = ((1 - newStats.size / stats.size) * 100).toFixed(1);

      console.log(`✅ ${img.input}`);
      console.log(`   ${originalSize} MB → ${newSize} MB (${savings}% smaller)`);
      console.log(`   WebP version created: ${img.input.replace('.png', '.webp')}\n`);
    } catch (error) {
      console.error(`❌ Error optimizing ${img.input}:`, error.message);
    }
  }

  console.log('✨ Image optimization complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Update your code to use Next.js Image component');
  console.log('2. Use .webp versions where supported');
  console.log('3. Original backups saved as .backup files');
}

optimizeImages().catch(console.error);
