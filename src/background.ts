// src/background.ts
import { callLLM, loadStoredSettings } from "./utils";
console.log("Background.ts loaded")

// Create context menu on extension install/startup
chrome.runtime.onInstalled.addListener(() => {
  // Main parent menu
  chrome.contextMenus.create({
    id: "byte-chat-tools",
    title: "Byte Chat Tools",
    contexts: ["selection"]
  });


  // Translate submenu
  chrome.contextMenus.create({
    id: "tool-translate",
    title: "🌐 Translate",
    parentId: "byte-chat-tools",
    contexts: ["selection"]
  });

  // Summarize submenu
  chrome.contextMenus.create({
    id: "tool-summarize",
    title: "📝 Summarize",
    parentId: "byte-chat-tools",
    contexts: ["selection"]
  });

  // Reply submenu
  chrome.contextMenus.create({
    id: "tool-reply",
    title: "💬 Reply",
    parentId: "byte-chat-tools",
    contexts: ["selection"]
  });

  // Fact Check submenu
  chrome.contextMenus.create({
    id: "tool-fact-check",
    title: "🔍 Fact Check",
    parentId: "byte-chat-tools",
    contexts: ["selection"]
  });

  // Fix Grammar submenu
  chrome.contextMenus.create({
    id: "tool-fix-grammar",
    title: "✍️ Fix Grammar",
    parentId: "byte-chat-tools",
    contexts: ["selection"]
  });

  // Separator
  chrome.contextMenus.create({
    id: "separator-1",
    type: "separator",
    parentId: "byte-chat-tools",
    contexts: ["selection"]
  });

  // Custom Prompt option
  chrome.contextMenus.create({
    id: "custom-prompt",
    title: "💭 Custom Prompt",
    parentId: "byte-chat-tools",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText || !tab?.id) return;

  const menuItemId = info.menuItemId as string;
  console.log(`Context menu clicked: ${menuItemId} with text:`, info.selectionText);

  let toolName = null;
  let isCustomPrompt = false;

  // Map menu item IDs to tool names
  switch (menuItemId) {
    case 'tool-translate':
      toolName = 'Translate';
      break;
    case 'tool-summarize':
      toolName = 'Summarize';
      break;
    case 'tool-reply':
      toolName = 'Reply';
      break;
    case 'tool-fact-check':
      toolName = 'Fact Check';
      break;
    case 'tool-fix-grammar':
      toolName = 'Fix Grammar';
      break;
    case 'custom-prompt':
      isCustomPrompt = true;
      break;
    default:
      return; // Unknown menu item
  }

  // Store the selected text and tool selection for the side panel
  await chrome.storage.local.set({
    'pending_text': info.selectionText,
    'pending_tool': toolName,
    'pending_is_custom_prompt': isCustomPrompt,
    'pending_timestamp': Date.now()
  });

  // Open the side panel
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked!', tab);

  if (!tab.id) {
    console.log('No tab ID available');
    return;
  }

  try {
    // Open the side panel
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error('Failed to open side panel:', error);
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/new_logo_32.png',
      title: 'xAI',
      message: 'Failed to open side panel. Please try again.'
    });
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
