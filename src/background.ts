// src/background.ts
import { callLLM, loadStoredSettings } from "./utils";

// Listen for our “fixText” messages and reply asynchronously
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "fixText" && typeof msg.text === "string") {
    (async () => {
      try {
        const settings = await loadStoredSettings();
        const fixed = await callLLM(
          settings,
          // you could also pull this from your constants
          "Convert the following into standard English and fix any grammatical errors:",
          msg.text
        );
        sendResponse({ text: fixed });
      } catch (err: any) {
        sendResponse({ error: err.message });
      }
    })();
    // must return true to keep the message channel open for our async response
    return true;
  }
});
