"use strict";
import {
	BROWSER,
	EXTENSION_NAME,
	ISCHROME,
	ISFIREFOX,
	MANIFEST,
	NO_UPDATE_NOTIFICATION,
	SETTINGS_KEY,
	WHAT_EXPORT_FROM_BG,
	WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
	WHAT_UPDATE_EXTENSION,
} from "/constants.js";
import { isExportAllowed } from "/functions.js";
import { TabContainer } from "/tabContainer.js";
import { bg_getSettings, bg_getStorage, bg_setStorage } from "./background.js";

/**
 * Queries the browser for the current active tab in the current window.
 * If the tab is not found or an error occurs, the function will retry up to 5 times before throwing an error.
 * The `callback` function will be called with the first tab object found.
 *
 * @param {Function} callback - A function to handle the retrieved tab once it is found.
 * @param {number} [count=0] - A counter used to track the number of retries. Defaults to 0.
 * @throws {Error} Throws an error if the current tab cannot be found after 5 retries.
 */
async function _queryTabs(callback, count = 0) {
	const queryParams = { active: true, currentWindow: true };
	if (count > 0) {
		delete queryParams.currentWindow;
	}
	const browserTabs = await BROWSER.tabs.query(queryParams);
	if (
		BROWSER.runtime.lastError || browserTabs == null ||
		browserTabs == [] || browserTabs[0] == null
	) {
		if (count > 5) {
			throw new Error("error_no_browser_tab");
		}
		await _queryTabs(callback, count + 1);
	} else callback(browserTabs[0]);
}
/**
 * Retrieves the current active browser tab based on the given parameters.
 * If the callback is provided, it will be invoked with the current tab object.
 * If the callback is not provided, it will return a promise that resolves with the current tab object.
 * The function attempts to find the tab multiple times (up to 5 retries) in case of failure.
 *
 * @param {Function} [callback] - A callback function to handle the retrieved tab. If not provided, a promise is returned.
 * @param {boolean} [fromPopup=false] - A flag indicating whether the function was called from a popup. If true, queries all tabs in the current window.
 * @throws {Error} Throws an error if the current tab cannot be found after 5 retries.
 * @return {Promise|undefined} A promise that resolves to the current tab if no callback is provided; undefined if a callback is provided.
 */
export function bg_getCurrentBrowserTab(callback = null) {
	if (callback == null) {
		return new Promise((resolve, reject) => {
			_queryTabs(resolve)
				.then((q) => resolve(q))
				.catch((e) => reject(e));
		});
	}
	_queryTabs(callback);
}
/**
 * Sends the same message back to other parts of the extension.
 *
 * @param {JSONObject} message - the message to be sent
 */
export async function bg_notify(message) {
	if (message == null) {
		throw new Error("error_no_message");
	}
	const browserTab = await bg_getCurrentBrowserTab();
	BROWSER.tabs.sendMessage(browserTab.id, message);
}

/**
 * Handles the export of tab data by converting it into a JSON file and triggering a download.
 * The JSON file will be named "again-why-salesforce.json".
 *
 * @param {Array} tabs - An array of tab objects to be exported as a JSON file.
 */
function _exportHandler(tabs) {
	const jsonData = JSON.stringify(tabs);
	const filename = `${EXTENSION_NAME}_${
		Array.isArray(tabs) ? tabs.length : tabs[TabContainer.keyTabs]?.length
	}-Tabs.json`;
	if (ISFIREFOX) {
		// Firefox implementation
		const blob = new Blob([jsonData], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		BROWSER.downloads.download({
			url,
			filename,
		}).then(() => {
			BROWSER.downloads.onChanged.addListener((e) => {
				if (e.state.current === "complete") {
					URL.revokeObjectURL(url);
				}
			});
		});
	} else if (ISCHROME) {
		// Chrome implementation
		const dataStr = "data:application/json;charset=utf-8," +
			encodeURIComponent(jsonData);
		chrome.downloads.download({
			url: dataStr,
			filename,
		});
	} else {
		// Safari and unidentified browsers: send a message to the content script
		bg_notify({
			what: WHAT_EXPORT_FROM_BG,
			filename,
			payload: jsonData,
		});
	}
}

/**
 * Exports tab data as a JSON file. If no tab data is provided, it retrieves the data from storage.
 *
 * @param {Array|null} tabs - An array of tab objects to be exported as a JSON file. If null, the function fetches the tab data from storage.
 * @return {Promise} from bg_getStorage
 */
function exportHandler(tabs = null) {
	if (tabs == null) {
		return bg_getStorage(_exportHandler);
	}
	_exportHandler(tabs);
}

/**
 * Attempts to set the browser action popup to the export-permission request page.
 * If the URL for the permission page cannot be obtained, no popup is set.
 *
 * @return {boolean}
 *   `true` if the popup was successfully set to the permission request page;
 *   `false` if the permission page URL could not be retrieved.
 */
function requestExportPermission() {
	const req_perm_link = BROWSER.runtime.getURL(
		"action/req_permissions/req_permissions.html",
	);
	if (req_perm_link == null) {
		return false;
	}
	BROWSER.action.setPopup({
		popup: `${req_perm_link}?whichid=download`,
	});
	return true;
}

/**
 * Checks whether downloads permission is already granted and launches the export handler.
 * If not, it triggers a notification prompting the user to open a popup to grant permission.
 *
 * @param {object[]|null} [tabs=null] Optional array of Tab objects to pass through to the export handler.
 * @param {boolean} [checkOnly=false] Whether to check only or launch the export if allowed
 * @return {boolean} whether the export of Tabs is allowed
 */
export function checkLaunchExport(tabs = null, checkOnly = false) {
	const isAllowed = isExportAllowed();
	if (isAllowed) {
		if (!checkOnly) {
			// downloads permission has already been granted
			exportHandler(tabs);
		}
	} else {
		// show toast message to request the user to open the popup
		bg_notify({
			what: WHAT_REQUEST_EXPORT_PERMISSION_TO_OPEN_POPUP,
			ok: requestExportPermission(),
		});
	}
	return isAllowed;
}

/**
 * Compares two semantic version strings to determine if the latest version is newer.
 * Versions are expected in dot-separated format (e.g., "1.2.3"). Missing segments are treated as 0.
 *
 * @param {string} latest - The latest version string.
 * @param {string} current - The current version string.
 * @return {boolean} `true` if the latest version is newer than the current version, otherwise `false`.
 */
function _isNewerVersion(latest, current) {
	const latestParts = latest.split(".").map(Number);
	const currentParts = current.split(".").map(Number);
	for (
		let i = 0;
		i < Math.max(latestParts.length, currentParts.length);
		i++
	) {
		const latestPart = latestParts[i] ?? 0;
		const currentPart = currentParts[i] ?? 0;
		if (latestPart > currentPart) {
			return true;
		} else if (latestPart < currentPart) {
			return false;
		}
	}
	return false; // Versions are equal
}
/**
 * Checks for extension updates and notifies the user if a newer version is available.
 * - Skips the check if the user has disabled update notifications or if the last check was within 7 days.
 * - Compares the current version with the latest GitHub release.
 * - If an update is available, a notification is triggered with update details.
 *
 * @return {Promise<void>} A promise that resolves when the update check process completes.
 */
export async function checkForUpdates() {
	// check user settings
	const no_update_notification = await bg_getSettings(NO_UPDATE_NOTIFICATION);
	if (
		no_update_notification != null &&
		(
			no_update_notification.enabled === true || // the user does not want to be notified
			(
				no_update_notification.date != null &&
				Math.floor(
						(Date.now() - new Date(no_update_notification.date)) /
							(1000 * 60 * 60 * 24),
					) <= 7 // the date difference is less than a week
			)
		)
	) {
		return;
	}
	// set last date saved as today
	bg_setStorage(
		[{ id: NO_UPDATE_NOTIFICATION, date: new Date().toJSON() }],
		null,
		SETTINGS_KEY,
	);
	try {
		const currentVersion = MANIFEST.version;
		const homepageUrl = MANIFEST.homepage_url;
		// Parse GitHub username and repo from homepage URL
		const urlParts = homepageUrl?.split("github.com/");
		// Validate homepage URL (must be GitHub)
		if (
			!homepageUrl?.startsWith("https://github.com/") ||
			urlParts.length < 2
		) {
			console.error("no_manifest_github");
			return;
		}
		const repoPath = urlParts[1].replace(/\.git$/, "");
		// Fetch latest release data from GitHub API
		const response = await fetch(
			`https://api.github.com/repos/${repoPath}/releases`,
		);
		if (!response.ok) {
			console.error("error_failed_to_fetch", response.status);
			return;
		}
		const releases = await response.json();
		// Find the latest non-prerelease version
		const latestVersion = releases
			.filter((release) =>
				!release.prerelease &&
				_isNewerVersion(
					release.tag_name.replace(/^.*(-)?v/, ""),
					currentVersion,
				)
			)
			.sort((a, b) => {
				return new Date(b.created_at) - new Date(a.created_at);
			})
			?.[0].tag_name.replace(/^.*(-)?v/, "");
		// Compare versions and open homepage if update is available
		if (latestVersion != null) {
			bg_notify({
				what: WHAT_UPDATE_EXTENSION,
				oldversion: currentVersion,
				version: latestVersion,
				link: homepageUrl,
				//link: `${homepageUrl}/releases/tag/${BROWSER_NAME}-v${latestVersion}`,
			});
		}
	} catch (error) {
		console.error("error_check_update", error);
	}
}
