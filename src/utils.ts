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
  if (provider === "openrouter") {
    // For OpenRouter, we don't validate against PROVIDER_MODELS as they are fetched dynamically.
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
  return new Promise((resolve) => {
    browserAPI.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs?.[0];
      const tabId = tab?.id;

      /* ── guard #1: tab or scripting API unavailable ───────────────── */
      if (!tabId || !browserAPI.scripting?.executeScript) {
        console.warn("[execInPage] cannot inject script (no tab or scripting API)");
        return resolve(undefined);
      }

      /* ── guard #2: privileged / non-HTTP(S) pages ─────────────────── */
      if (!/^https?:\/\//i.test(tab.url || "")) {
        console.info(`[execInPage] skip injection on privileged URL: ${tab.url}`);
        return resolve(undefined);
      }

      /* ── safe to inject ───────────────────────────────────────────── */
      try {
        const [injectionResult] = await browserAPI.scripting.executeScript({
          target: { tabId },
          func: fn as unknown as () => void,
        });
        resolve(injectionResult?.result);
      } catch (err) {
        console.error("[execInPage] injection failed:", err);
        resolve(undefined);
      }
    });
  });
}

// Streaming function for all providers
export async function callLLMStream(
  { provider, model, apiKey }: Settings,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void,
  existingAnswer: string = "" // For continuation
): Promise<void> {
  // Check if user is logged in - if so, route ALL requests through backend
  const user = await loadStoredUser();
  if (user?.token) {
    // For logged-in users, send only the question to backend (OpenRouter only)
    console.log("Sending request to backend for logged-in user");
    console.log("Existing answer length:", existingAnswer.length);
    
    const response = await fetch("http://localhost:8000/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`,
      },
      body: JSON.stringify({
        question: `${systemPrompt}\n\n${userPrompt}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
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
          
          console.log("Processing line:", line);
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              console.log("Received [DONE], ending stream");
              return;
            }
            
            if (data === '') continue; // Skip empty data lines
            
            try {
              const parsed = JSON.parse(data);
              console.log("Parsed data:", parsed);
              
              // Handle error responses
              if (parsed.error) {
                console.error("API Error:", parsed.error);
                throw new Error(`API Error: ${parsed.error.message}`);
              }
              
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                console.log("Streaming content:", content);
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
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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