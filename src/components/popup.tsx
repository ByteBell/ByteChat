import React, { useEffect, useState } from "react";
import "../tailwind.css";
import { loadStoredSettings, loadStoredUser, execInPage } from "../utils";
import ApiKeySetup from "./ApiKeySetup";
import MainInterface from "./MainInterface";

const Popup: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Set fixed popup dimensions for full height
  useEffect(() => {
    document.body.style.width = "420px";
    document.body.style.height = "100vh";
    document.body.style.minHeight = "700px";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    // Check for stored API key
    chrome.storage.local.get(['openRouterApiKey'], (result) => {
      if (result.openRouterApiKey) {
        setApiKey(result.openRouterApiKey);
      }
      setIsLoading(false);
    });

    // Preload settings/user if needed by panels
    loadStoredSettings();
    loadStoredUser();

    // Optional: capture selected text for future use
    (async () => {
      await execInPage(() => {
        const sel = window.getSelection()?.toString().trim();
        if (sel) return sel;
        const el = document.activeElement as any;
        if (el && "value" in el) return el.value;
        if (el?.isContentEditable) return el.innerText;
        return "";
      });
    })();
  }, []);

  const handleApiKeySet = (newApiKey: string) => {
    setApiKey(newApiKey);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      {!apiKey ? (
        <ApiKeySetup onApiKeySet={handleApiKeySet} />
      ) : (
        <MainInterface apiKey={apiKey} />
      )}
    </div>
  );
};

export default Popup;