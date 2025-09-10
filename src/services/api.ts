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
    throw new Error(`${settings.provider} API key is required`);
  }

  if (!settings.model) {
    throw new Error('Please select a model');
  }

  const temperature = options.temperature ?? 0.1;
  const max_tokens = options.max_tokens ?? 10000;

  switch (settings.provider) {
    case 'openai':
      console.log("Making request to OpenAI");
      return await sendOpenAIRequest(messages, settings, temperature, max_tokens);
    
    case 'anthropic':
      console.log("Making request to Anthropic");
      return await sendAnthropicRequest(messages, settings, temperature, max_tokens);
    
    case 'together':
      console.log("Making request to Together");
      return await sendTogetherRequest(messages, settings, temperature, max_tokens);
    
    case 'openrouter':
      console.log("Making request to Openrouter");
      return await sendOpenRouterRequest(messages, settings, temperature, max_tokens);
    
    default:
      throw new Error(`Unsupported provider: ${settings.provider}`);
  }
}

async function sendOpenAIRequest(
  messages: ChatMessage[],
  settings: Settings,
  temperature: number,
  max_tokens: number
): Promise<ChatResponse> {
  const request: ChatRequest = {
    model: settings.model,
    messages,
    temperature,
    max_tokens,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `OpenAI API request failed: ${response.statusText}`);
  }

  return response.json();
}

async function sendAnthropicRequest(
  messages: ChatMessage[],
  settings: Settings,
  temperature: number,
  max_tokens: number
): Promise<ChatResponse> {
  // Anthropic uses a different message format
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const request = {
    model: settings.model,
    messages: userMessages,
    system: systemMessage?.content || '',
    temperature,
    max_tokens,
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': settings.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Anthropic API request failed: ${response.statusText}`);
  }

  const anthropicResponse = await response.json();

  // Convert Anthropic response format to standard format
  return {
    id: anthropicResponse.id,
    choices: [{
      message: {
        role: 'assistant',
        content: anthropicResponse.content[0]?.text || '',
      },
      finish_reason: anthropicResponse.stop_reason,
      index: 0,
    }],
    usage: {
      prompt_tokens: anthropicResponse.usage?.input_tokens || 0,
      completion_tokens: anthropicResponse.usage?.output_tokens || 0,
      total_tokens: (anthropicResponse.usage?.input_tokens || 0) + (anthropicResponse.usage?.output_tokens || 0),
    },
  };
}

async function sendTogetherRequest(
  messages: ChatMessage[],
  settings: Settings,
  temperature: number,
  max_tokens: number
): Promise<ChatResponse> {
  const request: ChatRequest = {
    model: settings.model,
    messages,
    temperature,
    max_tokens,
  };

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Together API request failed: ${response.statusText}`);
  }

  return response.json();
}

async function sendOpenRouterRequest(
  messages: ChatMessage[],
  settings: Settings,
  temperature: number,
  max_tokens: number
): Promise<ChatResponse> {
  const request: ChatRequest = {
    model: settings.model,
    messages,
    temperature,
    max_tokens,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
    throw new Error(error.error?.message || `OpenRouter API request failed: ${response.statusText}`);
  }
  const result = response.json()
  console.log(`LLM reponse = ${result}`)
  return result;
}