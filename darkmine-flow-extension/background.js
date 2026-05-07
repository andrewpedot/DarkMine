// DarkMine Flow Sender - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    flowQueue: [],
    flowDelay: 90,
    queueRunning: false,
    queueCurrent: 0,
    queueTotal: 0,
    queueStatus: 'idle',
  });
  console.log('[DarkMine Flow] Extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getQueue') {
    chrome.storage.local.get(['flowQueue', 'flowDelay', 'queueRunning'], (result) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === 'clearQueue') {
    chrome.storage.local.set({
      flowQueue: [],
      queueRunning: false,
      queueCurrent: 0,
      queueTotal: 0,
      queueStatus: 'idle',
    });
    sendResponse({ status: 'cleared' });
  }

  if (message.action === 'sendToTab') {
    chrome.tabs.query({ url: 'https://labs.google.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startQueue' });
        sendResponse({ status: 'sent', tabId: tabs[0].id });
      } else {
        sendResponse({ status: 'noTab' });
      }
    });
    return true;
  }
});

console.log('[DarkMine Flow] Background service worker loaded');
