/* src/services/modelCategories.ts */
import type { ModelCapability } from "../types";
import type { OpenRouterModel } from "./openrouter";
import { getModelCapabilities } from "./openrouter";

export interface ModelsByCategory {
  text: OpenRouterModel[];
  image: OpenRouterModel[];
  file: OpenRouterModel[];
  audio: OpenRouterModel[];
}

export interface ModelPreferences {
  text: string;
  image: string;
  file: string;
  audio: string;
}

/**
 * Categorize models by their capabilities
 */
export function categorizeModels(models: OpenRouterModel[]): ModelsByCategory {
  const categories: ModelsByCategory = {
    text: [],
    image: [],
    file: [],
    audio: []
  };

  models.forEach(model => {
    const capabilities = getModelCapabilities(model);
    
    // Add to each category the model supports
    capabilities.forEach(capability => {
      if (categories[capability]) {
        categories[capability].push(model);
      }
    });
  });

  return categories;
}

/**
 * Filter models by specific capability
 */
export function filterModelsByCapability(
  models: OpenRouterModel[], 
  capability: ModelCapability
): OpenRouterModel[] {
  return models.filter(model => {
    const capabilities = getModelCapabilities(model);
    return capabilities.includes(capability);
  });
}

/**
 * Save model preference for specific capability
 */
export async function saveModelPreference(
  capability: ModelCapability, 
  modelId: string
): Promise<void> {
  try {
    const key = `selected_${capability}_model`;
    await chrome.storage.local.set({ [key]: modelId });
    console.log(`[ModelCategories] Saved ${capability} model preference:`, modelId);
  } catch (error) {
    console.error(`[ModelCategories] Failed to save ${capability} model preference:`, error);
  }
}

/**
 * Get saved model preference for specific capability
 */
export async function getModelPreference(
  capability: ModelCapability
): Promise<string | null> {
  try {
    const key = `selected_${capability}_model`;
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  } catch (error) {
    console.error(`[ModelCategories] Failed to get ${capability} model preference:`, error);
    return null;
  }
}

/**
 * Get all saved model preferences
 */
export async function getAllModelPreferences(): Promise<Partial<ModelPreferences>> {
  try {
    const keys = [
      'selected_text_model',
      'selected_image_model', 
      'selected_file_model',
      'selected_audio_model'
    ];
    const result = await chrome.storage.local.get(keys);
    
    return {
      text: result.selected_text_model,
      image: result.selected_image_model,
      file: result.selected_file_model,
      audio: result.selected_audio_model
    };
  } catch (error) {
    console.error('[ModelCategories] Failed to get model preferences:', error);
    return {};
  }
}

/**
 * Get default model for each capability from available models
 */
export function getDefaultModelsForCapabilities(
  categorizedModels: ModelsByCategory
): Partial<ModelPreferences> {
  const defaults: Partial<ModelPreferences> = {};
  
  // Select first (highest scored) model for each category
  if (categorizedModels.text.length > 0) {
    defaults.text = categorizedModels.text[0].id;
  }
  
  if (categorizedModels.image.length > 0) {
    defaults.image = categorizedModels.image[0].id;
  }
  
  if (categorizedModels.file.length > 0) {
    defaults.file = categorizedModels.file[0].id;
  }
  
  if (categorizedModels.audio.length > 0) {
    defaults.audio = categorizedModels.audio[0].id;
  }
  
  return defaults;
}

/**
 * Get the best model for a specific capability, considering user preferences
 */
export async function getBestModelForCapability(
  capability: ModelCapability,
  categorizedModels: ModelsByCategory
): Promise<string | null> {
  // First try to get user preference
  const preference = await getModelPreference(capability);
  if (preference) {
    // Verify the preferred model is still available
    const availableModels = categorizedModels[capability];
    if (availableModels.some(m => m.id === preference)) {
      return preference;
    }
  }
  
  // Fallback to default (first model in category)
  const availableModels = categorizedModels[capability];
  return availableModels.length > 0 ? availableModels[0].id : null;
}