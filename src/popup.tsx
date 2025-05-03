// src/popup.tsx
import React, { useEffect, useState } from "react";
import "./tailwind.css";

/* ---------------------------------------------------------------- *
 *  Types & helpers
 * ---------------------------------------------------------------- */
type Provider = "openai" | "anthropic" | "together";
interface Settings {
  provider: Provider;
  model: string;
  apiKey: string;
}

const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ["gpt-4o", "gpt-3.5-turbo"],
  anthropic: ["claude-3-sonnet", "claude-3-haiku"],
  together: [
    "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
  ],
};

const SYSTEM_PROMPTS: Record<string, string> = {
  "Grammar Fix":
    "Convert the following into standard English and fix any grammatical errors:",
  "Translate > English":
    "Translate the following text into English, Donnot provide any extra information just the translated text: ",
  Summarize: "Provide a concise summary of the following text:",
};

const browserAPI = typeof browser !== "undefined" ? browser : chrome;

/* ---------------------------------------------------------------- *
 *  UI components
 * ---------------------------------------------------------------- */
const TabButton: React.FC<{
  id: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ id, active, onClick, children }) => (
  <button
    id={id}
    className={`px-3 py-1 rounded-t-md text-sm font-semibold
                ${active ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"}
               `}
    onClick={onClick}
  >
    {children}
  </button>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (
  props,
) => (
  <select
    {...props}
    className="w-full rounded-md border px-2 py-1 text-sm outline-none
               focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-200
              "
  />
);

/* ---------------------------------------------------------------- *
 *  Main component
 * ---------------------------------------------------------------- */
export const Popup: React.FC = () => {
  /* Ensure min dimensions for Firefox */
  useEffect(() => {
    document.body.style.minWidth = "420px";
    document.body.style.minHeight = "500px";
  }, []);

  /* Tabs */
  const [tab, setTab] = useState<"chat" | "settings">("chat");

  /* Settings state */
  const [settings, setSettings] = useState<Settings>({
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
  });
  const [showKey, setShowKey] = useState(false);
  const [saveOK, setSaveOK] = useState(false);
  /* Chat */
  const [systemID, setSystemID] = useState<string>("Grammar Fix");
  const systemPrompt = SYSTEM_PROMPTS[systemID];
  /* Chat state */
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------ *
   *  Load & persist settings
   * ------------------------------------------------------------------ */
  useEffect(() => {
    /* Load saved settings */
    browserAPI.storage?.local.get(
      ["provider", "model", "apiKey"],
      (raw: any) => {
        if (raw?.apiKey) setSettings(raw as Settings);
        console.log("[popup] settings loaded", raw);
      },
    );

    /* Grab text from the page */
    (async () => {
      const text = await execInPage(() => {
        /* This function runs **inside the page** */
        const sel = window.getSelection()?.toString().trim();
        if (sel) return sel;
        const el = document.activeElement as any;
        if (el && "value" in el) return el.value; // <input>/<textarea>
        if (el?.isContentEditable) return el.innerText; // contentEditable
        return "";
      });
      console.log("[popup] execInPage →", text);
      if (text) setPrompt(text);
    })();
  }, []);

  // Utility function to execute code in the current page
  async function execInPage(fn: () => any): Promise<any> {
    return new Promise((resolve) => {
      browserAPI.tabs.query(
        { active: true, currentWindow: true },
        async (tabs) => {
          const tabId = tabs?.[0]?.id;
          if (!tabId || !browserAPI.scripting?.executeScript) {
            console.warn("[popup] cannot inject script");
            return resolve(undefined);
          }

          try {
            const [injectionResult] = await browserAPI.scripting.executeScript({
              target: { tabId },
              func: fn as unknown as () => void,
            });
            resolve(injectionResult?.result);
          } catch (err) {
            console.error(err);
            resolve(undefined);
          }
        },
      );
    });
  }

  const persist = (next: Settings) => {
    browserAPI?.storage?.local.set(next, () => {
      setSaveOK(true);
      setTimeout(() => setSaveOK(false), 2000);
    });
  };

  /* ------------------------------------------------------------------ *
   *  Chat
   * ------------------------------------------------------------------ */
  async function runChat() {
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
  }

  /* ------------------------------------------------------------------ *
   *  API calls
   * ------------------------------------------------------------------ */
  async function callLLM(
    { provider, model, apiKey }: Settings,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    switch (provider) {
      case "openai": {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 1000,
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        return j.choices[0].message.content.trim();
      }

      case "anthropic": {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
            max_tokens: 1000,
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        return j.content[0].text.trim();
      }

      case "together": {
        const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const r = await fetch("https://api.together.xyz/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: combinedPrompt }],
            max_tokens: 1000,
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        return j.choices[0].message.content.trim();
      }
    }
    return "Provider not supported";
  }

  /* ------------------------------------------------------------------ *
   *  Render
   * ------------------------------------------------------------------ */
  return (
    <div className="w-[420px] text-slate-800 font-sans select-none">
      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex space-x-1 border-b">
        <TabButton
          id="chatTab"
          active={tab === "chat"}
          onClick={() => setTab("chat")}
        >
          Chat
        </TabButton>
        <TabButton
          id="settingsTab"
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          Settings
        </TabButton>
      </div>

      {/* ── Content panels ────────────────────────────────────────── */}
      {tab === "chat" ? (
        <div className="p-4 space-y-6 font-['Inter',sans-serif]">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-lg">
            <h2 className="text-white font-bold mb-2 text-xl">AI Assistant</h2>
          </div>

          <div className="p-6 bg-white rounded-b-lg shadow-lg space-y-6">
            <label className="block text-sm mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700">System Prompt</span>
                <Select
                  value={systemID}
                  onChange={(e) => setSystemID(e.target.value)}
                  className="w-48"
                >
                  {Object.keys(SYSTEM_PROMPTS).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </Select>
              </div>
              <textarea
                value={SYSTEM_PROMPTS[systemID]}
                onChange={(e) => {
                  SYSTEM_PROMPTS[systemID] = e.target.value;
                  setSystemID(systemID);
                }}
                rows={3}
                className="w-full rounded-md border p-2 text-sm outline-none resize-y
                         focus:ring-2 focus:ring-purple-500 bg-gray-50"
              />
            </label>

            <textarea
              placeholder="Ask me anything…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full rounded-md border p-2 text-sm outline-none resize-y
                       focus:ring-2 focus:ring-purple-500 bg-white"
            />

            <button
              disabled={loading}
              onClick={runChat}
              className="w-full rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 
                     py-3 text-white font-semibold hover:from-purple-700 hover:to-indigo-700
                     disabled:opacity-50 cursor-pointer firefox:focus:outline-none
                     transform transition hover:scale-[1.02] my-4"
            >
              {loading ? "Generating…" : "Submit"}
            </button>

            <textarea
              readOnly
              value={answer}
              rows={6}
              className="w-full resize-y rounded-md border-2 border-gray-200 p-3 
                     text-sm bg-gray-50 focus:border-purple-500"
            />
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-4 text-sm">
          <button
            onClick={() => {
              /* TODO: Implement Google Login */
            }}
            className="w-full flex items-center justify-center space-x-2 rounded-md bg-white border-2 border-gray-200 py-2 hover:bg-gray-50"
          >
            <img
              src="https://www.google.com/favicon.ico"
              className="w-5 h-5"
              alt="Google"
            />
            <span>Continue with Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block font-medium">Provider</span>
            <Select
              value={settings.provider}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  provider: e.target.value as Provider,
                  model: PROVIDER_MODELS[e.target.value as Provider][0],
                }))
              }
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="together">Together AI</option>
            </Select>
          </label>

          <label className="block">
            <span className="mb-1 block font-medium">Model</span>
            <Select
              value={settings.model}
              onChange={(e) =>
                setSettings((s) => ({ ...s, model: e.target.value }))
              }
            >
              {PROVIDER_MODELS[settings.provider].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1 block font-medium">API key</span>
            <div className="flex">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, apiKey: e.target.value }))
                }
                className="flex-1 rounded-l-md border px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="rounded-r-md border-l bg-slate-200 px-3"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button
            onClick={() => persist(settings)}
            className="w-full rounded-md bg-emerald-600 py-2 text-white hover:bg-emerald-700"
          >
            Save
          </button>

          {saveOK && <p className="text-center text-emerald-600">✔ Saved!</p>}
        </div>
      )}
    </div>
  );
};

export default Popup;
