/* src/services/openrouter.ts */
export type ORole = "system" | "user" | "assistant";
export type ChatMessage = { role: ORole; content: string };

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
    prompt?: number;       // price per million input tokens
    completion?: number;   // price per million output tokens
    currency?: string;     // usually USD
  };
  context_length?: number;
  top_provider?: string;
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

/** Get the available models for this key */
export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch(`${OR_API}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch models (${res.status}) ${text}`);
  }
  const data = await res.json();
  const items: any[] = Array.isArray(data) ? data : (data?.data || []);
  return items
    .map((m) => ({
      id: m?.id || "",
      name: m?.name || m?.id,
      description: m?.description,
      pricing: m?.pricing,
      context_length: m?.context_length,
      top_provider: m?.top_provider,
    }))
    .filter((m) => !!m.id);
}

/** Pretty name for a model id */
export function getModelDisplayName(model: OpenRouterModel | string): string {
  if (typeof model === "string") return model;
  return model.name || model.id;
}

/** Human readable price summary */
export function getModelPrice(model: OpenRouterModel): string {
  const p = model.pricing || {};
  const cur = p.currency || "USD";
  const inP = typeof p.prompt === "number" ? `${cur} ${p.prompt}/M in` : "";
  const outP = typeof p.completion === "number" ? `${cur} ${p.completion}/M out` : "";
  if (inP && outP) return `${inP} • ${outP}`;
  return inP || outP || "n/a";
}