# Quick Testing Guide

## 🚀 Quick Test Steps

### 1. Install & Load Extension
```bash
# In terminal, go to the extension directory
cd "behance dribble extenstion"

# Install dependencies (if not already done)
npm install

# Build the extension
npm run build

# Load in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the 'dist' folder
```

### 2. Test on Behance Gallery
1. **Go to a Behance gallery** (e.g., `https://www.behance.net/gallery/229917721/INFINITI-QX60-2025-Launch-Campaign`)
2. **Click extension icon** - Should show "Ready to download media from Behance gallery"
3. **Click "Download All Media"** - Should start scrolling automatically
4. **Check progress** - Progress bar should show loading percentage
5. **Verify download** - ZIP file should download with proper name format

### 3. Test on Dribbble Shot
1. **Go to a Dribbble shot** (e.g., `https://dribbble.com/shots/any-shot-id`)
2. **Click extension icon** - Should show "Ready to download media from Dribbble shot"
3. **Click "Download All Media"** - Should extract and download media
4. **Check ZIP contents** - Should contain images and/or videos

### 4. Test on Dribbble Profiles (All Types)
1. **Go to any Dribbble profile**:
   - User profile: `https://dribbble.com/username`
   - Team profile: `https://dribbble.com/teamname`
   - Company profile: `https://dribbble.com/companyname`
2. **Click extension icon** - Should show "Ready to download media from Dribbble profile"
3. **Click "Download All Media"** - Should download visible shots and portfolio items
4. **Check ZIP contents** - Should contain multiple shot images

## ✅ Expected Behavior

### Visual Indicators
- **Green checkmark badge** on supported pages
- **Progress bar** during scrolling and downloading
- **Real-time status updates** in popup
- **Media count display** (images, videos, third-party videos)

### Download Results
- **ZIP file** with proper naming (username-work-name)
- **High-quality images** (JPG, PNG, WebP, etc.)
- **Video files** (MP4, WebM)
- **third-party-videos.xlsx** (if applicable)

### Error Handling
- **"No media found"** on unsupported pages
- **Progress cancellation** with cancel button
- **Graceful failure** with error messages

## 🐛 Common Test Issues

1. **Extension not visible**: Check if loaded properly in chrome://extensions/
2. **No media found**: Ensure page has #project-modules div (Behance) or equivalent
3. **Download fails**: Check browser download settings and permissions
4. **ZIP corrupted**: Usually indicates network issues during download

## 📊 Performance Expectations

- **Scrolling**: 2-4 seconds per viewport scroll
- **Media detection**: 1-2 seconds after scrolling completes
- **Download speed**: Depends on media size and network
- **ZIP creation**: 1-3 seconds for typical galleries

## 🔍 Debug Tips

1. **Open DevTools** (F12) during testing
2. **Check Console** for detailed logs
3. **Monitor Network** tab for failed requests
4. **Inspect Elements** to verify #project-modules div exists

---

**Ready to test! 🎯** 