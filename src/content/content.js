// Content script for Behance & Dribbble Downloader — optimized & refactored

class MediaExtractor {
  constructor() {
    this.isExtracting = false;
    this.extractedMedia = [];
    this.thirdPartyVideos = [];
    this.projectModules = null;
    this.DEBUG = false; // Toggle detailed logging
    this.init();
  }

  log(...args) {
    if (this.DEBUG) console.log('[MediaExtractor]', ...args);
  }

  init() {
    this.log('Initialized on', window.location.href);
    chrome.runtime.onMessage.addListener((req, sender, send) => {
      this.log('Received message:', req);
      if (req.action === 'test') {
        return send({ success: true });
      }
      if (req.action === 'extractMedia') {
        this.extractAllMedia().then(send).catch(err => send({ success: false, message: err.message }));
        return true;
      }
      send({ success: false, message: 'Unknown action' });
      return true;
    });
  }

  async extractAllMedia() {
    if (this.isExtracting) throw new Error('Already extracting');
    this.isExtracting = true;
    this.extractedMedia = [];
    this.thirdPartyVideos = [];

    try {
      const url = window.location.href;
      let folderName;

      if (url.includes('behance.net/gallery/')) {
        folderName = await this.extractBehanceGallery();
      } else if (url.includes('dribbble.com/shots/')) {
        folderName = await this.extractDribbbleShot();
      } else if (url.includes('dribbble.com/') && !url.includes('/shots/')) {
        folderName = await this.extractDribbbleProfile();
      } else {
        folderName = await this.extractGenericPage();
      }

      // If no media found, try fallback extraction from entire page
      if (!this.extractedMedia.length) {
        this.log('No media found with specific extractors, trying fallback extraction');
        
        // Try direct page source extraction
        this.mediaMap = new Set();
        
        // Extract from all images on page
        const allImages = document.querySelectorAll('img');
        allImages.forEach(img => {
          const src = img.src || img.dataset.src || img.getAttribute('data-src');
          if (src && !src.includes('data:')) {
            this.extractedMedia.push({
              type: 'image',
              url: src,
              filename: this.getFileNameFromUrl(src)
            });
          }
        });
        
        // Extract from page source for Behance/Dribbble specific patterns
        const pageSource = document.documentElement.outerHTML;
        const imageUrlPatterns = [
          /https:\/\/[^"']*\.(?:jpg|jpeg|png|gif|webp)/g,
          /https:\/\/[^"']*images[^"']*\/[^"']+/g,
          /https:\/\/[^"']*media[^"']*\/[^"']+/g
        ];
        
        let foundUrls = [];
        imageUrlPatterns.forEach(pattern => {
          const matches = pageSource.match(pattern);
          if (matches) foundUrls = foundUrls.concat(matches);
        });
        
        // Add unique URLs to extracted media
        [...new Set(foundUrls)].forEach(url => {
          if (!url.includes('avatar') && !url.includes('icon')) {
            this.extractedMedia.push({
              type: 'image',
              url: url,
              filename: this.getFileNameFromUrl(url)
            });
          }
        });
        
        // Remove duplicates
        this.extractedMedia = [...new Map(this.extractedMedia.map(item => 
          [item.url, item])).values()];
      }

      if (!this.extractedMedia.length) {
        throw new Error('No media found on this page');
      }

      return { success: true, media: this.extractedMedia, thirdPartyVideos: this.thirdPartyVideos, folderName };
    } finally {
      this.isExtracting = false;
    }
  }

  // Shared helpers
  sanitizeFilename(name) { return name.replace(/[\/\\<>:"|?*&]/g, '_').substring(0,100); }
  getFileNameFromUrl(url) {
    try {
      const p = new URL(url).pathname.split('/').pop() || 'media';
      return this.sanitizeFilename(p.includes('.') ? p : `${p}.jpg`);
    } catch {
      return `media-${Date.now()}.jpg`;
    }
  }
  extractMediaFromList(list) {
    list.forEach(el => {
      const { url, type } = el;
      if (!this.mediaMap.has(url)) {
        this.mediaMap.add(url);
        this.extractedMedia.push({ type, url, filename: this.getFileNameFromUrl(url) });
      }
    });
  }
  bestSrc(srcset) {
    return srcset
      .split(',')
      .map(cfg => cfg.trim().split(' '))
      .sort((a, b) => (b[1]?.endsWith('w') ? parseInt(b[1]) : 0) - (a[1]?.endsWith('w') ? parseInt(a[1]) : 0))
      .map(p => p[0])[0];
  }

  async scrollToLoadAll(maxAttempts = 30, stepDelay = 800) {
    let lastHeight = document.body.scrollHeight;
    for (let i = 0; i < maxAttempts; i++) {
      window.scrollBy(0, window.innerHeight * 0.7);
      await new Promise(r => setTimeout(r, stepDelay));
      const newH = document.body.scrollHeight;
      if (newH === lastHeight) break;
      lastHeight = newH;
    }
    window.scrollTo(0, 0);
  }

  gatherMedia(div) {
    const images = Array.from(div.querySelectorAll('img'));
    const videos = Array.from(div.querySelectorAll('video source, video'));
    const iframes = Array.from(div.querySelectorAll('iframe'));
    const bgEls = Array.from(div.querySelectorAll('*'));

    const candidates = [];

    // Process images with expanded attribute checking
    images.forEach(img => {
      // Check all possible image source attributes
      let src = img.src || 
                img.dataset.src || 
                img.getAttribute('data-src') || 
                img.getAttribute('data-lazy-src') ||
                img.getAttribute('data-original') ||
                img.getAttribute('data-hi-res') ||
                img.getAttribute('data-retina') || 
                '';
                
      // Handle srcset
      if (img.srcset) src = this.bestSrc(img.srcset);
      
      // Check for valid image URL
      if (src && !src.includes('data:') && 
          !src.includes('avatar') && 
          !src.includes('icon') &&
          !src.includes('logo') &&
          !src.includes('badge') &&
          !src.includes('emoji') &&
          !src.includes('placeholder')) {
        candidates.push({ type: 'image', url: src });
      }
    });

    // Process videos
    videos.forEach(v => {
      const src = v.src || v.closest('video')?.src;
      if (src) candidates.push({ type: 'video', url: src });
    });

    // Process iframes for third-party videos
    iframes.forEach(fr => {
      const s = fr.src || fr.dataset.src;
      if (s && /(youtube\.com|vimeo\.com|player\.)/.test(s)) {
        this.thirdPartyVideos.push(s);
      }
    });

    // Process background images
    bgEls.forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      const m = bg?.match(/url\(["']?(.+?)["']?\)/);
      if (m && m[1] && !m[1].includes('data:')) {
        candidates.push({ type: 'image', url: m[1] });
      }
    });
    
    // Extract from style attributes
    bgEls.forEach(el => {
      const style = el.getAttribute('style');
      if (style && style.includes('background-image')) {
        const match = style.match(/background-image\s*:\s*url\(['"]?([^'"]+)['"]?\)/i);
        if (match && match[1] && !match[1].includes('data:')) {
          candidates.push({ type: 'image', url: match[1] });
        }
      }
    });
    
    // Look for special Behance/Dribbble attributes
    bgEls.forEach(el => {
      const dataSrc = el.getAttribute('data-src');
      const dataHighRes = el.getAttribute('data-high-res');
      const dataImage = el.getAttribute('data-image');
      
      if (dataSrc && !dataSrc.includes('data:')) {
        candidates.push({ type: 'image', url: dataSrc });
      }
      if (dataHighRes && !dataHighRes.includes('data:')) {
        candidates.push({ type: 'image', url: dataHighRes });
      }
      if (dataImage && !dataImage.includes('data:')) {
        candidates.push({ type: 'image', url: dataImage });
      }
    });

    return candidates.filter(c => c.url);
  }

  // Behance
  async extractBehanceGallery() {
    this.log('Behance gallery mode');
    
    // Try multiple possible container selectors for modern Behance layouts
    const possibleContainers = [
      // Traditional container
      document.getElementById('project-modules'),
      
      // Modern Behance containers
      document.querySelector('.Project-projectModules'),
      document.querySelector('.project-module-container'),
      document.querySelector('[data-id="project-modules"]'),
      document.querySelector('[data-testid="project-modules"]'),
      document.querySelector('[class*="ProjectModule"]'),
      document.querySelector('[class*="projectModule"]'),
      
      // Generic containers
      document.querySelector('main'),
      document.querySelector('.gallery-content'),
      document.querySelector('.project-content'),
      document.querySelector('.content-wrapper')
    ];
    
    // Find the first valid container
    this.projectModules = possibleContainers.find(container => container !== null);
    
    if (!this.projectModules) {
      this.log('No specific container found, using document.body');
      this.projectModules = document.body;
    }

    await this.scrollToLoadAll();
    this.mediaMap = new Set();
    this.extractMediaFromList(this.gatherMedia(this.projectModules));
    this.log('Found', this.extractedMedia.length, 'items');
    
    // If no media found, try the entire page
    if (this.extractedMedia.length === 0) {
      this.log('No media found in container, trying whole page');
      this.projectModules = document.body;
      this.extractMediaFromList(this.gatherMedia(document.body));
    }

    return this.sanitizeFilename(
      (document.querySelector('.owner-name')?.innerText || 'behance') +
      '-' + (window.location.pathname.split('/').pop() || 'gallery')
    );
  }

  // Dribbble shot
  async extractDribbbleShot() {
    this.log('Dribbble shot mode');
    this.projectModules = document.querySelector('.shot-content, .shot-container');
    if (!this.projectModules) throw new Error('Not a Dribbble shot page');

    await this.scrollToLoadAll();
    this.mediaMap = new Set();
    this.extractMediaFromList(this.gatherMedia(this.projectModules));
    this.log('Found', this.extractedMedia.length, 'items');

    return this.sanitizeFilename(
      (document.querySelector('.shot-user-name')?.innerText || 'dribbble') +
      '-' + (window.location.pathname.split('/shots/')[1] || 'shot')
    );
  }

  // Dribbble profile
  async extractDribbbleProfile() {
    this.log('Dribbble profile mode');
    await this.scrollToLoadAll();
    this.projectModules = document.body;
    this.mediaMap = new Set();
    this.extractMediaFromList(this.gatherMedia(this.projectModules));
    this.log('Found', this.extractedMedia.length, 'items');

    const user = window.location.pathname.split('/')[1] || 'dribbble-user';
    return this.sanitizeFilename(`${user}-portfolio`);
  }

  // Generic fallback
  async extractGenericPage() {
    this.log('Generic page mode');
    await this.scrollToLoadAll();
    this.projectModules = document.body;
    this.mediaMap = new Set();
    this.extractMediaFromList(this.gatherMedia(this.projectModules));
    this.log('Found', this.extractedMedia.length, 'items');

    const n = window.location.pathname.split('/').filter(p => p).join('-') || 'page';
    return this.sanitizeFilename(`page-${n}`);
  }
}

// Kick it off
new MediaExtractor();
console.log('MediaExtractor content script loaded.');
