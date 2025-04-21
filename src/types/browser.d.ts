interface Chrome {
    storage?: {
      local: {
        get: (keys: string[], callback: (result: any) => void) => void;
        set: (items: object, callback?: () => void) => void;
      }
    }
  }
  
  interface Browser {
    storage?: {
      local: {
        get: (keys: string[], callback: (result: any) => void) => void;
        set: (items: object, callback?: () => void) => void;
      }
    }
  }
  
  declare global {
    interface Window {
      chrome?: Chrome;
      browser?: Browser;
    }
  }
  
  export {};