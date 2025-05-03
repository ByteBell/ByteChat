// src/popup.tsx
import React, { useEffect, useState } from 'react';
import Together from 'together-ai';
import './tailwind.css';

/* ---------------------------------------------------------------- *
 *  Types & helpers
 * ---------------------------------------------------------------- */
type Provider = 'openai' | 'anthropic' | 'together';
interface Settings {
  provider: Provider;
  model: string;
  apiKey: string;
}

// ─── Google OAuth config ──────────────────────────────────────────
// ⚠️  Replace these with real values in production
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const BACKEND_URL      = 'https://your-backend.example.com/user';

const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai:    ['gpt-4o', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-sonnet', 'claude-3-haiku'],
  together:  [
    'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    'meta-llama/Llama-4-Scout-17B-16E-Instruct',
    'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
  ],
};

// Handy system‑prompt presets
const SYSTEM_PROMPTS: Record<string, string> = {
  'Grammar\u00A0Fix':        'Convert the following into standard English and fix any grammatical errors:',
  'Translate\u00A0>\u00A0English': 'Translate the following text into English. Don’t add anything else:',
  'Summarize':          'Provide a concise summary of the following text:',
};

const browserAPI = (globalThis as any).browser ?? (globalThis as any).chrome;

/* ---------------------------------------------------------------- *
 *  Re‑usable UI bits
 * ---------------------------------------------------------------- */
const TabButton: React.FC<{ id: string; active: boolean; onClick: () => void; children: React.ReactNode; }> = ({ id, active, onClick, children }) => (
  <button
    id={id}
    className={`px-3 py-1 rounded-t-md text-sm font-semibold transition-colors
                ${active ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
    onClick={onClick}
  >
    {children}
  </button>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-200"/>
);

/* ---------------------------------------------------------------- *
 *  Main popup component
 * ---------------------------------------------------------------- */
const Popup: React.FC = () => {
  /* Tabs */
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');

  /* Settings state */
  const [settings, setSettings] = useState<Settings>({ provider: 'openai', model: 'gpt-4o', apiKey: '' });
  const [showKey, setShowKey]   = useState(false);
  const [saveOK, setSaveOK]     = useState(false);

  /* Google user */
  const [userName,  setUserName]  = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const isLoggedIn = !!userEmail;

  /* Chat */
  const [systemID, setSystemID] = useState<string>('Grammar\u00A0Fix');
  const systemPrompt = SYSTEM_PROMPTS[systemID];

  /* Chat state */
  const [prompt, setPrompt]   = useState('');
  const [answer, setAnswer]   = useState('');
  const [loading, setLoading] = useState(false);


  /* ------------------------------------------------------------------ *
   *  Google OAuth sign‑in
   * ------------------------------------------------------------------ */
  const googleLogin = async () => {
    try {
      const redirectUri = browserAPI.identity?.getRedirectURL?.() ?? '';
      const scopes      = ['profile', 'email'];
      const authUrl     = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
      const identityApi = browserAPI.identity ?? (globalThis as any).chrome?.identity;
      if (!identityApi?.launchWebAuthFlow) {
        return console.error('[popup] Google Sign-in not supported in this browser');
      }
      
      browserAPI.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectedTo: string) => {
        if (browserAPI.runtime?.lastError || !redirectedTo) {
          console.error('[popup] Google auth failed', browserAPI.runtime?.lastError);
          return;
        }
        const params       = new URLSearchParams(redirectedTo.split('#')[1]);
        const accessToken  = params.get('access_token');
        if (!accessToken) return;

        const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!r.ok) throw new Error(await r.text());
        const profile = await r.json();
        setUserName(profile.name);
        setUserEmail(profile.email);

        // Send to backend
        await fetch(BACKEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profile.name, email: profile.email }) });
      });
    } catch (err) {
      console.error('[popup] googleLogin error', err);
    }
  };


  /* ------------------------------------------------------------------ *
   *  Load & persist settings
   * ------------------------------------------------------------------ */
  useEffect(() => {
    browserAPI.storage?.local.get(['provider', 'model', 'apiKey'], (raw: any) => {
      if (raw?.apiKey) setSettings(raw as Settings);
    });

    // Grab highlighted text / focused input text
    (async () => {
      const text = await execInPage(() => {
        const sel = window.getSelection()?.toString().trim();
        if (sel) return sel;
        const el = document.activeElement as any;
        if (el && 'value' in el) return el.value;
        if (el?.isContentEditable) return el.innerText;
        return '';
      });
      if (text) setPrompt(text);
    })();
  }, []);

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
    if (!prompt.trim()) return setAnswer('⚠️ Enter a prompt first.');
    if (!settings.apiKey) return setAnswer('⚠️ Add your API key in Settings.');

    setLoading(true);
    setAnswer('…thinking…');

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
   *  Render
   * ------------------------------------------------------------------ */
  return (
    <div className="w-[420px] text-slate-800 font-sans select-none bg-white">
      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        <TabButton id="chatTab"     active={tab==='chat'}     onClick={() => setTab('chat')}>Chat</TabButton>
        <TabButton id="settingsTab" active={tab==='settings'} onClick={() => setTab('settings')}>Settings</TabButton>
      </div>

      {/* Chat panel */}
      {tab === 'chat' && (
        <div className="p-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">System prompt</span>
            <Select value={systemID} onChange={(e) => setSystemID(e.target.value)}>
              {Object.keys(SYSTEM_PROMPTS).map((name) => <option key={name}>{name}</option>)}
            </Select>
          </label>

          <textarea
            placeholder="Ask me anything…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-md border p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>

          <button
            disabled={loading}
            onClick={runChat}
            className="w-full rounded-md bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Generating…' : 'Submit'}
          </button>

          <textarea readOnly value={answer} rows={6} className="w-full resize-none rounded-md border p-2 text-sm bg-slate-50"/>
        </div>
      )}

      {/* Settings panel */}
      {tab === 'settings' && (
        <div className="p-4 space-y-4 text-sm">
          {/* Google Sign‑in */}
          {!isLoggedIn ? (
            <button
              onClick={googleLogin}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2 shadow-sm hover:bg-slate-50 transition-colors">
              {/* Google "G" icon (small) */}
              <svg className="h-4 w-4" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M533.5 278.4c0-17.6-1.6-35-4.6-51.8H272v97.8h146.9c-6.4 34.7-25.6 64.2-54.6 84.2l88.2 68.4c51.5-47.4 80.6-117.3 80.6-198.6z"/>
                <path fill="#34A853" d="M272 544.3c73.6 0 135.3-24.3 180.4-65.7l-88.2-68.4c-24.5 16.4-55.9 26.1-92.2 26.1-70.9 0-131-47.9-152.6-112.1l-90 69.5c45.3 89 136.3 150.6 242.6 150.6z"/>
                <path fill="#FBBC04" d="M119.4 324.2c-10.6-31.4-10.6-65.4 0-96.8L29.4 157.9C-9.8 237 1.4 336.9 45.4 410.2l74-86z"/>
                <path fill="#EA4335" d="M272 107.7c39.9 0 75.8 13.7 104 36.1l78-78C407.3 24 345.6 0 272 0 165.7 0 74.7 61.6 29.4 150.7l90 69.5C141 155.6 201.1 107.7 272 107.7z"/>
              </svg>
              <span className="font-medium text-slate-700">Sign in with Google</span>
            </button>
          ) : (
            <p className="text-center">Logged in as <strong>{userName}</strong><br/>{userEmail}</p>
          )}

          {/* Provider */}
          <label className="block">
            <span className="mb-1 block font-medium">Provider</span>
            <Select value={settings.provider} onChange={(e) => setSettings(s => ({ ...s, provider: e.target.value as Provider, model: PROVIDER_MODELS[e.target.value as Provider][0] }))}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="together">Together AI</option>
            </Select>
          </label>

          {/* Model */}
          <label className="block">
            <span className="mb-1 block font-medium">Model</span>
            <Select value={settings.model} onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}>
              {PROVIDER_MODELS[settings.provider].map(m => (<option key={m}>{m}</option>))}
            </Select>
          </label>

          {/* API Key */}
          <label className="block">
            <span className="mb-1 block font-medium">API key</span>
            <div className="flex">
              <input type={showKey ? 'text' : 'password'} value={settings.apiKey} onChange={(e) => setSettings(s => ({ ...s, apiKey: e.target.value }))} className="flex-1 rounded-l-md border px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"/>
              <button onClick={() => setShowKey(v => !v)} className="rounded-r-md border-l bg-slate-200 px-3 hover:bg-slate-300">{showKey ? 'Hide' : 'Show'}</button>
            </div>
          </label>

          <button onClick={() => persist(settings)} className="w-full rounded-md bg-emerald-600 py-2 text-white hover:bg-emerald-700">Save</button>
          {saveOK && <p className="text-center text-emerald-600">✔ Saved!</p>}
        </div>
      )}
    </div>
  );
};

export default Popup;


/* -------------------------------------------------------------------- *
 *  Low‑level fetcher
 * -------------------------------------------------------------------- */
async function callLLM({ provider, model, apiKey }: Settings, systemPrompt: string, userPrompt: string) {
  switch (provider) {
    case 'openai': {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1000,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      return j.choices[0].message.content.trim();
    }

    case 'anthropic': {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1000,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      return j.content[0].text.trim();
    }

    case 'together': {
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const messages = [{ role: 'user', content: combinedPrompt }];
      const r = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: 1000 }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      return j.choices[0].message.content.trim();
    }
  }
}

/* -------------------------------------------------------------------- *
 *  Execute arbitrary function in the active page context (helper)
 * -------------------------------------------------------------------- */
async function execInPage<T>(fn: () => T): Promise<T | ''> {
  return new Promise((resolve) => {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      if (!tabs?.length) {
        console.warn('[popup] no active tab');
        return resolve('' as T);
      }

      const tabId = tabs[0].id;

      // ────── ① Manifest V3 ──────
      if (browserAPI.scripting?.executeScript) {
        browserAPI.scripting
          .executeScript({ target: { tabId }, func: fn })
          .then((r: any) => resolve(r?.[0]?.result ?? ''))
          .catch(() => resolve(''));
      }

      // ────── ② Manifest V2 ──────
      else if (browserAPI.tabs.executeScript) {
        browserAPI.tabs.executeScript(tabId, { code: `(${fn})();` }, (res: any[]) => {
          if (browserAPI.runtime?.lastError) return resolve('' as T);
          resolve(res?.[0] ?? '');
        });
      }

      // ────── ③ No API ──────
      else resolve('');
    });
  });
}
