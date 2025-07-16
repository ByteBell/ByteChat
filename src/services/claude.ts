export interface ClaudeModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
}

export async function fetchClaudeModels(apiKey: string): Promise<ClaudeModel[]> {
  // Anthropic's API does not provide a direct endpoint to list all models.
  // We'll return a static list of commonly used Claude models.
  // In a real-world scenario, you might fetch this from a configuration or
  // a proxy service that maintains an updated list.
  console.warn("Anthropic API does not provide a direct endpoint for listing models. Returning static list.");
  
  return [
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      description: "Anthropic's most powerful model for highly complex tasks.",
      context_length: 200000,
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      description: "Anthropic's balance of intelligence and speed for enterprise workloads.",
      context_length: 200000,
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      description: "Anthropic's fastest and most compact model for near-instant responsiveness.",
      context_length: 200000,
    },
    {
      id: "claude-2.1",
      name: "Claude 2.1",
      description: "Previous generation model with a large context window.",
      context_length: 200000,
    },
    {
      id: "claude-2.0",
      name: "Claude 2.0",
      description: "Previous generation model.",
      context_length: 100000,
    },
    {
      id: "claude-instant-1.2",
      name: "Claude Instant 1.2",
      description: "Fast and affordable model.",
      context_length: 100000,
    },
  ];
}

export function getClaudeModelDisplayName(model: ClaudeModel): string {
  return model.name || model.id;
}

// Pricing for Claude models is not available via API.
export function getClaudeModelPrice(model: ClaudeModel): string {
  return "Pricing varies by usage. Refer to Anthropic documentation.";
}