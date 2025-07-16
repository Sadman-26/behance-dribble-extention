# Behance & Dribbble Downloader Chrome Extension

A powerful Chrome extension that allows you to download all images and videos from Behance galleries and Dribbble shots in a single ZIP file.

## Features

- ✅ Download all images and videos from Behance gallery pages
- ✅ Download all images and videos from Dribbble shot pages
- ✅ Automatic lazy loading by scrolling to load all content
- ✅ Extract high-quality versions of images
- ✅ Handle third-party videos (YouTube, Vimeo) by creating URL list
- ✅ Smart folder naming: `username-work-name`
- ✅ Everything packed in a convenient ZIP file
- ✅ Progress tracking and cancellation support
- ✅ Beautiful, modern UI

## Installation

### Method 1: Load Unpacked Extension (Recommended for Development)

1. **Clone/Download this project** to your computer
2. **Build the extension**:
   ```bash
   cd behance-dribble-extension
   npm install
   npm run build
   ```
3. **Open Chrome** and go to `chrome://extensions/`
4. **Enable Developer Mode** (toggle in top right)
5. **Click "Load unpacked"** and select the `dist` folder from this project
6. The extension should now appear in your Chrome toolbar

### Method 2: Development Mode

For development and testing:
```bash
npm run dev        # Build in development mode
npm run watch      # Watch for changes and auto-rebuild
```

## Usage

1. **Navigate to a supported page**:
   - Behance: `https://www.behance.net/gallery/[ID]/[work-name]`
   - Dribbble: `https://dribbble.com/shots/[ID]-[work-name]`

2. **Click the extension icon** in your Chrome toolbar
   - You'll see a green checkmark badge on supported pages

3. **Click "Download All Media"**
   - The extension will automatically scroll to load all lazy-loaded content
   - It will extract all images and videos from the `project-modules` div
   - Progress will be shown in the popup

4. **Wait for completion**
   - All media will be downloaded as a ZIP file
   - Third-party videos will be listed in a `third-party-videos.txt` file
   - The ZIP file will be named `username-work-name.zip`

## How It Works

### Content Extraction
- **Target**: Only content within `<div id="project-modules">` is extracted
- **Lazy Loading**: Automatically scrolls to load all content before extraction
- **Image Quality**: Attempts to get the highest quality version available
- **File Types**: Supports JPG, PNG, GIF, WebP, SVG, MP4, WebM, and more

### Folder Structure
```
username-work-name.zip
├── image1.jpg
├── image2.png
├── video1.mp4
├── background-image.jpg
└── third-party-videos.txt (if any)
```

### Third-Party Videos
For embedded videos from YouTube, Vimeo, or other platforms, the extension creates a text file with all video URLs that you can use to download manually.

## Supported Sites

- **Behance**: `https://www.behance.net/gallery/*`
- **Dribbble**: `https://dribbble.com/shots/*`

## Technical Details

### Architecture
- **Manifest Version**: 3 (latest Chrome extension format)
- **Content Script**: Extracts media from the DOM
- **Background Service Worker**: Handles tab management and badging
- **Popup Interface**: Provides user controls and progress tracking

### Build System
- **Webpack**: Bundles all JavaScript and assets
- **JSZip**: Creates ZIP files in the browser
- **Modern ES6+**: Uses async/await and modern JavaScript features

### Permissions
- `activeTab`: Access to the current active tab
- `storage`: Store extension settings
- `downloads`: Download files to the user's computer
- `host_permissions`: Access to Behance and Dribbble domains

## Development

### Project Structure
```
behance-dribble-extension/
├── src/
│   ├── content/
│   │   └── content.js          # Content script for media extraction
│   ├── popup/
│   │   ├── popup.html          # Extension popup interface
│   │   ├── popup.css           # Popup styling
│   │   └── popup.js            # Popup functionality
│   └── background/
│       └── background.js       # Background service worker
├── dist/                       # Built extension files
├── manifest.json              # Extension manifest
├── webpack.config.js          # Webpack configuration
└── package.json              # Dependencies and scripts
```

### Development Commands
```bash
npm install          # Install dependencies
npm run build        # Build for production
npm run dev          # Build for development
npm run watch        # Watch mode for development
```

### Key Components

#### Content Script (`content.js`)
- Extracts media from `project-modules` div
- Handles lazy loading by auto-scrolling
- Finds highest quality image versions
- Identifies third-party video embeds

#### Popup (`popup.js`)
- Provides user interface
- Communicates with content script
- Handles ZIP file creation and download
- Shows progress and media information

#### Background Script (`background.js`)
- Manages tab state and badging
- Handles extension lifecycle events
- Provides communication between components

## Troubleshooting

### Common Issues

1. **"Project modules div not found"**
   - Make sure you're on a Behance gallery or Dribbble shot page
   - Some pages may load slowly; try refreshing and waiting

2. **No images/videos found**
   - The page may not have loaded completely
   - Try scrolling manually first, then using the extension

3. **Download fails**
   - Check if Chrome's download permissions are enabled
   - Try downloading to a different folder

4. **Extension not working**
   - Refresh the page and try again
   - Check if the extension is enabled in `chrome://extensions/`

### Debug Mode
To see detailed logs:
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Use the extension - errors will appear in console

## Privacy & Security

- **No data collection**: The extension doesn't collect or send any personal data
- **Local processing**: All media extraction happens locally in your browser
- **No external servers**: Files are downloaded directly from the original sources
- **Open source**: Full source code is available for inspection

## Contributing

Feel free to submit issues, suggestions, or pull requests to improve this extension!

## License

MIT License - feel free to use and modify as needed.

---

**Note**: This extension is for educational and personal use. Please respect the intellectual property rights of content creators and only download media that you have permission to use. 