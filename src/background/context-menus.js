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
} from "../core/constants.js";
import { openSettingsPage } from "../core/functions.js";
import Tab from "../core/tab.js";
import { TranslationService } from "../core/translator.js";
import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkLaunchExport,
} from "./utils.js";
import { bg_getSettings } from "./storage.js";
import { bg_getCommandLinks } from "./commands.js";
import { bg_getSalesforceLanguage } from "./salesforce-language.js";

/**
 * Loads a preferred translator language from background data sources.
 *
 * @param {{
 *   bgGetSalesforceLanguage: () => Promise<string | null>;
 *   bgGetSettings: (key: string) => Promise<{ enabled?: string } | null>;
 *   translator: { currentLanguage: string; loadNewLanguage: (language?: string) => Promise<boolean> };
 *   userLanguage: string;
 * }} options Language-loading dependencies.
 * @return {Promise<string | null>} Loaded language or `null`.
 */
async function loadTranslatorLanguageFromBackground({
	bgGetSalesforceLanguage,
	bgGetSettings,
	translator,
	userLanguage,
}) {
	try {
		const selectedLanguage = await bgGetSettings(userLanguage);
		if (await translator.loadNewLanguage(selectedLanguage?.enabled)) {
			return translator.currentLanguage;
		}
		const salesforceLanguage = await bgGetSalesforceLanguage();
		if (await translator.loadNewLanguage(salesforceLanguage)) {
			return translator.currentLanguage;
		}
	} catch {
		return null;
	}
	return null;
}

/**
 * Logs a translated context-menu operation error.
 *
 * @param {{ error: (message: unknown, ...args: unknown[]) => void; trace: () => void }} consoleRef Logger.
 * @param {{ getTranslations: (key: string) => Promise<string> }} translator Translator service.
 * @param {unknown} error Context-menu operation error.
 * @return {Promise<void>} Resolves after logging.
 */
async function logContextMenuError(consoleRef, translator, error) {
	consoleRef.trace();
	if (error == null || error.message === "") {
		return;
	}
	const message = await translator.getTranslations("error_cxm_check");
	consoleRef.error(message, error.message);
}

/**
 * Creates isolated context-menu behavior and lifecycle state.
 *
 * @return {{ checkAddRemoveContextMenus: (what: string, callback?: function|null) => Promise<void>, refreshContextMenus: (what: string) => Promise<void>, removeMenuItems: (force?: boolean) => Promise<void>, startContextMenus: () => void }} Context-menu API.
 */
export function createContextMenusModule() {
	let areMenuItemsVisible = false;
	let link_cmd_save_as_tab = null;
	let link_cmd_remove_tab = null;
	let link_cmd_toggle_org = null;
	let link_cmd_update_tab = null;
	let link_cmd_open_settings = null;
	let link_cmd_open_other_org = null;
	let link_cmd_import = null;
	let link_cmd_export_all = null;
	let pendingContextMenuOperation = null;
	let hasStarted = false;

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
	 * Gets the configured keyboard shortcut for a menu item id.
	 *
	 * @param {string} menuItemId - The context menu item id.
	 * @return {string|null} The keyboard shortcut, if configured.
	 */
	function getMenuShortcutById(menuItemId) {
		switch (menuItemId) {
			case CXM_PAGE_SAVE_TAB:
				return link_cmd_save_as_tab;
			case CXM_PAGE_REMOVE_TAB:
				return link_cmd_remove_tab;
			case CXM_UPDATE_ORG:
				return link_cmd_toggle_org;
			case CXM_UPDATE_TAB:
				return link_cmd_update_tab;
			case CMD_OPEN_SETTINGS:
				return link_cmd_open_settings;
			case CXM_OPEN_OTHER_ORG:
				return link_cmd_open_other_org;
			case CXM_IMPORT_TABS:
				return link_cmd_import;
			case CXM_EXPORT_TABS:
				return link_cmd_export_all;
			default:
				return null;
		}
	}

	/**
	 * Returns a deep clone of the original context menu items enriched with command shortcuts.
	 * Each menu item receives a `shortcut` property when a corresponding keyboard shortcut exists.
	 *
	 * @return {Array<Object>} A cloned array of menu items with optional shortcut metadata.
	 */
	function getMenuItemsClone() {
		const clone = structuredClone(menuItemsOriginal);
		for (const el of clone) {
			el.shortcut = getMenuShortcutById(el.id);
		}
		return clone;
	}

	/**
	 * Creates context menu items dynamically based on the provided menu definitions.
	 * Existing menus are removed first when a forced rebuild is requested or when
	 * local state indicates the browser menu tree may be stale.
	 *
	 * @param {boolean} [force=false] - Whether to rebuild the menu tree even when
	 * it is already marked as visible.
	 * @return {Promise<void>}
	 */
	async function createMenuItems(force = false) {
		if (areMenuItemsVisible && !force) {
			return;
		}
		await TranslationService.ensureTranslatorAvailability((translator) =>
			loadTranslatorLanguageFromBackground({
				bgGetSalesforceLanguage: bg_getSalesforceLanguage,
				bgGetSettings: bg_getSettings,
				translator,
				userLanguage: USER_LANGUAGE,
			}),
		);
		try {
			await Promise.all([updateCommandLinks(), removeMenuItems(true)]);
			const menuItems = getMenuItemsClone();
			const translatedMenuItems = await Promise.all(
				menuItems.map(async (item) => {
					const title = await TranslationService.getTranslations(
						item.title,
					);
					const shortcut = item.shortcut ?? null;
					if (shortcut != null) {
						return { ...item, title: `${title} (${shortcut})` };
					}
					return { ...item, title };
				}),
			);
			for (const item of translatedMenuItems) {
				delete item.shortcut;
				BROWSER.contextMenus.create(item);
				if (BROWSER.runtime.lastError) {
					console.trace();
					throw new Error(BROWSER.runtime.lastError.message);
				}
			}
			areMenuItemsVisible = true;
		} catch (error) {
			areMenuItemsVisible = false;
			const msg =
				await TranslationService.getTranslations("error_cxm_create");
			console.error(msg, error);
			await removeMenuItems(true);
		}
		resetLinks();
	}

	/**
	 * Runs a single context-menu create/refresh operation and reports any failure.
	 *
	 * @param {Object} [param0={}] - operation configuration
	 * @param {string|null} [param0.what=null] - optional notification message to send after creation
	 * @param {Function|null} [param0.callback=null] - optional callback invoked after creation succeeds
	 * @param {boolean} [param0.force=false] - whether to force rebuilding the context menu tree
	 * @return {Promise<void>} Resolves when the operation has finished.
	 */
	async function innerContextMenuOperation({
		what = null,
		callback = null,
		force = false,
	} = {}) {
		try {
			await createMenuItems(force);
			if (what != null) {
				await bg_notify({ what });
			}
			callback?.();
		} catch (error) {
			await logContextMenuError(console, TranslationService, error);
		}
	}

	/**
	 * Serializes context menu mutations so create/remove/refresh flows do not overlap.
	 *
	 * @param {Function} operation - The async menu operation to run.
	 * @return {Promise} A promise that resolves when the queued operation completes.
	 */
	function queueContextMenuOperation({
		what = null,
		callback = null,
		force = false,
	} = {}) {
		if (pendingContextMenuOperation == null) {
			pendingContextMenuOperation = Promise.resolve();
		}
		pendingContextMenuOperation = pendingContextMenuOperation
			.catch(() => undefined)
			.then(() =>
				innerContextMenuOperation({
					what,
					callback,
					force,
				}),
			);
		return pendingContextMenuOperation;
	}

	/**
	 * Removes existing context menu items.
	 *
	 * @param {boolean} [force=false] - Whether to remove menu items even when the
	 * local visibility state says none are currently tracked.
	 */
	async function removeMenuItems(force = false) {
		if (!force && !areMenuItemsVisible) return;
		try {
			await BROWSER.contextMenus.removeAll();
			areMenuItemsVisible = false;
		} catch (error) {
			const msg =
				await TranslationService.getTranslations("error_cxm_remove");
			console.error(msg, error);
		}
	}

	/**
	 * Ensures context menu items are registered in the browser. Visibility is
	 * controlled by each item's `documentUrlPatterns`, not by the active tab.
	 *
	 * @param {string} what - A string identifier to specify the action that triggered the context menu check. This is used in the notification.
	 * @param {function} [callback=null] - A callback to call at the end of the execution
	 * @return {Promise} the promise with the queued operation
	 */
	function checkAddRemoveContextMenus(what, callback = null) {
		return queueContextMenuOperation({ what, callback });
	}

	/**
	 * Rebuilds context menu items so translated labels and command shortcuts stay current.
	 * Visibility remains controlled by each item's `documentUrlPatterns`.
	 *
	 * @param {string} what - A string identifier to specify the action that triggered the context menu refresh.
	 * @return {Promise} the promise with the queued operation
	 */
	function refreshContextMenus(what) {
		return queueContextMenuOperation({ what, force: true });
	}

	/**
	 * Registers browser listeners once for this context-menu instance.
	 *
	 * @return {void}
	 */
	function startContextMenus() {
		if (hasStarted) return;
		hasStarted = true;
		BROWSER.contextMenus.onClicked.addListener(async (info, _) => {
			const browserTabUrl = (await bg_getCurrentBrowserTab())?.url;
			const url = info.linkUrl ?? info.pageUrl ?? browserTabUrl;
			const message = {
				what:
					CMD_AND_CXM_MAP_TO_WHAT[info.menuItemId] ?? info.menuItemId,
				tabUrl: Tab.minifyURL(url),
				label: info.linkText,
				url: Tab.expandURL(url, browserTabUrl),
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
						message.pageUrl = Tab.expandURL(
							info.pageUrl,
							browserTabUrl,
						);
					}
					if (info.linkUrl != null) {
						message.linkTabUrl = Tab.minifyURL(info.linkUrl);
						message.linkUrl = Tab.expandURL(
							info.linkUrl,
							browserTabUrl,
						);
					}
					message.linkTabLabel = info.linkText;
					break;
				default:
					if (!ALL_CXM_KEYS.has(info.menuItemId)) {
						message.what = TOAST_WARNING;
						message.message = `Received unknown context menu: ${info.menuItemId}`;
					}
					break;
			}
			await bg_notify(message);
		});

		BROWSER.storage.onChanged.addListener(async (changes) => {
			const pickedLanguageObj = changes[SETTINGS_KEY]?.newValue?.filter(
				(el) => el.id === USER_LANGUAGE,
			);
			if (pickedLanguageObj != null && pickedLanguageObj.length > 0) {
				await refreshContextMenus();
			}
		});
	}

	return {
		checkAddRemoveContextMenus,
		refreshContextMenus,
		removeMenuItems,
		startContextMenus,
	};
}

let contextMenusModule = null;

/**
 * Gets default context-menu behavior, creating it on first use.
 *
 * @return {ReturnType<typeof createContextMenusModule>} Context-menu API.
 */
function getContextMenusModule() {
	contextMenusModule ??= createContextMenusModule();
	return contextMenusModule;
}

/**
 * Registers context-menu browser listeners.
 *
 * @return {void}
 */
export function startContextMenus() {
	getContextMenusModule().startContextMenus();
}

/**
 * Ensures context menu items are registered in the browser.
 *
 * @param {string} what - Identifier for action triggering menu check.
 * @param {function} [callback=null] - Callback run after menu creation.
 * @return {Promise<void>} Promise for queued operation.
 */
export function checkAddRemoveContextMenus(what, callback = null) {
	return getContextMenusModule().checkAddRemoveContextMenus(what, callback);
}

/**
 * Rebuilds context menu labels and command shortcuts.
 *
 * @param {string} what - Identifier for action triggering refresh.
 * @return {Promise<void>} Promise for queued operation.
 */
export function refreshContextMenus(what) {
	return getContextMenusModule().refreshContextMenus(what);
}

/**
 * Removes context menu items.
 *
 * @param {boolean} [force=false] - Whether to remove untracked items.
 * @return {Promise<void>} Promise resolving after removal.
 */
export function removeMenuItems(force = false) {
	return getContextMenusModule().removeMenuItems(force);
}

/**
 * Clears cached context-menu behavior for tests.
 *
 * @return {void}
 */
export function resetContextMenuStateForTests() {
	contextMenusModule = null;
}
