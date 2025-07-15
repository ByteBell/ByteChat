
export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/grammerai/extension',
        'X-Title': 'GrammerAI Extension',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data: OpenRouterModelsResponse = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    throw error;
  }
}

export function getModelDisplayName(model: OpenRouterModel): string {
  return model.name || model.id;
}

export function getModelPrice(model: OpenRouterModel): string {
  const promptPrice = parseFloat(model.pricing.prompt) * 1000000;
  const completionPrice = parseFloat(model.pricing.completion) * 1000000;
  return `$${promptPrice.toFixed(2)} / $${completionPrice.toFixed(2)} per 1M tokens`;
}