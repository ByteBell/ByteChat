import { OPENROUTER_API_URL } from '../constants';
import { Settings } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function sendChatRequest(
  messages: ChatMessage[],
  settings: Settings,
  options: { temperature?: number; max_tokens?: number } = {}
): Promise<ChatResponse> {
  if (!settings.apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  if (!settings.model) {
    throw new Error('Please select a model');
  }

  const request: ChatRequest = {
    model: settings.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 1000,
  };

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/grammerai/extension',
      'X-Title': 'GrammerAI Extension',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `API request failed: ${response.statusText}`);
  }

  return response.json();
}