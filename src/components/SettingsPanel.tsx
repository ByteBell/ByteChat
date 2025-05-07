// src/components/SettingsPanel.tsx
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
import { Select } from "./Select";

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
    // load user
    loadStoredUser().then((u) => {
      if (u) setUserState(u);
    });

    // load settings
    loadStoredSettings().then((s) => {
      if (
        s &&
        typeof s.provider === "string" &&
        PROVIDER_MODELS[s.provider as Provider]
      ) {
        const models = PROVIDER_MODELS[s.provider as Provider];
        const validModel = models.includes(s.model) ? s.model : models[0];
        setSettingsState({
          provider: s.provider as Provider,
          model: validModel,
          apiKey: s.apiKey || "",
        });
      }
    });
  }, []);

  const handleAuthClick = async () => {
    if (user) {
      // logout
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

  return (
    <div className="p-4 space-y-4 text-sm">
      {/* Google login / logout */}
      <button
        onClick={handleAuthClick}
        className="w-full flex items-center justify-center space-x-2 rounded-md bg-white border-2 border-gray-200 py-2 hover:bg-gray-50"
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google"
          className="w-5 h-5"
        />
        <span>{user ? "Logout" : "Continue with Google"}</span>
      </button>

      {user ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-center mb-2">
              You are now on Free plan and can translate/fix grammar up to 1,000,000 words
            </p>
            <p className="text-center text-sm text-blue-600">
              You can always buy more credits - $1.2 for 1,000,000 words
            </p>
          </div>
          <button
            className="w-full rounded-md bg-indigo-600 py-2 text-white hover:bg-indigo-700"
            onClick={() => alert("Purchase functionality coming soon!")}
          >
            Buy Credits
          </button>
        </div>
      ) : (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm bg-white px-2">
              Or
            </div>
          </div>

          {/* Provider selector */}
          <label className="block">
            <span className="block font-medium mb-1">Provider</span>
            <Select
              value={settings.provider}
              onChange={(e) => {
                const prov = e.target.value as Provider;
                setSettingsState((prev) => ({
                  provider: prov,
                  model: PROVIDER_MODELS[prov][0],
                  apiKey: prev.apiKey,
                }));
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="together">Together AI</option>
            </Select>
          </label>

          {/* Model selector */}
          <label className="block">
            <span className="block font-medium mb-1">Model</span>
            <Select
              value={settings.model}
              onChange={(e) =>
                setSettingsState((s) => ({ ...s, model: e.target.value }))
              }
            >
              {PROVIDER_MODELS[settings.provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </label>

          {/* API key input */}
          <label className="block">
            <span className="block font-medium mb-1">API key</span>
            <div className="flex">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) =>
                  setSettingsState((s) => ({ ...s, apiKey: e.target.value }))
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

          {/* Save button */}
          <button
            onClick={async () => {
              await saveSettings(settings);
              setSaveOK(true);
              setTimeout(() => setSaveOK(false), 2000);
            }}
            className="w-full rounded-md bg-emerald-600 py-2 text-white hover:bg-emerald-700"
          >
            Save
          </button>
          {saveOK && (
            <p className="text-center text-emerald-600">✔ Saved!</p>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsPanel;