"use strict";
import {
	BROWSER,
	EXTENSION_NAME,
	HIDDEN_CLASS,
	TOAST_ERROR,
	TOAST_WARNING,
} from "../core/constants.js";
import { injectStyle } from "../core/functions.js";
import Tab from "../core/tab.js";
import {
	ensureAllTabsAvailability,
	TabContainer,
} from "../core/tabContainer.js";
import { getTranslations } from "../core/translator.js";

import {
	generateCheckboxWithLabel,
	generateSection,
	generateSldsFileInput,
	generateSldsModal,
	generateSldsModalWithTabList,
	MODAL_ID,
} from "./generator.js";
import { createImportPureModule } from "./import-module.js";
import { sf_afterSet } from "./content-runtime.js";
import { showToast } from "./toast.js";
import { getModalHanger, getSetupTabUl } from "./sf-elements.js";

/**
 * Creates the import module API with runtime defaults and override support.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @param {{ runtime?: { getURL?: (path: string) => string } }} [overrides.BROWSER=BROWSER] Browser API object.
 * @param {string} [overrides.EXTENSION_NAME=EXTENSION_NAME] Extension name/id.
 * @param {string} [overrides.HIDDEN_CLASS=HIDDEN_CLASS] Hidden CSS utility class.
 * @param {string} [overrides.MODAL_ID=MODAL_ID] Modal id used by generator modals.
 * @param {string} [overrides.TOAST_ERROR=TOAST_ERROR] Error toast type.
 * @param {string} [overrides.TOAST_WARNING=TOAST_WARNING] Warning toast type.
 * @param {unknown} [overrides.Tab=Tab] Tab helper object.
 * @param {unknown} [overrides.TabContainer=TabContainer] TabContainer helper object.
 * @param {() => Promise<unknown>} [overrides.ensureAllTabsAvailability=ensureAllTabsAvailability] Saved-tab container resolver.
 * @param {(keys: string | string[]) => Promise<string | string[]>} [overrides.getTranslations=getTranslations] Translation resolver.
 * @param {(id: string, i18nKey: string, checked: boolean) => Promise<unknown>} [overrides.generateCheckboxWithLabel=generateCheckboxWithLabel] Checkbox generator.
 * @param {() => Promise<{ section: unknown; divParent: unknown }>} [overrides.generateSection=generateSection] Section generator.
 * @param {(importId: string, fileInputId: string, accept: string) => Promise<{ fileInputWrapper: unknown; inputContainer: unknown }>} [overrides.generateSldsFileInput=generateSldsFileInput] File input generator.
 * @param {(options: { modalTitle: string }) => Promise<{ modalParent: unknown; article: unknown; saveButton: unknown; closeButton: unknown }>} [overrides.generateSldsModal=generateSldsModal] Modal generator.
 * @param {(tabContainer: unknown, options: Record<string, string>) => Promise<{ modalParent: unknown; saveButton: unknown; closeButton: unknown; getSelectedTabs: () => { tabs: unknown[]; selectedAll: boolean } }>} [overrides.generateSldsModalWithTabList=generateSldsModalWithTabList] Tab-picker modal generator.
 * @param {(id: string, options: { css?: string; link?: string }) => unknown} [overrides.injectStyle=injectStyle] Style injector.
 * @param {(options: {
 *   shouldReload?: boolean;
 *   tabs?: {
 *     importTabs: (
 *       json: string,
 *       config: Record<string, boolean>,
 *     ) => Promise<number>;
 *   } | null;
 *   what?: string;
 * }) => void} [overrides.sf_afterSet=sf_afterSet] Content post-update hook.
 * @param {(message: string | unknown[], status?: string) => void | Promise<void>} [overrides.showToast=showToast] Toast helper.
 * @param {() => unknown} [overrides.getModalHanger=getModalHanger] Modal hanger resolver.
 * @param {() => unknown} [overrides.getSetupTabUl=getSetupTabUl] Setup-tab UL resolver.
 * @param {{
 *   createElement: (tagName: string) => HTMLElement;
 *   getElementById: (id: string) => HTMLElement | null;
 * }} [overrides.documentRef=globalThis.document] Document-like object.
 * @return {{
 *   __getInputModalParent: () => unknown;
 *   __setInputModalParent: (value: unknown) => void;
 *   createImportModal: () => Promise<void>;
 *   filterForUnexpectedTabKeys: (tabs?: Record<string, unknown>[] | null) => unknown[];
 *   generateSldsImport: () => Promise<{
 *     closeButton: HTMLElement;
 *     inputContainer: HTMLInputElement;
 *     saveButton: HTMLElement;
 *   }>;
 *   getTabsFromJSON: (jsonWithTabs?: Record<string, unknown> | null) => unknown[];
 *   makeValidTabs: (
 *     tabs?: Record<string, unknown>[] | null,
 *     mapping?: { label?: string; org?: string; url?: string },
 *   ) => unknown[];
 *   readChangeOrDropFiles: (event: Event) => Promise<void>;
 *   readFile: (files: FileList | File[] | File) => Promise<void>;
 *   showFileImport: () => Promise<void>;
 *   showTabSelectThenImport: (files?: File[], importConfig?: Record<string, boolean>) => Promise<void>;
 * }} Import module API.
 */
export function createImportModule(overrides = {}) {
	return createImportPureModule({
		browserRef: overrides.BROWSER ?? BROWSER,
		extensionName: overrides.EXTENSION_NAME ?? EXTENSION_NAME,
		hiddenClass: overrides.HIDDEN_CLASS ?? HIDDEN_CLASS,
		modalId: overrides.MODAL_ID ?? MODAL_ID,
		toastError: overrides.TOAST_ERROR ?? TOAST_ERROR,
		toastWarning: overrides.TOAST_WARNING ?? TOAST_WARNING,
		tabRef: overrides.Tab ?? Tab,
		tabContainerRef: overrides.TabContainer ?? TabContainer,
		ensureAllTabsAvailabilityFn: overrides.ensureAllTabsAvailability ??
			ensureAllTabsAvailability,
		getTranslationsFn: overrides.getTranslations ?? getTranslations,
		generateCheckboxWithLabelFn: overrides.generateCheckboxWithLabel ??
			generateCheckboxWithLabel,
		generateSectionFn: overrides.generateSection ?? generateSection,
		generateSldsFileInputFn: overrides.generateSldsFileInput ??
			generateSldsFileInput,
		generateSldsModalFn: overrides.generateSldsModal ?? generateSldsModal,
		generateSldsModalWithTabListFn:
			overrides.generateSldsModalWithTabList ??
				generateSldsModalWithTabList,
		injectStyleFn: overrides.injectStyle ?? injectStyle,
		sfAfterSetFn: overrides.sf_afterSet ?? sf_afterSet,
		showToastFn: overrides.showToast ?? showToast,
		getModalHangerFn: overrides.getModalHanger ?? getModalHanger,
		getSetupTabUlFn: overrides.getSetupTabUl ?? getSetupTabUl,
		documentRef: overrides.documentRef ?? globalThis.document,
	});
}

const importModule = createImportModule();

/**
 * Displays the import modal using runtime defaults.
 *
 * @return {Promise<void>}
 */
export function createImportModal() {
	return importModule.createImportModal();
}
