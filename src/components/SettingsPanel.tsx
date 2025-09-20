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
import { ModelSelector } from "./ModelSelector";

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
        let modelToSet = s.model;
        if (s.provider !== "openrouter" && s.provider !== "together") {
          modelToSet = PROVIDER_MODELS[s.provider as Provider].includes(s.model)
            ? s.model
            : PROVIDER_MODELS[s.provider as Provider][0];
        }
        setSettingsState({
          provider: s.provider as Provider,
          model: modelToSet,
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

        const resp = await fetch("http://localhost:8000/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: token }),
        });
        const userData: User = await resp.json();

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

  const getProviderDisplayName = (provider: Provider): string => {
    switch (provider) {
      case "openai": return "OpenAI";
      case "anthropic": return "Anthropic";
      case "together": return "Together AI";
      case "openrouter": return "OpenRouter";
      default: return provider;
    }
  };

  const getProviderIcon = (provider: Provider): string => {
    switch (provider) {
      case "openai": return "🤖";
      case "anthropic": return "🧠";
      case "together": return "🚀";
      case "openrouter": return "🔀";
      default: return "⚡";
    }
  };

  const shouldUseDynamicModelSelector = (provider: Provider): boolean => {
    return provider === "openrouter" || provider === "together";
  };

  const providers = Object.keys(PROVIDER_MODELS) as Provider[];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 space-y-4 flex-1 custom-scrollbar overflow-y-auto">
        {/* User Section */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                {user ? user.name.charAt(0).toUpperCase() : "?"}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {user ? user.name : "Guest User"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {user ? "Premium Account" : "Free Account"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user && (
                <div className="badge badge-default">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1" />
                  Active
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAuthClick}
            className={`
              w-full btn btn-md transition-all duration-200
              ${user 
                ? "btn-outline hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" 
                : "btn-primary gradient-primary text-white shadow-lg hover:shadow-xl transform hover:scale-105"
              }
            `}
          >
            <div className="flex items-center justify-center space-x-2">
              {!user && (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span>{user ? "Logout" : "Sign in with Google"}</span>
            </div>
          </button>
        </div>

        {/* Premium Features (for logged-in users) */}
        {user && (
          <div className="card p-4 space-y-4 bg-gradient-to-r from-gray-50 to-emerald-50 border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💎</span>
              <div>
                <h4 className="font-semibold text-emerald-900">Premium Plan</h4>
                <p className="text-sm text-emerald-700">1M words per month included</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2 text-emerald-800">
                <span>✓</span>
                <span>Unlimited generations</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-800">
                <span>✓</span>
                <span>Priority support</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-800">
                <span>✓</span>
                <span>Advanced models</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-800">
                <span>✓</span>
                <span>No API key needed</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-emerald-600 mb-2">
                Extra usage: $1.20 per 1M words
              </p>
              <button
                className="w-full btn btn-secondary btn-sm bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => alert("Purchase coming soon!")}
              >
                <span>💳</span>
                <span>Buy Credits</span>
              </button>
            </div>
          </div>
        )}

        {/* API Configuration (for non-logged-in users) */}
        {!user && (
          <div className="space-y-4">
            {/* Provider Selection */}
            <div className="card p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
                  <span>🔧</span>
                  <span>AI Provider</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {providers.map((provider) => (
                    <button
                      key={provider}
                      onClick={() => {
                        setSettingsState((prev) => ({
                          provider,
                          model: shouldUseDynamicModelSelector(provider) ? "" : PROVIDER_MODELS[provider][0],
                          apiKey: prev.apiKey,
                        }));
                      }}
                      className={`
                        flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200 text-left
                        ${settings.provider === provider
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card hover:bg-accent hover:text-accent-foreground border-border hover:border-primary/50"
                        }
                      `}
                    >
                      <span className="text-lg">{getProviderIcon(provider)}</span>
                      <div>
                        <div className="font-medium text-sm">{getProviderDisplayName(provider)}</div>
                        <div className="text-xs opacity-70">
                          {provider === "openai" && "GPT Models"}
                          {provider === "anthropic" && "Claude Models"}
                          {provider === "together" && "Open Source"}
                          {provider === "openrouter" && "All Models"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
                  <span>🎯</span>
                  <span>AI Model</span>
                </label>
                
                {shouldUseDynamicModelSelector(settings.provider) ? (
                  <div className="p-3 border border-border rounded-lg bg-muted/30">
                    <ModelSelector
                      selectedModel={settings.model}
                      onModelChange={(model) =>
                        setSettingsState((s) => ({ ...s, model: model }))
                      }
                      apiKey={settings.apiKey}
                      provider={settings.provider}
                    />
                  </div>
                ) : (
                  <select
                    value={settings.model}
                    onChange={(e) =>
                      setSettingsState((s) => ({ ...s, model: e.target.value }))
                    }
                    className="select w-full"
                  >
                    {PROVIDER_MODELS[settings.provider].map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center space-x-2">
                  <span>🔑</span>
                  <span>API Key</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={settings.apiKey}
                    onChange={(e) =>
                      setSettingsState((s) => ({ ...s, apiKey: e.target.value }))
                    }
                    className="input pr-12"
                    placeholder="Enter your API key..."
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from {getProviderDisplayName(settings.provider)}'s website
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full btn btn-primary btn-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>💾</span>
                <span>Save Settings</span>
              </div>
            </button>

            {/* Success Message */}
            {saveOK && (
              <div className="card p-3 bg-emerald-50 border-emerald-200 animate-scale-in">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <span>✅</span>
                  <span className="font-medium">Settings saved successfully!</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="card p-4 space-y-3 bg-muted/30">
          <h4 className="font-semibold text-foreground flex items-center space-x-2">
            <span>💡</span>
            <span>Need Help?</span>
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Get API keys from your chosen provider's website</p>
            <p>• Premium users don't need API keys</p>
            <p>• Contact support for assistance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;