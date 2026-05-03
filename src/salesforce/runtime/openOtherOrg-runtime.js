"use strict";
import {
	HTTPS,
	LIGHTNING_FORCE_COM,
	MODAL_ID,
	SALESFORCE_URL_PATTERN,
	SETUP_LIGHTNING,
	TOAST_ERROR,
	TOAST_WARNING,
} from "../../core/constants.js";
import { getSettings } from "../../core/functions.js";
import { getTranslations } from "../../core/translator.js";
import Tab from "../../core/tab.js";
import { ensureAllTabsAvailability } from "../../core/tabContainer.js";

import { generateOpenOtherOrgModal, sldsConfirm } from "../generator.js";
import {
	createOpenOtherOrgModule as createOpenOtherOrgPureModule,
} from "../module/openOtherOrg-module.js";
import { getCurrentHref, getModalHanger } from "../sf-elements.js";
import { showToast } from "../toast.js";

/**
 * Creates the open-other-org runtime module with dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @param {string} [overrides.https=HTTPS] Protocol prefix.
 * @param {string} [overrides.lightningForceCom=LIGHTNING_FORCE_COM] Salesforce domain suffix.
 * @param {RegExp} [overrides.salesforceUrlPattern=SALESFORCE_URL_PATTERN] Validation pattern for org hosts.
 * @param {string} [overrides.setupLightning=SETUP_LIGHTNING] Setup path prefix.
 * @param {string} [overrides.toastError=TOAST_ERROR] Error toast status.
 * @param {string} [overrides.toastWarning=TOAST_WARNING] Warning toast status.
 * @param {(keys: string | string[]) => Promise<unknown>} [overrides.getSettingsFn=getSettings] Settings resolver.
 * @param {(message: string | string[] | unknown[], connector?: string) => Promise<string | string[]>} [overrides.getTranslationsFn=getTranslations] Translation resolver.
 * @param {{
 *   containsSalesforceId: (url: string | null) => boolean;
 *   extractOrgName: (value: string | null | undefined) => string;
 *   minifyURL: (value: string | null | undefined) => string;
 * }} [overrides.tabRef=Tab] Tab helper object.
 * @param {() => Promise<{ getSingleTabByData: (data: Record<string, unknown>) => { label?: string; url?: string; } }>} [overrides.ensureAllTabsAvailabilityFn=ensureAllTabsAvailability] Saved-tab container resolver.
 * @param {(options: { label: string | null; org: string | null; url: string | null; }) => Promise<{
 *   closeButton: {
 *     click: () => void | Promise<void>;
 *   };
 *   getSelectedRadioButtonValue: () => string | null;
 *   inputContainer: {
 *     addEventListener: (type: string, listener: (event: {
 *       preventDefault: () => void;
 *       target: { value: string };
 *     }) => void | Promise<void>) => void;
 *     value: string;
 *   };
 *   modalParent: unknown;
 *   saveButton: {
 *     addEventListener: (type: string, listener: (event: {
 *       preventDefault: () => void;
 *       target: { value: string };
 *     }) => void | Promise<void>) => void;
 *   };
 * }>} [overrides.generateOpenOtherOrgModalFn=generateOpenOtherOrgModal] Modal generator.
 * @param {string} [overrides.modalId=MODAL_ID] Active modal element id.
 * @param {(message: string | string[], status?: string) => Promise<void> | void} [overrides.showToastFn=showToast] Toast function.
 * @param {() => string} [overrides.getCurrentHrefFn=getCurrentHref] Current href resolver.
 * @param {() => { appendChild: (element: unknown) => unknown } | null} [overrides.getModalHangerFn=getModalHanger] Modal hanger resolver.
 * @param {{ getElementById: (id: string) => unknown } | undefined} [overrides.documentRef=globalThis.document] Document-like object.
 * @param {{ href?: string } | undefined} [overrides.locationRef=globalThis.location] Location-like object.
 * @param {{ info: (message: unknown) => void }} [overrides.consoleRef=console] Console-like object.
 * @param {(options?: {
 *   body?: string | string[];
 *   cancelLabel?: string;
 *   closeLabel?: string;
 *   confirmLabel?: string;
 * }) => boolean | Promise<boolean>} [overrides.sldsConfirmFn=sldsConfirm] Confirm callback.
 * @param {(url: string | URL, target?: string) => unknown} [overrides.openFn=globalThis.open] Window open callback.
 * @param {{ new(input: string): URL }} [overrides.urlCtor=URL] URL constructor.
 * @return {{
 *   createOpenOtherOrgModal: (options?: { label?: string | null; org?: string | null; url?: string | null; }) => Promise<void>;
 * }} Open-other-org runtime API.
 */
export function createOpenOtherOrgModule({
	https = HTTPS,
	lightningForceCom = LIGHTNING_FORCE_COM,
	salesforceUrlPattern = SALESFORCE_URL_PATTERN,
	setupLightning = SETUP_LIGHTNING,
	toastError = TOAST_ERROR,
	toastWarning = TOAST_WARNING,
	getSettingsFn = getSettings,
	getTranslationsFn = getTranslations,
	tabRef = Tab,
	ensureAllTabsAvailabilityFn = ensureAllTabsAvailability,
	generateOpenOtherOrgModalFn = generateOpenOtherOrgModal,
	modalId = MODAL_ID,
	showToastFn = showToast,
	getCurrentHrefFn = getCurrentHref,
	getModalHangerFn = getModalHanger,
	documentRef = globalThis.document,
	locationRef = globalThis.location,
	consoleRef = console,
	sldsConfirmFn = sldsConfirm,
	openFn = globalThis.open,
	urlCtor = URL,
} = {}) {
	return createOpenOtherOrgPureModule({
		https,
		lightningForceCom,
		salesforceUrlPattern,
		setupLightning,
		toastError,
		toastWarning,
		getSettingsFn,
		getTranslationsFn,
		tabRef,
		ensureAllTabsAvailabilityFn,
		generateOpenOtherOrgModalFn,
		modalId,
		showToastFn,
		getCurrentHrefFn,
		getModalHangerFn,
		documentRef,
		locationRef,
		consoleRef,
		sldsConfirmFn,
		openFn,
		urlCtor,
	});
}

const openOtherOrgModule = createOpenOtherOrgModule();

/**
 * Shows the open-other-org modal using runtime defaults.
 *
 * @param {Object} [options={}] Modal context values.
 * @param {string|null} [options.label=null] Tab label.
 * @param {string|null} [options.url=null] Tab URL suffix.
 * @param {string|null} [options.org=null] Current org name.
 * @return {Promise<void>} Promise resolved once setup is complete.
 */
export function createOpenOtherOrgModal(options = {}) {
	return openOtherOrgModule.createOpenOtherOrgModal(options);
}
