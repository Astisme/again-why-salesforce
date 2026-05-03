"use strict";

/**
 * Compares semantic versions and checks whether `latest` is newer than `current`.
 *
 * @param {string} latest Latest version.
 * @param {string} current Current version.
 * @return {boolean} `true` when latest is newer.
 */
function _isNewerVersion(latest, current) {
	const latestParts = latest.split(".").map(Number);
	const currentParts = current.split(".").map(Number);
	for (
		let index = 0;
		index < Math.max(latestParts.length, currentParts.length);
		index++
	) {
		const latestPart = latestParts[index] ?? 0;
		const currentPart = currentParts[index] ?? 0;
		if (latestPart > currentPart) {
			return true;
		}
		if (latestPart < currentPart) {
			return false;
		}
	}
	return false;
}

/**
 * Creates background utility handlers with injected runtime dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ action: { setPopup: (details: { popup: string }) => void }; downloads?: { download: (details: { filename: string; url: string }) => Promise<number> | number; onChanged: { addListener: (listener: (event: { state: { current: string } }) => void) => void; }; }; runtime: { getURL: (path: string) => string | null; lastError?: Error | null }; tabs: { query: (params: object) => Promise<Array<{ id: number }>>; sendMessage: (tabId: number, message: object) => void; }; }} options.browser Browser API wrapper.
 * @param {string} options.extensionGithubLink Extension GitHub repository URL.
 * @param {string} options.extensionName Extension name.
 * @param {string} options.extensionVersion Extension version string.
 * @param {boolean} options.isChrome Browser flag.
 * @param {boolean} options.isFirefox Browser flag.
 * @param {string} options.noUpdateNotification Setting key for update-notification preference.
 * @param {string} options.settingsKey Settings storage key.
 * @param {string} options.whatExportFromBg Background export message reason.
 * @param {string} options.whatRequestExportPermissionToOpenPopup Permission-request message reason.
 * @param {string} options.whatUpdateExtension Update notification message reason.
 * @param {() => boolean} options.isExportAllowedFn Download-permission checker.
 * @param {{ keyTabs: string }} options.tabContainerRef TabContainer static helpers.
 * @param {(key: string) => Promise<{ date?: string; enabled?: boolean } | null>} options.bgGetSettingsFn Settings reader.
 * @param {(callback: (tabs: object[]) => void) => Promise<void>} options.bgGetStorageFn Storage reader.
 * @param {(value: object[], other?: null, key?: string) => void} options.bgSetStorageFn Storage writer.
 * @param {{ downloads?: { download: (details: { filename: string; url: string }) => void } }} [options.chromeRef=chrome] Chrome global wrapper.
 * @param {(input: string) => Promise<{ ok: boolean; status: number; json: () => Promise<Array<{ created_at: string; prerelease: boolean; tag_name: string }>> }>} [options.fetchFn=fetch] Fetch implementation.
 * @param {{ createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void }} [options.urlCtor=URL] URL wrapper.
 * @param {{ error: (...args: unknown[]) => void }} [options.consoleRef=console] Console wrapper.
 * @return {{
 *   _exportHandler: (tabs: object[] | { length?: number; tabs?: object[] }) => void;
 *   _isNewerVersion: (latest: string, current: string) => boolean;
 *   bg_getCurrentBrowserTab: (callback?: ((tab: {
 *     id: number;
 *     active?: boolean;
 *     currentWindow?: boolean;
 *     url?: string;
 *   }) => unknown) | null) => Promise<{
 *     id: number;
 *     active?: boolean;
 *     currentWindow?: boolean;
 *     url?: string;
 *   } | unknown>;
 *   bg_notify: (message: object | null) => Promise<void>;
 *   checkForUpdates: () => Promise<void>;
 *   checkLaunchExport: (tabs?: object[] | object | null, checkOnly?: boolean) => boolean;
 *   requestExportPermission: () => boolean;
 * }} Background utility API.
 */
export function createBackgroundUtilsModule({
	browser,
	extensionGithubLink,
	extensionName,
	extensionVersion,
	isChrome,
	isFirefox,
	noUpdateNotification,
	settingsKey,
	whatExportFromBg,
	whatRequestExportPermissionToOpenPopup,
	whatUpdateExtension,
	isExportAllowedFn,
	tabContainerRef,
	bgGetSettingsFn,
	bgGetStorageFn,
	bgSetStorageFn,
	chromeRef = chrome,
	fetchFn = fetch,
	urlCtor = URL,
	consoleRef = console,
} = {}) {
	const browserRuntime = browser;
	const extensionGithubLinkRuntime = extensionGithubLink;
	const extensionNameRuntime = extensionName;
	const extensionVersionRuntime = extensionVersion;
	const isChromeRuntime = isChrome;
	const isFirefoxRuntime = isFirefox;
	const noUpdateNotificationRuntime = noUpdateNotification;
	const settingsKeyRuntime = settingsKey;
	const whatExportFromBgRuntime = whatExportFromBg;
	const whatRequestExportPermissionToOpenPopupRuntime =
		whatRequestExportPermissionToOpenPopup;
	const whatUpdateExtensionRuntime = whatUpdateExtension;
	const isExportAllowedRuntime = isExportAllowedFn;
	const tabContainerRuntime = tabContainerRef;
	const bgGetSettingsRuntime = bgGetSettingsFn;
	const bgGetStorageRuntime = bgGetStorageFn;
	const bgSetStorageRuntime = bgSetStorageFn;
	const chromeRuntime = chromeRef;
	const fetchRuntime = fetchFn;
	const urlRuntime = urlCtor;
	const consoleRuntime = consoleRef;

	/**
	 * Queries the browser for the current active tab.
	 *
	 * @param {(tab: {
	 *   id: number;
	 *   active?: boolean;
	 *   currentWindow?: boolean;
	 *   url?: string;
	 * }) => unknown} callback Callback invoked with found tab.
	 * @param {number} [count=0] Retry counter.
	 * @return {Promise<unknown>} Callback result.
	 */
	async function _queryTabs(callback, count = 0) {
		const queryParams = { active: true, currentWindow: true };
		if (count > 0) {
			delete queryParams.currentWindow;
		}
		const browserTabs = await browserRuntime.tabs.query(queryParams);
		if (
			browserRuntime.runtime.lastError || browserTabs == null ||
			browserTabs.length === 0 || browserTabs[0] == null
		) {
			if (count > 5) {
				throw new Error("error_no_browser_tab");
			}
			return _queryTabs(callback, count + 1);
		}
		return callback(browserTabs[0]);
	}

	/**
	 * Retrieves the current active browser tab.
	 *
	 * @param {((tab: {
	 *   id: number;
	 *   active?: boolean;
	 *   currentWindow?: boolean;
	 *   url?: string;
	 * }) => unknown) | null} [callback=null] Optional callback.
	 * @return {Promise<{
	 *   id: number;
	 *   active?: boolean;
	 *   currentWindow?: boolean;
	 *   url?: string;
	 * } | unknown>} Resolved tab value or callback result.
	 */
	function bg_getCurrentBrowserTab(callback = null) {
		if (callback == null) {
			return new Promise((resolve, reject) => {
				_queryTabs(resolve)
					.then((queryResult) => resolve(queryResult))
					.catch((error) => reject(error));
			});
		}
		return _queryTabs(callback);
	}

	/**
	 * Sends a message to the current tab.
	 *
	 * @param {object | null} message Message payload.
	 * @return {Promise<void>}
	 */
	async function bg_notify(message) {
		if (message == null) {
			throw new Error("error_no_message");
		}
		const browserTab = await bg_getCurrentBrowserTab();
		browserRuntime.tabs.sendMessage(browserTab.id, message);
	}

	/**
	 * Handles tab export in Firefox, Chrome, or fallback environments.
	 *
	 * @param {Array | { length?: number; tabs?: object[] }} tabs Tab payload.
	 */
	function _exportHandler(tabs) {
		const jsonData = JSON.stringify(tabs);
		const filename = `${extensionNameRuntime}_${
			Array.isArray(tabs)
				? tabs.length
				: tabs[tabContainerRuntime.keyTabs]?.length
		}-Tabs.json`;
		if (isFirefoxRuntime) {
			const blob = new Blob([jsonData], { type: "application/json" });
			const url = urlRuntime.createObjectURL(blob);
			browserRuntime.downloads.download({
				url,
				filename,
			}).then(() => {
				browserRuntime.downloads.onChanged.addListener((event) => {
					if (event.state.current === "complete") {
						urlRuntime.revokeObjectURL(url);
					}
				});
			});
		} else if (isChromeRuntime) {
			const dataStr = "data:application/json;charset=utf-8," +
				encodeURIComponent(jsonData);
			chromeRuntime.downloads.download({
				url: dataStr,
				filename,
			});
		} else {
			bg_notify({
				what: whatExportFromBgRuntime,
				filename,
				payload: jsonData,
			});
		}
	}

	/**
	 * Launches export, reading from storage when tabs are omitted.
	 *
	 * @param {Array | object | null} [tabs=null] Optional tab payload.
	 * @return {Promise<void> | void} Launch result for storage-backed or direct export.
	 */
	function exportHandler(tabs = null) {
		if (tabs == null) {
			return bgGetStorageRuntime(_exportHandler);
		}
		_exportHandler(tabs);
	}

	/**
	 * Attempts to set the browser action popup for download permission.
	 *
	 * @return {boolean} Whether popup was set.
	 */
	function requestExportPermission() {
		const permissionLink = browserRuntime.runtime.getURL(
			"action/req_permissions/req_permissions.html",
		);
		if (permissionLink == null) {
			return false;
		}
		browserRuntime.action.setPopup({
			popup: `${permissionLink}?whichid=download`,
		});
		return true;
	}

	/**
	 * Checks download permission and optionally launches export.
	 *
	 * @param {object[] | object | null} [tabs=null] Optional export payload.
	 * @param {boolean} [checkOnly=false] When true, only checks permission.
	 * @return {boolean} Whether export permission is available.
	 */
	function checkLaunchExport(tabs = null, checkOnly = false) {
		const isAllowed = isExportAllowedRuntime();
		if (isAllowed) {
			if (!checkOnly) {
				exportHandler(tabs);
			}
		} else {
			bg_notify({
				what: whatRequestExportPermissionToOpenPopupRuntime,
				ok: requestExportPermission(),
			});
		}
		return isAllowed;
	}

	/**
	 * Checks GitHub releases and notifies when a newer extension version exists.
	 *
	 * @return {Promise<void>}
	 */
	async function checkForUpdates() {
		const noUpdateSetting = await bgGetSettingsRuntime(
			noUpdateNotificationRuntime,
		);
		if (
			noUpdateSetting != null &&
			(
				noUpdateSetting.enabled === true ||
				(
					noUpdateSetting.date != null &&
					Math.floor(
							(Date.now() - new Date(noUpdateSetting.date)) /
								(1000 * 60 * 60 * 24),
						) <= 7
				)
			)
		) {
			return;
		}
		bgSetStorageRuntime(
			[{ id: noUpdateNotificationRuntime, date: new Date().toJSON() }],
			null,
			settingsKeyRuntime,
		);
		try {
			const urlParts = extensionGithubLinkRuntime.split("github.com/");
			const repoPath = urlParts[1].replace(/\.git$/, "");
			const response = await fetchRuntime(
				`https://api.github.com/repos/${repoPath}/releases`,
			);
			if (!response.ok) {
				consoleRuntime.error("error_failed_to_fetch", response.status);
				return;
			}
			const releases = await response.json();
			const latestVersion = releases
				.filter((release) =>
					!release.prerelease &&
					_isNewerVersion(
						release.tag_name.replace(/^.*(-)?v/, ""),
						extensionVersionRuntime,
					)
				)
				.sort((a, b) => {
					return new Date(b.created_at) - new Date(a.created_at);
				})
				?.[0]?.tag_name?.replace(/^.*(-)?v/, "");
			if (latestVersion != null) {
				await bg_notify({
					what: whatUpdateExtensionRuntime,
					oldversion: extensionVersionRuntime,
					version: latestVersion,
					link: extensionGithubLinkRuntime,
				});
			}
		} catch (error) {
			consoleRuntime.error("error_check_update", error);
		}
	}

	return {
		_exportHandler,
		_isNewerVersion,
		bg_getCurrentBrowserTab,
		bg_notify,
		checkForUpdates,
		checkLaunchExport,
		requestExportPermission,
	};
}
