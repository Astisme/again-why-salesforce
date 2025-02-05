"use strict";
import {
	CONTEXT_MENU_PATTERNS,
	CONTEXT_MENU_PATTERNS_REGEX,
	FRAME_PATTERNS,
} from "./constants.js";
import {
	bg_expandURL,
	bg_minifyURL,
	bg_notify,
	exportHandler,
} from "./utils.js";

let areMenuItemsVisible = false;

const menuItems = [
	{
		id: "open-other-org",
		title: "🔗 Open in another Org",
		contexts: ["link", "page", "frame"],
	},

	{ id: "move", title: "🧭 Move tab", contexts: ["link"] },
	{
		id: "move-first",
		title: "↩️ Make first",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: "move-left",
		title: "👈 Move left",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: "move-right",
		title: "👉 Move right",
		contexts: ["link"],
		parentId: "move",
	},
	{
		id: "move-last",
		title: "↪️ Make last",
		contexts: ["link"],
		parentId: "move",
	},

	{ id: "remove", title: "💥 Remove tab(s)", contexts: ["link"] },
	{
		id: "remove-tab",
		title: "1️⃣ This tab",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "remove-other-tabs",
		title: "↔️ Other tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "remove-left-tabs",
		title: "🔥 Tabs to the left",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "remove-right-tabs",
		title: "🌊 Tabs to the right",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "empty-no-org-tabs",
		title: "👀 All visible tabs",
		contexts: ["link"],
		parentId: "remove",
	},
	{
		id: "empty-tabs",
		title: "😨 ALL tabs",
		contexts: ["link"],
		parentId: "remove",
	},

	{
		id: "import-tabs",
		title: "🆙 Import tabs",
		contexts: ["page", "frame"],
	},
	{
		id: "export-tabs",
		title: "⬇️ Export tabs",
		contexts: ["page", "frame"],
	},
	{
		id: "page-save-tab",
		title: "💾 Save as tab",
		contexts: ["page", "frame"],
	},
	{
		id: "page-remove-tab",
		title: "👋 Remove tab",
		contexts: ["page", "frame"],
	},
];

/**
 * - Updates `documentUrlPatterns` for each menu item:
 *   - Uses `FRAME_PATTERNS` if the item context includes "frame".
 *   - Uses `CONTEXT_MENU_PATTERNS` otherwise.
 */
menuItems.forEach((item) => {
	item.documentUrlPatterns = item.contexts.includes("frame")
		? FRAME_PATTERNS
		: CONTEXT_MENU_PATTERNS;
});

/**
 * Creates context menu items dynamically based on the provided menu definitions.
 *
 * - Iterates through `menuItems` and creates each item using `browser.contextMenus.create`.
 */
async function createMenuItems() {
	if (areMenuItemsVisible) return;

	try {
		await browser.contextMenus.removeAll();

		for (const item of menuItems) {
			await browser.contextMenus.create(item);
		}

		areMenuItemsVisible = true;
	} catch (error) {
		console.error("Error creating menu items:", error);
		areMenuItemsVisible = false;
	}
}

/**
 * Removes all existing context menu items.
 */
async function removeMenuItems() {
	if (!areMenuItemsVisible) return;

	try {
		await browser.contextMenus.removeAll();
		areMenuItemsVisible = false;
	} catch (error) {
		console.error("Error removing menu items:", error);
	}
}

/**
 * Checks the current active tab's URL and conditionally adds or removes context menus.
 *
 * - Queries the currently active tab in the current browser window.
 * - If the tab exists and its URL matches any regex in `CONTEXT_MENU_PATTERNS_REGEX`, calls `createMenuItems`.
 * - If no match is found, calls `removeMenuItems` to clean up context menus.
 */
async function checkAddRemoveContextMenus() {
	try {
		const tabs = await browser.tabs.query({
			active: true,
			currentWindow: true,
		});

		if (tabs && tabs[0] && tabs[0].url) {
			const url = tabs[0].url;

			if (CONTEXT_MENU_PATTERNS_REGEX.some((cmp) => url.match(cmp))) {
				await removeMenuItems();
				await createMenuItems();
				bg_notify({ what: "focused" });
			} else {
				await removeMenuItems();
			}
		}
	} catch (error) {
		console.error("Error checking context menus:", error);
	}
}

// when the browser starts
browser.runtime.onStartup.addListener(checkAddRemoveContextMenus);
// when the extension is installed / updated
browser.runtime.onInstalled.addListener(checkAddRemoveContextMenus);
// when the extension is activated by the browser
self.addEventListener("activate", checkAddRemoveContextMenus);
// when the tab changes
browser.tabs.onHighlighted.addListener(checkAddRemoveContextMenus);
// when window changes
browser.windows.onFocusChanged.addListener(checkAddRemoveContextMenus);

/* TODO add tutorial on install and link to current changes on update
if (details.reason == "install") {
}
else if (details.reason == "update") {
}
*/
/*
// TODO update uninstall url
browser.runtime.setUninstallURL("https://www.duckduckgo.com/", () => {
    removeMenuItems()
});
*/

/**
 * Listener for context menu item clicks, processes actions based on the clicked menu item.
 *
 * - Listens to `browser.contextMenus.onClicked` events.
 * - Creates a `message` object with details based on the menu item ID.
 *   - Common fields: `what` (menuItemId), `tabUrl`, `url`, and `tabTitle` (if applicable).
 *   - Special cases:
 *     - "open-other-org": Adds `pageTabUrl`, `pageUrl`, `linkTabUrl`, `linkUrl`, and `linkTabTitle`.
 *     - "page-save-tab" and "page-remove-tab": Focuses on `pageUrl`.
 * - Calls `bg_notify(message)` to handle further processing or communication.
 */
browser.contextMenus.onClicked.addListener((info, _) => {
	const message = { what: info.menuItemId };
	switch (info.menuItemId) {
		case "open-other-org":
			message.pageTabUrl = bg_minifyURL(info.pageUrl);
			message.pageUrl = bg_expandURL(info.pageUrl);
			message.linkTabUrl = bg_minifyURL(info.linkUrl);
			message.linkUrl = bg_expandURL(info.linkUrl);
			message.linkTabTitle = info.linkText;
			break;
		case "import-tabs":
			message.what = "add";
			break;
		case "export-tabs":
			exportHandler();
			break;
		case "page-save-tab":
		case "page-remove-tab":
			message.tabUrl = bg_minifyURL(info.pageUrl);
			message.url = bg_expandURL(info.pageUrl);
			break;
		default:
			message.tabUrl = bg_minifyURL(info.linkUrl);
			message.url = bg_expandURL(info.linkUrl);
			message.tabTitle = info.linkText;
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
