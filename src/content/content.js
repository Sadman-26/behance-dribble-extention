// Content script for Behance & Dribbble Downloader — improved with on/off toggle

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
    chrome.runtime.onMessage.addListener(async (req, sender, send) => {
      this.log('Received message:', req);
      if (req.action === 'test') {
        return send({ success: true });
      }
      if (req.action === 'extractMedia') {
        // Check if extension is enabled
        const { extensionEnabled } = await chrome.storage.local.get({ extensionEnabled: true });
        if (!extensionEnabled) {
          send({ success: false, message: 'Extension is OFF' });
          return true;
        }
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

      // Always scroll to load all content before extraction
      await this.scrollToLoadAll();

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
        // Always scroll again before fallback extraction (in case previous scroll was in a container)
        await this.scrollToLoadAll();
        this.mediaMap = new Set();
        // Extract from all images on page, filtering avatars/icons/logos/badges/emojis/placeholders
        const allImages = Array.from(document.querySelectorAll('img'));
        allImages.forEach(img => {
          let srcs = [];
          if (img.srcset) {
            srcs = img.srcset.split(',').map(cfg => cfg.trim().split(' ')[0]);
          }
          [
            img.src,
            img.dataset?.src,
            img.getAttribute('data-src'),
            img.getAttribute('data-lazy-src'),
            img.getAttribute('data-original'),
            img.getAttribute('data-hi-res'),
            img.getAttribute('data-retina'),
          ].forEach(s => { if (s) srcs.push(s); });
          // Filter out avatars/icons/logos/badges/emojis/placeholders
          srcs = srcs.filter(src => src && !src.includes('data:') && !src.match(/avatar|icon|logo|badge|emoji|placeholder/i));
          const best = this.pickBestQuality(srcs);
          if (best) {
            this.extractedMedia.push({
              type: 'image',
              url: best,
              filename: this.getFileNameFromUrl(best)
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
        // Add unique URLs to extracted media, filtering avatars/icons/logos/badges/emojis/placeholders
        [...new Set(foundUrls)].forEach(url => {
          if (!url.match(/avatar|icon|logo|badge|emoji|placeholder/i)) {
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
  // Utility: Pick the best quality URL from a set of candidates
  pickBestQuality(urls) {
    if (!urls || urls.length === 0) return null;
    // Prefer URLs with 'original', 'full', 'max', or largest dimension/size in the path
    const qualityKeywords = ['original', 'full', 'max', '4k', 'hd', 'large'];
    const scored = urls.map(url => {
      let score = 0;
      const lower = url.toLowerCase();
      qualityKeywords.forEach((kw, i) => {
        if (lower.includes(kw)) score += (qualityKeywords.length - i) * 10;
      });
      // Prefer longer URLs (often higher res)
      score += lower.length;
      // Prefer .png or .webp over .jpg
      if (lower.endsWith('.png')) score += 5;
      if (lower.endsWith('.webp')) score += 3;
      return { url, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].url;
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
      // Collect all possible image sources
      let srcs = [];
      if (img.srcset) {
        // Parse all srcset candidates
        srcs = img.srcset.split(',').map(cfg => cfg.trim().split(' ')[0]);
      }
      [
        img.src,
        img.dataset?.src,
        img.getAttribute('data-src'),
        img.getAttribute('data-lazy-src'),
        img.getAttribute('data-original'),
        img.getAttribute('data-hi-res'),
        img.getAttribute('data-retina'),
      ].forEach(s => { if (s) srcs.push(s); });
      // Filter out avatars/icons/logos/badges/emojis/placeholders
      srcs = srcs.filter(src => src && !src.includes('data:') && !src.match(/avatar|icon|logo|badge|emoji|placeholder/i));
      // Pick the best quality
      const best = this.pickBestQuality(srcs);
      if (best) candidates.push({ type: 'image', url: best });
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
      document.getElementById('project-modules'),
      document.querySelector('.Project-projectModules'),
      document.querySelector('.project-module-container'),
      document.querySelector('[data-id="project-modules"]'),
      document.querySelector('[data-testid="project-modules"]'),
      document.querySelector('[class*="ProjectModule"]'),
      document.querySelector('[class*="projectModule"]'),
      document.querySelector('main'),
      document.querySelector('.gallery-content'),
      document.querySelector('.project-content'),
      document.querySelector('.content-wrapper')
    ];
    this.projectModules = possibleContainers.find(container => container !== null);
    if (!this.projectModules) {
      this.log('No specific container found, using document.body');
      this.projectModules = document.body;
    }
    await this.scrollToLoadAll();
    this.mediaMap = new Set();
    this.extractMediaFromList(this.gatherMedia(this.projectModules));
    // Try to extract original images from embedded JSON (Behance)
    try {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent);
      const initialStateScript = scripts.find(s => s.includes('original_url') || s.includes('modules') || s.includes('projectModules'));
      if (initialStateScript) {
        const jsonMatch = initialStateScript.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
        let json = null;
        if (jsonMatch) {
          try { json = JSON.parse(jsonMatch[1]); } catch {}
        } else {
          const curly = initialStateScript.indexOf('{');
          if (curly !== -1) {
            try { json = JSON.parse(initialStateScript.slice(curly, initialStateScript.lastIndexOf('}')+1)); } catch {}
          }
        }
        if (json) {
          const urls = [];
          const findUrls = obj => {
            if (!obj || typeof obj !== 'object') return;
            for (const k in obj) {
              if (typeof obj[k] === 'string' && obj[k].match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i)) {
                if (obj[k].toLowerCase().includes('original') || obj[k].toLowerCase().includes('full')) {
                  urls.push(obj[k]);
                }
              } else if (typeof obj[k] === 'object') {
                findUrls(obj[k]);
              }
            }
          };
          findUrls(json);
          urls.forEach(url => {
            this.extractMediaFromList([{ type: 'image', url }]);
          });
        }
      }
    } catch (e) { this.log('Behance JSON parse error', e); }
    this.log('Found', this.extractedMedia.length, 'items');
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
    // Try to extract original images from embedded JSON (Dribbble)
    try {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.textContent);
      const preloadScript = scripts.find(s => s.includes('original') || s.includes('full') || s.includes('images'));
      if (preloadScript) {
        const jsonMatch = preloadScript.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});/);
        let json = null;
        if (jsonMatch) {
          try { json = JSON.parse(jsonMatch[1]); } catch {}
        } else {
          const curly = preloadScript.indexOf('{');
          if (curly !== -1) {
            try { json = JSON.parse(preloadScript.slice(curly, preloadScript.lastIndexOf('}')+1)); } catch {}
          }
        }
        if (json) {
          const urls = [];
          const findUrls = obj => {
            if (!obj || typeof obj !== 'object') return;
            for (const k in obj) {
              if (typeof obj[k] === 'string' && obj[k].match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i)) {
                if (obj[k].toLowerCase().includes('original') || obj[k].toLowerCase().includes('full')) {
                  urls.push(obj[k]);
                }
              } else if (typeof obj[k] === 'object') {
                findUrls(obj[k]);
              }
            }
          };
          findUrls(json);
          urls.forEach(url => {
            this.extractMediaFromList([{ type: 'image', url }]);
          });
        }
      }
    } catch (e) { this.log('Dribbble JSON parse error', e); }
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