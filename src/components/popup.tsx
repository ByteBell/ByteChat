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
            {/* New AISphere Header */}
      <header className="flex items-center justify-between bg-[#134E4A] p-3">
        <div className="flex items-center space-x-2">
          <img   src={chrome.runtime.getURL("icons/logo_128.png")}  alt="FixGrammer" className="w-8 h-8" />
          <span className="text-white font-bold text-lg">FixGrammer</span>
        </div>
        <nav className="flex items-center space-x-4 text-white text-sm font-semibold">
  <button onClick={() => setTab("chat")} className={tab==="chat"?"opacity-100":"opacity-60"}>Chat</button>
  <button onClick={() => setTab("settings")} className={tab==="settings"?"opacity-100":"opacity-60"}>Settings</button>
  <button onClick={() => setTab("feedback")} className={tab==="feedback"?"opacity-100":"opacity-60"}>Feedback</button>
</nav>
      </header>
      {/* Panel Content */}
      <div>
        {tab === "chat" && <ChatPanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "feedback" && <FeedbackPanel />}
      </div>
    </div>
  );
};

export default Popup;