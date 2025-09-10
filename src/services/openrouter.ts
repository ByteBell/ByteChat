
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
    
    // Filter and sort popular models
    const popularModels = data.data
      .filter(model => {
        // Filter for popular, reasonably priced models
        const promptPrice = parseFloat(model.pricing.prompt);
        return promptPrice <= 0.01 && model.context_length >= 4000;
      })
      .sort((a, b) => {
        // Sort by pricing (cheaper first) then by context length
        const priceA = parseFloat(a.pricing.prompt);
        const priceB = parseFloat(b.pricing.prompt);
        if (priceA !== priceB) return priceA - priceB;
        return b.context_length - a.context_length;
      })
      .slice(0, 25); // Limit to top 25 models

    return popularModels.length > 0 ? popularModels : getFallbackModels();
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return getFallbackModels();
  }
}

function getFallbackModels(): OpenRouterModel[] {
  return [
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      description: 'Most capable model from Anthropic',
      pricing: { prompt: '0.000003', completion: '0.000015' },
      context_length: 200000,
      architecture: { modality: 'text', tokenizer: 'claude', instruct_type: 'anthropic' },
      top_provider: { context_length: 200000, max_completion_tokens: 8192, is_moderated: false },
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Fast and affordable model from OpenAI',
      pricing: { prompt: '0.00015', completion: '0.0006' },
      context_length: 128000,
      architecture: { modality: 'text', tokenizer: 'gpt4', instruct_type: 'openai' },
      top_provider: { context_length: 128000, max_completion_tokens: 16384, is_moderated: true },
    },
    {
      id: 'meta-llama/llama-3.1-8b-instruct:free',
      name: 'Llama 3.1 8B (Free)',
      description: 'Free model from Meta',
      pricing: { prompt: '0', completion: '0' },
      context_length: 131072,
      architecture: { modality: 'text', tokenizer: 'llama3', instruct_type: 'llama' },
      top_provider: { context_length: 131072, max_completion_tokens: 8192, is_moderated: false },
    },
  ];
}

export function getModelDisplayName(model: OpenRouterModel): string {
  return model.name || model.id;
}

export function getModelPrice(model: OpenRouterModel): string {
  const promptPrice = parseFloat(model.pricing.prompt) * 1000000;
  const completionPrice = parseFloat(model.pricing.completion) * 1000000;
  return `$${promptPrice.toFixed(2)} / $${completionPrice.toFixed(2)} per 1M tokens`;
}

export async function validateOpenRouterKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/grammerai/extension',
        'X-Title': 'GrammerAI Extension',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}