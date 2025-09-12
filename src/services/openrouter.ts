/* src/services/openrouter.ts */
import type { MessageContent } from "../types";

export type ORole = "system" | "user" | "assistant";
export type ChatMessage = { role: ORole; content: string | MessageContent[] };

export type OpenRouterArgs = {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  metadata?: Record<string, any>;
};

export type OpenRouterChoice = {
  index: number;
  message: { role: ORole; content: string };
};

export type OpenRouterResponse = {
  id?: string;
  model?: string;
  choices: OpenRouterChoice[];
  usage?: any;
};

export type OpenRouterModel = {
  id: string;
  name?: string;
  description?: string;
  pricing?: {
    prompt?: string;       // price per token (as string)
    completion?: string;   // price per token (as string)
    currency?: string;     // usually USD
  };
  context_length?: number;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  created?: number;        // timestamp
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  canonical_slug?: string;
  supported_parameters?: string[];
};

const OR_API = "https://openrouter.ai/api/v1";

/** Chat completion */
export async function chatOpenRouter(args: OpenRouterArgs): Promise<OpenRouterResponse> {
  const { apiKey, model, messages, metadata } = args;

  const res = await fetch(`${OR_API}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://grammerai.local",
      "X-Title": "GrammerAI Extension",
    },
    body: JSON.stringify({ model, messages, metadata }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    console.error("[OpenRouter] Response is not JSON. Status:", res.status);
    throw new Error(`OpenRouter returned non JSON. Status ${res.status}`);
  }

  console.log("[OpenRouter] Raw response:", data);

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `OpenRouter error ${res.status}`;
    throw new Error(msg);
  }

  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.content ??
    "";

  return {
    id: data?.id,
    model: data?.model || model,
    choices: [
      { index: 0, message: { role: "assistant", content } },
    ],
    usage: data?.usage,
  };
}

/** Check if the key works by calling the models endpoint */
export async function validateOpenRouterKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${OR_API}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return false;
    await res.json();
    return true;
  } catch {
    return false;
  }
}

/** Get cached models or fetch fresh ones */
export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  // Check cache first
  const cachedData = await getCachedModels();
  if (cachedData) {
    console.log('[OpenRouter] Using cached models');
    return cachedData;
  }

  // Fetch fresh models
  console.log('[OpenRouter] Fetching fresh models from API');
  const models = await fetchAllModelsFromAPI(apiKey);
  
  // Cache the results
  await cacheModels(models);
  
  return models;
}

/** Fetch all models directly from OpenRouter API */
export async function fetchAllModelsFromAPI(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${OR_API}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://grammerai.local",
      "X-Title": "GrammerAI Extension",
    },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch models (${res.status}) ${text}`);
  }
  
  const data = await res.json();
  const items: any[] = Array.isArray(data) ? data : (data?.data || []);
  
  const allModels = items
    .map((m) => ({
      id: m?.id || "",
      name: m?.name || m?.id,
      description: m?.description,
      pricing: m?.pricing,
      context_length: m?.context_length,
      top_provider: m?.top_provider,
      created: m?.created,
      architecture: m?.architecture,
      canonical_slug: m?.canonical_slug,
      supported_parameters: m?.supported_parameters,
    }))
    .filter((m) => !!m.id);

  // Sort by popularity and filter top models
  return sortAndFilterTopModels(allModels);
}

/** Sort models by cost (highest first) and show all models */
function sortAndFilterTopModels(models: OpenRouterModel[]): OpenRouterModel[] {
  // Sort by total cost (prompt + completion price) - highest first
  return models.sort((a, b) => {
    const aPricePrompt = parseFloat(a.pricing?.prompt || "0");
    const aPriceCompletion = parseFloat(a.pricing?.completion || "0");
    const aTotalPrice = aPricePrompt + aPriceCompletion;
    
    const bPricePrompt = parseFloat(b.pricing?.prompt || "0");
    const bPriceCompletion = parseFloat(b.pricing?.completion || "0");
    const bTotalPrice = bPricePrompt + bPriceCompletion;
    
    // Sort by highest cost first
    return bTotalPrice - aTotalPrice;
  });
}

/** Cache models in Chrome storage */
async function cacheModels(models: OpenRouterModel[]): Promise<void> {
  const cacheData = {
    models,
    timestamp: Date.now(),
    version: '1.0'
  };
  
  try {
    await chrome.storage.local.set({ 'openrouter_models_cache': cacheData });
    console.log('[OpenRouter] Models cached successfully');
  } catch (error) {
    console.error('[OpenRouter] Failed to cache models:', error);
  }
}

/** Get cached models if they're still fresh (within 1 week) */
async function getCachedModels(): Promise<OpenRouterModel[] | null> {
  try {
    const result = await chrome.storage.local.get(['openrouter_models_cache']);
    const cacheData = result.openrouter_models_cache;
    
    if (!cacheData || !cacheData.models || !cacheData.timestamp) {
      return null;
    }
    
    // Check if cache is older than 1 week (7 * 24 * 60 * 60 * 1000 ms)
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - cacheData.timestamp > oneWeekMs;
    
    if (isExpired) {
      console.log('[OpenRouter] Cache expired, will fetch fresh models');
      return null;
    }
    
    return cacheData.models;
  } catch (error) {
    console.error('[OpenRouter] Failed to read cache:', error);
    return null;
  }
}

/** Force refresh models cache */
export async function refreshModelsCache(apiKey: string): Promise<OpenRouterModel[]> {
  console.log('[OpenRouter] Force refreshing models cache');
  
  // Clear existing cache
  try {
    await chrome.storage.local.remove(['openrouter_models_cache']);
  } catch (error) {
    console.error('[OpenRouter] Failed to clear cache:', error);
  }
  
  // Fetch fresh models
  return await fetchAllModelsFromAPI(apiKey);
}

/** Pretty name for a model id */
export function getModelDisplayName(model: OpenRouterModel | string): string {
  if (typeof model === "string") return model;
  return model.name || model.id;
}

/** Human readable price summary */
export function getModelPrice(model: OpenRouterModel): string {
  const p = model.pricing || {};
  const promptPrice = parseFloat(p.prompt || "0");
  const completionPrice = parseFloat(p.completion || "0");
  
  if (promptPrice === 0 && completionPrice === 0) {
    return "Free";
  }
  
  const inP = !isNaN(promptPrice) && promptPrice > 0 ? `$${(promptPrice * 1000000).toFixed(2)}/M in` : "";
  const outP = !isNaN(completionPrice) && completionPrice > 0 ? `$${(completionPrice * 1000000).toFixed(2)}/M out` : "";
  
  if (inP && outP) return `${inP} • ${outP}`;
  return inP || outP || "n/a";
}

/** Get model context length in human readable format */
export function getModelContextLength(model: OpenRouterModel): string {
  const contextLength = model.context_length || model.top_provider?.context_length;
  if (!contextLength) return "Unknown";
  
  if (contextLength >= 1000000) {
    return `${(contextLength / 1000000).toFixed(1)}M tokens`;
  } else if (contextLength >= 1000) {
    return `${(contextLength / 1000).toFixed(0)}K tokens`;
  } else {
    return `${contextLength} tokens`;
  }
}

/** Check if model supports specific features */
export function getModelFeatures(model: OpenRouterModel): string[] {
  const features: string[] = [];
  
  if (model.pricing?.prompt === "0" || model.pricing?.completion === "0") {
    features.push("Free");
  }
  
  if (model.architecture?.input_modalities?.includes('image')) {
    features.push("Vision");
  }
  
  if (model.supported_parameters?.includes('tools') || model.supported_parameters?.includes('tool_choice')) {
    features.push("Tools");
  }
  
  if (model.supported_parameters?.includes('reasoning') || model.supported_parameters?.includes('include_reasoning')) {
    features.push("Reasoning");
  }
  
  if (model.context_length && model.context_length >= 100000) {
    features.push("Long Context");
  }
  
  return features;
}

/** Get model capabilities */
import type { ModelCapability } from "../types";

export function getModelCapabilities(model: OpenRouterModel): ModelCapability[] {
  const capabilities: ModelCapability[] = [];
  
  // Get input and output modalities
  const inputModalities = model.architecture?.input_modalities || [];
  const outputModalities = model.architecture?.output_modalities || [];
  
  // Text capabilities - check input modalities for text
  if (inputModalities.includes('text')) {
    capabilities.push("text");
  }
  
  // Image capabilities - check both input (vision) and output (generation)
  if (inputModalities.includes('image') || outputModalities.includes('image')) {
    capabilities.push("image");
  }
  
  // File processing capabilities - check input modalities for file
  if (inputModalities.includes('file')) {
    capabilities.push("file");
  }
  
  // Audio capabilities - check input modalities for audio
  if (inputModalities.includes('audio')) {
    capabilities.push("audio");
  }
  
  // If no modalities are specified, assume it's a text model
  if (capabilities.length === 0) {
    capabilities.push("text");
  }
  
  // Remove duplicates manually
  const uniqueCapabilities: ModelCapability[] = [];
  capabilities.forEach(cap => {
    if (!uniqueCapabilities.includes(cap)) {
      uniqueCapabilities.push(cap);
    }
  });
  
  return uniqueCapabilities;
}

/** OpenRouter Key Info Response */
export interface OpenRouterKeyInfo {
  data: {
    label: string;
    usage: number;          // Number of credits used
    limit: number | null;   // Credit limit for the key, or null if unlimited
    is_free_tier: boolean;  // Whether the user has paid for credits before
  };
}

/** Check API key info and balance */
export async function checkKeyInfo(apiKey: string): Promise<OpenRouterKeyInfo> {
  try {
    const res = await fetch(`${OR_API}/key`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://grammerai.local",
        "X-Title": "GrammerAI Extension",
      },
    });
    
    if (!res.ok) {
      throw new Error(`Failed to check key info: ${res.status}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("[OpenRouter] Failed to check key info:", error);
    throw error;
  }
}

/** Legacy function for backward compatibility - returns remaining credits */
export async function checkBalance(apiKey: string): Promise<number> {
  try {
    const keyInfo = await checkKeyInfo(apiKey);
    const usage = keyInfo.data.usage || 0;
    const limit = keyInfo.data.limit;
    
    // If unlimited, return a high number to indicate good balance
    if (limit === null) {
      return 999999; // Unlimited
    }
    
    // Return remaining credits
    return Math.max(0, limit - usage);
  } catch (error) {
    console.error("[OpenRouter] Failed to check balance:", error);
    return 0;
  }
}