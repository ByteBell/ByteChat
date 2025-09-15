/// <reference lib="dom" />
export {};

declare global {
  /** Minimal, safe surface area we actually use, with Promise + callback overloads */
  namespace chrome {
    /* ---------- runtime ---------- */
    namespace runtime {
      function getURL(path: string): string;
      const id: string;
      const onMessage: {
        addListener(
          cb: (
            message: any,
            sender: { tab?: { id?: number } } | undefined,
            sendResponse: (response?: any) => void
          ) => void
        ): void;
      };
      /** Promise-based sendMessage (supported in MV3 when no callback is passed) */
      function sendMessage(message: any): Promise<any>;
    }

    /* ---------- storage ---------- */
    namespace storage {
      namespace local {
        // Promise overload
        function get(
          keys?: string[] | { [key: string]: any } | null
        ): Promise<any>;
        // Callback overload
        function get(
          keys: string[] | { [key: string]: any } | null,
          cb: (items: any) => void
        ): void;

        function set(items: object): Promise<void>;
        function set(items: object, cb: () => void): void;

        function remove(keys: string | string[]): Promise<void>;
        function remove(keys: string | string[], cb: () => void): void;
      }
    }

    /* ---------- tabs ---------- */
    namespace tabs {
      interface Tab {
        id?: number;
        url?: string;
        title?: string;
        active?: boolean;
        windowId?: number;
      }
      interface QueryInfo {
        active?: boolean;
        currentWindow?: boolean;
        url?: string;
        title?: string;
      }

      // Promise overload
      function query(q: QueryInfo): Promise<Tab[]>;
      // Callback overload
      function query(q: QueryInfo, cb: (tabs: Tab[]) => void): void;
    }

    /* ---------- scripting ---------- */
    namespace scripting {
      type World = 'ISOLATED' | 'MAIN';

      interface ScriptTarget {
        tabId: number;
        allFrames?: boolean;
        frameIds?: number[];
      }

      interface ScriptInjection<Args extends any[] = any[]> {
        target: ScriptTarget;
        func: (...args: Args) => any;
        args?: Args;
        world?: World;
      }

      interface InjectionResult<R = any> {
        frameId: number;
        result: R;
      }

      // Promise overload
      function executeScript<Args extends any[] = any[], R = any>(
        injection: ScriptInjection<Args>
      ): Promise<InjectionResult<R>[]>;

      // Callback overload
      function executeScript<Args extends any[] = any[], R = any>(
        injection: ScriptInjection<Args>,
        cb: (results: InjectionResult<R>[]) => void
      ): void;
    }
  }

  /** Optional convenience: a very light alias so `browser` can be used if you want */
  const browser: typeof chrome;
}
