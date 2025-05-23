// src/background.ts
import { callLLM, loadStoredSettings } from "./utils";
console.log("Background.ts loaded")
// Listen for our “fixText” messages and reply asynchronously
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
