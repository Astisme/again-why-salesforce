"use strict";
import {
	CXM_PIN_TAB,
	CXM_REMOVE_TAB,
	CXM_UNPIN_TAB,
	HIDDEN_CLASS,
	MODAL_ID,
	PIN_TAB_CLASS,
	TOAST_ERROR,
	TOAST_WARNING,
	TUTORIAL_EVENT_CLOSE_MANAGE_TABS,
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
	TUTORIAL_EVENT_REORDERED_TABS_TABLE,
} from "../../core/constants.js";
import {
	getInnerElementFieldBySelector,
	injectStyle,
} from "../../core/functions.js";
import Tab from "../../core/tab.js";
import {
	ensureAllTabsAvailability,
	TabContainer,
} from "../../core/tabContainer.js";
import { getTranslations } from "../../core/translator.js";

import { setupDragForTable, setupDragForUl } from "../dragHandler.js";
import {
	createManageTabRow,
	generateManageTabsModal,
	handleLightningLinkClick,
} from "../generator.js";
import {
	makeDuplicatesBold,
	reorderTabsUl,
	sf_afterSet,
} from "./content-runtime.js";
import { showToast } from "../toast.js";
import { getCurrentHref, getModalHanger } from "../sf-elements.js";
import { updateModalBodyOverflow } from "../modal-layout.js";
import {
	createManageTabsModule as createManageTabsPureModule,
} from "../module/manageTabs-module.js";

/**
 * Creates manage-tabs helpers with runtime defaults and optional overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {{
 *   __getState: () => Record<string, unknown>;
 *   __setState: (state?: Record<string, unknown>) => void;
 *   addTr: (tabAppendElement?: HTMLElement | null) => Promise<void>;
 *   checkAddDuplicateStyle: (tabAppendElement: HTMLElement) => void;
 *   checkAddRemoveLastTr: (options?: Record<string, unknown>) => Promise<void>;
 *   checkDuplicates: (tab?: Record<string, unknown>, options?: Record<string, unknown>) => Promise<void>;
 *   checkOpenAskConfirm: (e: Event) => Promise<void>;
 *   checkRemoveTr: (e: Event) => Promise<void>;
 *   closeDropdownOnBtnClick: (e: Event, button: HTMLButtonElement) => void;
 *   closeDropdownOnTrClick: (e: Event, button: HTMLButtonElement) => void;
 *   createManageTabsModal: () => Promise<void>;
 *   getLastTr: (tbody?: HTMLElement | null) => HTMLElement | undefined;
 *   handleActionButtonClick: (e: Event, options?: Record<string, unknown>) => Promise<void>;
 *   moveTrToGivenIndex: (options?: Record<string, unknown>) => void;
 *   performAfterChecks: (tab?: Record<string, unknown>, options?: Record<string, unknown>) => void;
 *   readManagedTabsAndSave: (options?: Record<string, unknown>) => Promise<void>;
 *   reduceLoggersToElements: () => Array<{ element: HTMLElement; index: number; type: string }>;
 *   removeTr: (tabAppendElement?: HTMLElement | null, trToRemove?: HTMLElement | null, removeIndex?: number) => Promise<void>;
 *   reorderTabsTable: (options?: { fromIndex?: number; toIndex?: number }) => void;
 *   setInfoForDrag: (element: HTMLElement, listener: () => void, index: number) => void;
 *   trInputListener: (options?: Record<string, unknown>) => Promise<void>;
 *   updateLoggerIndex: (fromIndex?: number | null, toIndex?: number | null) => void;
 *   updateTabAttributes: (options?: Record<string, unknown>) => void;
 * }} Manage-tabs module API.
 */
export function createManageTabsModule(overrides = {}) {
	return createManageTabsPureModule({
		CXM_PIN_TAB: overrides.CXM_PIN_TAB ?? CXM_PIN_TAB,
		CXM_REMOVE_TAB: overrides.CXM_REMOVE_TAB ?? CXM_REMOVE_TAB,
		CXM_UNPIN_TAB: overrides.CXM_UNPIN_TAB ?? CXM_UNPIN_TAB,
		HIDDEN_CLASS: overrides.HIDDEN_CLASS ?? HIDDEN_CLASS,
		MODAL_ID: overrides.MODAL_ID ?? MODAL_ID,
		PIN_TAB_CLASS: overrides.PIN_TAB_CLASS ?? PIN_TAB_CLASS,
		TOAST_ERROR: overrides.TOAST_ERROR ?? TOAST_ERROR,
		TOAST_WARNING: overrides.TOAST_WARNING ?? TOAST_WARNING,
		TUTORIAL_EVENT_CLOSE_MANAGE_TABS:
			overrides.TUTORIAL_EVENT_CLOSE_MANAGE_TABS ??
				TUTORIAL_EVENT_CLOSE_MANAGE_TABS,
		TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL:
			overrides.TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL ??
				TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
		TUTORIAL_EVENT_REORDERED_TABS_TABLE:
			overrides.TUTORIAL_EVENT_REORDERED_TABS_TABLE ??
				TUTORIAL_EVENT_REORDERED_TABS_TABLE,
		CustomEvent: overrides.CustomEvent ?? globalThis.CustomEvent,
		Tab: overrides.Tab ?? Tab,
		TabContainer: overrides.TabContainer ?? TabContainer,
		confirm: overrides.confirm ?? globalThis.confirm,
		createManageTabRow: overrides.createManageTabRow ?? createManageTabRow,
		document: overrides.document ?? globalThis.document,
		ensureAllTabsAvailability: overrides.ensureAllTabsAvailability ??
			ensureAllTabsAvailability,
		generateManageTabsModal: overrides.generateManageTabsModal ??
			generateManageTabsModal,
		getCurrentHref: overrides.getCurrentHref ?? getCurrentHref,
		getInnerElementFieldBySelector:
			overrides.getInnerElementFieldBySelector ??
				getInnerElementFieldBySelector,
		getModalHanger: overrides.getModalHanger ?? getModalHanger,
		getTranslations: overrides.getTranslations ?? getTranslations,
		handleLightningLinkClick: overrides.handleLightningLinkClick ??
			handleLightningLinkClick,
		injectStyle: overrides.injectStyle ?? injectStyle,
		makeDuplicatesBold: overrides.makeDuplicatesBold ?? makeDuplicatesBold,
		reorderTabsUl: overrides.reorderTabsUl ?? reorderTabsUl,
		setTimeout: overrides.setTimeout ?? globalThis.setTimeout,
		setupDragForTable: overrides.setupDragForTable ?? setupDragForTable,
		setupDragForUl: overrides.setupDragForUl ?? setupDragForUl,
		sf_afterSet: overrides.sf_afterSet ?? sf_afterSet,
		showToast: overrides.showToast ?? showToast,
		updateModalBodyOverflow: overrides.updateModalBodyOverflow ??
			updateModalBodyOverflow,
	});
}

const manageTabsModule = createManageTabsModule();

/**
 * Shows the manage-tabs modal using runtime defaults.
 *
 * @return {Promise<void>}
 */
export function createManageTabsModal() {
	return manageTabsModule.createManageTabsModal();
}

/**
 * Handles clicks on manage-tabs row action buttons using runtime defaults.
 *
 * @param {Event} e Button click event.
 * @param {Record<string, unknown>} [options={}] Action options.
 * @return {Promise<void>}
 */
export function handleActionButtonClick(e, options = {}) {
	return manageTabsModule.handleActionButtonClick(e, options);
}
