import React, { useEffect, useState, useRef, useMemo } from "react";
import { execInPage, callLLMStream, loadStoredSettings, loadStoredUser } from "../utils";
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

  // Debug effect to track answer changes
  useEffect(() => {
    console.log("Answer state changed to:", answer);
  }, [answer]);

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
    } catch (err: any) {
      console.error("Chat request failed:", err);
      setAnswer(`❌ ${err.message}`);
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-['Inter',sans-serif]">
      <div className="p-4 bg-mint-light border-2 border-mint-dark rounded-b-lg shadow space-y-4">
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
        <button
          disabled={loading}
          onClick={runChat}
          className="w-full rounded-md bg-brand-light py-2 text-text font-semibold hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Generating…" : "Submit"}
        </button>
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