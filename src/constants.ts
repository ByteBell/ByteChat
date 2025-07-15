import { Provider } from "./types";

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ["gpt-4o", "gpt-3.5-turbo"],
  anthropic: ["claude-3-sonnet", "claude-3-haiku"],
  together: [
    "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
  ],
  openrouter: ["mistralai/devstral-small"],

};

export const LANGUAGES = [
  "Hindi",
  "English",
  "Chinese",
  "Spanish",
  "Arabic",
  "Portuguese",
  "Russian",
];

export const SYSTEM_PROMPTS: Record<string, string> = {
  "Grammar Fix":
    "Convert the following into standard English and fix any grammatical errors:",
  Translate: "Translate the following text between selected languages: ",
  Summarize: "Provide a concise summary of the following text:",
};