import React, { useEffect, useState } from "react";
import { execInPage, callLLM, loadStoredSettings } from "../utils";
import { SYSTEM_PROMPTS, LANGUAGES } from "../constants";
import { Settings } from "../types";
import { Select } from "./Select";

const ChatPanel: React.FC = () => {
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Hindi");
  const [settings, setSettings] = useState<Settings>({
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
  });
  const [systemID, setSystemID] = useState<string>("Grammar Fix");
  const systemPrompt = SYSTEM_PROMPTS[systemID];
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!prompt.trim()) return setAnswer("⚠️ Enter a prompt first.");
    if (!settings.apiKey) return setAnswer("⚠️ Add your API key in Settings.");

    setLoading(true);
    setAnswer("…thinking…");
    try {
      const text = await callLLM(settings, systemPrompt, prompt.trim());
      setAnswer(text);
    } catch (err: any) {
      setAnswer(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 font-['Inter',sans-serif]">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-lg">
        <h2 className="text-white font-bold mb-2 text-xl">AI Assistant</h2>
      </div>
      <div className="p-6 bg-white rounded-b-lg shadow-lg space-y-6">
        <label className="block text-sm mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-gray-700">Action</span>
            <Select
              value={systemID}
              onChange={(e) => setSystemID(e.target.value)}
              className="w-48"
            >
              <option value="New System Prompt">New System Prompt</option>
              {Object.keys(SYSTEM_PROMPTS).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          {systemID === "New System Prompt" && (
            <div className="flex space-x-2">
              <textarea
                value={systemPrompt}
                onChange={(e) => {
                  SYSTEM_PROMPTS[systemID] = e.target.value;
                  setSystemID(systemID);
                }}
                rows={3}
                className="flex-1 rounded-md border p-2 text-sm outline-none resize-y focus:ring-2 focus:ring-purple-500 bg-gray-50"
              />
              <button
                onClick={() => {
                  /* Save prompt logic if needed */
                }}
                className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm h-fit"
              >
                Save Prompt
              </button>
            </div>
          )}
          {systemID === "Translate" && (
            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-md">
              <Select
                value={fromLang}
                onChange={(e) => setFromLang(e.target.value)}
                className="flex-1"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </Select>
              <span className="text-gray-500">→</span>
              <Select
                value={toLang}
                onChange={(e) => setToLang(e.target.value)}
                className="flex-1"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </label>
        <textarea
          placeholder="Ask me anything…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full rounded-md border p-2 text-sm outline-none resize-y focus:ring-2 focus:ring-purple-500 bg-white"
        />
        <button
          disabled={loading}
          onClick={runChat}
          className="w-full rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 cursor-pointer firefox:focus:outline-none transform transition hover:scale-[1.02] my-4"
        >
          {loading ? "Generating…" : "Submit"}
        </button>
        <textarea
          readOnly
          value={answer}
          rows={6}
          className="w-full resize-y rounded-md border-2 border-gray-200 p-3 text-sm bg-gray-50 focus:border-purple-500"
        />
      </div>
    </div>
  );
};

export default ChatPanel;