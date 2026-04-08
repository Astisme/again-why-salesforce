"use strict";

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
}) {
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
		const browserTabs = await browser.tabs.query(queryParams);
		if (
			browser.runtime.lastError || browserTabs == null ||
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
		browser.tabs.sendMessage(browserTab.id, message);
	}

	/**
	 * Handles tab export in Firefox, Chrome, or fallback environments.
	 *
	 * @param {Array | { length?: number; tabs?: object[] }} tabs Tab payload.
	 */
	function _exportHandler(tabs) {
		const jsonData = JSON.stringify(tabs);
		const filename = `${extensionName}_${
			Array.isArray(tabs) ? tabs.length : tabs[tabContainerRef.keyTabs]?.length
		}-Tabs.json`;
		if (isFirefox) {
			const blob = new Blob([jsonData], { type: "application/json" });
			const url = urlCtor.createObjectURL(blob);
			browser.downloads.download({
				url,
				filename,
			}).then(() => {
				browser.downloads.onChanged.addListener((event) => {
					if (event.state.current === "complete") {
						urlCtor.revokeObjectURL(url);
					}
				});
			});
		} else if (isChrome) {
			const dataStr = "data:application/json;charset=utf-8," +
				encodeURIComponent(jsonData);
			chromeRef.downloads.download({
				url: dataStr,
				filename,
			});
		} else {
			bg_notify({
				what: whatExportFromBg,
				filename,
				payload: jsonData,
			});
		}
	}

	/**
	 * Launches export, reading from storage when tabs are omitted.
	 *
	 * @param {Array | object | null} [tabs=null] Optional tab payload.
	 * @return {Promise<void> | void}
	 */
	function exportHandler(tabs = null) {
		if (tabs == null) {
			return bgGetStorageFn(_exportHandler);
		}
		_exportHandler(tabs);
	}

	/**
	 * Attempts to set the browser action popup for download permission.
	 *
	 * @return {boolean} Whether popup was set.
	 */
	function requestExportPermission() {
		const permissionLink = browser.runtime.getURL(
			"action/req_permissions/req_permissions.html",
		);
		if (permissionLink == null) {
			return false;
		}
		browser.action.setPopup({
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
		const isAllowed = isExportAllowedFn();
		if (isAllowed) {
			if (!checkOnly) {
				exportHandler(tabs);
			}
		} else {
			bg_notify({
				what: whatRequestExportPermissionToOpenPopup,
				ok: requestExportPermission(),
			});
		}
		return isAllowed;
	}

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
	 * Checks GitHub releases and notifies when a newer extension version exists.
	 *
	 * @return {Promise<void>}
	 */
	async function checkForUpdates() {
		const noUpdateSetting = await bgGetSettingsFn(noUpdateNotification);
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
		bgSetStorageFn(
			[{ id: noUpdateNotification, date: new Date().toJSON() }],
			null,
			settingsKey,
		);
		try {
			const urlParts = extensionGithubLink.split("github.com/");
			const repoPath = urlParts[1].replace(/\.git$/, "");
			const response = await fetchFn(
				`https://api.github.com/repos/${repoPath}/releases`,
			);
			if (!response.ok) {
				consoleRef.error("error_failed_to_fetch", response.status);
				return;
			}
			const releases = await response.json();
			const latestVersion = releases
				.filter((release) =>
					!release.prerelease &&
					_isNewerVersion(
						release.tag_name.replace(/^.*(-)?v/, ""),
						extensionVersion,
					)
				)
				.sort((a, b) => {
					return new Date(b.created_at) - new Date(a.created_at);
				})
				?.[0]?.tag_name?.replace(/^.*(-)?v/, "");
			if (latestVersion != null) {
				await bg_notify({
					what: whatUpdateExtension,
					oldversion: extensionVersion,
					version: latestVersion,
					link: extensionGithubLink,
				});
			}
		} catch (error) {
			consoleRef.error("error_check_update", error);
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
