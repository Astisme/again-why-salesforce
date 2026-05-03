"use strict";

import * as generatorRuntime from "./runtime/generator-runtime.js";

/**
 * Creates generator helpers with optional dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {Record<string, unknown>} Generator module API.
 */
export function createGeneratorModule(overrides = {}) {
	return generatorRuntime.createGeneratorModule(overrides);
}

/**
 * Handles the click event for a Lightning Link and determines the navigation target.
 *
 * @param {Event} e Click event.
 * @return {Promise<void>}
 */
export function handleLightningLinkClick(e) {
	return generatorRuntime.handleLightningLinkClick(e);
}

/**
 * Generates and injects CSS rules based on saved tab style settings.
 *
 * @return {Promise<void>} Resolves once styles are updated.
 */
export function generateStyleFromSettings() {
	return generatorRuntime.generateStyleFromSettings();
}

/**
 * Generates the HTML for a tab row.
 *
 * @param {Object} [row={}] Tab data.
 * @param {Object} [conf={}] Rendering configuration.
 * @return {HTMLElement} Generated row element.
 */
export function generateRowTemplate(row = {}, conf = {}) {
	return generatorRuntime.generateRowTemplate(row, conf);
}

/**
 * Generates an SLDS-styled toast message element.
 *
 * @param {string | string[]} message Message key(s).
 * @param {string} [status=undefined] Toast status.
 * @return {Promise<HTMLElement>} Toast element.
 */
export function generateSldsToastMessage(message, status = undefined) {
	return generatorRuntime.generateSldsToastMessage(message, status);
}

/**
 * Generates an SLDS section wrapper with title.
 *
 * @param {string | null} [sectionTitle=null] Section title key.
 * @return {Promise<{ divParent: HTMLElement; section: HTMLElement }>} Section elements.
 */
export function generateSection(sectionTitle = null) {
	return generatorRuntime.generateSection(sectionTitle);
}

/**
 * Generates a generic SLDS modal.
 *
 * @param {Object} [options={}] Modal options.
 * @return {Promise<Record<string, unknown>>} Modal API.
 */
export function generateSldsModal(options = {}) {
	return generatorRuntime.generateSldsModal(options);
}

/**
 * Generates a radio button group.
 *
 * @param {string} name Group name.
 * @param {Object} [radio0={}] First radio definition.
 * @param {Object} [radio1={}] Second radio definition.
 * @param {...Object} otherRadioDefs Additional radio definitions.
 * @return {{ getSelectedRadioButtonValue: () => string | undefined; radioGroup: HTMLDivElement }} Radio group API.
 */
export function generateRadioButtons(
	name,
	radio0 = {},
	radio1 = {},
	...otherRadioDefs
) {
	return generatorRuntime.generateRadioButtons(
		name,
		radio0,
		radio1,
		...otherRadioDefs,
	);
}

/**
 * Generates the "open other org" modal.
 *
 * @param {Object} [options={}] Prefilled tab values.
 * @return {Promise<Record<string, unknown>>} Modal API.
 */
export function generateOpenOtherOrgModal(options = {}) {
	return generatorRuntime.generateOpenOtherOrgModal(options);
}

/**
 * Generates an SLDS file input wrapper.
 *
 * @param {string} wrapperId Wrapper id.
 * @param {string} inputElementId Input id.
 * @param {string} acceptedType Accepted mime/type list.
 * @param {boolean} [singleFile=true] Whether single file is allowed.
 * @param {boolean} [allowDrop=true] Whether drag/drop is enabled.
 * @param {boolean} [preventFileSelection=true] Whether to prevent manual file selection.
 * @param {boolean} [required=false] Whether input is required.
 * @return {Promise<{ fileInputWrapper: HTMLElement; inputContainer: HTMLInputElement }>} File input API.
 */
export function generateSldsFileInput(
	wrapperId,
	inputElementId,
	acceptedType,
	singleFile = true,
	allowDrop = true,
	preventFileSelection = true,
	required = false,
) {
	return generatorRuntime.generateSldsFileInput(
		wrapperId,
		inputElementId,
		acceptedType,
		singleFile,
		allowDrop,
		preventFileSelection,
		required,
	);
}

/**
 * Generates a checkbox input with label.
 *
 * @param {string} id Checkbox id.
 * @param {string} label Label key.
 * @param {boolean} [checked=false] Checked state.
 * @return {Promise<HTMLLabelElement>} Checkbox label element.
 */
export function generateCheckboxWithLabel(id, label, checked = false) {
	return generatorRuntime.generateCheckboxWithLabel(id, label, checked);
}

/**
 * Generates the update-tab modal.
 *
 * @param {string | null} label Tab label.
 * @param {string | null} url Tab URL.
 * @param {string | null} org Tab org.
 * @return {Promise<Record<string, unknown>>} Modal API.
 */
export function generateUpdateTabModal(label, url, org) {
	return generatorRuntime.generateUpdateTabModal(label, url, org);
}

/**
 * Generates an SLDS help tooltip with icon.
 *
 * @param {Object} [options={}] Help options.
 * @return {Record<string, unknown>} Tooltip elements.
 */
export function generateHelpWith_i_popup(options = {}) {
	return generatorRuntime.generateHelpWith_i_popup(options);
}

/**
 * Generates a modal with selectable tab list.
 *
 * @param {Array<Record<string, unknown>>} [tabs=[]] Candidate tabs.
 * @param {Object} [options={}] Modal options.
 * @return {Promise<Record<string, unknown>>} Modal API.
 */
export function generateSldsModalWithTabList(tabs = [], options = {}) {
	return generatorRuntime.generateSldsModalWithTabList(tabs, options);
}

/**
 * Creates one row for the manage-tabs modal.
 *
 * @param {Object} [row={}] Row data.
 * @param {Object} [config={}] Row configuration.
 * @return {Promise<Record<string, unknown>>} Row API.
 */
export function createManageTabRow(row = {}, config = {}) {
	return generatorRuntime.createManageTabRow(row, config);
}

/**
 * Generates the manage-tabs modal.
 *
 * @param {Array<Record<string, unknown>>} [tabs=[]] Managed tabs.
 * @param {Object} [options={}] Modal options.
 * @return {Promise<Record<string, unknown>>} Modal API.
 */
export function generateManageTabsModal(tabs = [], options = {}) {
	return generatorRuntime.generateManageTabsModal(tabs, options);
}

/**
 * Generates the review/sponsor SVG block.
 *
 * @return {Record<string, unknown>} SVG and link elements.
 */
export function generateReviewSponsorSvgs() {
	return generatorRuntime.generateReviewSponsorSvgs();
}

/**
 * Generates tutorial overlay elements.
 *
 * @return {Promise<Record<string, unknown>>} Tutorial elements.
 */
export function generateTutorialElements() {
	return generatorRuntime.generateTutorialElements();
}

/**
 * Shows a Salesforce-styled confirm modal and resolves the user choice.
 *
 * @param {Object} [options={}] Prompt labels and text.
 * @return {Promise<boolean>} True when user confirms.
 */
export function sldsConfirm(options = {}) {
	return generatorRuntime.sldsConfirm(options);
}
