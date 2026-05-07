// DarkMine Bridge - Runs on darkmine.fun
// Listens for postMessage from DarkScript and forwards to chrome.storage

(function() {
  'use strict';

  // Listen for messages from DarkScript (or any page on darkmine.fun)
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'DARKMINE_FLOW_QUEUE') {
      const { prompts, videoTitle, delay } = event.data;

      if (!prompts || prompts.length === 0) {
        console.log('[DarkMine Bridge] Empty queue received');
        return;
      }

      // Save to chrome.storage.local
      chrome.storage.local.set({
        flowQueue: prompts,
        flowDelay: delay || 90,
        queueRunning: false,
        queueTitle: videoTitle || '',
        queueSavedAt: new Date().toISOString(),
      }).then(() => {
        // Send confirmation back to the sender
        event.source.postMessage({
          type: 'DARKMINE_FLOW_CONFIRMED',
          count: prompts.length,
        }, event.origin);

        console.log(`[DarkMine Bridge] ${prompts.length} prompts saved to extension storage`);
      }).catch((error) => {
        console.error('[DarkMine Bridge] Error saving to storage:', error);
      });
    }
  });

  console.log('[DarkMine Bridge] Active on darkmine.fun - listening for DARKMINE_FLOW_QUEUE');
})();
