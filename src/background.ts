// src/background.ts
import { callLLM, loadStoredSettings } from "./utils";
console.log("Background.ts loaded")

// Function to create context menus
function createContextMenus() {
  console.log('[Background] Creating context menus...');

  // Clear existing menus first to avoid conflicts
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.error('[Background] Error clearing existing menus:', chrome.runtime.lastError);
    }

    // Main parent menu
    chrome.contextMenus.create({
      id: "byte-chat-tools",
      title: "Byte Chat Tools",
      contexts: ["selection"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Error creating main menu:', chrome.runtime.lastError);
        return;
      }
      console.log('[Background] Main context menu created successfully');

      // Create submenus
      const submenus = [
        { id: "tool-translate", title: "🌐 Translate" },
        { id: "tool-summarize", title: "📝 Summarize" },
        { id: "tool-reply", title: "💬 Reply" },
        { id: "tool-fact-check", title: "🔍 Fact Check" },
        { id: "tool-fix-grammar", title: "✍️ Fix Grammar" },
        { id: "separator-1", title: "", type: "separator" },
        { id: "custom-prompt", title: "💭 Custom Prompt" }
      ];

      submenus.forEach((menu) => {
        const menuConfig: chrome.contextMenus.CreateProperties = {
          id: menu.id,
          parentId: "byte-chat-tools",
          contexts: ["selection"]
        };

        if (menu.type === "separator") {
          menuConfig.type = "separator";
        } else {
          menuConfig.title = menu.title;
        }

        chrome.contextMenus.create(menuConfig, () => {
          if (chrome.runtime.lastError) {
            console.error(`[Background] Error creating submenu ${menu.id}:`, chrome.runtime.lastError);
          } else {
            console.log(`[Background] Submenu ${menu.id} created successfully`);
          }
        });
      });
    });
  });
}

// Create context menus on extension install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated, reason:', details.reason);
  createContextMenus();
});

// Create context menus on service worker startup (important for MV3)
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Service worker started, recreating context menus');
  createContextMenus();
});

// Also create menus immediately when background script loads
console.log('[Background] Background script loaded, ensuring context menus exist');
createContextMenus();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[Background] Context menu clicked:', {
    menuItemId: info.menuItemId,
    selectionText: info.selectionText?.substring(0, 100) + '...',
    tabId: tab?.id
  });

  if (!info.selectionText || !tab?.id) {
    console.error('[Background] Missing selection text or tab ID');
    return;
  }

  const menuItemId = info.menuItemId as string;
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
      console.error('[Background] Unknown menu item:', menuItemId);
      return;
  }

  try {
    // Store the selected text and tool selection for the side panel
    const storageData = {
      'pending_text': info.selectionText,
      'pending_tool': toolName,
      'pending_is_custom_prompt': isCustomPrompt,
      'pending_timestamp': Date.now()
    };

    await chrome.storage.local.set(storageData);

    console.log('[Background] Stored context menu data:', {
      tool: toolName,
      isCustomPrompt,
      textLength: info.selectionText.length,
      timestamp: storageData.pending_timestamp
    });

    // Verify storage was successful
    const verification = await chrome.storage.local.get(['pending_text', 'pending_tool']);
    console.log('[Background] Storage verification:', verification);

    // Small delay to ensure storage is complete before opening panel
    await new Promise(resolve => setTimeout(resolve, 100));

    // Open the side panel
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('[Background] Side panel opened successfully');

  } catch (error) {
    console.error('[Background] Error handling context menu click:', error);

    // Show error notification to user
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/ByteBellLogo.png',
      title: 'Byte Chat',
      message: 'Failed to open side panel. Please try clicking the extension icon instead.'
    });
  }
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
