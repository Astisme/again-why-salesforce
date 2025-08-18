// deno-lint-ignore-file no-explicit-any
import Tab from "/tab.js";
import manifest from "/manifest/template-manifest.json" with { type: "json" };

export interface MockStorage {
	againWhySalesforce: Tab[];
	settings: object[];
	"settings-tab_generic_style": object[] | undefined;
	"settings-tab_org_style": object[] | undefined;
	_locale: string;
}
// Mock browser APIs
export const mockStorage: MockStorage = {
	againWhySalesforce: [],
	settings: [],
	"settings-tab_generic_style": undefined,
	"settings-tab_org_style": undefined,
	_locale: "fr",
};

export interface InternalMessage {
	what: string;
	url?: string;
	set?: any;
	key?: string;
	keys?: string | string[];
}

mockStorage.settings.push(...[
    { enabled: "fr", id: "picked-language" },
    { enabled: false, id: "persist_sort" },
]);

type ContextMenuClickInfo = {
	menuItemId: string;
	[key: string]: any; // optional: to match full API structure
};

type BrowserTab = {
	id: number;
	url: string;
	active: boolean;
	currentWindow: boolean;
};

type Command = {
	name: string;
	description?: string;
	shortcut?: string;
	[key: string]: any;
};
type ContextMenu = {
	name: string;
};
type Cookie = {
	domain: string;
	name: string;
};

type OnClickedCallback = (info: ContextMenuClickInfo, tab: BrowserTab) => void;
type OnStartupCallback = () => void;
type OnInstalledCallback = (
	details: { reason: string; [key: string]: any },
) => void;
type OnActivatedCallback = (
	activeInfo: { tabId: number; windowId: number },
) => void;
type OnFocusChangedCallback = (windowId: number) => void;
type OnMessageCallback = (
	message: any,
	sender: string,
	sendResponse: (response?: any) => void,
) => boolean | void;
type OnCommandCallback = (command: string) => void;

export const mockBrowser = {
	storage: {
		sync: {
			get: (keys: string[], callback): Promise<object> => {
                const response = {};
                keys.forEach((key) => {
                    response[key] = mockStorage[key];
                });
				if (callback == null) {
					return new Promise((resolve, _) => resolve(response));
				}
				return callback(response);
			},
			set: (data: object, callback): Promise<boolean> => {
                Object.assign(mockStorage, data)
                if(callback == null)
                    return new Promise((resolve, _) => resolve(true));
                return callback(true);
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
				case "get-sf-language":
					response = "en";
					break;
				case "get-settings": {
					response = [];
					const keys = Array.isArray(message.keys)
						? message.keys
						: [message.keys];
					for (const key of keys) {
						if (typeof key === "string") {
							const foundSetting = mockStorage.settings.filter(
								(s) => s.id === key,
							);
							if (
								foundSetting != null && foundSetting.length > 0
							) {
								response.push(...foundSetting);
							} else {
								response = undefined;
								break;
							}
						} else if (key == null) {
							response = mockStorage.settings;
						} else {
							response = undefined;
							setError(
								`Unknown message key: ${key}`,
							);
						}
					}
					if (Array.isArray(response) && response.length === 1) {
						response = response[0];
					}
					break;
				}
				case "get-style-settings": {
					const settings = mockStorage[message.key];
					if (message.keys == null || settings == null) {
						response = settings;
					} else {
						if (!Array.isArray(message.keys)) {
							message.keys = [message.keys];
						}
						const requestedSettings = settings.filter((setting) =>
							message.keys.includes(setting.id)
						);
						response = message.keys.length > 1
							? requestedSettings
							: requestedSettings[0];
					}
					break;
				}
				case "echo":
					response = message.echo;
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
		onMessage: {
			_listeners: [] as OnMessageCallback[],
			addListener(callback: OnMessageCallback): void {
				this._listeners.push(callback);
			},
			triggerMessage(
				message: any,
				sender: string = "",
				sendResponse: (response?: any) => void = () => {},
			): void {
				this._listeners.forEach((listener) =>
					listener(message, sender, sendResponse)
				);
			},
		},
		getURL: (path: string): string => {
			return path;
		},
		getManifest: (): object => {
			return manifest;
		},
		onStartup: {
			_listeners: [] as OnStartupCallback[],
			addListener(callback: OnStartupCallback): void {
				this._listeners.push(callback);
			},
			triggerStartup(): void {
				this._listeners.forEach((listener) => listener());
			},
		},
		onInstalled: {
			_listeners: [] as OnInstalledCallback[],
			addListener(callback: OnInstalledCallback): void {
				this._listeners.push(callback);
			},
			triggerInstalled(
				details: { reason: string; [key: string]: any },
			): void {
				this._listeners.forEach((listener) => listener(details));
			},
		},
	},
	i18n: {
		getMessage: (_: string): string => {
			return "Again, Why Salesforce";
		},
	},
	contextMenus: {
		onClicked: {
			_listeners: [] as OnClickedCallback[],
			addListener(callback: OnClickedCallback): void {
				this._listeners.push(callback);
			},
			triggerClick(info: ContextMenuClickInfo, tab: BrowserTab): void {
				this._listeners.forEach((listener) => listener(info, tab));
			},
		},
		_contextMenus: [] as ContextMenu[],
		removeAll(): void {
			this._contextMenus = [] as ContextMenu[];
		},
		create(cm: ContextMenu): void {
			this._contextMenus.push(cm);
		},
	},
	tabs: {
		onActivated: {
			_listeners: [] as OnActivatedCallback[],
			addListener(callback: OnActivatedCallback): void {
				this._listeners.push(callback);
			},
			triggerActivated(
				activeInfo: { tabId: number; windowId: number },
			): void {
				this._listeners.forEach((listener) => listener(activeInfo));
			},
		},
		_mockBrowserTabs: [] as BrowserTab[],
		// Allows you to set mock tab data in tests
		setMockBrowserTabs(tabs: BrowserTab[]): void {
			this._mockBrowserTabs = tabs;
		},
		query(queryInfo: Partial<BrowserTab>): Promise<BrowserTab[]> {
			const result = this._mockBrowserTabs.filter((tab) => {
				return Object.entries(queryInfo).every(([key, value]) =>
					tab[key as keyof BrowserTab] === value
				);
			});
			return Promise.resolve(result);
		},
		sendMessage(
			_tabId: number,
			_message: Message,
			_options?: any,
		): Promise<any> {
			return new Promise((resolve, _) => {
				resolve(true);
			});
		},
	},
	windows: {
		onFocusChanged: {
			_listeners: [] as OnFocusChangedCallback[],
			addListener(callback: OnFocusChangedCallback): void {
				this._listeners.push(callback);
			},
			triggerFocusChanged(windowId: number): void {
				this._listeners.forEach((listener) => listener(windowId));
			},
		},
	},
	commands: {
		onCommand: {
			_listeners: [] as OnCommandCallback[],
			addListener(callback: OnCommandCallback): void {
				this._listeners.push(callback);
			},
			triggerCommand(command: string): void {
				this._listeners.forEach((listener) => listener(command));
			},
		},
		_mockCommands: [] as Command[],
		// Allows you to define the available commands in tests
		setMockCommands(commands: Command[]): void {
			this._mockCommands = commands;
		},
		getAll(): Promise<Command[]> {
			return Promise.resolve(this._mockCommands);
		},
	},
	action: {
		_popupMap: new Map<number | undefined, string>(),
		setPopup(details: { tabId?: number; popup: string }): Promise<void> {
			this._popupMap.set(details.tabId, details.popup);
			return Promise.resolve();
		},
		// Optional helper for testing: get the popup set for a tab
		getPopup(tabId?: number): string | undefined {
			return this._popupMap.get(tabId);
		},
	},
	cookies: {
		_cookies: [] as Cookie[],
		getAll(which: Cookie): Promise<Cookie[]> {
			return Promise.resolve(
				this._cookies.filter((c: Cookie) =>
					c.domain === which.domain && c.name === which.name
				),
			);
		},
        setMockCookies(cookies: Cookie[]): void {
            this._cookies = cookies;
        }
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

const og_fetch = fetch;

globalThis.fetch = (path: string) => ({
	json: () => {
        if(path.includes("locales")){
            // extract from `/_locales/${language}/messages.json`
            const language = path.substring(
                "/_locales/".length,
                path.length - "/messages.json".length,
            );
            if (language != null && language !== "") {
                return translations[language];
            } else {
                return og_fetch(path)
                .then((res) => res.json());
            }
        }
        else if(path.includes("oauth2/userinfo")){
            return { language: "sf-lang-en" };
        }
	},
});
