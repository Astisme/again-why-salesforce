"use strict";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_OTHER_ORG,
	CMD_OPEN_SETTINGS,
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	CMD_TOGGLE_ORG,
	CMD_UPDATE_TAB,
	CONTEXT_MENU_PATTERNS,
	CONTEXT_MENU_PATTERNS_REGEX,
	CXM_EMPTY_NO_ORG_TABS,
	CXM_EMPTY_TABS,
	CXM_EXPORT_TABS,
	CXM_IMPORT_TABS,
	CXM_MOVE_FIRST,
	CXM_MOVE_LAST,
	CXM_MOVE_LEFT,
	CXM_MOVE_RIGHT,
	CXM_OPEN_OTHER_ORG,
	CXM_PAGE_REMOVE_TAB,
	CXM_PAGE_SAVE_TAB,
	CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_RIGHT_TABS,
	CXM_REMOVE_TAB,
	CXM_UPDATE_ORG,
	CXM_UPDATE_TAB,
	FRAME_PATTERNS,
	NO_RELEASE_NOTES,
	openSettingsPage,
	SETTINGS_KEY,
	USER_LANGUAGE,
} from "/constants.js";
import Tab from "/tab.js";
import ensureTranslatorAvailability from "/translator.js";
import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkForUpdates,
	exportHandler,
} from "./utils.js";
import {
	bg_getCommandLinks,
	bg_getSalesforceLanguage,
	bg_getSettings,
} from "./background.js";

let areMenuItemsVisible = false;
const cxm_open_settings = "open-settings";

let link_cmd_save_as_tab = null;
let link_cmd_remove_tab = null;
let link_cmd_toggle_org = null;
let link_cmd_update_tab = null;
let link_cmd_open_settings = null;
let link_cmd_open_other_org = null;
let link_cmd_import = null;
let link_cmd_export_all = null;
async function updateCommandLinks() {
	const commandLinks = await bg_getCommandLinks();
	commandLinks.forEach((cmdLink) => {
		switch (cmdLink.name) {
			case CMD_SAVE_AS_TAB:
				link_cmd_save_as_tab = cmdLink.shortcut;
				break;
			case CMD_REMOVE_TAB:
				link_cmd_remove_tab = cmdLink.shortcut;
				break;
			case CMD_TOGGLE_ORG:
				link_cmd_toggle_org = cmdLink.shortcut;
				break;
			case CMD_UPDATE_TAB:
				link_cmd_update_tab = cmdLink.shortcut;
				break;
			case CMD_OPEN_SETTINGS:
				link_cmd_open_settings = cmdLink.shortcut;
				break;
			case CMD_OPEN_OTHER_ORG:
				link_cmd_open_other_org = cmdLink.shortcut;
				break;
			case CMD_IMPORT:
				link_cmd_import = cmdLink.shortcut;
				break;
			case CMD_EXPORT_ALL:
				link_cmd_export_all = cmdLink.shortcut;
				break;
			default:
				break;
		}
	});
}
function resetLinks() {
	link_cmd_save_as_tab = null;
	link_cmd_remove_tab = null;
	link_cmd_toggle_org = null;
	link_cmd_update_tab = null;
	link_cmd_open_settings = null;
	link_cmd_open_other_org = null;
	link_cmd_import = null;
	link_cmd_export_all = null;
}

const menuItemsOriginal = [
	{
		id: CXM_OPEN_OTHER_ORG,
		title: "cxm_open_other_org",
		//title: ["cxm_open_other_org",link_cmd_open_other_org != null ? `(${link_cmd_open_other_org})` : null],
		contexts: ["link", "page", "frame"],
	},

	{ id: "update", title: "cxm_update", contexts: ["link"] },
	{
		id: CXM_UPDATE_ORG,
		title: "cxm_update_org",
		contexts: ["link"],
		parentId: "update",
	},
	{
		id: CXM_UPDATE_TAB,
		title: "cxm_update_tab",
		contexts: ["link"],
		parentId: "update",
	},

	{ id: "move", title: "cxm_move", contexts: ["link"] },
	{
		id: CXM_MOVE_FIRST,
		title: "cxm_move_first",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: CXM_MOVE_LEFT,
		title: "cxm_move_left",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: CXM_MOVE_RIGHT,
		title: "cxm_move_right",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: CXM_MOVE_LAST,
		title: "cxm_move_last",
		contexts: ["link"],
		parentId: "move",
	},

	{ id: "remove", title: "cxm_remove", contexts: ["link"] },
	{
		id: CXM_REMOVE_TAB,
		title: "cxm_remove_tab",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_REMOVE_OTHER_TABS,
		title: "cxm_remove_other_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_REMOVE_LEFT_TABS,
		title: "cxm_remove_left_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_REMOVE_RIGHT_TABS,
		title: "cxm_remove_right_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_EMPTY_NO_ORG_TABS,
		title: "cxm_empty_no_org_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_EMPTY_TABS,
		title: "cxm_empty_tabs",
		contexts: ["link"],
		parentId: "remove",
	},

	{
		id: CXM_IMPORT_TABS,
		title: "cxm_import_tabs",
		contexts: ["page", "frame"],
	},
	{
		id: CXM_EXPORT_TABS,
		title: "cxm_export_tabs",
		contexts: ["page", "frame"],
	},
	{
		id: CXM_PAGE_SAVE_TAB,
		title: "cxm_page_save_tab",
		contexts: ["page", "frame"],
	},
	{
		id: CXM_PAGE_REMOVE_TAB,
		title: "cxm_page_remove_tab",
		contexts: ["page", "frame"],
	},

	{
		id: cxm_open_settings,
		title: "cxm_settings",
		contexts: ["link", "page", "frame"],
	},
].map((item) => {
	/**
	 * - Updates `documentUrlPatterns` for each menu item:
	 *   - Uses `FRAME_PATTERNS` if the item context includes "frame".
	 *   - Uses `CONTEXT_MENU_PATTERNS` otherwise.
	 */
	item.documentUrlPatterns = item.contexts.includes("frame")
		? FRAME_PATTERNS
		: CONTEXT_MENU_PATTERNS;
	return item;
});

function getMenuItemsClone() {
	const clone = structuredClone(menuItemsOriginal);
	clone.forEach((el) => {
		switch (el.id) {
			case CXM_PAGE_SAVE_TAB:
				if (link_cmd_save_as_tab != null) {
					el.title = [
						el.title,
						`(${link_cmd_save_as_tab})`,
					];
				}
				break;
			case CXM_PAGE_REMOVE_TAB:
				if (link_cmd_remove_tab != null) {
					el.title = [
						el.title,
						`(${link_cmd_remove_tab})`,
					];
				}
				break;
			case CXM_UPDATE_ORG:
				if (link_cmd_toggle_org != null) {
					el.title = [
						el.title,
						`(${link_cmd_toggle_org})`,
					];
				}
				break;
			case CXM_UPDATE_TAB:
				if (link_cmd_update_tab != null) {
					el.title = [
						el.title,
						`(${link_cmd_update_tab})`,
					];
				}
				break;
			case cxm_open_settings:
				if (link_cmd_open_settings != null) {
					el.title = [
						el.title,
						`(${link_cmd_open_settings})`,
					];
				}
				break;
			case CXM_OPEN_OTHER_ORG:
				if (link_cmd_open_other_org != null) {
					el.title = [
						el.title,
						`(${link_cmd_open_other_org})`,
					];
				}
				break;
			case CXM_IMPORT_TABS:
				if (link_cmd_import != null) {
					el.title = [
						el.title,
						`(${link_cmd_import})`,
					];
				}
				break;
			case CXM_EXPORT_TABS:
				if (link_cmd_export_all != null) {
					el.title = [
						el.title,
						`(${link_cmd_export_all})`,
					];
				}
				break;
			default:
				break;
		}
	});
	return clone;
}

/**
 * Creates context menu items dynamically based on the provided menu definitions.
 *
 * - Iterates through `menuItems` and creates each item using `BROWSER.contextMenus.create`.
 */
async function createMenuItems() {
	if (areMenuItemsVisible) return;
	const translator = await ensureTranslatorAvailability();
	await updateCommandLinks();
	areMenuItemsVisible = true;
	try {
		// load the user picked language
		if (
			!await translator.loadNewLanguage(
				(await bg_getSettings(USER_LANGUAGE))?.enabled,
			)
		) {
			// load the language in which salesforce is currently set
			await translator.loadNewLanguage(await bg_getSalesforceLanguage());
		}
		const menuItems = getMenuItemsClone();
		for (const item of menuItems) {
			item.title = await translator.translate(item.title);
			await BROWSER.contextMenus.create(item);
			if (BROWSER.runtime.lastError) {
				throw new Error(BROWSER.runtime.lastError.message);
			}
		}
	} catch (error) {
		const msg = await translator.translate("error_cxm_create");
		console.error(msg, error);
		await removeMenuItems();
	}
	resetLinks();
}

/**
 * Removes all existing context menu items.
 */
async function removeMenuItems() {
	if (!areMenuItemsVisible) return;
	try {
		await BROWSER.contextMenus.removeAll();
		areMenuItemsVisible = false;
	} catch (error) {
		const translator = await ensureTranslatorAvailability();
		const msg = await translator.translate("error_cxm_remove");
		console.error(msg, error);
	}
}

/**
 * Checks the current browser tab's URL against a list of patterns and adds or removes context menu items based on the match.
 * If a match is found, it removes existing context menu items and creates new ones. If no match is found, it removes any existing context menu items.
 * The function also triggers a notification if the context menu is updated.
 *
 * @function checkAddRemoveContextMenus
 * @param {string} what - A string identifier to specify the action that triggered the context menu check. This is used in the notification.
 * @throws {Error} Throws an error if there is an issue retrieving the current browser tab or if there are any errors during context menu updates.
 */
async function checkAddRemoveContextMenus(what, callback = null) {
	try {
		const browserTabUrl = (await bg_getCurrentBrowserTab())?.url;
		if (browserTabUrl == null) {
			return;
		}
		if (
			CONTEXT_MENU_PATTERNS_REGEX.some((cmp) => browserTabUrl.match(cmp))
		) {
			await removeMenuItems();
			await createMenuItems();
			bg_notify({ what });
			if (callback != null) {
				callback();
			}
		} else {
			await removeMenuItems();
		}
	} catch (error) {
		console.trace();
		if (error != null && error.message !== "") {
			const translator = await ensureTranslatorAvailability();
			const msg = await translator.translate("error_cxm_check");
			console.error(msg, error);
		}
	}
}

/**
 * Creates a debounced version of a function that delays its execution until after a specified delay period has passed since the last call.
 * The returned debounced function can be called multiple times, but the actual execution of the original function will only happen once the
 * specified delay has passed since the last invocation.
 *
 * @param {Function} fn - The function to debounce.
 * @param {number} [delay=150] - The delay in milliseconds before the function is executed after the last invocation.
 * @returns {Function} A debounced version of the provided function.
 */
function debounce(fn, delay = 150) {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
}

// Debounced version for high-frequency events
const debouncedCheckMenus = debounce(checkAddRemoveContextMenus);

// when the browser starts
BROWSER.runtime.onStartup.addListener(() =>
	checkAddRemoveContextMenus("startup")
);
// when the extension is installed / updated
BROWSER.runtime.onInstalled.addListener(async (details) => {
	checkAddRemoveContextMenus("installed");
	if (details.reason === "update") {
		// the extension has been updated
		// check user settings
		const no_release_notes = await bg_getSettings(NO_RELEASE_NOTES);
		if (no_release_notes != null && no_release_notes.enabled === true) {
			return;
		}
		// get the extension version
		const manifest = BROWSER.runtime.getManifest();
		const version = manifest.version;
		// open github to show the release notes
		const homepage = manifest.homepage_url;
		// Validate homepage URL (must be GitHub)
		if (!homepage || !homepage.includes("github.com")) {
			console.error("no_manifest_github");
			return;
		}
		BROWSER.tabs.create({
			url: `${homepage}/tree/main/docs/Release Notes/v${version}.md`,
		});
	}
	/* TODO add tutorial on install
    if (details.reason == "install") {
    }
    */
});
// when the extension is activated by the BROWSER
self.addEventListener("activate", () => checkAddRemoveContextMenus("activate"));
// when the tab changes
BROWSER.tabs.onActivated.addListener(() =>
	debouncedCheckMenus("highlighted", checkForUpdates)
);
//BROWSER.tabs.onHighlighted.addListener(() => checkAddRemoveContextMenus("highlighted"));
// when window changes
//BROWSER.windows.onFocusChanged.addListener(() => debouncedCheckMenus("focuschanged"));
BROWSER.windows.onFocusChanged.addListener(() =>
	checkAddRemoveContextMenus("focuschanged")
);

/*
// TODO update uninstall url
BROWSER.runtime.setUninstallURL("https://www.duckduckgo.com/", () => {
    removeMenuItems()
});
*/

/**
 * Listener for context menu item clicks, processes actions based on the clicked menu item.
 *
 * - Listens to `BROWSER.contextMenus.onClicked` events.
 * - Creates a `message` object with details based on the menu item ID.
 *   - Common fields: `what` (menuItemId), `tabUrl`, `url`, and `label` (if applicable).
 *   - Special cases:
 *     - "open-other-org": Adds `pageTabUrl`, `pageUrl`, `linkTabUrl`, `linkUrl`, and `linkTabLabel`.
 *     - "page-save-tab" and "page-remove-tab": Focuses on `pageUrl`.
 * - Calls `bg_notify(message)` to handle further processing or communication.
 */
BROWSER.contextMenus.onClicked.addListener(async (info, _) => {
	const message = { what: info.menuItemId };
	const browserTabUrl = (await bg_getCurrentBrowserTab())?.url;
	switch (info.menuItemId) {
		case CXM_OPEN_OTHER_ORG:
			if (info.pageUrl != null) {
				message.pageTabUrl = Tab.minifyURL(info.pageUrl);
				message.pageUrl = Tab.expandURL(info.pageUrl, browserTabUrl);
			}
			if (info.linkUrl) {
				message.linkTabUrl = Tab.minifyURL(info.linkUrl);
				message.linkUrl = Tab.expandURL(info.linkUrl, browserTabUrl);
			}
			message.linkTabLabel = info.linkText;
			break;
		case CXM_IMPORT_TABS:
			message.what = "add";
			break;
		case CXM_EXPORT_TABS:
			exportHandler();
			break;
		case CXM_PAGE_SAVE_TAB:
		case CXM_REMOVE_TAB:
			message.tabUrl = Tab.minifyURL(info.pageUrl);
			message.url = Tab.expandURL(info.pageUrl, browserTabUrl);
			break;
		case cxm_open_settings:
			openSettingsPage();
			break;
		default:
			message.tabUrl = Tab.minifyURL(info.linkUrl);
			message.url = Tab.expandURL(info.linkUrl, browserTabUrl);
			message.label = info.linkText;
			break;
	}
	bg_notify(message);
});

// Start periodic check
setInterval(async () => {
	if (!areMenuItemsVisible) {
		await checkAddRemoveContextMenus();
	}
}, 60000);

// create persistent menuItems
checkAddRemoveContextMenus();

BROWSER.storage.onChanged.addListener((changes) => {
	const pickedLanguageObj = changes[SETTINGS_KEY]?.newValue?.filter((el) =>
		el.id === USER_LANGUAGE
	);
	if (pickedLanguageObj != null && pickedLanguageObj.length > 0) {
		checkAddRemoveContextMenus();
	}
});
