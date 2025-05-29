import React, { useEffect, useState, useRef, useMemo } from "react";
import { execInPage, callLLMStream, loadStoredSettings, loadStoredUser, saveStreamingState, loadStreamingState, clearStreamingState } from "../utils";
import { SYSTEM_PROMPTS, LANGUAGES } from "../constants";
import { Settings } from "../types";
import { Select } from "./Select";

const ChatPanel: React.FC = () => {

  const [settings, setSettings] = useState<Settings>({
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
  });

  const [systemID, setSystemID] = useState<string>("Grammar Fix");
  const [tone,      setTone]      = useState<string>("Formal");
  const [fromLang,  setFromLang]  = useState<string>("English");
  const [toLang,    setToLang]    = useState<string>("Hindi");

  const [prompt, setPrompt]   = useState<string>("");
  const [answer, setAnswer]   = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [restoredSession, setRestoredSession] = useState<boolean>(false);
  const [wasInterrupted, setWasInterrupted] = useState<boolean>(false);

  // Ref to track if component is mounted (for cleanup)
  const isMountedRef = useRef(true);
  // Ref to track current answer for streaming
  const currentAnswerRef = useRef<string>("");

  useEffect(() => {
    // Ensure mounted state is true on mount
    isMountedRef.current = true;
    console.log("Component mounted, isMountedRef set to true");
    
    return () => {
      console.log("Component unmounting, setting isMountedRef to false");
      isMountedRef.current = false;
    };
  }, []);

  /* ------------ 1.  build system prompt on the fly ------------- */
   /* ------------------------- derived prompt ------------------------ */
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

  // Debug effect to track answer changes
  useEffect(() => {
    console.log("Answer state changed to:", answer);
  }, [answer]);

  // Save streaming state whenever it changes
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

  // Load previous streaming state on mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedState = await loadStreamingState();
      if (savedState) {
        console.log("Restoring previous session:", savedState);
        setPrompt(savedState.prompt || "");
        setAnswer(savedState.answer || "");
        currentAnswerRef.current = savedState.answer || "";
        
        // If the session was interrupted during streaming
        if (savedState.isStreaming) {
          console.log("Session was interrupted during streaming - auto-continuing...");
          setWasInterrupted(true);
          setRestoredSession(true);
          
          // Auto-continue streaming after restoration
          setTimeout(async () => {
            await continueStreamingFromStorage(savedState);
          }, 500);
        } else {
          setRestoredSession(true);
          // Clear the restored session indicator after 3 seconds
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

      console.log("Continuing streaming from saved state...");
      console.log("Existing answer length:", savedState.answer?.length || 0);
      
      setLoading(true);
      setWasInterrupted(false);
      
      // Continue streaming with existing answer
      await callLLMStream(
        settings,
        savedState.systemPrompt || systemPrompt,
        savedState.prompt || prompt,
        (chunk: string) => {
          console.log("Received continuation chunk:", chunk);
          
          // Update ref immediately  
          currentAnswerRef.current += chunk;
          const newAnswer = currentAnswerRef.current;
          
          // Update state
          setAnswer(newAnswer);
        },
        savedState.answer || "" // Pass existing answer for continuation
      );
      
      console.log("Streaming continuation completed");
      await clearStreamingState();
    } catch (err: any) {
      console.error("Failed to continue streaming:", err);
      setAnswer(prev => prev + `\n❌ Failed to continue: ${err.message}`);
    } finally {
      setLoading(false);
      setRestoredSession(false);
    }
  };

  // 1️⃣ On mount, load saved values (if any) and seed state
  useEffect(() => {
    chrome.storage.local.get(
      ["transformType", "fromLang", "toLang", "tone"],
      (saved) => {
        if (saved.transformType) setSystemID(saved.transformType);
        if (saved.fromLang)     setFromLang(saved.fromLang);
        if (saved.toLang)       setToLang(saved.toLang);
        if (saved.tone)         setTone(saved.tone);
      }
    );
  }, []);

  // a ref so we can skip saving on that very first render
  const isFirst = useRef(true);

  // 2️⃣ On any change *after* the first load, write back to storage
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
    console.log("runChat started, isMountedRef.current:", isMountedRef.current);
    
    if (!prompt.trim()) {
      setAnswer("⚠️ Enter a prompt first.");
      return;
    }
    
    // Check if user is logged in, if not, require API key
    const user = await loadStoredUser();
    
    if (!user?.token && !settings.apiKey) {
      setAnswer("⚠️ Add your API key in Settings or login to use the service.");
      return;
    }

    console.log("Starting chat request...", { isLoggedIn: !!user?.token, isMountedRef: isMountedRef.current });
    setLoading(true);
    setAnswer(""); // Clear previous answer
    currentAnswerRef.current = ""; // Clear ref as well
    setWasInterrupted(false); // Clear interrupted state
    setRestoredSession(false); // Clear restored state
    
    try {
      console.log("Calling LLM stream with:", {
        systemPrompt: systemPrompt,
        userPrompt: prompt.trim(),
        fullQuestion: `${systemPrompt}\n\n${prompt.trim()}`,
        settings,
        isLoggedIn: !!user?.token
      });

      // Use streaming for all providers
      await callLLMStream(
        settings,
        systemPrompt,
        prompt.trim(),
        (chunk: string) => {
          console.log("Received chunk in ChatPanel:", chunk);
          console.log("isMountedRef.current:", isMountedRef.current);
          
          // Update ref immediately
          currentAnswerRef.current += chunk;
          const newAnswer = currentAnswerRef.current;
          console.log("Updating answer to:", newAnswer);
          
          // Update state regardless of mounted status (React handles this safely)
          setAnswer(newAnswer);
        }
      );
      
      console.log("Chat request completed successfully");
      // Clear streaming state on successful completion
      await clearStreamingState();
    } catch (err: any) {
      console.error("Chat request failed:", err);
      setAnswer(`❌ ${err.message}`);
      // Clear streaming state on error too
      await clearStreamingState();
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-['Inter',sans-serif]">
      <div className="p-4 bg-mint-light border-2 border-mint-dark rounded-b-lg shadow space-y-4">
      
      {/* Restored Session Indicator */}
      {restoredSession && !wasInterrupted && (
        <div className="p-2 bg-blue-100 border border-blue-300 rounded-md text-sm text-blue-800">
          ✨ Previous session restored - you can continue where you left off
        </div>
      )}

      {/* Interrupted Session Indicator */}
      {wasInterrupted && (
        <div className="p-3 bg-green-100 border border-green-300 rounded-md text-sm">
          <div className="text-green-800 mb-1">
            🔄 Continuing interrupted streaming session...
          </div>
          <div className="text-green-600 text-xs">
            Your previous response has been restored and streaming will continue automatically
          </div>
        </div>
      )}

      <label className="block text-sm font-medium text-text mb-0.5">
        Action
      </label>

            <Select
              value={systemID}
              onChange={(e) => setSystemID(e.target.value)}
              className="w-full mb-2 border-mint focus:ring-mint p-1.5 text-sm"
            >
              <option value="Change the Tone">Change the Tone</option>
              {Object.keys(SYSTEM_PROMPTS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          {systemID === "Change the Tone" && (
            <div className="mt-3">
              <span className="text-sm text-gray-600 mb-1 block">Choose Tone:</span>
              <Select
                className="w-full"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="Formal">Formal</option>
                <option value="Friendly">Friendly</option>
                <option value="Funny">Funny</option>
                <option value="Casual">Casual</option>
                <option value="Normal">Normal</option>
              </Select>
            </div>
          )}
          {/* translate language pickers */}
          {systemID === "Translate" && (
            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
              <Select
                value={fromLang}
                onChange={(e) => setFromLang(e.target.value)}
                className="flex-1"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang}>{lang}</option>
                ))}
              </Select>
              <span className="text-gray-500">→</span>
              <Select
                value={toLang}
                onChange={(e) => setToLang(e.target.value)}
                className="flex-1"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang}>{lang}</option>
                ))}
              </Select>
            </div>
          )}
        
        <textarea
          placeholder="Ask me anything…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-mint p-1.5 text-sm outline-none resize-y focus:ring-2 focus:ring-mint bg-white"
        />
        <div className="flex space-x-2">
          <button
            disabled={loading}
            onClick={runChat}
            className="flex-1 rounded-md bg-brand-light py-2 text-text font-semibold hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "Generating…" : "Submit"}
          </button>
          {(answer || loading || wasInterrupted) && (
            <button
              onClick={async () => {
                setAnswer("");
                setPrompt("");
                setLoading(false);
                setWasInterrupted(false);
                currentAnswerRef.current = "";
                await clearStreamingState();
                setRestoredSession(false);
              }}
              className="px-4 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              title="Clear current session"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          readOnly
          value={answer}
          rows={6}
          className="w-full resize-y rounded-md border-2 border-gray-200 p-2 text-sm bg-gray-50 focus:border-purple-500"
        />
      </div>
    </div>
  );
};

export default ChatPanel;