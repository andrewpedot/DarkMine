// DarkMine Flow Sender - Content Script for labs.google.com (VEO3)
// Handles the queue execution and UI automation

(function() {
  'use strict';

  const STORAGE_KEY = 'flowQueue';
  const DELAY_KEY = 'flowDelay';
  let isRunning = false;
  let currentIndex = 0;

  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function getQueue() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY, DELAY_KEY], (result) => {
        resolve({
          prompts: result[STORAGE_KEY] || [],
          delay: result[DELAY_KEY] || 90,
        });
      });
    });
  }

  async function updateStatus(index, total, status) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        queueCurrent: index,
        queueTotal: total,
        queueStatus: status,
      }, resolve);
    });
  }

  function findPromptInput() {
    // Look for common input patterns in VEO3 interface
    const selectors = [
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="description" i]',
      'textarea[placeholder*="enter" i]',
      'textarea',
      '[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      const inputs = document.querySelectorAll(selector);
      for (const input of inputs) {
        const rect = input.getBoundingClientRect();
        if (rect.width > 200 && rect.height > 50) {
          return input;
        }
      }
    }
    return null;
  }

  function findSubmitButton() {
    const selectors = [
      'button[type="submit"]',
      'button:contains("Generate")',
      'button:contains("Create")',
      'button:contains("Run")',
      '[role="button"]',
    ];

    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);
      for (const button of buttons) {
        if (button.offsetParent !== null && !button.disabled) {
          return button;
        }
      }
    }
    return null;
  }

  async function processPrompt(prompt, index, total) {
    const input = findPromptInput();
    if (!input) {
      console.log(`[DarkMine Flow] Prompt input not found for clip ${index + 1}`);
      return false;
    }

    await updateStatus(index + 1, total, 'typing');

    // Clear and fill input
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = prompt;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(500);

    const button = findSubmitButton();
    if (button) {
      await updateStatus(index + 1, total, 'generating');
      button.click();
      await sleep(500);
    }

    return true;
  }

  async function runQueue() {
    if (isRunning) return;

    const { prompts, delay } = await getQueue();
    if (!prompts || prompts.length === 0) {
      console.log('[DarkMine Flow] Queue is empty');
      return;
    }

    isRunning = true;
    chrome.storage.local.set({ queueRunning: true });

    for (let i = 0; i < prompts.length; i++) {
      const { queueRunning } = await new Promise(r => chrome.storage.local.get('queueRunning', r));
      if (!queueRunning) {
        console.log('[DarkMine Flow] Queue stopped by user');
        break;
      }

      await processPrompt(prompts[i], i, prompts.length);
      await sleep(delay * 1000);
    }

    isRunning = false;
    chrome.storage.local.set({ queueRunning: false, queueStatus: 'complete' });
    console.log('[DarkMine Flow] Queue completed');
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startQueue') {
      runQueue();
      sendResponse({ status: 'started' });
    } else if (message.action === 'stopQueue') {
      chrome.storage.local.set({ queueRunning: false });
      sendResponse({ status: 'stopped' });
    } else if (message.action === 'getStatus') {
      chrome.storage.local.get(['queueRunning', 'queueCurrent', 'queueTotal', 'queueStatus'], (result) => {
        sendResponse(result);
      });
      return true;
    }
  });

  // Check for pending queue on page load
  chrome.storage.local.get(['queueRunning', 'flowQueue'], (result) => {
    if (result.flowQueue && result.flowQueue.length > 0 && !result.queueRunning) {
      console.log(`[DarkMine Flow] Found ${result.flowQueue.length} prompts in queue`);
    }
  });

  console.log('[DarkMine Flow] Content script loaded');
})();
