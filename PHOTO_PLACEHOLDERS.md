# Photo Placeholders - Where to Add Your Real Pet Photos

This document lists all placeholder images that need to be replaced with real photos of pets and the PawMe robot.

---

## 🎯 Priority Photos Needed

### 0. **HERO SECTION - MOST IMPORTANT** (`/src/app/components/hero.tsx`)

**Line ~109:** Main PawMe Robot Image (Center of Hero)
```typescript
<ImageWithFallback
  src="https://images.unsplash.com/photo-1589254065878-42c9da997008?..."
  alt="PawMe AI Robot Companion"
  className="w-full h-full object-cover"
/>
```
**Recommended:** **YOUR ACTUAL PAWME ROBOT PHOTO**
**Use case:** This is the centerpiece of your entire landing page!
**What to show:**
- Clear, professional photo of the PawMe robot
- Well-lit, clean background
- Shows the camera, movement capability
- Ideally with a pet nearby or interacting
- High resolution (1200x800px minimum)

**This is the #1 most important photo to replace!**

---

**Floating Pet Photos in Hero (Already have real photos, but can be customized):**
- ✅ Top Left: Dog & cat together
- ✅ Top Right: Happy dog at home
- ✅ Bottom Left: Cat looking at camera
- ✅ Bottom Right: Happy pets at home

You can replace these with your own pet photos if desired.

---

### 1. **ProductFeatures Component** (`/src/app/components/product-features.tsx`)

**Line ~27:** AI Health Detection Feature
```typescript
image: 'PLACEHOLDER - Add close-up photo of pet face/eyes',
alt: 'Close-up of pet for AI health detection',
```
**Recommended:** Close-up of a dog or cat's face showing eyes and nose clearly
**Use case:** Demonstrating AI can monitor pet's eyes and nose for health issues

---

**Line ~33:** Daily Highlight Reels Feature
```typescript
image: 'PLACEHOLDER - Add photo of happy pet moments compilation',
alt: 'Pet highlight moments',
```
**Recommended:** Collage of happy pet moments or a playful pet in action
**Use case:** Show automatic video compilation feature

---

**Line ~39:** Smart Security Alerts Feature
```typescript
image: 'PLACEHOLDER - Add photo of alert/security concept',
alt: 'Smart home security for pets',
```
**Recommended:** Pet looking alert at home, or home security camera view with pet
**Use case:** Demonstrating unusual activity detection

---

**Line ~137:** AI Companion Section (Large Feature Box)
```typescript
<div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
  <p className="text-center text-muted-foreground px-4">
    PLACEHOLDER<br />Add photo of PawMe robot interacting with pet
  </p>
</div>
```
**Recommended:** **THE ROBOT PHOTO YOU PROVIDED** - PawMe robot with a pet
**Use case:** Hero image showing the robot in action with a real pet
**This is the most important photo!**

---

## 📸 Existing Real Photos (Already Implemented)

These sections already have real photos from Unsplash:

### ProductFeatures Component
1. ✅ **360° Movement & HD Camera** - Happy dog at home
2. ✅ **Two-Way Audio** - Pet owner on video call
3. ✅ **AI Health Monitoring** - Cat looking at camera
4. ✅ **Distance Sensor** - Pet waiting for owner
5. ✅ **Interactive Laser Play** - Dog playing with laser

### Hero Component
1. ✅ **Main hero image** - AI robot companion photo (right column)

---

## 🖼️ How to Add Your Photos

### Method 1: Direct Image URLs
If you have photos hosted online (e.g., on your server or CDN):

```typescript
image: 'https://yourdomain.com/photos/pawme-robot-with-cat.jpg',
```

### Method 2: Import Local Images
If you want to add local images to the project:

1. **Add image to project** (create an assets folder):
   ```
   /src/assets/
     ├── robot-with-pet.jpg
     ├── pet-closeup.jpg
     ├── pet-moments.jpg
     └── security-alert.jpg
   ```

2. **Import in component:**
   ```typescript
   import robotWithPet from '@/assets/robot-with-pet.jpg';
   ```

3. **Use in component:**
   ```typescript
   image: robotWithPet,
   ```

### Method 3: Use Figma Assets
If images are in Figma and you import them:

```typescript
import petPhoto from 'figma:asset/[YOUR_FIGMA_ASSET_ID].jpg';
```

---

## 📝 Recommended Photo Specifications

### For Feature Cards (ProductFeatures)
- **Dimensions:** 800x600px minimum
- **Aspect Ratio:** 4:3 or 16:9
- **Format:** JPG or PNG
- **Quality:** High resolution (for retina displays)
- **File Size:** Optimized (under 500KB per image)

### For Large Hero Sections
- **Dimensions:** 1200x800px minimum
- **Aspect Ratio:** 3:2 or 16:9
- **Format:** JPG preferred
- **Quality:** High resolution
- **File Size:** Under 1MB

---

## 🎨 Photo Style Guidelines

To maintain consistency with existing photos:

1. **Natural Lighting** - Bright, well-lit photos
2. **Home Settings** - Photos should look like real homes
3. **Happy Pets** - Pets should look content and healthy
4. **Clean Backgrounds** - Avoid cluttered backgrounds
5. **Professional Quality** - Sharp focus, good composition

---

## 🤖 The Most Important Photo

### PawMe Robot with Pet
**Location:** ProductFeatures component, line ~137
**This should be YOUR actual robot photo!**

**What to show:**
- The physical PawMe robot
- Interacting with a real pet (dog or cat)
- Home environment
- Clear view of the robot's features (camera, movement)

**This photo will:**
- Build trust with potential backers
- Show the product is real and working
- Demonstrate the size and scale
- Create emotional connection

---

## 💡 Quick Photo Sources (If Needed)

While you gather your real photos, here are some options:

### Option 1: Use Your Own Photos
- Photos of beta testers using PawMe
- Photos from your product development
- Photos from your team at Ayva Labs

### Option 2: Stock Photos (Temporary)
- Unsplash (free, high quality)
- Pexels (free, high quality)
- Your own pet photos

### Option 3: AI-Generated (Not Recommended for Main Product)
- Can be used for concepts
- Should NOT be used for the actual robot

---

## ✅ Photo Checklist

Before adding photos, ensure:
- [ ] Photos are your own or properly licensed
- [ ] Images are optimized for web (compressed)
- [ ] Alt text is descriptive and accurate
- [ ] Photos match the feature they represent
- [ ] Robot photos show the actual PawMe device
- [ ] Photos are high quality and professional
- [ ] All placeholder text is removed

---

## 🚀 Priority Order

1. **HIGHEST PRIORITY:** PawMe robot with pet (line ~137)
2. **HIGH:** AI health detection close-up (line ~27)
3. **MEDIUM:** Daily highlights compilation (line ~33)
4. **LOW:** Security alerts (line ~39)

---

## Need Help?

If you need assistance:
1. Replace placeholder text with your image URL
2. Ensure image dimensions are appropriate
3. Test on different screen sizes
4. Verify images load correctly

**The placeholders are marked with "PLACEHOLDER" text - just search for this in your code editor!**