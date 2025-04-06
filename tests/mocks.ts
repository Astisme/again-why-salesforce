// deno-lint-ignore-file no-explicit-any
import Tab from "/tab.js";
export interface MockStorage {
	tabs: Tab[];
}
// Mock browser APIs
export const mockStorage: MockStorage = {
	tabs: [],
};

export interface InternalMessage {
	what: string;
	url?: string;
	tabs?: Tab[];
}

export interface Message {
	message: InternalMessage;
}

let language = "fr";

export const mockBrowser = {
	storage: {
		local: {
			// deno-lint-ignore require-await
			get: async (): Promise<MockStorage> => mockStorage,
			// deno-lint-ignore require-await
			set: async (data: { tabs: any[] }): Promise<boolean> => {
				mockStorage.tabs = data.tabs;
				return true;
			},
		},
        sync: {
            get: async () => ({ language })
        },
        onChanged: {
            addListener: () => {}
        }
	},
	runtime: {
		sendMessage: async (
			mess: Message,
			callback?: (response?: any) => void,
		): Promise<any> => {
			// Clear any previous errors
			delete (chrome.runtime as any).lastError;

			let response: any;
			const message = mess.message;
			switch (message.what) {
				case "get":
					response = mockStorage.tabs;
					break;
				case "set":
					if (message.tabs != null) {
						mockStorage.tabs = message.tabs;
						response = true;
					} else {
						(chrome.runtime as any).lastError = {
							message: "Tabs data is missing",
						};
					}
					break;
				case "get-language":
					response = language;
					break;
				default:
					(chrome.runtime as any).lastError = {
						message: "Unknown message type",
					};
			}

			if (callback) {
				callback(response);
			} else return response;
		},
        getURL: (path: String): String => {
            return path;
        }
	},
    i18n: {
        getMessage: (_: String): String => {
            return "Again, Why Salesforce"
        }
    }
};

declare global {
	var chrome: typeof mockBrowser;
	var browser: typeof mockBrowser;
}

// Setup global objects that extension code expects
globalThis.chrome = mockBrowser as any;
globalThis.browser = mockBrowser as any;
const mockElements = [
	{ getAttribute: () => "hello+-+textContent", textContent: "" },
	{ getAttribute: () => "goodbye+-+textContent", textContent: "" },
];
globalThis.document = {
	querySelectorAll: () => mockElements,
};


// Make global variables available
globalThis.BROWSER = mockBrowser;
// Mock translations object
export const translations = {
	"en": {
		"hello": {
            "message": "Hello",
        },
		"goodbye": {
            "message": "Goodbye",
        },
        "error_missing_key": {
            "message": "Key not found anywhere",
        }
	},
	"fr": {
		"hello": {
            "message": "Bonjour",
        }
		// goodbye is missing to test missing key default to english
	},
};
globalThis.fetch = async (path) => ({
    json: async () => {
        // extract from `/_locales/${language}/messages.json`
        const language = path.substring("/_locales/".length, path.length - "/messages.json".length);
        return translations[language]
    },
});
