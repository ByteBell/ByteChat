export type Provider = "openai" | "anthropic" | "together" | "openrouter";

export type ModelCapability = "text" | "image" | "file" | "audio";

export interface Settings {
  provider: Provider;
  model: string;
  apiKey: string;
  temperature?: number;
}

export interface User {
  name: string;
  email: string;
  token: string;
  expires: string;
}

// Multimodal content types for OpenRouter API
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export interface FileContent {
  type: 'file';
  filename: string;
  file_data: string;
}

export interface AudioContent {
  type: 'input_audio';
  input_audio: {
    data: string;
    format: string;
  };
}

export type MessageContent = TextContent | ImageContent | FileContent | AudioContent;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

// API Balance response
export interface BalanceResponse {
  data: {
    credits: number;
  };
}

// Session Management Types
export interface ChatSession {
  id: string;
  name: string;
  messages: SessionMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | MessageContent[];
  timestamp: number;
  model?: string;
  attachments?: MessageContent[];
}

export interface SessionStorage {
  sessions: ChatSession[];
  currentSessionId: string | null;
  lastSessionId: string | null;
}