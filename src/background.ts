// src/background.ts
import { callLLM, loadStoredSettings } from "./utils";
console.log("Background.ts loaded")

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked!', tab);
  
  // Check if we can inject on this tab
  if (!tab.id || !tab.url) {
    console.log('No tab ID or URL available');
    return;
  }
  
  // Skip chrome:// and other restricted URLs
  if (tab.url.startsWith('chrome://') || 
      tab.url.startsWith('chrome-extension://') || 
      tab.url.startsWith('edge://') || 
      tab.url.startsWith('about:')) {
    console.log('Cannot inject on restricted URL:', tab.url);
        chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'icons/new_logo_32.png',
            title: 'xAI',
            message: 'Open a normal site like google dot com to use the sidebar'
          });
    return;
  }
  
  try {
    console.log('Sending toggleSidebar message to tab:', tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
    console.log('Toggle response:', response);
  } catch (error) {
    console.log('Content script not ready, injecting...', error);
    // If content script isn't ready, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
      });
      console.log('Content script injected, trying again...');
      // Try again after injection
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id!, { action: 'toggleSidebar' });
        } catch (e) {
          console.log('Still failed after injection:', e);
        }
      }, 100);
    } catch (injectError) {
      console.log('Failed to inject content script:', injectError);
      // Show reload notification
      chrome.tabs.sendMessage(tab.id, { 
        action: 'showReloadNotification' 
      }).catch(() => {
        // If we can't even send a message, show browser alert
        chrome.notifications?.create({
                    type: 'basic',
                    iconUrl: 'icons/new_logo_32.png',
                    title: 'xAI',
                    message: 'Please reload this page and try again to use the sidebar'
                  });;
      });
    }
  }
});

// Listen for our "fixText" messages and reply asynchronously
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("background.ts received onMessage event")
  if (msg.action === "transformText" && typeof msg.text === "string") {
    (async () => {
      try {
        const settings = await loadStoredSettings();

        // pick the system prompt based on type
        let systemPrompt: string;
        switch (msg.type) {
          case "Translate":
            systemPrompt = `Translate the following text from ${
              msg.options.fromLang
            } to ${msg.options.toLang}:`;
            break;
          case "Change the Tone":
            systemPrompt = `Change the tone of the text to be ${msg.options.tone}.`;
            break;
          case "Summarize":
            systemPrompt = "Provide a concise summary of the following text:";
            break;
          case "Grammar Fix":
          default:
            systemPrompt =
              "Convert the following into standard English and fix any grammatical errors:";
        }

        const transformed = await callLLM(
          settings,
          systemPrompt,
          msg.text
        );
        sendResponse({ text: transformed });
      } catch (err: any) {
        sendResponse({ error: err.message });
      }
    })();
    // keep channel open for async
    return true;
  }


  // if (msg.action === "fixText" && typeof msg.text === "string") {
  //   (async () => {
  //     try {
  //       const settings = await loadStoredSettings();
  //       const fixed = await callLLM(
  //         settings,
  //         // you could also pull this from your constants
  //         "Convert the following into standard English and fix any grammatical errors:",
  //         msg.text
  //       );
  //       sendResponse({ text: fixed });
  //     } catch (err: any) {
  //       sendResponse({ error: err.message });
  //     }
  //   })();
  //   // must return true to keep the message channel open for our async response
  //   return true;
  // }
});
