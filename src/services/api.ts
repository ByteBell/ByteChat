/* src/services/api.ts */
import type { Settings, ChatMessage } from "../types";
import { chatOpenRouter } from "./openrouter";

export type { ChatMessage };

/**
 * Unified chat request across providers.
 * Must return an object with `.choices[0].message.content`.
 */
export async function sendChatRequest(messages: ChatMessage[], settings: Settings): Promise<any> {
  const provider = settings.provider || "openai";
  console.log("[Chat] Provider:", provider, "Model:", settings.model);

  if (provider === "openrouter") {
    if (!settings.apiKey) throw new Error("OpenRouter API key missing in Settings");
    const resp = await chatOpenRouter({
      apiKey: settings.apiKey,
      model: settings.model || "openai/gpt-4o-mini",
      messages,
    });
    console.log("[Chat] OpenRouter normalized response:", resp);
    return resp;
  }

  // If you have other providers implemented, route to them here.
  throw new Error("Unsupported provider. Set provider to openrouter or implement other providers here.");
}
