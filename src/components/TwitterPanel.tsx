import React, { useEffect, useState, useRef } from "react";
import { execInPage, loadStoredSettings, loadStoredUser } from "../utils";
import { sendChatRequest, ChatMessage } from "../services/api";
import { SYSTEM_PROMPTS } from "../constants";
import { Settings } from "../types";

const TwitterPanel: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
  });

  const [actionType, setActionType] = useState<string>("Reply");
  const [prompt, setPrompt] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadStoredSettings().then((s) => s && setSettings(s));
    (async () => {
      const text = await execInPage(() => {
        const sel = window.getSelection()?.toString().trim();
        if (sel) return sel;
        const el = document.activeElement as any;
        if (el && "value" in el) return el.value;
        if (el?.isContentEditable) return el.innerText;
        return "";
      });
      if (text) setPrompt(text);
    })();
  }, []);

  const validateTwitterSettings = (): boolean => {
    if (settings.provider !== "openrouter") {
      setError("❌ Twitter features require OpenRouter. Please configure OpenRouter in Settings.");
      return false;
    }
    if (!settings.apiKey) {
      setError("❌ OpenRouter API key is required for Twitter features. Please add your key in Settings.");
      return false;
    }
    setError("");
    return true;
  };

  const runTwitterAction = async () => {
    if (!prompt.trim()) {
      setError("⚠️ Enter a tweet or text first.");
      return;
    }

    if (!validateTwitterSettings()) {
      return;
    }

    setLoading(true);
    setAnswer("");
    setError("");
    
    try {
      const user = await loadStoredUser();
      
      // For Twitter features, we need OpenRouter specifically
      if (!user?.token && (!settings.apiKey || settings.provider !== "openrouter")) {
        setError("⚠️ Twitter features require OpenRouter. Please configure OpenRouter with your API key in Settings.");
        return;
      }

      // Force Grok4 model for Twitter actions
      const twitterSettings: Settings = {
        ...settings,
        provider: "openrouter",
        model: "x-ai/grok-4", // Grok4 model
        apiKey: settings.apiKey, // Ensure API key is passed
      };

      const systemPrompt = SYSTEM_PROMPTS[actionType as keyof typeof SYSTEM_PROMPTS];
      
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ];

      const response = await sendChatRequest(messages, twitterSettings);
      const assistantMessage = response.choices[0]?.message?.content || 'No response received';
      setAnswer(assistantMessage);
      
    } catch (err: any) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAnswer("");
    setPrompt("");
    setLoading(false);
    setError("");
  };

  const actionOptions = [
    { value: "Reply", label: "Reply", icon: "💬", description: "Generate a thoughtful reply" },
    { value: "Fact Check", label: "Fact Check", icon: "🔍", description: "Verify information accuracy" },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 space-y-3">
        {/* Twitter Header */}
        <div className="card p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-blue-900">Twitter Assistant</h2>
              <p className="text-sm text-blue-700">Powered by Grok4 via OpenRouter</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="card p-3 bg-red-50 border-red-200 animate-slide-up">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
                {error.includes("OpenRouter") && (
                  <p className="text-xs text-red-600 mt-1">
                    Go to Settings tab → Select OpenRouter → Add your API key → Select x-ai/grok-beta model
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Selection */}
        <div className="card p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <span>🐦</span>
              <span>Twitter Action</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {actionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActionType(option.value)}
                  className={`
                    flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 text-left
                    ${actionType === option.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-102"
                      : "bg-white hover:bg-gray-50 hover:text-gray-900 border-gray-200 hover:border-blue-500/50"
                    }
                  `}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm opacity-80">{option.description}</div>
                  </div>
                  {actionType === option.value && (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grok4 Info */}
          <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">G4</span>
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">Using Grok4 AI</p>
              <p className="text-xs text-purple-700">X's advanced AI model via OpenRouter</p>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="card p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <span>📝</span>
              <span>{actionType === "Reply" ? "Tweet to Reply To" : "Content to Fact Check"}</span>
            </label>
            <textarea
              placeholder={actionType === "Reply" 
                ? "Paste the tweet you want to reply to..." 
                : "Paste the content you want to fact-check..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="textarea resize-none custom-scrollbar"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              disabled={loading}
              onClick={runTwitterAction}
              className="btn btn-primary btn-md flex-1 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 spinner border-white" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{actionType === "Reply" ? "💬" : "🔍"}</span>
                  <span>{actionType === "Reply" ? "Generate Reply" : "Fact Check"}</span>
                </div>
              )}
            </button>
            
            {(answer || loading || error) && (
              <button
                onClick={handleClear}
                className="btn btn-outline btn-md px-4"
                title="Clear"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Result Section */}
        {(answer || loading) && (
          <div className="card p-4 space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                <span>{actionType === "Reply" ? "💬" : "🔍"}</span>
                <span>{actionType === "Reply" ? "Generated Reply" : "Fact Check Result"}</span>
              </label>
              {answer && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(answer)}
                    className="btn btn-ghost btn-sm"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Grok4
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={answer}
                rows={6}
                className="textarea bg-gray-50/50 custom-scrollbar resize-none"
                placeholder={loading ? "Grok4 is analyzing..." : "Your result will appear here..."}
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-md">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="w-4 h-4 spinner border-current" />
                    <span className="text-sm">Grok4 is processing...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="card p-4 space-y-3 bg-muted/30">
          <h4 className="font-semibold text-foreground flex items-center space-x-2">
            <span>💡</span>
            <span>Tips for {actionType}</span>
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {actionType === "Reply" ? (
              <>
                <p>• Paste the original tweet for context</p>
                <p>• Grok4 will generate a thoughtful, engaging reply</p>
                <p>• Review and personalize before posting</p>
              </>
            ) : (
              <>
                <p>• Paste claims, news, or statements to verify</p>
                <p>• Grok4 will check facts and provide sources</p>
                <p>• Always cross-reference with multiple sources</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwitterPanel;