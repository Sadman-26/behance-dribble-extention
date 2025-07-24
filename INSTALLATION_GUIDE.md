# Behance & Dribbble Portfolio Downloader Extension

## 📋 Overview

This Chrome extension allows you to download all images and videos from Behance galleries and Dribbble shots/profiles in a single ZIP file. It handles lazy-loaded content, extracts high-quality media, and organizes downloads with proper folder naming.

## ✨ Features

- **Multi-platform support**: Works on both Behance and Dribbble
- **Bulk download**: Download all images and videos from a portfolio work
- **Smart folder naming**: Creates folders as `username-work-name` format
- **Lazy loading handling**: Automatically scrolls to load all content
- **High-quality extraction**: Gets the highest quality versions of media
- **Third-party video support**: Extracts video URLs to a text file for manual download
- **ZIP packaging**: Everything downloads in a convenient ZIP file
- **Progress tracking**: Real-time progress updates during download
- **Duplicate removal**: Automatically removes duplicate media files

## 🛠 Installation

### Method 1: Load Unpacked Extension (Recommended)

1. **Build the extension**:
   ```bash
   cd "behance dribble extenstion"
   npm install
   npm run build
   ```

2. **Open Chrome Extension Management**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `dist` folder from the built extension
   - The extension should now appear in your extensions list

4. **Pin the extension**:
   - Click the puzzle piece icon in Chrome toolbar
   - Pin the "Behance & Dribbble Downloader" extension

## 📖 Usage

### For Behance Galleries

1. **Navigate to a Behance gallery**:
   - Go to any Behance gallery page (e.g., `https://www.behance.net/gallery/229917721/INFINITI-QX60-2025-Launch-Campaign`)

2. **Open the extension**:
   - Click the extension icon in your toolbar
   - You'll see "Ready to download media from Behance gallery"

3. **Download media**:
   - Click "Download All Media"
   - The extension will automatically scroll to load all content
   - Progress will be shown in real-time
   - A ZIP file will be downloaded when complete

### For Dribbble Shots

1. **Navigate to a Dribbble shot**:
   - Go to any Dribbble shot page (e.g., `https://dribbble.com/shots/123456-shot-name`)

2. **Follow the same process** as Behance galleries

### For Dribbble Profiles (All Types)

1. **Navigate to any Dribbble profile**:
   - **User profiles**: `https://dribbble.com/username`
   - **Team profiles**: `https://dribbble.com/teamname`
   - **Company profiles**: `https://dribbble.com/companyname`

2. **Follow the same process** to download all visible shots and portfolio items

## 🎯 Supported Pages

- **Behance**: 
  - Gallery pages: `https://www.behance.net/gallery/*`
  
- **Dribbble**:
  - Shot pages: `https://dribbble.com/shots/*`
  - User profiles: `https://dribbble.com/username`
  - Team profiles: `https://dribbble.com/teamname`
  - Company profiles: `https://dribbble.com/companyname`
  - All other profile pages (excluding system pages like settings, login, etc.)

## 📁 Download Structure

### Folder Naming
- **Behance**: `username-work-name` (e.g., `john-doe-INFINITI-QX60-2025-Launch-Campaign`)
- **Dribbble**: `username-shot-name` or `username-portfolio`

### File Types
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Videos**: MP4, WebM
- **Third-party videos**: URLs saved in `third-party-videos.xlsx` (Excel format)

## 🔧 Technical Details

### Permissions Required
- `activeTab`: To access current page content
- `storage`: To store extension settings
- `downloads`: To save files to your computer
- `host_permissions`: For Behance and Dribbble domains

### How It Works
1. **Content Detection**: Automatically detects supported pages
2. **Lazy Loading**: Scrolls progressively to load all content
3. **Media Extraction**: Finds all images and videos in the `#project-modules` div (Behance) or equivalent containers (Dribbble)
4. **Quality Enhancement**: Attempts to get highest quality versions of media
5. **Packaging**: Creates a ZIP file with all media and metadata

## 🚨 Troubleshooting

### Common Issues

1. **Extension not working on a page**:
   - Refresh the page and try again
   - Check if the page URL is supported
   - Ensure the extension is enabled

2. **No media found**:
   - Some pages may not have downloadable media
   - Try scrolling down manually first
   - Check if the page has loaded completely

3. **Download fails**:
   - Check your Chrome download settings
   - Ensure you have enough disk space
   - Try disabling other extensions temporarily

4. **ZIP file is corrupted**:
   - This may happen if the download was interrupted
   - Try downloading again
   - Check your internet connection

### Debug Mode
To enable debug mode:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for extension logs prefixed with "Content script" or "Background script"

## ⚖️ Legal Considerations

- **Respect Terms of Service**: Always comply with Behance and Dribbble's terms of service
- **Copyright**: Only download content you have permission to use
- **Personal Use**: This extension is intended for personal portfolio downloading and educational purposes
- **Attribution**: Give proper credit to original creators when using their work

## 🔄 Updates

To update the extension:
1. Pull latest changes from the repository
2. Run `npm run build` again
3. The extension will automatically reload if you're in developer mode

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Look at the browser console for error messages
3. Ensure you're using the latest version of Chrome
4. Try disabling other extensions that might conflict

## 🎨 Customization

You can customize the extension by modifying:
- **Popup UI**: Edit `src/popup/popup.html` and `src/popup/popup.css`
- **Download logic**: Modify `src/content/content.js`
- **Supported sites**: Update `manifest.json` permissions
- **Styling**: Customize the CSS in `src/popup/popup.css`

After making changes, always run `npm run build` to rebuild the extension.

---

**Happy downloading! 🎉** 