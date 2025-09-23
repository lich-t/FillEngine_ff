/**
 * Background Service Worker for Auto-Fill Google Forms Extension
 * Handles extension lifecycle and message passing between components
 */

// Initialize extension when installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Auto-Fill Google Forms extension installed", details);
  
  // Déclencher le rafraîchissement des profils lors de l'installation/mise à jour
  if (details.reason === 'install') {
    console.log("🆕 Extension installed - profiles will refresh on first popup open");
  } else if (details.reason === 'update') {
    console.log("🔄 Extension updated - profiles will auto-refresh on next popup open");
    // Marquer qu'une mise à jour a eu lieu pour le popup
    chrome.storage.local.set({
      extensionUpdated: true,
      updateTimestamp: Date.now()
    });
  }
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  if (message.action === "fillForm") {
    // Forward the message to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "fillForm" }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Keep the message channel open for async response
  }
});

// Handle tab updates to ensure content script is ready
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.includes("docs.google.com/forms/")) {
    console.log("Google Forms page loaded:", tab.url);
  }
});
