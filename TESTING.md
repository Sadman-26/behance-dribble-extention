# Testing Guide for Behance & Dribbble Downloader

## Pre-Testing Setup

1. **Build the extension**:
   ```bash
   npm install
   npm run build
   ```

2. **Load the extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Test Cases

### 1. Basic Functionality Test

#### Test Behance Gallery
1. Navigate to a Behance gallery page: `https://www.behance.net/gallery/[ID]/[work-name]`
2. Check that extension badge shows green checkmark
3. Click extension icon
4. Verify popup shows "Ready to download media"
5. Click "Download All Media"
6. Verify:
   - Status shows "Extracting media from page..."
   - Page automatically scrolls to load content
   - Progress bar appears
   - Media info shows counts
   - ZIP file downloads with correct name format

#### Test Dribbble Shot
1. Navigate to a Dribbble shot page: `https://dribbble.com/shots/[ID]-[work-name]`
2. Repeat same steps as Behance test
3. Verify all functionality works

### 2. Edge Cases

#### Test Empty Project
1. Navigate to a page with no images/videos in project-modules
2. Verify appropriate error message appears

#### Test Unsupported Page
1. Navigate to homepage (behance.com or dribbble.com)
2. Verify extension badge is empty
3. Click extension - should show warning message

#### Test Third-Party Videos
1. Find a portfolio with embedded YouTube/Vimeo videos
2. Download and verify `third-party-videos.txt` is created
3. Check that URLs are properly listed

### 3. UI/UX Tests

#### Test Progress Tracking
1. Monitor progress bar during download
2. Verify media counts update correctly
3. Test cancel functionality

#### Test Responsive Design
1. Test popup on different screen sizes
2. Verify all buttons and text are readable

### 4. Error Handling

#### Test Network Errors
1. Disconnect internet during download
2. Verify graceful error handling

#### Test Permission Errors
1. Revoke download permissions
2. Verify fallback download method works

## Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Badge shows correctly on supported pages
- [ ] Badge is hidden on unsupported pages
- [ ] Popup opens and displays correctly
- [ ] Download button is disabled on unsupported pages
- [ ] Auto-scrolling works for lazy loading
- [ ] Images are extracted from project-modules div only
- [ ] Videos are extracted properly
- [ ] Third-party videos create text file
- [ ] ZIP file downloads with correct name
- [ ] Progress tracking works
- [ ] Cancel functionality works
- [ ] Error messages are clear and helpful
- [ ] High-quality images are downloaded
- [ ] Duplicate files are removed
- [ ] Background images are extracted
- [ ] Multiple file types are supported

## Common Test URLs

### Behance Examples
- `https://www.behance.net/gallery/123456789/Example-Project`
- Look for galleries with multiple images and videos

### Dribbble Examples
- `https://dribbble.com/shots/12345678-Example-Shot`
- Look for shots with multiple images

## Debugging

### Console Logs
1. Open Chrome DevTools (F12)
2. Check Console tab for errors
3. Look for:
   - Content script errors
   - Network request failures
   - Extension API errors

### Extension Debugging
1. Go to `chrome://extensions/`
2. Click "inspect views: popup.html" to debug popup
3. Click "inspect views: background page" to debug background script

### Network Debugging
1. Open DevTools Network tab
2. Monitor requests during download
3. Check for failed image/video requests

## Performance Testing

### Large Portfolios
1. Test with portfolios containing 20+ images
2. Monitor memory usage
3. Verify all files download successfully

### Slow Networks
1. Throttle network in DevTools
2. Test download behavior
3. Verify timeout handling

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Chrome (one version back)
- [ ] Edge (Chromium-based)

## Reporting Issues

When reporting bugs, include:
1. Browser version
2. Extension version
3. Page URL being tested
4. Console errors
5. Steps to reproduce
6. Expected vs actual behavior

## Success Criteria

The extension passes testing when:
1. All basic functionality works on both Behance and Dribbble
2. No console errors during normal operation
3. ZIP files download with correct content and naming
4. UI is responsive and user-friendly
5. Error handling is graceful
6. Performance is acceptable for typical use cases 