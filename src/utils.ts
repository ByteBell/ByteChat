import { Settings, User } from "./types";
import { SYSTEM_PROMPTS } from "./constants";

const browserAPI = chrome;

export function loadStoredSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    browserAPI.storage?.local.get(
      ["provider", "model", "apiKey"],
      (raw: any) => resolve(raw as Settings)
    );
  });
}

export function loadStoredUser(): Promise<User | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["user"], (res) => resolve(res.user || null));
  });
}

export function saveSettings(next: Settings): Promise<void> {
  return new Promise((resolve) => {
    browserAPI.storage.local.set(next, () => resolve());
  });
}

export function removeUser(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["user"], () => resolve());
  });
}

export function setUser(user: User): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ user }, () => resolve());
  });
}

// utils.ts
export async function execInPage(fn: () => any): Promise<any> {
  return new Promise((resolve) => {
    browserAPI.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs?.[0];
      const tabId = tab?.id;

      /* ── guard #1: tab or scripting API unavailable ───────────────── */
      if (!tabId || !browserAPI.scripting?.executeScript) {
        console.warn("[execInPage] cannot inject script (no tab or scripting API)");
        return resolve(undefined);
      }

      /* ── guard #2: privileged / non-HTTP(S) pages ─────────────────── */
      // chrome-extension://, chrome://, edge://, about:blank, file://, etc.
      if (!/^https?:\/\//i.test(tab.url || "")) {
        console.info(`[execInPage] skip injection on privileged URL: ${tab.url}`);
        return resolve(undefined);
      }

      /* ── safe to inject ───────────────────────────────────────────── */
      try {
        const [injectionResult] = await browserAPI.scripting.executeScript({
          target: { tabId },
          func: fn as unknown as () => void,
        });
        resolve(injectionResult?.result);
      } catch (err) {
        console.error("[execInPage] injection failed:", err);
        resolve(undefined);
      }
    });
  });
}

export async function callLLM(
  { provider, model, apiKey }: Settings,
  systemPrompt: string,
  userPrompt: string
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
      const r = await fetch(
        "https://api.together.xyz/v1/chat/completions",
        {
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
        }
      );
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      return j.choices[0].message.content.trim();
    }
  }
  return "Provider not supported";
}