import React, { useEffect, useState } from "react";
import "../tailwind.css";
import { loadStoredSettings, loadStoredUser, execInPage } from "../utils";
import ChatPanel from "./ChatPanel";
import SettingsPanel from "./SettingsPanel";
import FeedbackPanel from "./FeedbackPanel";

const Popup: React.FC = () => {
  // Set fixed popup dimensions
  useEffect(() => {
    document.body.style.width = "420px";
    document.body.style.height = "500px";

    // Preload settings/user if needed by panels
    loadStoredSettings();
    loadStoredUser();

    // Optional: capture selected text for ChatPanel
    (async () => {
      const text = await execInPage(() => {
        const sel = window.getSelection()?.toString().trim();
        if (sel) return sel;
        const el = document.activeElement as any;
        if (el && "value" in el) return el.value;
        if (el?.isContentEditable) return el.innerText;
        return "";
      });
      // ChatPanel reads directly from storage or context
    })();
  }, []);

  const [tab, setTab] = useState<"chat" | "settings" | "feedback">("chat");

  const tabs = [
    { 
      id: "chat" as const, 
      label: "Chat", 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    { 
      id: "settings" as const, 
      label: "Settings", 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: "feedback" as const, 
      label: "Feedback", 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-sans select-none animate-fade-in">
      {/* Modern Header with Glass Effect */}
      <header className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 gradient-primary opacity-90" />
        
        {/* Content */}
        <div className="relative z-10 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={chrome.runtime.getURL("icons/logo_128.png")}
                  alt="FixGrammer"
                  className="w-8 h-8 rounded-lg shadow-lg"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">FixGrammer</h1>
                <p className="text-blue-100 text-xs">AI Writing Assistant</p>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                <span className="text-white text-xs font-medium">Online</span>
              </div>
            </div>
          </div>

          {/* Modern Tab Navigation */}
          <nav className="flex items-center justify-center">
            <div className="flex bg-white/20 backdrop-blur-md rounded-xl p-1 space-x-1">
              {tabs.map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${tab === tabItem.id 
                      ? "bg-white text-blue-600 shadow-lg transform scale-105" 
                      : "text-white hover:bg-white/10 hover:scale-105"
                    }
                  `}
                >
                  {tabItem.icon}
                  <span>{tabItem.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Panel Content with Smooth Transitions */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full transition-all duration-300 ease-in-out">
          {tab === "chat" && (
            <div className="h-full animate-slide-up">
              <ChatPanel />
            </div>
          )}
          {tab === "settings" && (
            <div className="h-full animate-slide-up">
              <SettingsPanel />
            </div>
          )}
          {tab === "feedback" && (
            <div className="h-full animate-slide-up">
              <FeedbackPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Popup;