export type Provider = "openai" | "anthropic" | "together" | "openrouter";

export interface Settings {
  provider: Provider;
  model: string;
  apiKey: string;
}

export interface User {
  name: string;
  email: string;
  token: string;
  expires: string;
}