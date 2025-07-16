export interface TogetherModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  // Add other fields as needed based on Together.ai API response
}

export interface TogetherModelsResponse {
  data: TogetherModel[];
}

export async function fetchTogetherModels(apiKey: string): Promise<TogetherModel[]> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Together AI API key is required');
  }

  try {
    console.log('Fetching Together AI models with API key:', apiKey.substring(0, 10) + '...');
    
    const response = await fetch('https://api.together.xyz/v1/models', {
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'accept': 'application/json',
      },
    });
    
    console.log('Together AI API response status:', response.status);
    console.log('Together AI API response:', response);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Together AI API error response:', errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid Together AI API key. Please check your API key and try again.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. Please check your Together AI API key permissions.');
      } else {
        throw new Error(`Together AI API error (${response.status}): ${errorText}`);
      }
    }

    const responseData = await response.json();
    console.log('Together AI response data:', responseData);

    // Handle different possible response structures
    let models: TogetherModel[];
    
    if (Array.isArray(responseData)) {
      // If response is directly an array
      models = responseData;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      // If response has a data property with array
      models = responseData.data;
    } else {
      console.error('Unexpected Together AI API response structure:', responseData);
      throw new Error('Unexpected response structure from Together AI API');
    }

    console.log(`Successfully fetched ${models.length} Together AI models`);
    
    // Filter out models that don't have required properties
    const validModels = models.filter(model => 
      model && 
      typeof model === 'object' && 
      model.id && 
      typeof model.id === 'string'
    );

    console.log(`${validModels.length} valid models after filtering`);
    
    if (validModels.length === 0) {
      throw new Error('No valid models found in Together AI response');
    }

    return validModels;
  } catch (error) {
    console.error('Error fetching Together AI models:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred while fetching Together AI models');
    }
  }
}

export function getTogetherModelDisplayName(model: TogetherModel): string {
  return model.displayName || model.name || model.id;
}

export function getTogetherModelPrice(model: TogetherModel): string {
  if (model.pricing && model.pricing.prompt && model.pricing.completion) {
    try {
      const promptPrice = parseFloat(model.pricing.prompt) * 1000000;
      const completionPrice = parseFloat(model.pricing.completion) * 1000000;
      return `$${promptPrice.toFixed(2)} / $${completionPrice.toFixed(2)} per 1M tokens`;
    } catch (error) {
      console.warn('Error parsing pricing for model:', model.id, error);
      return "Pricing information not available";
    }
  }
  return "Pricing information not available";
}