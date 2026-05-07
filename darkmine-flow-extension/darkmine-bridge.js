// DarkMine Bridge - Runs on darkmine.fun
// Monitors localStorage for darkmine_flow_queue and syncs to chrome.storage

(function() {
  'use strict';

  const STORAGE_KEY = 'darkmine_flow_queue';
  let lastQueueData = null;

  function processQueue() {
    try {
      const queueData = localStorage.getItem(STORAGE_KEY);
      if (!queueData) return;

      const data = JSON.parse(queueData);

      // Skip if same data already processed
      if (lastQueueData && lastQueueData.savedAt === data.savedAt) return;

      lastQueueData = data;

      // Save to chrome.storage.local
      chrome.storage.local.set({
        flowQueue: data.prompts,
        flowDelay: data.delay || 90,
        queueRunning: false,
        queueTitle: data.videoTitle || '',
        queueSavedAt: data.savedAt,
      });

      // Remove from localStorage after successful sync
      localStorage.removeItem(STORAGE_KEY);

      console.log(`[DarkMine Bridge] Synced ${data.prompts?.length || 0} prompts to extension storage`);
    } catch (error) {
      console.error('[DarkMine Bridge] Error processing queue:', error);
    }
  }

  // Initial check
  processQueue();

  // Poll for changes every 2 seconds
  setInterval(processQueue, 2000);

  // Also listen for storage events from same tab
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      processQueue();
    }
  });

  console.log('[DarkMine Bridge] Active on darkmine.fun');
})();
