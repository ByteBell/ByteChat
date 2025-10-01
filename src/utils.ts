import { Provider, Settings, User } from "./types";
import { PROVIDER_MODELS } from "./constants";

const browserAPI = chrome;


export async function loadStoredSettings(): Promise<Settings> {
  console.log("Load settings called")
  const raw = await chrome.storage.local.get(["provider", "model", "apiKey"]);
  console.log("Raw settings from storage:", raw);

  const provider: Provider = (raw.provider ?? "openai") as Provider;
  console.log("Determined provider:", provider);

  const availableModels = PROVIDER_MODELS[provider];
  console.log("Available models for provider:", availableModels);

  let model: string;
  if (provider === "openrouter" || provider === "together") {
    // For OpenRouter and Together, we don't validate against PROVIDER_MODELS as they are fetched dynamically.
    // We trust the stored model for now, and ModelSelector will handle defaulting if invalid.
    model = raw.model ?? ""; // Use empty string if no model is stored
  } else {
    model =
      raw.model && availableModels.includes(raw.model)
        ? raw.model
        : availableModels[0];
  }

  console.log(`Final model selected: ${model}`);
  
  return {
    provider,
    model,
    apiKey: raw.apiKey ?? "",
  };
}
export function loadStoredUser(): Promise<User | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["user"], (res) => resolve(res.user || null));
  });
}


export function saveSettings(next: Settings): Promise<void> {
  console.log("saved settings called")
  return new Promise(res =>
    browserAPI.storage.local.set(
      { provider: next.provider, model: next.model, apiKey: next.apiKey },
      () => res()
    )
  );
}

export function removeUser(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["user"], () => resolve());
  });
}

export function setUser(user: User): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ user }, () => resolve());
  });
}

export function saveStreamingState(state: {
  prompt: string;
  answer: string;
  loading: boolean;
  systemPrompt: string;
  isStreaming?: boolean;
}): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ 
      streamingState: {
        ...state,
        timestamp: Date.now()
      }
    }, () => resolve());
  });
}

export function updateStreamingAnswer(answer: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["streamingState"], (res) => {
      if (res.streamingState) {
        const updatedState = {
          ...res.streamingState,
          answer: answer,
          timestamp: Date.now()
        };
        chrome.storage.local.set({ streamingState: updatedState }, () => resolve());
      } else {
        resolve();
      }
    });
  });
}

export function loadStreamingState(): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["streamingState"], (res) => {
      const state = res.streamingState;
      // Only restore if less than 5 minutes old
      if (state && (Date.now() - state.timestamp) < 5 * 60 * 1000) {
        resolve(state);
      } else {
        resolve(null);
      }
    });
  });
}

export function clearStreamingState(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["streamingState"], () => resolve());
  });
}

export async function execInPage(fn: () => any): Promise<any> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    const tabId = tab?.id;

    // ── guard #1: tab or scripting API unavailable ───────────────────
    if (!tabId || !chrome.scripting?.executeScript) {
      console.warn("[execInPage] cannot inject script (no tab or scripting API)");
      return undefined;
    }

    // ── guard #2: privileged / non-HTTP(S) pages ─────────────────────
    if (!/^https?:\/\//i.test(tab.url || "")) {
      console.info(`[execInPage] skip injection on privileged URL: ${tab.url}`);
      return undefined;
    }

    // ── safe to inject ────────────────────────────────────────────────
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId },
      func: fn as unknown as () => void,
    });

    return injectionResult?.result;
  } catch (err) {
    console.error("[execInPage] injection failed:", err);
    return undefined;
  }
}

// Get full page content with better structure and size limits
export async function getPageContent(): Promise<{
  html: string;
  text: string;
  title: string;
  url: string;
} | null> {
  return execInPage(() => {
    // Get the main content area or body
    const mainContent = document.querySelector('main') ||
                       document.querySelector('[role="main"]') ||
                       document.querySelector('article') ||
                       document.body;

    // Extract text with better structure preservation
    function getStructuredText(element: Element): string {
      let text = '';

      // Process each child node
      Array.from(element.children).forEach((child) => {
        const tagName = child.tagName.toLowerCase();

        // Skip hidden elements, scripts, styles
        const style = window.getComputedStyle(child);
        if (style.display === 'none' || style.visibility === 'hidden' ||
            tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
          return;
        }

        // Add spacing for block elements
        if (['div', 'p', 'section', 'article', 'header', 'footer', 'nav', 'aside'].includes(tagName)) {
          const childText = child.textContent?.trim();
          if (childText) {
            text += childText + '\n\n';
          }
        }
        // Headers
        else if (tagName.match(/^h[1-6]$/)) {
          const headerText = child.textContent?.trim();
          if (headerText) {
            text += `\n## ${headerText}\n`;
          }
        }
        // Lists
        else if (tagName === 'li') {
          const liText = child.textContent?.trim();
          if (liText) {
            text += `• ${liText}\n`;
          }
        }
        // Links with context
        else if (tagName === 'a') {
          const linkText = child.textContent?.trim();
          const href = child.getAttribute('href');
          if (linkText) {
            text += href ? `[${linkText}](${href}) ` : linkText + ' ';
          }
        }
        // Tables
        else if (tagName === 'table') {
          text += '\n[Table Content]\n';
          const rows = child.querySelectorAll('tr');
          rows.forEach((row, idx) => {
            const cells = row.querySelectorAll('td, th');
            const rowText = Array.from(cells).map(c => c.textContent?.trim()).filter(t => t).join(' | ');
            if (rowText) {
              text += rowText + '\n';
            }
          });
          text += '\n';
        }
        // Other inline elements
        else {
          const inlineText = child.textContent?.trim();
          if (inlineText) {
            text += inlineText + ' ';
          }
        }
      });

      return text;
    }

    let extractedText = getStructuredText(mainContent);

    // Fallback to innerText if structured extraction didn't work
    if (!extractedText || extractedText.length < 100) {
      extractedText = mainContent.textContent || '';
    }

    // Limit to first 50,000 characters to prevent truncation issues
    const MAX_LENGTH = 50000;
    if (extractedText.length > MAX_LENGTH) {
      extractedText = extractedText.substring(0, MAX_LENGTH) + '\n\n[Content truncated - showing first 50,000 characters]';
    }

    return {
      html: document.documentElement.outerHTML,
      text: extractedText.trim(),
      title: document.title,
      url: window.location.href
    };
  });
}


// Streaming function for all providers
import { MessageContent } from './types';

export async function callLLMStream(
  { provider, model, apiKey }: Settings,
  systemPrompt: string,
  userPrompt: string | MessageContent[],
  onChunk: (chunk: string) => void,
  existingAnswer: string = "", // For continuation
  plugins?: any[] // Optional plugins parameter for OpenRouter
): Promise<void> {
  // Check if user is logged in - if so, route ALL requests through backend
  const user = await loadStoredUser();
  if (user?.access_token) {
    // For logged-in users, send request to backend with proper format
    console.log("Sending request to backend for logged-in user");
    console.log("User tokens left:", user.tokens_left);

    // Build messages array
    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const response = await fetch("http://localhost:8000/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: user.access_token,
        messages: messages,
        model: model || undefined, // Use provided model or backend default
        temperature: 0.7,
        stream: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);

      // If it's an authentication error, clear user data and force re-login
      if (response.status === 401 || response.status === 403 || errorText.includes('Token verification failed')) {
        console.log("Authentication failed, clearing user data and forcing re-login");
        await removeUser();
        throw new Error(`Authentication failed. Please log in again.`);
      }

      throw new Error(`Backend error: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let buffer = "";
    let fullAnswer = existingAnswer; // Start with existing content

    try {
      console.log("Starting to read stream...");
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream ended");
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        while (buffer.includes('\n')) {
          const lineEnd = buffer.indexOf('\n');
          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line === '') continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              console.log("Received [DONE], ending stream");

              // Reload user data to update token count
              const updatedUser = await loadStoredUser();
              if (updatedUser) {
                console.log("✅ Tokens left after request:", updatedUser.tokens_left);
              }
              return;
            }

            if (data === '') continue; // Skip empty data lines

            try {
              const parsed = JSON.parse(data);

              // Handle token update message
              if (parsed.type === 'token_update') {
                console.log("💰 Token update:", parsed);
                // Update user's tokens_left in storage
                const currentUser = await loadStoredUser();
                if (currentUser) {
                  currentUser.tokens_left = parsed.tokens_left;
                  currentUser.tokens_used += parsed.tokens_used;
                  await setUser(currentUser);
                  console.log("✅ Updated user tokens in storage:", currentUser.tokens_left);
                }
                continue; // Skip to next iteration
              }

              // Handle error responses
              if (parsed.error) {
                console.error("API Error:", parsed.error);
                throw new Error(`API Error: ${parsed.error}`);
              }

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullAnswer += content;
                onChunk(content);

                // Save the updated answer to storage for continuation
                await updateStreamingAnswer(fullAnswer);
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                console.warn("Failed to parse JSON:", data, parseError);
              } else {
                throw parseError; // Re-throw non-JSON errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream reading error:", error);
      throw error;
    } finally {
      reader.releaseLock();
    }
    return;
  }

  // If not logged in, use direct API calls with user's own API key
  let fullAnswer = existingAnswer; // Start with existing content for all providers
  
  switch (provider) {
    case "openai": {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 1000,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullAnswer += content;
                  onChunk(content);
                  // Save the updated answer to storage for continuation
                  await updateStreamingAnswer(fullAnswer);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      break;
    }

    case "anthropic": {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 1000,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  fullAnswer += parsed.delta.text;
                  onChunk(parsed.delta.text);
                  // Save the updated answer to storage for continuation
                  await updateStreamingAnswer(fullAnswer);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      break;
    }

    case "together": {
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const response = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: combinedPrompt }],
          max_tokens: 1000,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullAnswer += content;
                  onChunk(content);
                  // Save the updated answer to storage for continuation
                  await updateStreamingAnswer(fullAnswer);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      break;
    }

    case "openrouter": {
      // Build the user message content
      let userMessage: any;

      if (typeof userPrompt === 'string') {
        // Simple text message
        userMessage = { role: "user", content: userPrompt };
      } else {
        // Multimodal message with array of content
        userMessage = { role: "user", content: userPrompt };
      }

      const requestBody: any = {
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          userMessage
        ],
        stream: true,
      };

      // Add plugins if provided (for PDF processing, etc.)
      if (plugins && plugins.length > 0) {
        requestBody.plugins = plugins;
        console.log('📄 PDF Processing: Adding plugins to request:', JSON.stringify(plugins, null, 2));
      }

      console.log('🚀 FINAL REQUEST TO OPENROUTER:', JSON.stringify(requestBody, null, 2));

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullAnswer += content;
                  onChunk(content);
                  // Save the updated answer to storage for continuation
                  await updateStreamingAnswer(fullAnswer);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      break;
    }

    default:
      throw new Error("Provider not supported");
  }
}

// Legacy non-streaming function for backward compatibility
export async function callLLM(
  settings: Settings,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  let result = "";
  await callLLMStream(settings, systemPrompt, userPrompt, (chunk) => {
    result += chunk;
  }, ""); // No existing answer for legacy calls
  return result;
}