import React, { useEffect, useState, useRef, useMemo } from "react";
import { execInPage, loadStoredSettings, loadStoredUser, saveStreamingState, loadStreamingState, clearStreamingState } from "../utils";
import { sendChatRequest, ChatMessage } from "../services/api";
import { SYSTEM_PROMPTS, LANGUAGES } from "../constants";
import { Settings } from "../types";

const ChatPanel: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    provider: "openrouter",           // was "openai"
    model: "openai/gpt-4o-mini",      // was "gpt-4o"
    apiKey: "",
  });

  const [systemID, setSystemID] = useState<string>("Grammar Fix");
  const [tone, setTone] = useState<string>("Formal");
  const [fromLang, setFromLang] = useState<string>("English");
  const [toLang, setToLang] = useState<string>("Hindi");

  const [prompt, setPrompt] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [restoredSession, setRestoredSession] = useState<boolean>(false);
  const [wasInterrupted, setWasInterrupted] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const currentAnswerRef = useRef<string>("");

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const systemPrompt = useMemo(() => {
    switch (systemID) {
      case "Translate":
        return `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}. Only provide the translation, no explanations or additional text:`;
      case "Change the Tone":
        return `Change the tone of the text to be ${tone}.`;
      case "Summarize":
        return SYSTEM_PROMPTS["Summarize"];
      default:
        return SYSTEM_PROMPTS[systemID as keyof typeof SYSTEM_PROMPTS];
    }
  }, [systemID, fromLang, toLang, tone]);

  useEffect(() => {
    if (loading || answer) {
      saveStreamingState({
        prompt,
        answer,
        loading,
        systemPrompt,
        isStreaming: loading
      });
    }
  }, [prompt, answer, loading, systemPrompt]);

  useEffect(() => {
    const restoreSession = async () => {
      const savedState = await loadStreamingState();
      if (savedState) {
        setPrompt(savedState.prompt || "");
        setAnswer(savedState.answer || "");
        currentAnswerRef.current = savedState.answer || "";
        
        if (savedState.isStreaming) {
          setWasInterrupted(true);
          setRestoredSession(true);
          
          setTimeout(async () => {
            await continueStreamingFromStorage(savedState);
          }, 500);
        } else {
          setRestoredSession(true);
          setTimeout(() => setRestoredSession(false), 3000);
        }
      }
    };

    restoreSession();
  }, []);

  const continueStreamingFromStorage = async (savedState: any) => {
    try {
      const user = await loadStoredUser();
      if (!user?.token && !settings.apiKey) {
        setAnswer(prev => prev + "\n❌ Cannot continue - authentication required");
        setWasInterrupted(false);
        return;
      }

      setLoading(true);
      setWasInterrupted(false);
      
      const messages: ChatMessage[] = [
        { role: 'system', content: savedState.systemPrompt || systemPrompt },
        { role: 'user', content: savedState.prompt || prompt },
      ];
      const response = await sendChatRequest(messages, settings);
      console.log("[UI] continueStreamingFromStorage response:", response);
      const assistantMessage = savedState.answer + (response.choices[0]?.message?.content || 'No response received');
      setAnswer(assistantMessage);
      
      await clearStreamingState();
    } catch (err: any) {
      setAnswer(prev => prev + `\n❌ Failed to continue: ${err.message}`);
    } finally {
      setLoading(false);
      setRestoredSession(false);
    }
  };

  useEffect(() => {
    chrome.storage.local.get(
      ["transformType", "fromLang", "toLang", "tone"],
      (saved) => {
        if (saved.transformType) setSystemID(saved.transformType);
        if (saved.fromLang) setFromLang(saved.fromLang);
        if (saved.toLang) setToLang(saved.toLang);
        if (saved.tone) setTone(saved.tone);
      }
    );
  }, []);

  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    chrome.storage.local.set({
      transformType: systemID,
      fromLang,
      toLang,
      tone,
    });
  }, [systemID, fromLang, toLang, tone]);

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

  const runChat = async () => {
    if (!prompt.trim()) {
      setAnswer("⚠️ Enter a prompt first.");
      return;
    }
    
    const user = await loadStoredUser();
    
    if (!user?.token && !settings.apiKey) {
      setAnswer("⚠️ Add your API key in Settings or login to use the service.");
      return;
    }

    setLoading(true);
    setAnswer("");
    currentAnswerRef.current = "";
    setWasInterrupted(false);
    setRestoredSession(false);
    
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt.trim() },
      ];

      const response = await sendChatRequest(messages, settings);
      console.log("[UI] runChat response:", response);
      const assistantMessage = response.choices?.[0]?.message?.content || "No response received";
      setAnswer(assistantMessage);
      
      await clearStreamingState();
    } catch (err: any) {
      setAnswer(`❌ ${err.message}`);
      await clearStreamingState();
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setAnswer("");
    setPrompt("");
    setLoading(false);
    setWasInterrupted(false);
    currentAnswerRef.current = "";
    await clearStreamingState();
    setRestoredSession(false);
  };

  const actionOptions = [
    { value: "Grammar Fix", label: "Grammar Fix", icon: "📝" },
    { value: "Change the Tone", label: "Change Tone", icon: "🎭" },
    { value: "Translate", label: "Translate", icon: "🌍" },
    { value: "Summarize", label: "Summarize", icon: "📋" },
  ];

  const toneOptions = [
    { value: "Formal", label: "Formal", icon: "🎩" },
    { value: "Friendly", label: "Friendly", icon: "😊" },
    { value: "Funny", label: "Funny", icon: "😄" },
    { value: "Casual", label: "Casual", icon: "👕" },
    { value: "Normal", label: "Normal", icon: "💬" },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Status Cards */}
      <div className="p-4 space-y-3">
        {restoredSession && !wasInterrupted && (
          <div className="card glass p-3 border-blue-200 bg-blue-50/50 animate-slide-up">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-800">
                ✨ Previous session restored
              </span>
            </div>
          </div>
        )}

        {wasInterrupted && (
          <div className="card glass p-3 border-green-200 bg-green-50/50 animate-slide-up">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-800">
                🔄 Continuing interrupted session...
              </span>
            </div>
          </div>
        )}

        {/* Action Selection */}
        <div className="card p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <span>🎯</span>
              <span>Action</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {actionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSystemID(option.value)}
                  className={`
                    flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200 text-left
                    ${systemID === option.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                      : "bg-white hover:bg-gray-50 hover:text-gray-900 border-gray-200 hover:border-blue-500/50"
                    }
                  `}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          {systemID === "Change the Tone" && (
            <div className="space-y-2 animate-slide-up">
              <label className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                <span>🎭</span>
                <span>Tone</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {toneOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTone(option.value)}
                    className={`
                      flex items-center space-x-2 p-2 rounded-lg border transition-all duration-200 text-left
                      ${tone === option.value
                        ? "bg-gray-200 text-gray-900 border-gray-300 shadow-sm"
                        : "bg-white hover:bg-gray-50 hover:text-gray-900 border-gray-200"
                      }
                    `}
                  >
                    <span>{option.icon}</span>
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Language Selection */}
          {systemID === "Translate" && (
            <div className="space-y-2 animate-slide-up">
              <label className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                <span>🌍</span>
                <span>Languages</span>
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-100/50 rounded-lg">
                <select
                  value={fromLang}
                  onChange={(e) => setFromLang(e.target.value)}
                  className="select flex-1 bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <select
                  value={toLang}
                  onChange={(e) => setToLang(e.target.value)}
                  className="select flex-1 bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="card p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <span>✍️</span>
              <span>Your Text</span>
            </label>
            <textarea
              placeholder="Enter your text here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="textarea resize-none custom-scrollbar"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              disabled={loading}
              onClick={runChat}
              className="btn btn-primary btn-md flex-1 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 spinner border-white" />
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>✨</span>
                  <span>Generate</span>
                </div>
              )}
            </button>
            
            {(answer || loading || wasInterrupted) && (
              <button
                onClick={handleClear}
                className="btn btn-outline btn-md px-4"
                title="Clear session"
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
                <span>🎯</span>
                <span>Result</span>
              </label>
              {answer && (
                <button
                  onClick={() => navigator.clipboard.writeText(answer)}
                  className="btn btn-ghost btn-sm"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={answer}
                rows={4}
                className="textarea bg-gray-50/50 custom-scrollbar resize-none"
                placeholder={loading ? "AI is thinking..." : "Your result will appear here..."}
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-md">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="w-4 h-4 spinner border-current" />
                    <span className="text-sm">Generating response...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;