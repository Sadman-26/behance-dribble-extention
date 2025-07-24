// Import JSZip for creating ZIP files
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

class PopupController {
  constructor() {
    this.isDownloading = false;
    this.downloadedFiles = 0;
    this.totalFiles = 0;
    this.zip = null;
    // Do not call this.init() here
  }

  init() {
    this.bindEvents();
    this.checkCurrentPage();
    this.listenForProgress();
  }
  
  listenForProgress() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'scrollProgress') {
        this.updateScrollProgress(request.progress);
      } else if (request.action === 'downloadProgress') {
        this.updateDownloadProgress(request.progress);
      }
    });
  }

  bindEvents() {
    const downloadBtn = document.getElementById('downloadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const siteAccessToggle = document.getElementById('siteAccessToggle');

    downloadBtn.addEventListener('click', () => this.startDownload());
    cancelBtn.addEventListener('click', () => this.cancelDownload());

    // Toggle site access logic
    siteAccessToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      chrome.storage.sync.set({ siteAccessEnabled: enabled }, () => {
        this.updateSiteAccessUI(enabled);
        // Notify background to update icon
        chrome.runtime.sendMessage({ action: 'updateSiteAccessIcon', enabled });
      });
    });

    // Restore site access toggle state on popup load
    chrome.storage.sync.get(['siteAccessEnabled'], (result) => {
      // Default to OFF (false) if not set
      const enabled = result.siteAccessEnabled === true;
      siteAccessToggle.checked = enabled;
      this.updateSiteAccessUI(enabled);
      // Notify background to update icon on popup load
      chrome.runtime.sendMessage({ action: 'updateSiteAccessIcon', enabled });
    });
  }

  async checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on a supported page by asking the background script
      const response = await chrome.runtime.sendMessage({ action: 'checkPage', url: tab.url });
      
      if (!response.supported) {
        this.updateStatus('Please navigate to a Behance gallery or Dribbble page', 'error');
        document.getElementById('downloadBtn').disabled = true;
        return;
      }

      // Determine the type of page and customize the message
      let readyMessage = 'Ready to download media from current page';
      
      if (tab.url.includes('behance.net/gallery/')) {
        readyMessage = 'Ready to download media from Behance gallery';
      } else if (tab.url.includes('dribbble.com/shots/')) {
        readyMessage = 'Ready to download media from Dribbble shot';
      } else if (tab.url.includes('dribbble.com/')) {
        const path = new URL(tab.url).pathname.split('/')[1];
        const excludedPaths = ['about', 'contact', 'terms', 'privacy', 'login', 'signup', 'session', 'account', 'settings', 'explore', 'following', 'likes', 'buckets', 'tags', 'search', 'jobs', 'pro', 'hiring', 'freelance-jobs', 'full-time-jobs', 'go-pro'];
        
        if (path && !excludedPaths.includes(path)) {
          // Determine if it's a user, team, or company profile
          readyMessage = `Ready to download media from Dribbble profile`;
        }
      }

      this.updateStatus(readyMessage);
      document.getElementById('downloadBtn').disabled = false;
    } catch (error) {
      this.updateStatus('Error checking current page', 'error');
      console.error('Error:', error);
    }
  }

  async startDownload() {
    // Check site access before proceeding
    const enabled = await new Promise(resolve => {
      chrome.storage.sync.get(['siteAccessEnabled'], result => {
        resolve(result.siteAccessEnabled === true);
      });
    });
    if (!enabled) {
      this.updateStatus('Site access is disabled. Enable to use downloader.', 'error');
      return;
    }

    if (this.isDownloading) return;

    this.isDownloading = true;
    this.updateStatus('Extracting media from page...', 'loading');
    this.toggleButtons(true);
    this.showProgressBar();
    this.updateProgressLabel('Scrolling to load content...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log('Current tab:', tab);
      console.log('Tab URL:', tab.url);
      
      // Test if content script is available
      try {
        const testResponse = await chrome.tabs.sendMessage(tab.id, { action: 'test' });
        console.log('Content script test response:', testResponse);
      } catch (testError) {
        console.error('Content script test failed:', testError);
        this.updateStatus('Content script not found. Please refresh the page and try again.', 'error');
        return;
      }
      
      // Send message to content script to extract media
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractMedia' });
      
      console.log('Content script response:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to extract media');
      }

      const { media, thirdPartyVideos, folderName } = response;
      
      console.log(`Extracted media summary:`, {
        totalMedia: media.length,
        images: media.filter(m => m.type === 'image').length,
        videos: media.filter(m => m.type === 'video').length,
        thirdPartyVideos: thirdPartyVideos.length,
        folderName: folderName
      });
      
      // Log first few media items for debugging
      if (media.length > 0) {
        console.log('First few media items:', media.slice(0, 3));
      }
      
      if (thirdPartyVideos.length > 0) {
        console.log('Third-party videos found:', thirdPartyVideos);
      }
      
      // Update UI with media info
      this.updateMediaInfo(media, thirdPartyVideos, folderName);
      
      if (media.length === 0 && thirdPartyVideos.length === 0) {
        throw new Error('No media found on this page');
      }

      // Update progress for download phase
      this.updateProgressLabel('Downloading media files...');
      
      // Start downloading
      await this.downloadAllMedia(media, thirdPartyVideos, folderName);

    } catch (error) {
      this.updateStatus(`Error: ${error.message}`, 'error');
      console.error('Download error:', error);
    } finally {
      this.isDownloading = false;
      this.toggleButtons(false);
      this.hideProgressBar();
    }
  }

  async downloadAllMedia(media, thirdPartyVideos, folderName) {
    this.zip = new JSZip();
    this.totalFiles = media.length + (thirdPartyVideos.length > 0 ? 1 : 0) + 1; // +1 for page-url.txt
    this.downloadedFiles = 0;

    this.updateStatus(`Downloading ${media.length} media files...`, 'loading');
    this.updateProgressLabel(`Downloading media files (0/${this.totalFiles})`);

    try {
      // Add current page URL to zip
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const pageUrl = tab.url || '';
      this.zip.file('page-url.txt', pageUrl);
      this.downloadedFiles++;
      this.updateProgress();
      this.updateProgressLabel(`Downloading media files (${this.downloadedFiles}/${this.totalFiles})`);
      chrome.runtime.sendMessage({
        action: 'downloadProgress',
        progress: {
          current: this.downloadedFiles,
          total: this.totalFiles,
          percentage: (this.downloadedFiles / this.totalFiles) * 100
        }
      });

      // Create third-party videos Excel file if any exist
      if (thirdPartyVideos.length > 0) {
        console.log(`Creating third-party videos Excel file with ${thirdPartyVideos.length} URLs`);
        
        // Create worksheet data
        const worksheetData = [
          ['#', 'Video URL', 'Platform'], // Header row
          ...thirdPartyVideos.map((url, index) => {
            const platform = this.getVideoPlatform(url);
            return [index + 1, url, platform];
          })
        ];
        
        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Set column widths
        worksheet['!cols'] = [
          { width: 5 },  // #
          { width: 80 }, // Video URL
          { width: 15 }  // Platform
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Third-Party Videos');
        
        // Generate Excel file as buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
        console.log('Third-party videos Excel file created');
        
        this.zip.file('third-party-videos.xlsx', excelBuffer);
        this.downloadedFiles++;
        this.updateProgress();
        this.updateProgressLabel(`Downloading media files (${this.downloadedFiles}/${this.totalFiles})`);
        
        // Send progress to background script for badge update
        chrome.runtime.sendMessage({
          action: 'downloadProgress',
          progress: {
            current: this.downloadedFiles,
            total: this.totalFiles,
            percentage: (this.downloadedFiles / this.totalFiles) * 100
          }
        });
      } else {
        console.log('No third-party videos found, skipping Excel file creation');
      }

      // Download all media files
      this.updateStatus(`Downloading ${media.length} media files...`, 'loading');
      console.log(`Starting to download ${media.length} media files`);
      
      const downloadPromises = media.map(mediaItem => this.downloadMediaFile(mediaItem));
      
      await Promise.all(downloadPromises);
      
      console.log(`Successfully downloaded ${this.downloadedFiles} files to ZIP`);
      
      // Generate and download ZIP file
      this.updateStatus('Creating ZIP file...', 'loading');
      this.updateProgressLabel('Creating ZIP file...');
      this.updateProgress(100); // Show full progress for ZIP creation
      
      console.log('Starting ZIP generation...');
      console.log(`ZIP contains ${Object.keys(this.zip.files).length} files`);
      
      const zipBlob = await this.zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
        // Add progress callback for ZIP creation
        onUpdate: (metadata) => {
          console.log(`ZIP generation progress: ${metadata.percent}%`);
          this.updateProgressLabel(`Creating ZIP: ${Math.round(metadata.percent)}%`);
        }
      });
      
      console.log(`ZIP blob created successfully. Size: ${zipBlob.size} bytes`);
      
      // Download the ZIP file
      this.updateProgressLabel('Saving ZIP file...');
      const downloadUrl = URL.createObjectURL(zipBlob);
      const zipFilename = `${folderName || 'portfolio-media'}.zip`;
      
      console.log(`Attempting to download ZIP file: ${zipFilename}`);
      
      const downloadId = await this.downloadFile(downloadUrl, zipFilename);
      
      console.log(`Download initiated with ID: ${downloadId}`);
      
      this.updateStatus(`Successfully downloaded ${media.length} files!`, 'success');
      
      // Clean up
      URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Error in downloadAllMedia:', error);
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  async downloadMediaFile(mediaItem) {
    try {
      console.log(`Downloading: ${mediaItem.url}`);
      console.log(`File type: ${mediaItem.type}, filename: ${mediaItem.filename}`);
      
      const response = await fetch(mediaItem.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${mediaItem.url}: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log(`Downloaded ${mediaItem.filename}: ${blob.size} bytes, type: ${blob.type}`);
      
      if (blob.size === 0) {
        throw new Error(`Empty file downloaded for ${mediaItem.url}`);
      }
      
      this.zip.file(mediaItem.filename, blob);
      console.log(`Successfully added ${mediaItem.filename} to ZIP`);
      
      this.downloadedFiles++;
      this.updateProgress();
      this.updateProgressLabel(`Downloading media files (${this.downloadedFiles}/${this.totalFiles})`);
      
      // Send progress to background script for badge update
      chrome.runtime.sendMessage({
        action: 'downloadProgress',
        progress: {
          current: this.downloadedFiles,
          total: this.totalFiles,
          percentage: (this.downloadedFiles / this.totalFiles) * 100
        }
      });
      
    } catch (error) {
      console.error(`Error downloading ${mediaItem.url}:`, error);
      console.error(`Error type: ${error.name}, message: ${error.message}`);
      
      // Add a placeholder file for failed downloads
      const errorContent = `Failed to download: ${mediaItem.url}\nError: ${error.message}\nError type: ${error.name}`;
      this.zip.file(`ERROR_${mediaItem.filename}.txt`, errorContent);
      console.log(`Added error placeholder for ${mediaItem.filename}`);
      
      this.downloadedFiles++;
      this.updateProgress();
      this.updateProgressLabel(`Downloading media files (${this.downloadedFiles}/${this.totalFiles})`);
    }
  }

  async downloadFile(url, filename) {
    try {
      console.log(`Attempting to download file using Chrome downloads API: ${filename}`);
      
      // Test if we can access the Chrome downloads API
      if (!chrome.downloads) {
        console.error('Chrome downloads API is not available');
        throw new Error('Chrome downloads API is not available');
      }
      
      // Use Chrome downloads API
      return new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome downloads API error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log(`Download initiated successfully with ID: ${downloadId}`);
            resolve(downloadId);
          }
        });
      });
    } catch (error) {
      console.error('Chrome downloads API failed, using fallback:', error);
      
      // Fallback to creating a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      
      console.log('Triggering download via link click');
      a.click();
      
      document.body.removeChild(a);
      
      return 'fallback-download';
    }
  }

  // Add a test function to verify ZIP creation works independently
  async testZipGeneration() {
    try {
      console.log('Testing ZIP generation...');
      
      // Create a simple test ZIP
      const testZip = new JSZip();
      testZip.file('test.txt', 'This is a test file to verify ZIP generation works.');
      
      console.log('Generating test ZIP...');
      const testBlob = await testZip.generateAsync({ type: 'blob' });
      
      console.log(`Test ZIP created successfully. Size: ${testBlob.size} bytes`);
      
      // Try to download the test ZIP
      const testUrl = URL.createObjectURL(testBlob);
      const testResult = await this.downloadFile(testUrl, 'test.zip');
      
      console.log(`Test download result: ${testResult}`);
      
      // Clean up
      URL.revokeObjectURL(testUrl);
      
      return true;
    } catch (error) {
      console.error('Test ZIP generation failed:', error);
      return false;
    }
  }

  cancelDownload() {
    this.isDownloading = false;
    this.updateStatus('Download cancelled', 'error');
    this.toggleButtons(false);
    this.hideProgressBar();
  }

  updateStatus(message, type = '') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    if (type === 'loading') {
      statusElement.classList.add('loading');
    } else {
      statusElement.classList.remove('loading');
    }
  }

  updateMediaInfo(media, thirdPartyVideos, folderName) {
    const imageCount = media.filter(item => item.type === 'image').length;
    const videoCount = media.filter(item => item.type === 'video').length;
    
    document.getElementById('imageCount').textContent = imageCount;
    document.getElementById('videoCount').textContent = videoCount;
    document.getElementById('thirdPartyCount').textContent = thirdPartyVideos.length;
    document.getElementById('folderName').textContent = folderName || 'portfolio-media';
    
    document.getElementById('mediaInfo').style.display = 'block';
  }

  updateProgress(progressValue) {
    let progress = progressValue;
    if (progress === undefined) {
      progress = (this.downloadedFiles / this.totalFiles) * 100;
    }
    document.getElementById('progressFill').style.width = `${progress}%`;
  }
  
  updateProgressLabel(text) {
    // Add or update progress label element
    let progressLabel = document.getElementById('progress-label');
    if (!progressLabel) {
      progressLabel = document.createElement('div');
      progressLabel.id = 'progress-label';
      progressLabel.className = 'progress-label';
      document.querySelector('.progress-bar').insertAdjacentElement('afterend', progressLabel);
    }
    progressLabel.textContent = text;
  }
  
  updateScrollProgress(progress) {
    // Update progress bar for scrolling phase
    if (progress && this.isDownloading) {
      console.log(`Scroll progress: ${progress.percentage}% (${progress.current}/${progress.total})`);
      this.updateProgress(progress.percentage);
      this.updateProgressLabel(`Scrolling to load content: ${Math.round(progress.percentage)}%`);
      
      // Ensure progress bar is visible during scrolling
      const progressBar = document.getElementById('progressBar');
      if (progressBar && progressBar.style.display === 'none') {
        progressBar.style.display = 'block';
      }
    }
  }
  
  updateDownloadProgress(progress) {
    // Update progress bar for download phase
    if (progress && this.isDownloading) {
      this.updateProgress(progress.percentage);
      this.updateProgressLabel(`Downloading media files: ${progress.current}/${progress.total}`);
    }
  }

  showProgressBar() {
    document.getElementById('progressBar').style.display = 'block';
    document.getElementById('progressFill').style.width = '0%';
    
    // Make sure we have a progress label
    this.updateProgressLabel('Initializing...');
  }

  hideProgressBar() {
    document.getElementById('progressBar').style.display = 'none';
    // Remove progress label
    const progressLabel = document.getElementById('progress-label');
    if (progressLabel) {
      progressLabel.remove();
    }
  }

  toggleButtons(isDownloading) {
    const downloadBtn = document.getElementById('downloadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (isDownloading) {
      downloadBtn.style.display = 'none';
      cancelBtn.style.display = 'flex';
    } else {
      downloadBtn.style.display = 'flex';
      cancelBtn.style.display = 'none';
    }
  }

  updateSiteAccessUI(enabled) {
    const downloadBtn = document.getElementById('downloadBtn');
    if (!enabled) {
      downloadBtn.disabled = true;
      this.updateStatus('Site access is disabled. Enable to use downloader.', 'error');
    } else {
      // Only re-enable if on a supported page
      this.checkCurrentPage();
    }
  }

  // Helper method to identify video platform from URL
  getVideoPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'YouTube';
    } else if (url.includes('vimeo.com')) {
      return 'Vimeo';
    } else if (url.includes('dailymotion.com')) {
      return 'Dailymotion';
    } else if (url.includes('twitch.tv')) {
      return 'Twitch';
    } else if (url.includes('player.')) {
      return 'Player';
    } else {
      return 'Other';
    }
  }
}

// Initialize popup controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init();
}); 