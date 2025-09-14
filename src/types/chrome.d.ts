// Chrome Extension API types
declare global {
  namespace chrome {
    namespace tabCapture {
      interface CaptureOptions {
        audio?: boolean;
        video?: boolean;
        audioConstraints?: MediaTrackConstraints;
        videoConstraints?: MediaTrackConstraints;
      }
      
      function capture(
        options: CaptureOptions,
        callback: (stream: MediaStream | null) => void
      ): void;
    }
    
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
      
      function query(queryInfo: QueryInfo): Promise<Tab[]>;
    }
  }
}

export {};