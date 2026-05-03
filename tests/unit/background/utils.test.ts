import "../../mocks.test.ts";
import {
	assert,
	assertEquals,
	assertFalse,
	assertRejects,
} from "@std/testing/asserts";
import { waitForCondition, waitForNextTask } from "../../async.test.ts";
import { mockStorage } from "../../mocks.test.ts";
import { createBackgroundUtilsModule } from "../../../src/background/utils-runtime.js";

import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkForUpdates,
	checkLaunchExport,
} from "../../../src/background/utils.js";
import { ensureAllTabsAvailability } from "../../../src/core/tabContainer.js";
import {
	BROWSER,
	EXTENSION_VERSION,
	NO_UPDATE_NOTIFICATION,
	SETTINGS_KEY,
} from "../../../src/core/constants.js";

const NativeURL = globalThis.URL;

type BackgroundUtilsModule = {
	_exportHandler: (
		tabs: object[] | { length?: number; tabs?: object[] },
	) => void;
	_isNewerVersion: (latest: string, current: string) => boolean;
	checkForUpdates: () => Promise<void>;
	requestExportPermission: () => boolean;
};

/**
 * Loads background/utils.js with explicit browser and update-check stubs.
 *
 * @param {{
 *   extensionVersion?: string;
 *   getURL?: ((path: string) => string | null) | null;
 *   isChrome?: boolean;
 *   isExportAllowed?: boolean;
 *   isFirefox?: boolean;
 *   latestRelease?: { tag_name?: string };
 *   responseOk?: boolean;
 *   updateSetting?: { date?: string; enabled?: boolean } | null;
 * }} [options={}] Override values for the isolated module.
 * @return {Promise<{
 *   cleanup: () => void;
 *   downloads: Array<{ filename: string; url: string }>;
 *   messages: object[];
 *   module: BackgroundUtilsModule;
 *   popups: string[];
 *   requestUrls: string[];
 *   revokedUrls: string[];
 *   storageWrites: Array<{ key?: string; value: object[] }>;
 *   triggerDownloadComplete: () => void;
 * }>} Loaded module and captured side effects.
 */
function loadBackgroundUtilsModule(
	{
		extensionVersion = "1.0.0",
		getURL = (path: string) => path,
		isChrome = false,
		isExportAllowed: exportAllowed = true,
		isFirefox = false,
		latestRelease = {},
		responseOk = true,
		updateSetting = null,
	}: {
		extensionVersion?: string;
		getURL?: ((path: string) => string | null) | null;
		isChrome?: boolean;
		isExportAllowed?: boolean;
		isFirefox?: boolean;
		latestRelease?: { tag_name?: string };
		responseOk?: boolean;
		updateSetting?: { date?: string; enabled?: boolean } | null;
	} = {},
) {
	const downloads: Array<{ filename: string; url: string }> = [];
	const messages: object[] = [];
	const popups: string[] = [];
	const requestUrls: string[] = [];
	const revokedUrls: string[] = [];
	const storageWrites: Array<{ key?: string; value: object[] }> = [];
	const changedListeners: Array<
		(event: { state: { current: string } }) => void
	> = [];
	const MockURL = Object.assign(class extends NativeURL {}, {
		createObjectURL: () => "blob:test",
		revokeObjectURL: (url: string) => {
			revokedUrls.push(url);
		},
	});
	const module = createBackgroundUtilsModule({
		browser: {
			action: {
				setPopup: ({ popup }) => {
					popups.push(popup);
				},
			},
			downloads: {
				download: (details) => {
					downloads.push(details);
					return Promise.resolve(1);
				},
				onChanged: {
					addListener: (listener) => {
						changedListeners.push(listener);
					},
				},
			},
			runtime: {
				getURL: getURL ?? (() => null),
				lastError: null,
			},
			tabs: {
				query: () => Promise.resolve([{ id: 7 }]),
				sendMessage: (_tabId, message) => {
					messages.push(message);
				},
			},
		},
		extensionGithubLink: "https://github.com/acme/again-why-salesforce",
		extensionName: "again-why-salesforce",
		extensionVersion,
		isChrome,
		isFirefox,
		noUpdateNotification: "no-update",
		settingsKey: "settings",
		whatExportFromBg: "export-from-bg",
		whatRequestExportPermissionToOpenPopup: "request-export-permission",
		whatUpdateExtension: "update-extension",
		isExportAllowedFn: () => exportAllowed,
		tabContainerRef: {
			keyTabs: "tabs",
		},
		bgGetSettingsFn: () => Promise.resolve(updateSetting),
		bgGetStorageFn: (callback) => {
			callback([{ url: "/one" }]);
			return Promise.resolve();
		},
		bgSetStorageFn: (value, _other, key) => {
			storageWrites.push({ key, value });
		},
		chromeRef: {
			downloads: {
				download: (details: { filename: string; url: string }) => {
					downloads.push(details);
				},
			},
		},
		consoleRef: console,
		fetchFn: (url: string) => {
			requestUrls.push(url);
			return Promise.resolve({
				json: () => Promise.resolve(latestRelease),
				ok: responseOk,
				status: 500,
			});
		},
		urlCtor: MockURL,
	});

	return {
		cleanup: () => {},
		downloads,
		messages,
		module,
		popups,
		requestUrls,
		revokedUrls,
		storageWrites,
		triggerDownloadComplete: () => {
			changedListeners[0]?.({ state: { current: "complete" } });
		},
	};
}

Deno.test("bg_getCurrentBrowserTab behavior", async (t) => {
	await t.step("rejects if no tab found after retries", async () => {
		await assertRejects(
			async () => await bg_getCurrentBrowserTab(),
			Error,
			"error_no_browser_tab",
		);
	});

	BROWSER.tabs.setMockBrowserTabs([{
		id: 0,
		url: "https://mock0.url",
		active: true,
		currentWindow: true,
	}, {
		id: 1,
		url: "https://mock1.url",
		active: false,
		currentWindow: true,
	}]);

	await t.step("resolves with active tab (promise)", async () => {
		const tab = await bg_getCurrentBrowserTab() as {
			active: boolean;
			currentWindow: boolean;
			id: number;
			url: string;
		};
		assert(typeof tab.id === "number", "Tab id should be a number");
		assert(typeof tab.url === "string", "Tab url should be a string");
		assert(tab.active);
		assert(tab.currentWindow);
	});

	await t.step("invokes callback with active tab", () => {
		return new Promise<void>((resolve, reject) => {
			bg_getCurrentBrowserTab((tab: { id: number; url?: string }) => {
				try {
					assert(typeof tab.id === "number");
					assert(typeof tab.url === "string");
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});
	});
});

Deno.test("bg_notify behavior", async (t) => {
	await t.step("sends message to current tab without throwing", async () => {
		await bg_notify({ test: true });
	});

	await t.step("throws if message is null", () => {
		assertRejects(
			async () => await bg_notify(null as never),
			Error,
			"error_no_message",
		);
	});
});

Deno.test("checkLaunchExport behavior", async (t) => {
	await t.step("returns false when downloads NOT available", () => {
		assert(!checkLaunchExport(), "default params");
		assert(!checkLaunchExport(undefined, false), "checkOnly = false");
		assert(!checkLaunchExport(undefined, true), "checkOnly = true");
	});

	BROWSER.downloads = {
		download: () => Promise.resolve(0),
		onChanged: {
			addListener: () => {},
		},
	};
	chrome.downloads = {
		download: () => Promise.resolve(0),
		onChanged: {
			addListener: () => {},
		},
	};

	await t.step("returns true when downloads available", () => {
		assert(checkLaunchExport(), "default params");
		assert(checkLaunchExport(undefined, false), "checkOnly = false");
		assert(checkLaunchExport(undefined, true), "checkOnly = true");
	});

	await t.step("accepts an explicit tabs array parameter", () => {
		const dummyTabs = [{ id: 1, url: "https://foo.bar" }];
		assert(checkLaunchExport(dummyTabs));
	});

	await t.step("accepts a TabContainer JSON", async () => {
		const dummyTabs = await ensureAllTabsAvailability();
		assert(dummyTabs.length > 0);
		assert(dummyTabs.pinned === 0);
		assert(checkLaunchExport(dummyTabs.toJSON()));
		dummyTabs.pinned = 1;
		assert(dummyTabs.pinned === 1);
		assert(checkLaunchExport(dummyTabs.toJSON()));
	});
});

Deno.test("checkForUpdates idempotency", async (t) => {
	await t.step("completes gracefully on first run", async () => {
		await checkForUpdates();
	});

	await t.step("skips update within a week on second run", async () => {
		await checkForUpdates();
	});
});

Deno.test("checkForUpdates and export-permission direct branches", async (t) => {
	await t.step(
		"checkLaunchExport handles unavailable permission url directly",
		() => {
			const originalGetURL = BROWSER.runtime.getURL;
			const originalDownloads = BROWSER.downloads;
			BROWSER.runtime.getURL = (() => null) as unknown as (
				path: string,
			) => string;
			BROWSER.downloads = undefined;
			try {
				assertFalse(checkLaunchExport());
			} finally {
				BROWSER.runtime.getURL = originalGetURL;
				BROWSER.downloads = originalDownloads;
			}
		},
	);

	await t.step(
		"checkForUpdates fetches releases and sends an update notification when newer",
		async () => {
			const originalFetch = globalThis.fetch;
			const originalSendMessage = BROWSER.tabs.sendMessage;
			const originalSettings = structuredClone(
				mockStorage[SETTINGS_KEY] as Array<Record<string, unknown>>,
			);
			const sentMessages: Array<{ what?: string; version?: string }> = [];
			const fetchedUrls: string[] = [];
			mockStorage[SETTINGS_KEY] = [];
			BROWSER.tabs.setMockBrowserTabs([{
				id: 0,
				url: "https://mock0.url",
				active: true,
				currentWindow: true,
			}]);
			BROWSER.tabs.sendMessage = (_tabId: number, message: object) => {
				sentMessages.push(
					message as { what?: string; version?: string },
				);
				return Promise.resolve(true);
			};
			globalThis.fetch = (url: string | URL | Request) => {
				fetchedUrls.push(String(url));
				return Promise.resolve({
					json: () =>
						Promise.resolve({
							tag_name: "release-v999.0.0",
						}),
					ok: true,
					status: 200,
				} as Response);
			};
			try {
				await checkForUpdates();
				assert(
					mockStorage[SETTINGS_KEY].some((setting) =>
						setting.id === NO_UPDATE_NOTIFICATION
					),
				);
				assert(
					fetchedUrls.some((url) => url.endsWith("/releases/latest")),
				);
				assert(
					sentMessages.some((message) =>
						message.version === "999.0.0"
					),
				);
			} finally {
				globalThis.fetch = originalFetch;
				BROWSER.tabs.sendMessage = originalSendMessage;
				mockStorage[SETTINGS_KEY] = originalSettings;
			}
		},
	);

	await t.step(
		"checkForUpdates handles equal versions and fetch errors",
		async () => {
			const originalFetch = globalThis.fetch;
			const originalSendMessage = BROWSER.tabs.sendMessage;
			const originalSettings = structuredClone(
				mockStorage[SETTINGS_KEY] as Array<Record<string, unknown>>,
			);
			const sentMessages: Array<{ what?: string; version?: string }> = [];
			mockStorage[SETTINGS_KEY] = [];
			BROWSER.tabs.setMockBrowserTabs([{
				id: 0,
				url: "https://mock0.url",
				active: true,
				currentWindow: true,
			}]);
			BROWSER.tabs.sendMessage = (_tabId: number, message: object) => {
				sentMessages.push(
					message as { what?: string; version?: string },
				);
				return Promise.resolve(true);
			};
			globalThis.fetch = () =>
				Promise.resolve({
					json: () =>
						Promise.resolve({
							tag_name: `release-v${EXTENSION_VERSION}`,
						}),
					ok: true,
					status: 200,
				} as Response);
			try {
				await checkForUpdates();
				assertEquals(sentMessages.length, 0);
				mockStorage[SETTINGS_KEY] = [];
				globalThis.fetch = () =>
					Promise.reject(new Error("fetch-failure"));
				await checkForUpdates();
			} finally {
				globalThis.fetch = originalFetch;
				BROWSER.tabs.sendMessage = originalSendMessage;
				mockStorage[SETTINGS_KEY] = originalSettings;
			}
		},
	);
});

Deno.test("background utils isolated branches cover export handlers and update checks", async (t) => {
	await t.step(
		"export handler covers Firefox, Chrome, and fallback notification paths",
		async () => {
			const firefox = await loadBackgroundUtilsModule({
				isFirefox: true,
			});
			try {
				firefox.module._exportHandler([{ url: "/firefox" }]);
				await waitForNextTask();
				firefox.triggerDownloadComplete();
				assert(firefox.downloads[0].url.startsWith("blob:"));
				assertEquals(firefox.revokedUrls, ["blob:test"]);
			} finally {
				firefox.cleanup();
			}

			const chrome = await loadBackgroundUtilsModule({ isChrome: true });
			try {
				chrome.module._exportHandler([{ url: "/chrome" }]);
				assert(chrome.downloads[0].url.startsWith(
					"data:application/json;charset=utf-8,",
				));
			} finally {
				chrome.cleanup();
			}

			const fallback = await loadBackgroundUtilsModule({
				isChrome: false,
				isFirefox: false,
			});
			try {
				fallback.module._exportHandler([{ url: "/safari" }]);
				await waitForCondition(() => fallback.messages.length === 1);
				assertEquals(fallback.messages, [{
					what: "export-from-bg",
					filename: "again-why-salesforce_1-Tabs.json",
					payload: JSON.stringify([{ url: "/safari" }]),
				}]);
			} finally {
				fallback.cleanup();
			}
		},
	);

	await t.step(
		"requestExportPermission returns false when the permission page url is unavailable",
		async () => {
			const fixture = await loadBackgroundUtilsModule({
				getURL: () => null,
				isExportAllowed: false,
			});
			try {
				assertEquals(fixture.module.requestExportPermission(), false);
				assertEquals(fixture.popups, []);
			} finally {
				fixture.cleanup();
			}
		},
	);

	await t.step(
		"version comparison and update checks cover newer, older, skipped, and failed fetch branches",
		async () => {
			const versionFixture = await loadBackgroundUtilsModule();
			try {
				assert(versionFixture.module._isNewerVersion("1.2.0", "1.1.9"));
				assertFalse(
					versionFixture.module._isNewerVersion("1.0.0", "1.0.1"),
				);
				assertFalse(
					versionFixture.module._isNewerVersion("1.0", "1.0.0"),
				);
			} finally {
				versionFixture.cleanup();
			}

			const updateFixture = await loadBackgroundUtilsModule({
				extensionVersion: "1.0.0",
				latestRelease: {
					tag_name: "release-v1.1.0",
				},
			});
			try {
				await updateFixture.module.checkForUpdates();
				assertEquals(updateFixture.storageWrites.length, 1);
				assertEquals(
					updateFixture.requestUrls[0],
					"https://api.github.com/repos/acme/again-why-salesforce/releases/latest",
				);
				assertEquals(updateFixture.messages, [{
					what: "update-extension",
					oldversion: "1.0.0",
					version: "1.1.0",
					link: "https://github.com/acme/again-why-salesforce/releases/latest",
				}]);
			} finally {
				updateFixture.cleanup();
			}

			const skippedFixture = await loadBackgroundUtilsModule({
				updateSetting: { enabled: true },
			});
			try {
				await skippedFixture.module.checkForUpdates();
				assertEquals(skippedFixture.storageWrites.length, 0);
				assertEquals(skippedFixture.messages, []);
			} finally {
				skippedFixture.cleanup();
			}

			const failedFixture = await loadBackgroundUtilsModule({
				responseOk: false,
			});
			try {
				await failedFixture.module.checkForUpdates();
				assertEquals(failedFixture.messages, []);
			} finally {
				failedFixture.cleanup();
			}

			const emptyReleasesFixture = await loadBackgroundUtilsModule({
				latestRelease: {},
				responseOk: true,
			});
			try {
				await emptyReleasesFixture.module.checkForUpdates();
				assertEquals(emptyReleasesFixture.messages, []);
			} finally {
				emptyReleasesFixture.cleanup();
			}
		},
	);
});
