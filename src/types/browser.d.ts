interface Chrome {
  storage?: {
    local: {
      get: (keys: string[], callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string[], callback?: () => void) => void;
    };
  };
  tabs?: {
    query: (queryInfo: chrome.tabs.QueryInfo, callback: (result: chrome.tabs.Tab[]) => void) => void;
  };
  scripting?: {
    executeScript: (
      injection: chrome.scripting.ScriptInjection<any[]>,
      callback?: (results: chrome.scripting.InjectionResult<any>[]) => void
    ) => Promise<chrome.scripting.InjectionResult<any>[]>;
  };
}

interface Browser {
  storage?: {
    local: {
      get: (keys: string[], callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string[], callback?: () => void) => void;
    };
  };
  tabs?: {
    query: (queryInfo: browser.tabs.QueryQueryInfo, callback: (result: browser.tabs.Tab[]) => void) => void;
  };
  scripting?: {
    executeScript: (
      injection: browser.scripting.ScriptInjection<any[]>,
      callback?: (results: browser.scripting.InjectionResult<any>[]) => void
    ) => Promise<browser.scripting.InjectionResult<any>[]>;
  };
}

declare global {
  var chrome: Chrome;
  var browser: Browser;
}

export {};