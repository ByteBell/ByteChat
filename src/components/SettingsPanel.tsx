import React, { useEffect, useState } from "react";
import {
  loadStoredUser,
  loadStoredSettings,
  saveSettings,
  removeUser,
  setUser as persistUser,
} from "../utils";
import { PROVIDER_MODELS } from "../constants";
import { Provider, Settings, User } from "../types";

declare const chrome: any;

const SettingsPanel: React.FC = () => {
  const [user, setUserState] = useState<User | null>(null);
  const [settings, setSettingsState] = useState<Settings>({
    provider: "openai",
    model: PROVIDER_MODELS.openai[0],
    apiKey: "",
  });
  const [showKey, setShowKey] = useState(false);
  const [saveOK, setSaveOK] = useState(false);

  useEffect(() => {
    loadStoredUser().then((u) => u && setUserState(u));
    loadStoredSettings().then((s) => {
      if (s && PROVIDER_MODELS[s.provider as Provider]) {
        setSettingsState({
          provider: s.provider as Provider,
          model: PROVIDER_MODELS[s.provider as Provider].includes(s.model)
            ? s.model
            : PROVIDER_MODELS[s.provider as Provider][0],
          apiKey: s.apiKey || "",
        });
      }
    });
  }, []);

  const handleAuthClick = async () => {
    if (user) {
      await removeUser();
      setUserState(null);
    } else {
        // login: Google OAuth flow
        const manifest = chrome.runtime.getManifest();
        const clientId = manifest.oauth2?.client_id;
        const scopes = (manifest.oauth2?.scopes || []).join(" ");
        const redirectUri = chrome.identity.getRedirectURL();
        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}` +
          `&response_type=token` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent(scopes)}`;
  
        try {
          const responseUrl: string = await chrome.identity.launchWebAuthFlow({
            interactive: true,
            url: authUrl,
          });
          if (!responseUrl) return;
  
          const hash = new URL(responseUrl).hash.substring(1);
          const token = new URLSearchParams(hash).get("access_token");
          if (!token) return;
  
          // send token to backend
          const resp = await fetch("http://localhost:8000/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: token }),
          });
          const userData: User = await resp.json();
  
          // persist and update state
          await persistUser(userData);
          setUserState(userData);
        } catch (err) {
          console.error("Auth error:", err);
        }
    }
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setSaveOK(true);
    setTimeout(() => setSaveOK(false), 2000);
  };

  return (
      <div className="h-full flex flex-col justify-between bg-mint-light border-2 border-mint-dark rounded-md shadow p-4">
    <button
        onClick={handleAuthClick}
        className="w-full flex items-center justify-center space-x-2 rounded-md bg-white border-2 border-gray-200 py-2 mb-4 hover:bg-gray-50 text-sm"
      >
        <img src="icons/logo_48.png" alt="Google" className="w-5 h-5" />
        <span>{user ? "Logout" : "Upgrade"}</span>
      </button>

      {user ? (
        <>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-center mb-4">
            <p className="mb-2 text-sm">
              You are on Free plan — translate/fix up to 1M words
            </p>
            <p className="text-sm text-blue-600">$1.2 per extra 1M words</p>
          </div>
          <button
            className="w-full rounded-md bg-brand-light py-2 text-text font-semibold hover:bg-brand-dark text-sm mb-4"
            onClick={() => alert("Purchase coming soon!")}
          >
            Buy Credits
          </button>
        </>
      ) : (
        <>
          <label className="block text-sm mb-3">
            <span className="block mb-1 font-medium">Provider</span>
            <select
              value={settings.provider}
              onChange={(e) => {
                const prov = e.target.value as Provider;
                setSettingsState((prev) => ({
                  provider: prov,
                  model: PROVIDER_MODELS[prov][0],
                  apiKey: prev.apiKey,
                }));
              }}
              className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.keys(PROVIDER_MODELS).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm mb-3">
            <span className="block mb-1 font-medium">Model</span>
            <select
              value={settings.model}
              onChange={(e) =>
                setSettingsState((s) => ({ ...s, model: e.target.value }))
              }
              className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PROVIDER_MODELS[settings.provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm mb-0">
            <span className="block mb-1 font-medium">API Key</span>
            <div className="flex">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) =>
                  setSettingsState((s) => ({ ...s, apiKey: e.target.value }))
                }
                className="flex-1 rounded-l-md border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="rounded-r-md border-l bg-slate-200 px-3 text-sm"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        </>
      )}

      {!user && (
        <button
          onClick={handleSave}
          className="w-full rounded-md bg-brand-light py-2 text-text font-semibold hover:bg-brand-dark text-sm mt-4"
        >
          Save Settings
        </button>
      )}
      {saveOK && <p className="text-center text-emerald-600 text-sm mt-2">✔ Saved!</p>}
    </div>
  );
};

export default SettingsPanel;