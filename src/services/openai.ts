export interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[]; // This can be more specific if needed
  root: string;
  parent: string | null;
}

export interface OpenAIModelsResponse {
  data: OpenAIModel[];
  object: string;
}

export async function fetchOpenAIModels(apiKey: string): Promise<OpenAIModel[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAI models: ${response.statusText}`);
    }

    const data: OpenAIModelsResponse = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    throw error;
  }
}

export function getOpenAIModelDisplayName(model: OpenAIModel): string {
  return model.id;
}

// OpenAI does not provide pricing information directly via the models API,
// so this function will be a placeholder or return a generic message.
export function getOpenAIModelPrice(model: OpenAIModel): string {
  return "Pricing varies by usage. Refer to OpenAI documentation.";
}