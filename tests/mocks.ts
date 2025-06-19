// deno-lint-ignore-file no-explicit-any
import Tab from "/tab.js";
const WHY_KEY = "againWhySalesforce";
const LOCALE_KEY = "_locale";
const SETTINGS_KEY = "settings";
const USER_LANGUAGE = "picked-language";

export interface MockStorage {
	tabs: Tab[];
	settings: object[];
}
// Mock browser APIs
export const mockStorage: MockStorage = {
	tabs: [],
	settings: [],
};

export interface InternalMessage {
	what: string;
	url?: string;
	set?: any;
	key?: string;
	keys?: string | string[];
}

const language = "fr";

export const mockBrowser = {
	storage: {
		sync: {
			get: (keys: string[]): Promise<object> => {
				const response = {};
				keys.forEach((key) => {
					if (key === WHY_KEY) {
						response[WHY_KEY] = mockStorage.tabs;
					} else {
						response[key] = mockStorage[key];
					}
				});
				return new Promise((resolve, _) => resolve(response));
			},
			// deno-lint-ignore require-await
			set: async (data: { tabs: any[] }): Promise<boolean> => {
				if (data[WHY_KEY]) {
					mockStorage.tabs = data[WHY_KEY];
				} else if (data[LOCALE_KEY]) {
					mockStorage[LOCALE_KEY] = data[LOCALE_KEY];
				} else if (data[SETTINGS_KEY]) {
					mockStorage[SETTINGS_KEY] = data[SETTINGS_KEY];
				}
				return true;
			},
		},
		onChanged: {
			addListener: () => {},
		},
	},
	runtime: {
		sendMessage: (
			message: InternalMessage,
			callback?: (response?: any) => void,
		): Promise<any> | undefined => {
			// Clear any previous errors
			delete (chrome.runtime as any).lastError;
			const setError = (message: string) =>
				(chrome.runtime as any).lastError = message;

			let response: any;
			switch (message.what) {
				case "get":
					if (message.key != null) {
						response = mockStorage[message.key];
					} else {
						setError("Missing get key");
					}
					break;
				case "set":
					if (message.key != null && message.set != null) {
						mockStorage[message.key] = message.set;
						response = true;
					} else {
						setError("Set data is missing");
					}
					break;
				//case "get-language":
				case "get-sf-language":
					response = language;
					break;
				case "get-settings":
					switch (message.keys) {
						case USER_LANGUAGE:
							response = language;
							break;
						default:
							setError(
								`Unknown message keys for ${message.what}: ${message.keys}`,
							);
							break;
					}
					break;
				default:
					setError(`Unknown message type ${message.what}`);
					break;
			}
			if (callback) {
				callback(response);
				return;
			}
			return response;
		},
		getURL: (path: string): string => {
			return path;
		},
		getManifest: (): object => {
			return {};
		},
	},
	i18n: {
		getMessage: (_: string): string => {
			return "Again, Why Salesforce";
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

const mockElements = [
	{ getAttribute: () => "hello", textContent: "thiswillbeoverwritten" },
	{
		getAttribute: () => "goodbye+-+title",
		textContent: "thisiskept",
		title: "thiswillbeoverwritten",
	},
	{
		getAttribute: () => "weather+-+title+-+textContent",
		textContent: "thiswillbeoverwritten",
		title: "thiswillbeoverwritten",
	},
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
		"weather": {
			"message": "Weather",
		},
		"world": {
			"message": "$hello World",
		},
		"error_missing_key": {
			"message": "Key not found anywhere",
		},
	},
	"fr": {
		"hello": {
			"message": "Bonjour",
		},
		// goodbye is missing to test missing key default to english
		"weather": {
			"message": "Météo",
		},
		"world": {
			"message": "$hello Monde",
		},
	},
};
globalThis.fetch = (path) => ({
	json: () => {
		// extract from `/_locales/${language}/messages.json`
		const language = path.substring(
			"/_locales/".length,
			path.length - "/messages.json".length,
		);
		return translations[language];
	},
});
