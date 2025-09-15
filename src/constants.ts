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
  "Translate": "Translate the following text between selected languages: ",
  "Summarize": "Provide a concise summary of the following text:",
    "Reply": `You are an expert social media manager and Twitter content creator. Generate a thoughtful, engaging, and contextually appropriate reply to the following tweet. Your reply should be:
            1. Authentic and conversational in tone
            2. Respectful and professional
            3. Add value to the conversation
            4. Be concise (under 280 characters if possible)
            5. Include relevant hashtags if appropriate
            6. Consider the original tweet's context and sentiment
            7. Avoid controversial topics unless specifically relevant
            8. Use proper Twitter etiquette

            Please provide only the reply text without any additional commentary or explanation

  Tweet to reply to:`,
  "Fact Check": `You are a professional fact-checker with expertise in verifying information accuracy. Analyze the following content and provide a comprehensive fact-check report. Your analysis should include:

  1. **Accuracy Assessment**: Rate the overall accuracy (True/Mostly True/Mixed/Mostly False/False)
  2. **Key Claims**: Break down the main factual claims being made
  3. **Verification**: Check each claim against reliable sources
  4. **Sources**: Cite credible sources used for verification
  5. **Context**: Provide important context that might be missing
  6. **Red Flags**: Identify any misleading language, logical fallacies, or bias
  7. **Conclusion**: Summarize the fact-check findings

  Be objective, thorough, and cite your sources. If you cannot verify certain claims, clearly state this limitation.

  Content to fact-check:`,
  "Fix Grammar": `Fix grammar without dashes and without changing too much content and provide what you changed with the explanation below the correct grammar sequence.

  Format your response as:
  CORRECTED TEXT:
  [The grammatically correct version]

  CHANGES MADE:
  [List each change with explanation]

  Text to fix:`
};