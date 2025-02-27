import { Tab } from "/tab.js";
export interface MockStorage {
    tabs: Tab[];
}
// Mock browser APIs
export const mockStorage: MockStorage = {
    tabs: [] 
};

export interface InternalMessage {
  what: string;
  url?: string;
  tabs?: Tab[];
}

export interface Message {
  message: InternalMessage
}

export const mockBrowser = {
  storage: {
    local: {
      get: async (): Promise<MockStorage> => mockStorage,
      set: async (data: { tabs: any[] }): Promise<boolean> => {
        mockStorage.tabs = data.tabs;
        return true;
      }
    }
  },
  runtime: {
    sendMessage: (
        mess: Message,
        callback?: (response?: any) => void
    ): void => {
      // Clear any previous errors
      delete (chrome.runtime as any).lastError;

      let response: any;
      const message = mess.message;
      switch (message.what) {
        case 'get':
          response = mockStorage.tabs;
          break;
        case 'set':
          if (message.tabs != null) {
            mockStorage.tabs = message.tabs;
            response = true;
          } else {
            (chrome.runtime as any).lastError = { message: 'Tabs data is missing' };
          }
          break;
        default:
          (chrome.runtime as any).lastError = { message: 'Unknown message type' };
      }

      if (callback) {
        callback(response);
      } else return response;
    },
  },
};

declare global {
  var chrome: typeof mockBrowser;
  var browser: typeof mockBrowser;
}

// Setup global objects that extension code expects
globalThis.chrome = mockBrowser as any;
globalThis.browser = mockBrowser as any;
