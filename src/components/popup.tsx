import React, { useEffect, useState } from "react";
import "../tailwind.css";
import { loadStoredSettings, loadStoredUser, execInPage } from "../utils";
import ChatPanel from "./ChatPanel";
import SettingsPanel from "./SettingsPanel";
import FeedbackPanel from "./FeedbackPanel";

const Popup: React.FC = () => {
  // Ensure minimum dimensions
  useEffect(() => {
    document.body.style.minWidth = "420px";
    document.body.style.minHeight = "500px";

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

  return (
    <div className="w-[420px] text-slate-800 font-sans select-none">
      {/* Tab Buttons */}
      <div className="flex space-x-1 border-b">
        <button
          className={`px-3 py-1 rounded-t-md text-sm font-semibold ${
            tab === "chat" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
          }`}
          onClick={() => setTab("chat")}
        >
          Chat
        </button>
        <button
          className={`px-3 py-1 rounded-t-md text-sm font-semibold ${
            tab === "settings" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
          }`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
        <button
          className={`px-3 py-1 rounded-t-md text-sm font-semibold ${
            tab === "feedback" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
          }`}
          onClick={() => setTab("feedback")}
        >
          Feedback
        </button>
      </div>

      {/* Panel Content */}
      <div className="p-4">
        {tab === "chat" && <ChatPanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "feedback" && <FeedbackPanel />}
      </div>
    </div>
  );
};

export default Popup;