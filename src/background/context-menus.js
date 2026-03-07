"use strict";
import {
	ALL_CXM_KEYS,
	BROWSER,
	CMD_AND_CXM_MAP_TO_WHAT,
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
	CXM_EMPTY_GENERIC_TABS,
	CXM_EMPTY_TABS,
	CXM_EMPTY_VISIBLE_TABS,
	CXM_EXPORT_TABS,
	CXM_IMPORT_TABS,
	CXM_MANAGE_TABS,
	CXM_MOVE_FIRST,
	CXM_MOVE_LAST,
	CXM_MOVE_LEFT,
	CXM_MOVE_RIGHT,
	CXM_OPEN_OTHER_ORG,
	CXM_PAGE_REMOVE_TAB,
	CXM_PAGE_SAVE_TAB,
	CXM_PIN_TAB,
	CXM_REMOVE_LEFT_TABS,
	CXM_REMOVE_OTHER_TABS,
	CXM_REMOVE_PIN_TABS,
	CXM_REMOVE_RIGHT_TABS,
	CXM_REMOVE_TAB,
	CXM_REMOVE_UNPIN_TABS,
	CXM_RESET_DEFAULT_TABS,
	CXM_SORT_CLICK_COUNT,
	CXM_SORT_CLICK_DATE,
	CXM_SORT_LABEL,
	CXM_SORT_ORG,
	CXM_SORT_URL,
	CXM_TMP_HIDE_NON_ORG,
	CXM_TMP_HIDE_ORG,
	CXM_UNPIN_TAB,
	CXM_UPDATE_ORG,
	CXM_UPDATE_TAB,
	FRAME_PATTERNS,
	SETTINGS_KEY,
	TOAST_WARNING,
	USER_LANGUAGE,
} from "/constants.js";
import { openSettingsPage } from "/functions.js";
import Tab from "/tab.js";
import ensureTranslatorAvailability from "/translator.js";
import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkLaunchExport,
} from "./utils.js";
import {
	bg_getCommandLinks,
	bg_getSalesforceLanguage,
	bg_getSettings,
} from "./background.js";

let areMenuItemsVisible = false;

let link_cmd_save_as_tab = null;
let link_cmd_remove_tab = null;
let link_cmd_toggle_org = null;
let link_cmd_update_tab = null;
let link_cmd_open_settings = null;
let link_cmd_open_other_org = null;
let link_cmd_import = null;
let link_cmd_export_all = null;

/**
 * Asynchronously retrieves command shortcut links and updates corresponding variables.
 * Fetches the latest command links using `bg_getCommandLinks` and assigns the associated shortcuts
 * to their respective global variables based on the command name.
 *
 * @return {Promise<void>} A promise that resolves once the command links have been updated.
 */
async function updateCommandLinks() {
	const commandLinks = await bg_getCommandLinks();
	for (const cmdLink of commandLinks) {
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
	}
}

/**
 * Resets all stored command shortcut links to `null`.
 * Clears the global variables holding shortcut references for all known commands.
 */
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
	{
		id: CXM_PIN_TAB,
		title: "cxm_pin_tab",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: CXM_UNPIN_TAB,
		title: "cxm_unpin_tab",
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
		id: CXM_REMOVE_PIN_TABS,
		title: "cxm_remove_pin_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_REMOVE_UNPIN_TABS,
		title: "cxm_remove_unpin_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_EMPTY_VISIBLE_TABS,
		title: "cxm_empty_visible_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_EMPTY_GENERIC_TABS,
		title: "cxm_empty_generic_tabs",
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
		id: CXM_RESET_DEFAULT_TABS,
		title: "cxm_reset_default",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_TMP_HIDE_NON_ORG,
		title: "cxm_tmp_hide_non_org",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: CXM_TMP_HIDE_ORG,
		title: "cxm_tmp_hide_org",
		contexts: ["link"],
		parentId: "remove",
	},

	{ id: "sort", title: "cxm_sort", contexts: ["link"] },
	{
		id: CXM_SORT_LABEL,
		title: "cxm_sort_label",
		contexts: ["link"],
		parentId: "sort",
	},
	{
		id: CXM_SORT_URL,
		title: "cxm_sort_url",
		contexts: ["link"],
		parentId: "sort",
	},
	{
		id: CXM_SORT_ORG,
		title: "cxm_sort_org",
		contexts: ["link"],
		parentId: "sort",
	},
	{
		id: CXM_SORT_CLICK_COUNT,
		title: "cxm_sort_click_count",
		contexts: ["link"],
		parentId: "sort",
	},
	{
		id: CXM_SORT_CLICK_DATE,
		title: "cxm_sort_click_date",
		contexts: ["link"],
		parentId: "sort",
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
		id: CXM_MANAGE_TABS,
		title: "cxm_manage_tabs",
		contexts: ["page", "frame"],
	},

	{
		id: CMD_OPEN_SETTINGS,
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

/**
 * Returns a deep clone of the original context menu items with updated titles including command shortcuts.
 * Each menu item's title is appended with its corresponding keyboard shortcut (if available),
 * enhancing user visibility of assigned commands.
 *
 * @return {Array<Object>} A cloned array of menu items with updated titles reflecting shortcuts.
 */
function getMenuItemsClone() {
	const clone = structuredClone(menuItemsOriginal);
	for (const el of clone) {
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
			case CMD_OPEN_SETTINGS:
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
	}
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
				console.trace();
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

// deno-lint-ignore no-var
var intervalCxm = null; // is var so that it does not break tests
/**
 * Returns the current interval (for tests)
 * @return current interval
 */
export function getIntervalCxm() {
	return intervalCxm;
}
/**
 * Checks the current browser tab's URL against a list of patterns and adds or removes context menu items based on the match.
 * If a match is found, it removes existing context menu items and creates new ones. If no match is found, it removes any existing context menu items.
 * The function also triggers a notification if the context menu is updated.
 *
 * @param {string} what - A string identifier to specify the action that triggered the context menu check. This is used in the notification.
 * @param {function} [callback=null] - A callback to call at the end of the execution
 * @throws {Error} Throws an error if there is an issue retrieving the current browser tab or if there are any errors during context menu updates.
 */
export async function checkAddRemoveContextMenus(what, callback = null) {
	const isFirstLaunch = intervalCxm == null;
	if (isFirstLaunch) {
		// Start periodic check
		intervalCxm = setInterval(async () => {
			if (!areMenuItemsVisible) {
				await checkAddRemoveContextMenus();
			}
		}, 60000);
	}
	try {
		const browserTabUrl = (await bg_getCurrentBrowserTab())?.url;
		if (browserTabUrl == null) {
			return;
		}
		if (!isFirstLaunch) {
			await removeMenuItems();
		}
		if (
			CONTEXT_MENU_PATTERNS_REGEX.some((cmp) => browserTabUrl.match(cmp))
		) {
			await createMenuItems();
			bg_notify({ what });
			if (callback != null) {
				callback();
			}
		}
	} catch (error) {
		console.trace();
		if (error != null && error.message !== "") {
			const translator = await ensureTranslatorAvailability();
			const msg = await translator.translate("error_cxm_check");
			console.error(msg, error.message);
		}
	}
}

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
	const browserTabUrl = (await bg_getCurrentBrowserTab())?.url;
	const url = info.linkUrl ?? info.pageUrl ?? browserTabUrl;
	const message = {
		what: CMD_AND_CXM_MAP_TO_WHAT[info.menuItemId] ?? info.menuItemId,
		tabUrl: Tab.minifyURL(url),
		label: info.linkText,
		url: Tab.expandURL(
			url,
			browserTabUrl,
		),
		org: Tab.extractOrgName(url),
	};
	switch (info.menuItemId) {
		case CMD_OPEN_SETTINGS:
			openSettingsPage();
			return;
		case CXM_EXPORT_TABS:
			if (!checkLaunchExport(undefined, true)) {
				return;
			}
			break;
		case CXM_OPEN_OTHER_ORG:
			if (info.pageUrl != null) {
				message.pageTabUrl = Tab.minifyURL(info.pageUrl);
				message.pageUrl = Tab.expandURL(info.pageUrl, browserTabUrl);
			}
			if (info.linkUrl != null) {
				message.linkTabUrl = Tab.minifyURL(info.linkUrl);
				message.linkUrl = Tab.expandURL(info.linkUrl, browserTabUrl);
			}
			message.linkTabLabel = info.linkText;
			break;
		default:
			if (!ALL_CXM_KEYS.has(info.menuItemId)) {
				message.what = TOAST_WARNING;
				message.message =
					`Received unknown context menu: ${info.menuItemId}`;
			}
			break;
	}
	bg_notify(message);
});

BROWSER.storage.onChanged.addListener((changes) => {
	const pickedLanguageObj = changes[SETTINGS_KEY]?.newValue?.filter((el) =>
		el.id === USER_LANGUAGE
	);
	if (pickedLanguageObj != null && pickedLanguageObj.length > 0) {
		checkAddRemoveContextMenus();
	}
});
