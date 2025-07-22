// Background service worker for Behance & Dribbble Downloader
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('Behance & Dribbble Downloader installed');
      }
    });

    // Handle messages from content script and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Will respond asynchronously
    });

    // Handle tab updates to check if we're on a supported page
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.updateBadge(tab);
      }
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        this.updateBadge(tab);
      });
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'checkPage':
          // If URL is provided directly, use that, otherwise use the sender tab's URL
          const url = request.url || (sender.tab ? sender.tab.url : null);
          const isSupported = this.isSupportedPage(url);
          sendResponse({ supported: isSupported });
          break;

        case 'downloadProgress':
          // Handle download progress updates
          this.updateDownloadProgress(request.progress);
          break;

        case 'updateSiteAccessIcon':
          // Set icon based on site access state
          this.setSiteAccessIcon(request.enabled);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  }

  setSiteAccessIcon(enabled) {
    const iconPath = enabled
      ? {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png'
        }
      : {
          16: 'icons/icon16_gray.png',
          48: 'icons/icon48_gray.png',
          128: 'icons/icon128_gray.png'
        };
    chrome.action.setIcon({ path: iconPath });
  }

  isSupportedPage(url) {
    if (!url) return false;
    
    // Behance gallery pages
    if (url.includes('behance.net/gallery/')) {
      return true;
    }
    
    // Dribbble pages (supports all profile types: user, team, company)
    if (url.includes('dribbble.com/') || url.includes('www.dribbble.com/')) {
      // Exclude some Dribbble pages that don't contain downloadable content
      const excludedPaths = [
        '/about', 
        '/contact', 
        '/terms', 
        '/privacy', 
        '/login', 
        '/signup',
        '/session/new',
        '/account',
        '/settings',
        '/explore',
        '/following',
        '/likes',
        '/buckets',
        '/tags',
        '/search',
        '/jobs',
        '/pro',
        '/hiring',
        '/freelance-jobs',
        '/full-time-jobs',
        '/go-pro'
      ];
      
      // Check if URL contains any excluded paths
      for (const path of excludedPaths) {
        if (url.includes(path)) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  updateBadge(tab) {
    if (!tab || !tab.url) return;

    if (this.isSupportedPage(tab.url)) {
      // Show green badge for supported pages
      chrome.action.setBadgeText({
        text: '✓',
        tabId: tab.id
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#28a745',
        tabId: tab.id
      });
      chrome.action.setTitle({
        title: 'Download media from this portfolio',
        tabId: tab.id
      });
    } else {
      // Clear badge for unsupported pages
      chrome.action.setBadgeText({
        text: '',
        tabId: tab.id
      });
      chrome.action.setTitle({
        title: 'Navigate to a Behance gallery or Dribbble shot to download media',
        tabId: tab.id
      });
    }
  }

  updateDownloadProgress(progress) {
    // Update badge with progress if needed
    if (progress && progress.current && progress.total) {
      const percentage = Math.round((progress.current / progress.total) * 100);
      chrome.action.setBadgeText({
        text: `${percentage}%`
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#007bff'
      });
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService(); 