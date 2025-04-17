"use strict";
import {
	BROWSER,
	CONTEXT_MENU_PATTERNS,
	CONTEXT_MENU_PATTERNS_REGEX,
	FRAME_PATTERNS,
} from "/constants.js";
import Tab from "/tab.js";
import ensureTranslatorAvailability from "/translator.js";
import { bg_getCurrentBrowserTab, bg_notify, exportHandler } from "./utils.js";
import { bg_getSalesforceLanguage } from "./background.js";

let translator = null;

let areMenuItemsVisible = false;

const menuItemsOriginal = [
	{
		id: "open-other-org",
		title: "cxm_open_other_org",
		contexts: ["link", "page", "frame"],
	},

	{ id: "update", title: "cxm_update", contexts: ["link"] },
	{
		id: "update-org",
		title: "cxm_update_org",
		contexts: ["link"],
		parentId: "update",
	},
	{
		id: "update-tab",
		title: "cxm_update_tab",
		contexts: ["link"],
		parentId: "update",
	},

	{ id: "move", title: "cxm_move", contexts: ["link"] },
	{
		id: "move-first",
		title: "cxm_move_first",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: "move-left",
		title: "cxm_move_left",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: "move-right",
		title: "cxm_move_right",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: "move-last",
		title: "cxm_move_last",
		contexts: ["link"],
		parentId: "move",
	},

	{ id: "remove", title: "cxm_remove", contexts: ["link"] },
	{
		id: "remove-tab",
		title: "cxm_remove_tab",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "remove-other-tabs",
		title: "cxm_remove_other_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "remove-left-tabs",
		title: "cxm_remove_left_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "remove-right-tabs",
		title: "cxm_remove_right_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "empty-no-org-tabs",
		title: "cxm_empty_no_org_tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "empty-tabs",
		title: "cxm_empty_tabs",
		contexts: ["link"],
		parentId: "remove",
	},

	{
		id: "import-tabs",
		title: "cxm_import_tabs",
		contexts: ["page", "frame"],
	},
	{
		id: "export-tabs",
		title: "cxm_export_tabs",
		contexts: ["page", "frame"],
	},
	{
		id: "page-save-tab",
		title: "cxm_page_save_tab",
		contexts: ["page", "frame"],
	},
	{
		id: "page-remove-tab",
		title: "cxm_page_remove_tab",
		contexts: ["page", "frame"],
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
 * Creates context menu items dynamically based on the provided menu definitions.
 *
 * - Iterates through `menuItems` and creates each item using `BROWSER.contextMenus.create`.
 */
async function createMenuItems() {
	if (areMenuItemsVisible) return;
    if(translator == null)
        translator = await ensureTranslatorAvailability();
    areMenuItemsVisible = true;
	try {
        await translator.loadNewLanguage(await bg_getSalesforceLanguage());
        const menuItems = structuredClone(menuItemsOriginal);
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
        if(translator == null)
            translator = await ensureTranslatorAvailability();
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
async function checkAddRemoveContextMenus(what) {
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
		} else {
			await removeMenuItems();
		}
	} catch (error) {
		console.trace();
		if (error != null && error.message !== "") {
            if(translator == null)
                translator = await ensureTranslatorAvailability();
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
BROWSER.runtime.onInstalled.addListener(() =>
	checkAddRemoveContextMenus("installed")
);
// when the extension is activated by the BROWSER
self.addEventListener("activate", () => checkAddRemoveContextMenus("activate"));
// when the tab changes
BROWSER.tabs.onHighlighted.addListener(() =>
	debouncedCheckMenus("highlighted")
);
//BROWSER.tabs.onHighlighted.addListener(() => checkAddRemoveContextMenus("highlighted"));
// when window changes
//BROWSER.windows.onFocusChanged.addListener(() => debouncedCheckMenus("focuschanged"));
BROWSER.windows.onFocusChanged.addListener(() =>
	checkAddRemoveContextMenus("focuschanged")
);

/* TODO add tutorial on install and link to current changes on update
if (details.reason == "install") {
}
else if (details.reason == "update") {
}
*/
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
		case "open-other-org":
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
		case "import-tabs":
			message.what = "add";
			break;
		case "export-tabs":
			exportHandler();
			break;
		case "page-save-tab":
		case "page-remove-tab":
			message.tabUrl = Tab.minifyURL(info.pageUrl);
			message.url = Tab.expandURL(info.pageUrl, browserTabUrl);
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
