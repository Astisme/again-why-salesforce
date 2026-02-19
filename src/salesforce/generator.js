"use strict";
import {
	BROWSER,
	CXM_PIN_TAB,
	CXM_REMOVE_TAB,
	CXM_UNPIN_TAB,
	EXTENSION_GITHUB_LINK,
	EXTENSION_LABEL,
	EXTENSION_NAME,
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	HIDDEN_CLASS,
	HTTPS,
	LIGHTNING_FORCE_COM,
	LINK_NEW_BROWSER,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_CLASS,
	ORG_TAB_STYLE_KEY,
	PIN_TAB_CLASS,
	SETUP_LIGHTNING,
	TAB_STYLE_HOVER,
	TAB_STYLE_TOP,
	TOAST_ERROR,
	TOAST_SUCCESS,
	USE_LIGHTNING_NAVIGATION,
} from "/constants.js";
import {
	getCssRule,
	getCssSelector,
	getPinnedSpecificKey,
	getSettings,
	getStyleSettings,
	performLightningRedirect,
} from "/functions.js";
import Tab from "/tab.js";
import { ensureAllTabsAvailability, TabContainer } from "/tabContainer.js";
import ensureTranslatorAvailability from "/translator.js";

import { getCurrentHref, showToast } from "./content.js";
import { updateModalBodyOverflow } from "./manageTabs.js";

const TOAST_ID = `${EXTENSION_NAME}-toast`;
export const MODAL_ID = `${EXTENSION_NAME}-modal`;
const MODAL_CONFIRM_ID = `${EXTENSION_NAME}-modal-confirm`;

/**
 * Generates a random number with the specified number of digits.
 * - Calculates the lower bound as 10^(digits - 1) (e.g., 10 for 2 digits, 100 for 3 digits).
 * - Multiplies a random value (0 to 1) by the range (9 * 10^(digits - 1)) and adds the lower bound.
 * - Ensures the result is a whole number with the correct number of digits.
 *
 * @param {number} digits - The number of digits for the random number. Must be greater than 1.
 * @return {number} A random number with the specified number of digits
 * @throws Error when digits <= 1
 */
function getRng_n_digits(digits = 1) {
	if (digits <= 1) {
		throw new Error("error_required_params");
	}
	const tenToTheDigits = Math.pow(10, digits - 1);
	return Math.floor(Math.random() * 9 * tenToTheDigits) +
		tenToTheDigits;
}

/**
 * Determines the target for a link based on the click event and URL.
 *
 * @param {Event} e - The click event triggered by the link.
 * @param {string} url - The URL of the link being clicked.
 * @return {string} The target for the link, either "_blank" or "_top".
 */
function _getLinkTarget(e, url) {
	return e.ctrlKey || e.metaKey || !url.includes(SETUP_LIGHTNING)
		? "_blank"
		: "_top";
}

/**
 * Handles the click event for a Lightning Link and determines the appropriate target for navigation.
 *
 * @param {Event} e - the click event
 */
export async function handleLightningLinkClick(e) {
	e.preventDefault();
	const currentTarget = e.currentTarget.target;
	const metaCtrl = { ctrlKey: e.ctrlKey, metaKey: e.metaKey };
	const url = e.currentTarget.href;
	if (url == null) {
		showToast("error_redirect", TOAST_ERROR);
		return;
	}
	(await ensureAllTabsAvailability())
		.handleClickTabByData({ url: Tab.minifyURL(url) });
	const settings = await getSettings([
		LINK_NEW_BROWSER,
		USE_LIGHTNING_NAVIGATION,
	]);
	const fallbackTarget = currentTarget === ""
		? _getLinkTarget(metaCtrl, url)
		: currentTarget;
	const target =
		settings?.some((setting) =>
				setting.id === LINK_NEW_BROWSER && setting.enabled
			)
			? "_blank"
			: fallbackTarget;
	// open link into new page when requested or if the user is clicking the favourite tab one more time
	if (
		target === "_blank" || url === getCurrentHref() ||
		settings?.some((setting) =>
			setting.id === USE_LIGHTNING_NAVIGATION && setting.enabled
		)
	) {
		open(url, target);
	} else {
		performLightningRedirect(url);
	}
}

/**
 * Checks if two arrays are equal in content and order.
 * @param {Array} arr1 - First array to compare.
 * @param {Array} arr2 - Second array to compare.
 * @return {boolean} True if arrays are equal, otherwise false.
 */
function areArraysEqual(arr1, arr2) {
	return (arr1 == null && arr2 == null) ||
		(
			arr1 != null && arr2 != null &&
			arr1.length === arr2.length &&
			JSON.stringify(arr1) === JSON.stringify(arr2)
		);
}

let oldSettings = null;
/**
 * Determines if tab settings have been updated compared to previous settings.
 * @param {Object} settings - Current settings to compare.
 * @return {boolean} True if settings were updated, otherwise false.
 */
function wereSettingsUpdated(settings) {
	return oldSettings == null ||
		Object.keys(settings).some((key) =>
			!areArraysEqual(oldSettings[key], settings[key])
		);
}

/**
 * Maps style IDs to their corresponding pseudo-selectors.
 * @param {string} id - The style ID
 * @return {string} The pseudo-selector string
 */
function _getPseudoSelector(id) {
	switch (id) {
		case TAB_STYLE_HOVER:
			return ":hover";
		case TAB_STYLE_TOP:
			return "::before";
		default:
			return "";
	}
}
/**
 * Appends pseudo-selector rules to the style element.
 * @param {HTMLStyleElement} style - The style element to append to
 * @param {Array} pseudoRules - Array of pseudo rules to process
 * @param {boolean} isGeneric - Whether this is for generic Tab styles
 * @param {boolean} isPinned - Whether this is for pinned Tab styles
 */
function _appendPseudoRules({
	style,
	pseudoRules = [],
	isGeneric = true,
	isPinned = false,
} = {}) {
	for (const rule of pseudoRules) {
		const pseudoSelector = _getPseudoSelector(rule.id);
		const selector = getCssSelector({
			isInactive: !rule.forActive,
			isGeneric,
			pseudoElement: pseudoSelector,
			isPinned,
		});
		style.textContent += `${selector}{ ${
			getCssRule(rule.id, rule.value)
		} }`;
	}
}
/**
 * Checks if a style ID requires pseudo-selector handling.
 * @param {string} id - The style ID to check
 * @return {boolean} True if this is a pseudo rule
 */
function _isPseudoRule(id) {
	return id === TAB_STYLE_HOVER || id === TAB_STYLE_TOP;
}
/**
 * Builds CSS rules for active/inactive tabs and separates pseudo rules.
 *
 * @param {Object} [param0={}] - an object contains the following parameters
 * @param {Object[]} [param0.list=[]] - Array of style elements to process
 * @param {boolean} [param0.isGeneric=false] - Whether this is for generic Tab styles
 * @param {boolean} [param0.isPinned=false] - Whether this is for pinned Tab styles
 *
 * @return {Object} Object containing activeCss, inactiveCss, and pseudoRules
 */
function _buildCssRules({
	list = [],
	isGeneric = false,
	isPinned = false,
} = {}) {
	let inactiveCss = `${
		getCssSelector({ isInactive: true, isGeneric, isPinned })
	} { `;
	let activeCss = `${
		getCssSelector({ isInactive: false, isGeneric, isPinned })
	} {`;
	const pseudoRules = [];
	for (const element of list) {
		if (_isPseudoRule(element.id)) {
			pseudoRules.push(element);
			continue;
		}
		const rule = getCssRule(element.id, element.value);
		if (element.forActive) {
			activeCss += rule;
		} else {
			inactiveCss += rule;
		}
	}
	inactiveCss += "}";
	activeCss += "}";
	return { activeCss, inactiveCss, pseudoRules };
}

/**
 * Gets existing style element or creates a new one.
 * @param {boolean} isGeneric - Whether this is for generic Tab styles
 * @param {boolean} isPinned - Whether this is for pinned Tab styles
 * @return {HTMLStyleElement} The style element
 */
function _getOrCreateStyleElement({
	isGeneric = false,
	isPinned = false,
} = {}) {
	const styleId = `${EXTENSION_NAME}-${
		getPinnedSpecificKey({ isGeneric, isPinned })
	}`;
	const existingStyle = document.getElementById(styleId);
	if (existingStyle != null) {
		existingStyle.textContent = "";
		return existingStyle;
	}
	const style = document.createElement("style");
	style.id = styleId;
	return style;
}

/**
 * Processes a style list by building CSS and appending to document head.
 *
 * @param {Object} [param0={}] - an object contains the following parameters
 * @param {Object[]} [param0.list=[]] - Array of style elements to process
 * @param {boolean} [param0.isGeneric=false] - Whether this is for generic Tab styles
 * @param {boolean} [param0.isPinned=false] - Whether this is for pinned Tab styles
 */
function _processStyleList({
	list = [],
	isGeneric = false,
	isPinned = false,
} = {}) {
	const style = _getOrCreateStyleElement({ isGeneric, isPinned });
	const { activeCss, inactiveCss, pseudoRules } = _buildCssRules({
		list,
		isGeneric,
		isPinned,
	});
	style.textContent = `${inactiveCss}${activeCss}`;
	_appendPseudoRules({ style, pseudoRules, isGeneric, isPinned });
	document.head.appendChild(style);
}
/**
 * Generates and injects CSS rules based on saved tab style settings.
 *
 * - Fetches both generic and org settings and exits if unchanged.
 * - Removes any existing `<style>` elements for these keys.
 * - Builds separate CSS rules for active vs. inactive tabs.
 * - Handles pseudo-selectors (`:hover`, `::before`) for special rules.
 * - Appends the assembled `<style>` element to the document head.
 * @return {Promise<void>} Resolves once styles are updated.
 */
export async function generateStyleFromSettings() {
	const settings = await getStyleSettings();
	if (settings == null || !wereSettingsUpdated(settings)) {
		return;
	}
	oldSettings = settings;
	const styleLists = [
		{
			list: settings[GENERIC_TAB_STYLE_KEY],
			isGeneric: true,
			isPinned: false,
		},
		{
			list: settings[ORG_TAB_STYLE_KEY],
			isGeneric: false,
			isPinned: false,
		},
		{
			list: settings[GENERIC_PINNED_TAB_STYLE_KEY],
			isGeneric: true,
			isPinned: true,
		},
		{
			list: settings[ORG_PINNED_TAB_STYLE_KEY],
			isGeneric: false,
			isPinned: true,
		},
	];
	for (const el of styleLists) {
		if (el.list?.length > 0) {
			_processStyleList(el);
		}
	}
}

/**
 * Generates the HTML for a Tab row.
 *
 * @param {Object} row - The Tab data object containing label and URL.
 * @param {string} row.label - The label of the Tab.
 * @param {string} row.url - The URL of the Tab.
 * @param {string} row.org - The org of the org-specific Tab.
 *
 * @param {Object} conf - the configuration of the row
 * @param {boolean} [conf.hide=false] - True to hide the row
 * @param {boolean} [conf.isPinned=false] - True if the row is one of the pinned ones
 * @param {number} [conf.index=0] - the index of the row template to be built
 *
 * @return {HTMLElement} - The generated list item element representing the tab.
 */
export function generateRowTemplate(
	{ label = null, url = null, org = null } = {},
	{
		hide = false,
		isPinned = false,
		index = 0,
	} = {},
) {
	const miniURL = Tab.minifyURL(url);
	const expURL = Tab.expandURL(url, getCurrentHref());
	const li = document.createElement("li");
	li.setAttribute("role", "presentation");
	li.classList.add(
		"oneConsoleTabItem",
		"tabItem",
		"slds-context-bar__item",
		"borderRight",
		"navexConsoleTabItem",
		EXTENSION_NAME,
	);
	li.draggable = "true";
	li.dataset.auraClass = "navexConsoleTabItem";
	li.dataset.rowIndex = index;
	if (hide) {
		li.style.display = "none";
	}
	const a = document.createElement("a");
	a.dataset.draggable = "true";
	a.setAttribute("role", "tab");
	a.setAttribute("title", miniURL); // popup showing where the Tab is pointing to
	a.setAttribute("aria-selected", "false");
	a.setAttribute("href", expURL);
	a.classList.add("tabHeader", "slds-context-bar__label-action");
	a.style.zIndex = 0;
	a.addEventListener("click", handleLightningLinkClick);
	li.appendChild(a);
	const span = document.createElement("span");
	span.classList.add("label", "slds-truncate");
	span.textContent = label;
	if (org != null) {
		span.classList.add(ORG_TAB_CLASS);
		span.dataset.org = org;
	}
	if (isPinned) {
		span.classList.add(PIN_TAB_CLASS);
	}
	a.appendChild(span);
	// Highlight the tab related to the current page
	if (getCurrentHref() === expURL) {
		li.classList.add("slds-is-active");
	}
	return li;
}

/**
 * Generates an SLDS-styled toast message with a specified message, success, and warning types.
 *
 * @param {string} message - The message to display in the toast.
 * @param {string} [status="success"]  - The toast type.
 * @throws {Error} Throws an error if required parameters are missing or invalid.
 * @param {string} status - The toast type.
 * @return {HTMLElement} The generated toast container element.
 */
export async function generateSldsToastMessage(
	message,
	status = TOAST_SUCCESS,
) {
	const translator = await ensureTranslatorAvailability();
	if (message == null || message === "") {
		throw new Error(await translator.translate("error_toast_generation")); // [en] "Unable to generate Toast Message."
	}
	const toastContainer = document.createElement("div");
	const randomNumber10digits = getRng_n_digits(10);
	toastContainer.id = `${TOAST_ID}-${randomNumber10digits}`;
	toastContainer.classList.add(
		"toastContainer",
		"slds-notify_container",
		"slds-is-relative",
	);
	toastContainer.style.pointerEvents = "none";
	toastContainer.style.zIndex = "9002";
	const toast = document.createElement("div");
	toast.setAttribute("role", "alertdialog");
	toast.setAttribute("aria-describedby", "toastDescription7382:0");
	toast.setAttribute("aria-label", status);
	toast.dataset.key = status;
	toast.classList.add(
		`slds-theme--${status}`,
		"slds-notify--toast",
		"slds-notify",
		"slds-notify--toast",
		"forceToastMessage",
	);
	toast.dataset.auraClass = "forceToastMessage";
	const iconContainer = document.createElement("lightning-icon");
	iconContainer.setAttribute("icon-name", `utility:${status}`);
	iconContainer.classList.add(
		`slds-icon-utility-${status}`,
		"toastIcon",
		"slds-m-right--small",
		"slds-no-flex",
		"slds-align-top",
		"slds-icon_container",
	);
	iconContainer.style.alignSelf = "center";
	const boundarySpan = document.createElement("span");
	boundarySpan.style.cssText =
		"--sds-c-icon-color-background: var(--slds-c-icon-color-background, transparent)";
	boundarySpan.setAttribute("part", "boundary");
	const primitiveIcon = document.createElement("lightning-primitive-icon");
	primitiveIcon.setAttribute("size", "small");
	primitiveIcon.setAttribute("variant", "inverse");
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.classList.add("slds-icon", "slds-icon_small");
	svg.setAttribute("focusable", "false");
	svg.dataset.key = status;
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("viewBox", "0 0 520 520");
	svg.setAttribute("part", "icon");
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute(
		"d",
		status === "success" || status === "info"
			? "M260 20a240 240 0 100 480 240 240 0 100-480zm134 180L241 355c-6 6-16 6-22 0l-84-85c-6-6-6-16 0-22l22-22c6-6 16-6 22 0l44 45a10 10 0 0015 0l112-116c6-6 16-6 22 0l22 22c7 6 7 16 0 23z"
			: "M260 20C128 20 20 128 20 260s108 240 240 240 240-108 240-240S392 20 260 20zM80 260a180 180 0 01284-147L113 364a176 176 0 01-33-104zm180 180c-39 0-75-12-104-33l251-251a180 180 0 01-147 284z",
	);
	// Assemble icon
	g.appendChild(path);
	svg.appendChild(g);
	primitiveIcon.appendChild(svg);
	boundarySpan.appendChild(primitiveIcon);
	iconContainer.appendChild(boundarySpan);
	const assistiveText = document.createElement("span");
	assistiveText.classList.add("slds-assistive-text");
	assistiveText.textContent = status;
	iconContainer.appendChild(assistiveText);
	const toastContent = document.createElement("div");
	toastContent.classList.add("toastContent", "slds-notify__content");
	const contentInner = document.createElement("div");
	contentInner.classList.add("slds-align-middle", "slds-hyphenate");
	const descriptionDiv = document.createElement("div");
	descriptionDiv.id = "toastDescription7382:0";
	const translatedMessageSplit = (await translator.translate(message)).split(
		"\n",
	);
	for (const msg_split of translatedMessageSplit) {
		const messageSpan = document.createElement("div");
		messageSpan.classList.add(
			"toastMessage",
			"slds-text-heading--small",
			"forceActionsText",
		);
		messageSpan.dataset.auraClass = "forceActionsText";
		messageSpan.textContent = msg_split;
		descriptionDiv.appendChild(messageSpan);
	}
	// Assemble the message
	contentInner.appendChild(descriptionDiv);
	toastContent.appendChild(contentInner);
	// Assemble the toast
	toast.appendChild(iconContainer);
	toast.appendChild(toastContent);
	toastContainer.appendChild(toast);
	return toastContainer;
}

/**
 * Creates and returns an abbreviation element indicating a required field.
 *
 * The function constructs an <abbr> element, applies the "slds-required" class,
 * sets the "title" attribute to "required" and the "part" attribute to "required",
 * and sets its text content to an asterisk ("*").
 *
 * @return {HTMLElement} The <abbr> element representing the required indicator.
 */
async function generateRequired() {
	const translator = await ensureTranslatorAvailability();
	const requiredElement = document.createElement("abbr");
	requiredElement.classList.add("slds-required");
	requiredElement.setAttribute(
		"title",
		await translator.translate("required"),
	);
	requiredElement.setAttribute("part", "required");
	requiredElement.textContent = "*";
	return requiredElement;
}

/**
 * Creates an input element with specified attributes.
 *
 * @param {Object} [config={}] - Configuration object for the input.
 * @param {string} config.id - The id for the input.
 * @param {string} config.label - The label text for the input.
 * @param {string} [config.type="text"] - The type of the input element (e.g., "text", "password").
 * @param {boolean} [config.required=false] - Indicates if the input is required.
 * @param {boolean} [config.enabled=trie] - Indicates if the input is enabled.
 * @param {null} [config.placeholder=null] - Placeholder text for the input.
 * @param {null} [config.prepend=null] - Configuration for an input element to prepend.
 * @param {null} [config.append=null] - Configuration for an input element to append.
 * @param {null} [config.style=null] - Additional inline styles for the main input element.
 * @param {null} [config.value=null] - The value to be inserted in the input element.
 * @param {null} [config.title=null] - The title of the element
 * @param {boolean} [config.isTextArea=false] - True to create a textarea instead of a simple input field
 *
 * @param {Object} [translateConfig={}] - Configuration object for the translation
 * @param {boolean} [translateConfig.translateLabel=true] - True to translate the label
 * @param {boolean} [translateConfig.translatePlaceholder=true] - True to translate the placeholder
 * @param {boolean} [translateConfig.translateTitle=true] - True to translate the title
 *
 * @return {HTMLInputElement} The created input element.
 */
async function createInputElement(
	{
		id = null,
		label = null,
		type,
		placeholder,
		required = false,
		enabled = true,
		style = null,
		value = null,
		title = null,
		isTextArea = false,
	},
	{
		translateLabel = true,
		translatePlaceholder = true,
		translateTitle = true,
		//translateValue = true
	} = {},
) {
	const translator = await ensureTranslatorAvailability();
	const input = document.createElement(isTextArea ? "textarea" : "input");
	input.classList.add("slds-input");
	input.setAttribute("part", "input");
	input.setAttribute("maxlength", "255");
	id && (input.id = id);
	if (label) {
		let msg_tranLabel = label;
		if (translateLabel) {
			msg_tranLabel = await translator.translate(label);
		}
		input.setAttribute("name", msg_tranLabel);
	}
	type && input.setAttribute("type", type);
	if (placeholder) {
		let msg_tranPlaceholder = placeholder;
		if (translatePlaceholder) {
			msg_tranPlaceholder = await translator.translate(placeholder);
		}
		input.setAttribute("placeholder", msg_tranPlaceholder);
	}
	required && input.setAttribute("required", true);
	enabled === false && input.setAttribute("disabled", true);
	style && (input.style = style);
	value && (input.value = value);
	if (title) {
		let msg_tranTitle = title;
		if (translateTitle) {
			msg_tranTitle = await translator.translate(title);
		}
		input.setAttribute("title", msg_tranTitle);
	}
	return input;
}
/**
 * Generates a customizable input element wrapped in a Salesforce-styled form structure.
 * - Dynamically generates a unique `id` for the input using `getRng_n_digits(10)`.
 * - Wraps the input in a Salesforce-styled stacked form element.
 * - Supports additional inputs before (`prepend`) or after (`append`) the main input.
 * - Applies optional attributes like `placeholder`, `required`, and `style`.
 * - Maintains Salesforce Lightning Design System (SLDS) styling conventions.
 *
 * @param {Object} [config={}] - Configuration object for the input.
 * @param {*} config.label - The label text for the input.
 * @param {string} [config.type="text"] - The type of the input element (e.g., "text", "password").
 * @param {boolean} [config.required=false] - Indicates if the input is required.
 * @param {null} [config.placeholder=null] - Placeholder text for the input.
 * @param {null} [config.prepend=null] - Configuration for an input element to prepend.
 * @param {null} [config.append=null] - Configuration for an input element to append.
 * @param {null} [config.style=null] - Additional inline styles for the main input element.
 * @param {null} [config.value=null] - The value to be inserted in the input element.
 * @param {null} [config.title=null] - The title of the element
 * @param {boolean} [config.isTextArea=false] - True to create a textarea instead of a simple input field
 *
 * @param {Object} [translateConfig={}] - Configuration object for the translation
 * @param {boolean} [translateConfig.translateLabel=true] - True to translate the label
 * @param {boolean} [translateConfig.translatePlaceholder=true] - True to translate the placeholder
 * @param {boolean} [translateConfig.translateTitle=true] - True to translate the title
 *
 * @return {Object} - An object containing:
 *   - `inputParent`: The parent `div` containing the entire input structure.
 *   - `inputContainer`: The main input element.
 */
async function generateInput({
	label,
	type = "text",
	required = false,
	placeholder = null,
	prepend = null,
	append = null,
	style = null,
	value = null,
	title = null,
	isTextArea = false,
} = {}, {
	translateLabel = true,
	translatePlaceholder = true,
	translateTitle = true,
	//translateValue = true
} = {}) {
	const translator = await ensureTranslatorAvailability();
	const options = { translateLabel, translatePlaceholder, translateTitle };
	const inputParent = document.createElement("div");
	inputParent.setAttribute("name", "input");
	const formElement = document.createElement("div");
	formElement.classList.add("slds-form-element", "slds-form-element_stacked");
	formElement.setAttribute("variant", "label-stacked");
	inputParent.appendChild(formElement);
	const exportParts = document.createElement("div");
	exportParts.setAttribute(
		"exportparts",
		"input-text, input-container, input, required",
	);
	exportParts.setAttribute("variant", "label-stacked");
	formElement.appendChild(exportParts);
	const formElementLabel = document.createElement("div");
	formElementLabel.classList.add("slds-form-element__label", "slds-no-flex");
	formElementLabel.setAttribute("part", "input-text");
	formElementLabel.style.display = "unset"; // makes the elements inside have full width
	exportParts.appendChild(formElementLabel);
	const inputId = `${EXTENSION_NAME}-${getRng_n_digits(10)}`;
	const labelElement = document.createElement("label");
	labelElement.classList.add("slds-form-element__label", "slds-no-flex");
	labelElement.setAttribute("for", inputId);
	formElementLabel.appendChild(labelElement);
	if (required) {
		labelElement.appendChild(await generateRequired());
	}
	let msg_label = label;
	if (translateLabel) {
		msg_label = await translator.translate(label);
	}
	labelElement.append(msg_label);
	const inputWrapper = document.createElement("div");
	inputWrapper.classList.add("slds-form-element__control", "slds-grow");
	inputWrapper.setAttribute("part", "input-container");
	inputWrapper.setAttribute("type", type);
	formElementLabel.appendChild(inputWrapper);
	if (prepend != null) {
		const prepChild = await createInputElement(prepend, options);
		inputWrapper.appendChild(prepChild);
	}
	const inputContainer = await createInputElement({
		id: inputId,
		label,
		type,
		placeholder,
		required,
		style,
		value,
		title,
		isTextArea,
	}, options);
	inputWrapper.appendChild(inputContainer);
	if (append != null) {
		const appChild = await createInputElement(append, options);
		inputWrapper.appendChild(appChild);
	}
	return { inputParent, inputContainer };
}

/**
 * Generates a customizable Salesforce-styled section with a title and a layout structure.
 *
 * @param {string} sectionTitle - The title of the section to be displayed.
 *
 * @return {Object} - An object containing:
 *   - `section`: The root `records-record-layout-section` element that wraps the section.
 *   - `divParent`: A container div element for additional content inside the section.
 *
 * - Creates a `records-record-layout-section` component with a nested layout adhering to Salesforce's design standards.
 * - Includes a section title styled with SLDS (Salesforce Lightning Design System).
 * - Builds a nested grid layout inside the section for content organization.
 * - Adds empty slots (`divParent` and cloned `borderSpacer`) for future customization or dynamic content injection.
 */
export async function generateSection(sectionTitle = null) {
	const translator = await ensureTranslatorAvailability();
	const section = document.createElement("records-record-layout-section");
	section.setAttribute("lwc-692i7qiai51-host", "");
	if (sectionTitle != null) {
		const newDiv = document.createElement("div");
		newDiv.setAttribute("lwc-mlenr16lk9", "");
		newDiv.classList.add("slds-card__body", "slds-card__body_inner");
		section.appendChild(newDiv);
		const innerDiv = document.createElement("div");
		innerDiv.setAttribute("lwc-mlenr16lk9", "");
		innerDiv.classList.add(
			"section-layout-container",
			"slds-section",
			"slds-is-open",
		);
		newDiv.appendChild(innerDiv);
		const h3 = document.createElement("h3");
		h3.setAttribute("lwc-mlenr16lk9", "");
		h3.classList.add(
			"label",
			"slds-section__title",
			"slds-truncate",
			"slds-p-around_x-small",
			"slds-theme_shade",
		);
		innerDiv.appendChild(h3);
		const span = document.createElement("span");
		span.setAttribute("lwc-mlenr16lk9", "");
		span.classList.add("slds-truncate");
		const tranSectionTitle = await translator.translate(sectionTitle);
		span.setAttribute("title", tranSectionTitle);
		span.textContent = tranSectionTitle;
		h3.appendChild(span);
	}
	const progressiveContainer = document.createElement("div");
	progressiveContainer.classList.add(
		"section-content",
		"slds-size_1-of-1",
		"slds-grid",
	);
	section.appendChild(progressiveContainer);
	const borderSpacer = document.createElement("div");
	borderSpacer.classList.add("column", "flex-width");
	borderSpacer.setAttribute("slot", "columns");
	progressiveContainer.appendChild(borderSpacer);
	const columns = document.createElement("div");
	columns.classList.add(
		"slds-col",
		"slds-p-horizontal_small",
		"slds-p-vertical_x-small",
	);
	borderSpacer.appendChild(columns);
	const gridCols = document.createElement("div");
	gridCols.classList.add("slds-grid", "slds-col", "slds-has-flexi-truncate");
	gridCols.setAttribute("role", "listitem");
	columns.appendChild(gridCols);
	const gridStack = document.createElement("div");
	gridStack.classList.add("slds-grid", "slds-size_1-of-1", "label-stacked");
	gridCols.appendChild(gridStack);
	const hanger = document.createElement("div");
	hanger.classList.add("slds-size_1-of-1", "field_textarea");
	gridStack.appendChild(hanger);
	const divParent = document.createElement("div");
	progressiveContainer.appendChild(divParent);
	progressiveContainer.appendChild(borderSpacer.cloneNode(true));
	return { section, divParent };
}

/**
 * Generates a Salesforce Lightning Design System (SLDS)-styled modal dialog.
 *
 * @param {string} modalTitle - The title of the modal.
 * @param {string} [saveButtonLabel="continue"] The text to translate to use for the submit button
 * @return {Object} An object containing key elements of the modal:
 * - modalParent: The main modal container element.
 * - article: The content area within the modal.
 * - saveButton: The save button element for user actions.
 * - closeButton: The close button element for closing the modal.
 * - buttonContainer: The container for the footer of the modal
 */
export async function generateSldsModal({
	modalTitle = "",
	saveButtonLabel = "continue",
} = {}) {
	const translator = await ensureTranslatorAvailability();
	const modalParent = document.createElement("div");
	modalParent.id = MODAL_ID;
	modalParent.classList.add(
		"DESKTOP",
		"uiModal--medium",
		"uiModal--recordActionWrapper",
		"uiModal",
		"forceModal",
		"open",
		"active",
	);
	modalParent.dataset.auraClass =
		"uiModal--medium uiModal--recordActionWrapper uiModal forceModal";
	modalParent.setAttribute("aria-hidden", "false");
	modalParent.style.display = "block";
	modalParent.style.zIndex = "9001";
	const awsfStyle = document.createElement("style");
	awsfStyle.textContent =
		`.${HIDDEN_CLASS} { display:none; visibility:hidden; } .again-why-salesforce :is([disabled=true], td[data-draggable=false]) { cursor: not-allowed !important; pointer-events: painted; }`;
	modalParent.appendChild(awsfStyle);
	const backdropDiv = document.createElement("div");
	backdropDiv.setAttribute("tabindex", "-1");
	backdropDiv.classList.add(
		"modal-glass",
		"slds-backdrop",
		"fadein",
		"slds-backdrop_open",
	);
	backdropDiv.style.opacity = "0.8";
	modalParent.appendChild(backdropDiv);
	const dialog = document.createElement("div");
	dialog.setAttribute("role", "dialog");
	dialog.setAttribute("tabindex", "-1");
	dialog.setAttribute("aria-modal", "true");
	dialog.classList.add("panel", "slds-modal", "slds-fade-in-open");
	dialog.style.opacity = "1";
	dialog.setAttribute(
		"aria-label",
		`${EXTENSION_LABEL}${
			modalTitle != null && modalTitle !== "" ? ": " + modalTitle : ""
		}`,
	);
	modalParent.appendChild(dialog);
	const modalContainer = document.createElement("div");
	modalContainer.classList.add("modal-container", "slds-modal__container");
	dialog.appendChild(modalContainer);
	const modalHeader = document.createElement("div");
	modalHeader.classList.add(
		"modal-header",
		"slds-modal__header",
		"empty",
		"slds-modal__header_empty",
	);
	modalContainer.appendChild(modalHeader);
	const closeButton = document.createElement("button");
	closeButton.setAttribute("type", "button");
	const msg_cancelClose = await translator.translate("cancel_close");
	closeButton.setAttribute("title", msg_cancelClose);
	closeButton.classList.add(
		"slds-button",
		"slds-button_icon",
		"slds-modal__close",
		"closeIcon",
		"slds-button_icon-bare",
	);
	modalHeader.appendChild(closeButton);
	closeButton.addEventListener("click", () => modalParent.remove());
	backdropDiv.addEventListener("click", () => closeButton.click());
	const closeIcon = document.createElement("lightning-primitive-icon");
	closeIcon.setAttribute("variant", "bare");
	closeButton.appendChild(closeIcon);
	const closeSvg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	);
	closeSvg.setAttribute("focusable", "false");
	closeSvg.setAttribute("aria-hidden", "true");
	closeSvg.setAttribute("viewBox", "0 0 520 520");
	closeSvg.classList.add("slds-button__icon", "slds-button__icon_large");
	closeIcon.appendChild(closeSvg);
	const closeGroupElement = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"g",
	);
	closeSvg.appendChild(closeGroupElement);
	const closePath = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"path",
	);
	closePath.setAttribute(
		"d",
		"M310 254l130-131c6-6 6-15 0-21l-20-21c-6-6-15-6-21 0L268 212a10 10 0 01-14 0L123 80c-6-6-15-6-21 0l-21 21c-6 6-6 15 0 21l131 131c4 4 4 10 0 14L80 399c-6 6-6 15 0 21l21 21c6 6 15 6 21 0l131-131a10 10 0 0114 0l131 131c6 6 15 6 21 0l21-21c6-6 6-15 0-21L310 268a10 10 0 010-14z",
	);
	closeGroupElement.appendChild(closePath);
	const assistiveText = document.createElement("span");
	assistiveText.classList.add("slds-assistive-text");
	assistiveText.textContent = msg_cancelClose;
	closeButton.appendChild(assistiveText);
	const modalBody = document.createElement("div");
	modalBody.id = "content_1099:0";
	modalBody.classList.add(
		"modal-body",
		"scrollable",
		"slds-modal__content",
		"slds-p-around_medium",
	);
	modalBody.style.maxHeight = "65%";
	modalBody.dataset.scopedScroll = "true";
	modalContainer.appendChild(modalBody);
	const viewModeDiv = document.createElement("div");
	viewModeDiv.classList.add(
		"windowViewMode-normal",
		"oneRecordActionWrapper",
		"isModal",
		"active",
		"lafPageHost",
	);
	viewModeDiv.dataset.auraClass = "lafPageHost";
	modalBody.appendChild(viewModeDiv);
	const actionWrapperDiv = document.createElement("form");
	actionWrapperDiv.classList.add(
		"isModal",
		"inlinePanel",
		"oneRecordActionWrapper",
	);
	actionWrapperDiv.dataset.auraClass = "oneRecordActionWrapper";
	viewModeDiv.appendChild(actionWrapperDiv);
	const actionBodyDiv = document.createElement("div");
	actionBodyDiv.classList.add("actionBody");
	actionWrapperDiv.appendChild(actionBodyDiv);
	const fieldContainerDiv = document.createElement("div");
	fieldContainerDiv.classList.add(
		"slds-clearfix",
		"groupDependentFieldEnabled",
		"allow-horizontal-form",
		"wide-input-break",
		"full-width",
		"forceDetailPanelDesktop",
		"slds-p-bottom--none",
	);
	fieldContainerDiv.dataset.auraClass = "forceDetailPanelDesktop";
	actionBodyDiv.appendChild(fieldContainerDiv);
	const article = document.createElement("article");
	article.setAttribute("aria-labelledby", MODAL_ID);
	fieldContainerDiv.appendChild(article);
	const titleContainer = document.createElement("div");
	titleContainer.classList.add(
		"slds-p-around--medium",
		"slds-text-heading--medium",
	);
	titleContainer.style.textAlign = "center";
	titleContainer.style.display = "flex";
	titleContainer.style.alignItems = "center";
	titleContainer.style.justifyContent = "center";
	modalHeader.appendChild(titleContainer);
	const awsIcon = document.createElement("img");
	awsIcon.src = BROWSER.runtime.getURL("assets/icons/awsf-128.png");
	awsIcon.style.height = "2rem";
	titleContainer.appendChild(awsIcon);
	const heading = document.createElement("h2");
	heading.textContent = modalTitle;
	heading.style.marginLeft = "0.5rem";
	titleContainer.appendChild(heading);
	const legend = document.createElement("div");
	legend.classList.add(
		"required-legend",
		"slds-p-top--none",
	);
	article.appendChild(legend);
	const abbr = document.createElement("abbr");
	abbr.classList.add("slds-required");
	abbr.textContent = "*";
	legend.appendChild(abbr);
	legend.append(await translator.translate("required_info"));
	const footerContainer = document.createElement("div");
	footerContainer.classList.add("inlineFooter");
	footerContainer.style.borderTop =
		"var(--slds-g-sizing-border-2, var(--lwc-borderWidthThick, 2px)) solid var(--slds-g-color-border-1, var(--lwc-colorBorder, rgb(229, 229, 229)))";
	modalContainer.appendChild(footerContainer);
	const buttonContainerDiv = document.createElement("div");
	buttonContainerDiv.classList.add(
		"button-container",
		"slds-text-align_center",
		"forceRecordEditActions",
	);
	buttonContainerDiv.dataset.auraClass = "forceRecordEditActions";
	footerContainer.appendChild(buttonContainerDiv);
	const actionsContainerDiv = document.createElement("div");
	actionsContainerDiv.classList.add("actionsContainer");
	buttonContainerDiv.appendChild(actionsContainerDiv);
	const buttonContainerInnerDiv = document.createElement("div");
	buttonContainerInnerDiv.classList.add("button-container-inner");
	actionsContainerDiv.appendChild(buttonContainerInnerDiv);
	const cancelButton = document.createElement("button");
	cancelButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"uiButton--neutral",
		"uiButton",
		"forceActionButton",
	);
	cancelButton.setAttribute("aria-live", "off");
	cancelButton.setAttribute("type", "button");
	const msg_cancel = await translator.translate("cancel");
	cancelButton.setAttribute("title", msg_cancel);
	cancelButton.setAttribute("aria-label", "");
	cancelButton.dataset.auraClass = "uiButton forceActionButton";
	buttonContainerInnerDiv.appendChild(cancelButton);
	cancelButton.addEventListener("click", () => closeButton.click());
	const cancelSpan = document.createElement("span");
	cancelSpan.classList.add("label", "bBody");
	cancelSpan.setAttribute("dir", "ltr");
	cancelSpan.textContent = msg_cancel;
	cancelButton.appendChild(cancelSpan);
	const saveButton = document.createElement("button");
	saveButton.id = MODAL_CONFIRM_ID;
	saveButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"uiButton--brand",
		"uiButton",
		"forceActionButton",
	);
	saveButton.setAttribute("aria-live", "off");
	saveButton.setAttribute("type", "submit");
	const msg_continue = await translator.translate(saveButtonLabel);
	saveButton.setAttribute("title", msg_continue);
	saveButton.setAttribute("aria-label", "");
	saveButton.dataset.auraClass = "uiButton forceActionButton";
	buttonContainerInnerDiv.appendChild(saveButton);
	const saveSpan = document.createElement("span");
	saveSpan.classList.add("label", "bBody");
	saveSpan.setAttribute("dir", "ltr");
	saveSpan.textContent = msg_continue;
	saveButton.appendChild(saveSpan);
	/**
	 * Handles the keydown event and triggers specific actions based on the key pressed.
	 *
	 * @param {KeyboardEvent} event - The keydown event object.
	 * @return {void}
	 */
	function keyDownListener(event) {
		switch (event.key) {
			case "Escape":
				closeButton.click();
				break;
			case "Enter":
				saveButton.click();
				break;
			default:
				return;
		}
		document.removeEventListener("keydown", keyDownListener);
	}
	document.addEventListener("keydown", keyDownListener);
	return {
		modalParent,
		article,
		saveButton,
		closeButton,
		buttonContainer: buttonContainerInnerDiv,
	};
}

/**
 * Generates a group of radio button inputs wrapped in a container <div>.
 *
 * @param {string} name - The name attribute for all radio inputs, grouping them.
 * @param {Object} [radio0def] - Definition for the first radio button.
 * @param {string|null} [radio0def.id=null] - The id attribute for the radio input.
 * @param {string|null} [radio0def.value=null] - The value attribute for the radio input.
 * @param {string|null} [radio0def.label=null] - The label text for the radio button.
 * @param {boolean} [radio0def.checked=false] - Whether this radio button is checked by default.
 * @param {Object} [radio1def] - Definition for the second radio button (same shape as radio0def).
 * @param {string|null} [radio1def.id=null] - The id attribute for the radio input.
 * @param {string|null} [radio1def.value=null] - The value attribute for the radio input.
 * @param {string|null} [radio1def.label=null] - The label text for the radio button.
 * @param {boolean} [radio1def.checked=false] - Whether this radio button is checked by default.
 * @param {...Object} otherRadioDefs - Additional radio button definitions.
 *
 * @return {{ radioGroup: HTMLDivElement, getSelectedRadioButtonValue: () => string|undefined }}
 *   An object containing:
 *   - radioGroup: the container <div> element with all radio buttons appended.
 *   - getSelectedRadioButtonValue: a function that returns the value of the currently selected radio button or undefined if none selected.
 */
export function generateRadioButtons(name, {
	id: radio0Id = null,
	value: radio0Value = null,
	label: radio0Label = null,
	checked: radio0Checked = false,
} = {}, {
	id: radio1Id = null,
	value: radio1Value = null,
	label: radio1Label = null,
	checked: radio1Checked = false,
} = {}, ...otherRadioDefs) {
	const radio0def = {
		id: radio0Id,
		value: radio0Value,
		label: radio0Label,
		checked: radio0Checked,
	};
	const radio1def = {
		id: radio1Id,
		value: radio1Value,
		label: radio1Label,
		checked: radio1Checked,
	};
	const allRadioInputs = [];
	const radioGroup = document.createElement("div");
	otherRadioDefs.push(radio0def, radio1def);
	for (const raddef of otherRadioDefs) {
		const innerSpan = document.createElement("span");
		const radio = document.createElement("input");
		radio.type = "radio";
		radio.name = name;
		radio.id = raddef.id;
		radio.value = raddef.value;
		radio.checked = raddef.checked;
		allRadioInputs.push(radio);
		innerSpan.appendChild(radio);
		const labelEl = document.createElement("label");
		labelEl.for = radio.id;
		labelEl.textContent = raddef.label;
		labelEl.style.marginLeft = "0.5em";
		innerSpan.appendChild(labelEl);
		radioGroup.appendChild(innerSpan);
	}
	/**
	 * Returns the value of the currently selected (checked) radio button from the group.
	 *
	 * @return {string|undefined} The value of the checked radio button, or undefined if none are checked.
	 */
	function getSelectedRadioButtonValue() {
		return allRadioInputs.find((inp) => inp.checked)?.value;
	}
	return { radioGroup, getSelectedRadioButtonValue };
}

/**
 * Generates and opens a modal dialog for entering another Salesforce Org's information.
 *
 * @param {Object} options - An object containing optional parameters:
 * @param {string|null} [options.label=null] - The label for the modal. Defaults to a label fetched from saved tabs if not provided.
 * @param {string|null} [options.url=null] - The URL for the page to open in another organization.
 * @param {string|null} [options.org=null] - The org of the current page.
 * @return {Object} An object containing key elements of the modal:
 * - modalParent: The main modal container element.
 * - saveButton: The save button element for user actions.
 * - closeButton: The close button element for closing the modal.
 * - inputContainer: The container element for the org link input field.
 */
export async function generateOpenOtherOrgModal(
	{ label = null, url = null, org = null } = {},
) {
	const { modalParent, article, saveButton, closeButton } =
		await generateSldsModal({
			modalTitle: label,
		});
	const { section, divParent } = await generateSection("other_org_info");
	divParent.style.width = "100%"; // makes the elements inside have full width
	divParent.style.display = "flex";
	divParent.style.alignItems = "center";
	article.appendChild(section);
	const httpsSpan = document.createElement("span");
	httpsSpan.append(HTTPS);
	httpsSpan.style.height = "1.5em";
	divParent.appendChild(httpsSpan);
	const { inputParent, inputContainer } = await generateInput({
		label: "org_link",
		type: "text",
		required: true,
		placeholder: "other_org_placeholder",
		style:
			"width: 100%; height: 3em; resize: horizontal; word-break: break-all; overflow-y: hidden; white-space: nowrap;",
		isTextArea: true,
		value: org,
	});
	divParent.appendChild(inputParent);
	const linkEnd = document.createElement("span");
	linkEnd.append(
		`${LIGHTNING_FORCE_COM}${
			url.startsWith("/") ? "" : SETUP_LIGHTNING
		}${url}`,
	);
	linkEnd.style.width = "fit-content";
	linkEnd.style.height = "1.5em";
	linkEnd.style.wordBreak = "break-all";
	linkEnd.style.overflow = "hidden";
	divParent.appendChild(linkEnd);
	// create radio button to let the user pick where to open the link
	const translator = await ensureTranslatorAvailability();
	const { radioGroup, getSelectedRadioButtonValue } = generateRadioButtons(
		`${EXTENSION_NAME}-where-open-link`,
		{
			id: `${EXTENSION_NAME}-radio-top`,
			value: "_top",
			label: await translator.translate("open_here"),
		},
		{
			id: `${EXTENSION_NAME}-radio-blank`,
			value: "_blank",
			label: await translator.translate("open_new_tab"),
			checked: true,
		},
	);
	radioGroup.style.display = "flex";
	radioGroup.style.flexDirection = "column";
	radioGroup.style.alignItems = "center";
	article.appendChild(radioGroup);
	return {
		modalParent,
		saveButton,
		closeButton,
		inputContainer,
		getSelectedRadioButtonValue,
	};
}

/**
 * Generates an SLDS file input component with configurable file selection and drag-and-drop support.
 *
 * Depending on the parameters, this function constructs a complex DOM structure styled with SLDS classes.
 * It supports enabling/disabling drag-and-drop, preventing file selection, and toggling single or multiple file uploads.
 *
 * @param {string} wrapperId - The ID for the wrapper element that contains the file input.
 * @param {string} inputElementId - The ID for the input element.
 * @param {string} acceptedType - A string specifying the file types allowed (e.g., "image/*", ".pdf").
 * @param {boolean} [singleFile=false] - Flag indicating if only one file is allowed for upload.
 * @param {boolean} [allowDrop=true] - Flag indicating if file drop is allowed.
 * @param {boolean} [preventFileSelection=false] - Flag indicating if file selection should be prevented.
 * @param {boolean} [required=true] - Flag indicating if the file input is required.
 * @throws {Error} Throws an error if both `allowDrop` is false and `preventFileSelection` is true.
 * @throws {Error} Throws an error if required parameters are missing.
 * @return {{ fileInputWrapper: HTMLElement, inputContainer: HTMLInputElement }} An object containing:
 *   - fileInputWrapper: The wrapper element for the entire file input component.
 *   - inputContainer: The actual file input element.
 */
export async function generateSldsFileInput(
	wrapperId,
	inputElementId,
	acceptedType,
	singleFile = false,
	allowDrop = true,
	preventFileSelection = false,
	required = true,
) {
	if (
		(!allowDrop && preventFileSelection) ||
		(
			wrapperId == null || wrapperId === "" || inputElementId == null ||
			inputElementId === "" || acceptedType == null || acceptedType === ""
		)
	) {
		throw new Error(
			"error_required_params",
		);
	}
	const translator = await ensureTranslatorAvailability();
	const fileInputWrapper = document.createElement("div");
	fileInputWrapper.id = wrapperId;
	fileInputWrapper.classList.add(
		"previewMode",
		"MEDIUM",
		"forceRelatedListPreview",
	);
	fileInputWrapper.dataset.auraClass = "forceRelatedListPreview";
	fileInputWrapper.style.width = "100%";
	const innerDiv = document.createElement("div");
	fileInputWrapper.appendChild(innerDiv);
	const cardBodyDiv = document.createElement("div");
	cardBodyDiv.classList.add(
		"slds-card__body_inner",
		"forceContentFileDroppableZone",
		"forceContentRelatedListPreviewFileList",
	);
	cardBodyDiv.dataset.auraClass =
		"forceContentFileDroppableZone forceContentRelatedListPreviewFileList";
	innerDiv.appendChild(cardBodyDiv);
	const msg_file = await translator.translate("file");
	const msg_files = await translator.translate("files");
	if (preventFileSelection && allowDrop) {
		const fileSelectorDiv = document.createElement("div");
		fileSelectorDiv.classList.add(
			"slds-file-selector",
			"slds-file-selector--integrated",
			"slds-file-selector--integrated",
		);
		cardBodyDiv.appendChild(fileSelectorDiv);
		const dropzoneDiv = document.createElement("div");
		dropzoneDiv.classList.add(
			"slds-file-selector__dropzone",
			"slds-file-selector__dropzone--integrated",
		);
		fileSelectorDiv.appendChild(dropzoneDiv);
		const dropzoneBodySpan = document.createElement("span");
		dropzoneBodySpan.classList.add(
			"slds-file-selector__body",
			"slds-file-selector__body--integrated",
		);
		dropzoneDiv.appendChild(dropzoneBodySpan);
		const lightningIcon = document.createElement("lightning-icon");
		lightningIcon.classList.add(
			"slds-icon-utility-upload",
			"slds-file-selector__body-icon",
			"slds-icon",
			"slds-icon-text-default",
			"slds-button__icon",
			"slds-icon_container forceIcon",
		);
		lightningIcon.setAttribute("icon-name", "utility:upload");
		lightningIcon.dataset.auraClass = "forceIcon";
		dropzoneBodySpan.appendChild(lightningIcon);
		const iconSpan = document.createElement("span");
		iconSpan.style.setProperty(
			"--sds-c-icon-color-background",
			"var(--slds-c-icon-color-background, transparent)",
		);
		iconSpan.setAttribute("part", "boundary");
		lightningIcon.appendChild(iconSpan);
		const primitiveIcon = document.createElement(
			"lightning-primitive-icon",
		);
		primitiveIcon.setAttribute("exportparts", "icon");
		primitiveIcon.setAttribute("size", "medium");
		primitiveIcon.setAttribute("variant", "inverse");
		iconSpan.appendChild(primitiveIcon);
		const svg = document.createElement("svg");
		svg.setAttribute("focusable", "false");
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("viewBox", "0 0 520 520");
		svg.setAttribute("part", "icon");
		svg.classList.add("slds-icon");
		primitiveIcon.appendChild(svg);
		const g = document.createElement("g");
		svg.appendChild(g);
		const path = document.createElement("path");
		path.setAttribute(
			"d",
			"M485 310h-30c-8 0-15 8-15 15v100c0 8-7 15-15 15H95c-8 0-15-7-15-15V325c0-7-7-15-15-15H35c-8 0-15 8-15 15v135a40 40 0 0040 40h400a40 40 0 0040-40V325c0-7-7-15-15-15zM270 24c-6-6-15-6-21 0L114 159c-6 6-6 15 0 21l21 21c6 6 15 6 21 0l56-56c6-6 18-2 18 7v212c0 8 6 15 14 15h30c8 0 16-8 16-15V153c0-9 10-13 17-7l56 56c6 6 15 6 21 0l21-21c6-6 6-15 0-21z",
		);
		g.appendChild(path);
		const dropFilesSpan = document.createElement("span");
		dropFilesSpan.classList.add(
			"slds-file-selector__text",
			"slds-file-selector__text--integrated",
			"slds-text-heading--medium",
			"slds-text-align--center",
		);
		const msg_drop = await translator.translate("drop");
		dropFilesSpan.textContent = `${msg_drop} ${
			singleFile ? msg_file : msg_files
		}`;
		dropzoneBodySpan.appendChild(dropFilesSpan);
	}
	const dragOverDiv = document.createElement("div");
	dragOverDiv.classList.add("drag-over-body");
	cardBodyDiv.appendChild(dragOverDiv);
	const lightningInput = document.createElement("lightning-input");
	lightningInput.classList.add("slds-form-element", "lightningInput");
	dragOverDiv.appendChild(lightningInput);
	const primitiveInputFile = document.createElement(
		"lightning-primitive-input-file",
	);
	primitiveInputFile.setAttribute("exportparts", "button");
	lightningInput.appendChild(primitiveInputFile);
	const formLabelSpan = document.createElement("span");
	formLabelSpan.classList.add(
		"slds-form-element__label",
		"slds-assistive-text",
	);
	primitiveInputFile.appendChild(formLabelSpan);
	const controlDiv = document.createElement("div");
	controlDiv.classList.add("slds-form-element__control");
	primitiveInputFile.appendChild(controlDiv);
	const fileSelectorImagesDiv = document.createElement("div");
	fileSelectorImagesDiv.classList.add(
		"slds-file-selector",
		"slds-file-selector--images",
		"slds-file-selector_images",
	);
	fileSelectorImagesDiv.setAttribute("part", "file-selector");
	controlDiv.appendChild(fileSelectorImagesDiv);
	const fileDroppableZone = document.createElement(
		"lightning-primitive-file-droppable-zone",
	);
	fileDroppableZone.classList.add("slds-file-selector__dropzone");
	fileSelectorImagesDiv.appendChild(fileDroppableZone);
	const slot = document.createElement("slot");
	fileDroppableZone.appendChild(slot);
	const inputContainer = document.createElement("input");
	inputContainer.id = inputElementId;
	inputContainer.classList.add(
		"slds-file-selector__input",
		"slds-assistive-text",
	);
	inputContainer.setAttribute("accept", acceptedType);
	inputContainer.setAttribute("type", "file");
	inputContainer.setAttribute("part", "input");
	inputContainer.setAttribute("multiple", "");
	inputContainer.setAttribute("name", "fileInput");
	slot.appendChild(inputContainer);
	const fileSelectorLabel = document.createElement("label");
	fileSelectorLabel.classList.add("slds-file-selector__body");
	fileSelectorLabel.setAttribute("for", inputElementId);
	slot.appendChild(fileSelectorLabel);
	const fileSelectorButtonSpan = document.createElement("span");
	fileSelectorButtonSpan.classList.add(
		"slds-file-selector__button",
		"slds-button",
		"slds-button_neutral",
	);
	fileSelectorButtonSpan.setAttribute("part", "button");
	fileSelectorLabel.appendChild(fileSelectorButtonSpan);
	const buttonIcon = document.createElement("lightning-primitive-icon");
	buttonIcon.setAttribute("variant", "bare");
	fileSelectorButtonSpan.appendChild(buttonIcon);
	const msg_upload = await translator.translate("upload");
	fileSelectorButtonSpan.append(
		`${msg_upload} ${singleFile ? msg_file : msg_files}`,
	);
	required && fileSelectorButtonSpan.appendChild(await generateRequired());
	const buttonSvg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	);
	buttonSvg.classList.add("slds-button__icon", "slds-button__icon_left");
	buttonSvg.setAttribute("focusable", "false");
	buttonSvg.dataset.key = "upload";
	buttonSvg.setAttribute("aria-hidden", "true");
	buttonSvg.setAttribute("viewBox", "0 0 520 520");
	buttonSvg.setAttribute("part", "icon");
	buttonIcon.appendChild(buttonSvg);
	const buttonG = document.createElementNS("http://www.w3.org/2000/svg", "g");
	buttonSvg.appendChild(buttonG);
	const buttonPath = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"path",
	);
	buttonPath.setAttribute(
		"d",
		"M485 310h-30c-8 0-15 8-15 15v100c0 8-7 15-15 15H95c-8 0-15-7-15-15V325c0-7-7-15-15-15H35c-8 0-15 8-15 15v135a40 40 0 0040 40h400a40 40 0 0040-40V325c0-7-7-15-15-15zM270 24c-6-6-15-6-21 0L114 159c-6 6-6 15 0 21l21 21c6 6 15 6 21 0l56-56c6-6 18-2 18 7v212c0 8 6 15 14 15h30c8 0 16-8 16-15V153c0-9 10-13 17-7l56 56c6 6 15 6 21 0l21-21c6-6 6-15 0-21z",
	);
	buttonG.appendChild(buttonPath);
	if (allowDrop) {
		const orDropFilesSpan = document.createElement("span");
		orDropFilesSpan.classList.add(
			"slds-file-selector__text",
			"slds-medium-show",
		);
		const msg_or_drop = await translator.translate("or_drop");
		orDropFilesSpan.textContent = `${msg_or_drop} ${
			singleFile ? msg_file : msg_files
		}`;
		fileSelectorLabel.appendChild(orDropFilesSpan);
	}
	return { fileInputWrapper, inputContainer };
}

/**
 * Generates a checkbox input element with an associated label.
 *
 * @param {string} id - The unique identifier for the checkbox.
 * @param {string} label - The text to display next to the checkbox.
 * @param {boolean} [checked=false] - Whether the checkbox should be initially checked.
 * @return {HTMLLabelElement} The label element containing the checkbox input and its text.
 */
export async function generateCheckboxWithLabel(id, label, checked = false) {
	const translator = await ensureTranslatorAvailability();
	const msg_label = await translator.translate(label);
	const checkboxLabel = document.createElement("label");
	checkboxLabel.for = id;
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.id = id;
	checkbox.name = msg_label;
	checkbox.checked = checked;
	checkboxLabel.appendChild(checkbox);
	const checkboxSpan = document.createElement("span");
	checkboxSpan.style.marginLeft = "0.5rem";
	checkboxSpan.textContent = msg_label;
	checkboxLabel.append(checkboxSpan);
	return checkboxLabel;
}

/**
 * Generates a modal dialog for updating a Tab
 *
 * @param {string} label - The title of the modal tab.
 * @param {string} url - A partial URL for the target org.
 * @param {string} org - The Org to which the Tab points to.
 * @return {Object} An object containing key elements of the modal:
 * - modalParent: The main modal container element.
 * - saveButton: The save button element for user actions.
 * - closeButton: The close button element for closing the modal.
 * - labelContainer: The container element for the label input field.
 * - urlContainer: The container element for the url input field.
 * - orgContainer: The container element for the org input field.
 */
export async function generateUpdateTabModal(label, url, org) {
	const { modalParent, article, saveButton, closeButton } =
		await generateSldsModal({
			modalTitle: label,
		});
	const { section, divParent } = await generateSection("tab_information");
	divParent.style.width = "100%";
	divParent.style.display = "flex";
	divParent.style.alignItems = "center";
	article.appendChild(section);
	const { inputParent: labelParent, inputContainer: labelContainer } =
		await generateInput({
			label: "tab_label",
			type: "text",
			required: true,
			placeholder: label ?? "users",
			style: "width: 100%",
			value: label,
			title: "table_row_label",
		}, {
			translatePlaceholder: label == null,
		});
	divParent.appendChild(labelParent);
	const { inputParent: urlParent, inputContainer: urlContainer } =
		await generateInput({
			label: "tab_url",
			type: "text",
			required: true,
			placeholder: url ?? "ManageUsers/home",
			style: "width: 100%",
			value: url,
			title: "table_row_url",
		}, {
			translatePlaceholder: false,
		});
	divParent.appendChild(urlParent);
	const { inputParent: orgParent, inputContainer: orgContainer } =
		await generateInput({
			label: "tab_org",
			type: "text",
			required: false,
			placeholder: org ?? "mycustomorg",
			style: "width: 100%",
			value: org,
			title: "table_row_org_name",
		}, {
			translatePlaceholder: org == null,
		});
	divParent.appendChild(orgParent);
	return {
		modalParent,
		saveButton,
		closeButton,
		labelContainer,
		urlContainer,
		orgContainer,
	};
}

/**
 * Generates an i icon which includes information and a possibly a link to the resource
 * @param {Object} [param0={}] an object with the following keys
 * @param {null} [param0.text=null] the text to be inserted in the popup
 * @param {null} [param0.link=null] the valid URL to the resource to give deeper insights
 * @param {boolean} [param0.showTop=false] whether to show the popup at the top
 * @param {boolean} [param0.showBottom=false] whether to show the popup at the bottom
 * @param {boolean} [param0.showRight=false] whether to show the popup at the right
 * @param {boolean} [param0.showLeft=false] whether to show the popup at the left
 * @return {Object} used by the `help.js` class
 */
export function generateHelpWith_i_popup({
	text = null,
	link = null,
	showTop = false,
	showBottom = false,
	showRight = false,
	showLeft = false,
} = {}) {
	const wasCalledWithParams = text != null || link != null;
	const root = document.createElement("div");
	root.className = "help-icon";
	const anchor = document.createElement("a");
	root.append(anchor);
	anchor.className = "button";
	anchor.setAttribute("aria-describedby", "tooltip");
	const isLinkAvailable = link != null && link !== "";
	if (wasCalledWithParams && isLinkAvailable) anchor.href = link;
	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	anchor.append(svg);
	svg.setAttribute("focusable", "false");
	svg.setAttribute("aria-hidden", "true");
	svg.setAttribute("viewBox", "0 0 520 520");
	svg.setAttribute("class", "slds-button__icon");
	const g = document.createElementNS(svgNS, "g");
	svg.appendChild(g);
	const path = document.createElementNS(svgNS, "path");
	g.appendChild(path);
	path.setAttribute(
		"d",
		"M260 20a240 240 0 100 480 240 240 0 100-480zm0 121c17 0 30 13 30 30s-13 30-30 30-30-13-30-30 13-30 30-30zm50 210c0 5-4 9-10 9h-80c-5 0-10-3-10-9v-20c0-5 4-11 10-11 5 0 10-3 10-9v-40c0-5-4-11-10-11-5 0-10-3-10-9v-20c0-5 4-11 10-11h60c5 0 10 5 10 11v80c0 5 4 9 10 9 5 0 10 5 10 11z",
	);
	const assistive = document.createElement("span");
	anchor.append(assistive);
	assistive.className = "assistive";
	assistive.hidden = true;
	const tooltip = document.createElement("div");
	root.append(tooltip);
	tooltip.className = "tooltip";
	tooltip.setAttribute("role", "tooltip");
	let slot;
	const linkTip = document.createElement("div");
	linkTip.classList.add("link-tip");
	if (wasCalledWithParams) {
		tooltip.dataset.showTop = showTop ||
			(!showTop && !showBottom && !showRight && !showLeft);
		tooltip.dataset.showBottom = showBottom;
		tooltip.dataset.showRight = showRight;
		tooltip.dataset.showLeft = showLeft;
		slot = document.createElement("span");
		slot.textContent = text;
		if (!isLinkAvailable) {
			linkTip.classList.add(HIDDEN_CLASS);
		}
		// add help.css
		const linkid = `${EXTENSION_NAME}-helpcss`;
		if (!document.getElementById(linkid)) {
			const linkEl = document.createElement("link");
			linkEl.id = linkid;
			linkEl.rel = "stylesheet";
			linkEl.type = "text/css";
			linkEl.href = BROWSER.runtime.getURL("/components/help/help.css");
			document.head.appendChild(linkEl);
		}
	} else {
		slot = document.createElement("slot");
		slot.name = "text";
		slot.textContent = "Nothing to see here...";
	}
	tooltip.append(slot);
	tooltip.append(linkTip);
	(async () => {
		const translator = await ensureTranslatorAvailability();
		assistive.textContent = await translator.translate("help");
		linkTip.textContent = await translator.translate("help_tip_click_link");
	})();
	return {
		root,
		anchor,
		tooltip,
		linkTip,
		slot,
	};
}

/**
 * Creates a table header cell (th)
 * @param {string} label - The visible label text
 * @param {string} ariaLabel - The aria-label for accessibility
 * @param {string[]} classList - Additional CSS classes
 * @param {{}} [info={}] - an object used to generate an info button with a popup
 * @return {HTMLTableCellElement} The created th element
 */
function createTableHeader(
	label = "",
	ariaLabel = "",
	classList = [],
	info = {},
) {
	const th = document.createElement("th");
	th.scope = "col";
	th.classList.add(...classList);
	th.setAttribute("aria-label", ariaLabel);
	const div = document.createElement("div");
	th.append(div);
	div.textContent = label;
	if (Object.keys(info).length > 0) {
		th.style.overflow = "visible";
		div.style.display = "flex";
		div.style.alignItems = "center";
		div.style.justifyContent = "space-around";
		div.append(generateHelpWith_i_popup(info).root);
	}
	return th;
}

/**
 * Creates a complete table with headers
 * @param {Array<{label: string, ariaLabel: string, classList?: string[]}>} headers - Array of header configurations
 * @return {Object{HTMLTableElement, HTMLTbodyElement}} The created table element and its empty tbody
 */
function createTable(headers = []) {
	const table = document.createElement("table");
	table.id = "sortable-table"; // for drag handler to find it
	table.classList.add(
		"forceRecordLayout",
		"uiVirtualDataGrid--default",
		"uiVirtualDataGrid",
	);
	table.style.border =
		"var(--lwc-borderWidthThin,1px) solid var(--lwc-colorBorderSeparatorAlt,rgb(201, 201, 201))";
	table.style.borderRadius = "var(--lwc-borderRadiusMedium,0.25rem)";
	const thead = document.createElement("thead");
	thead.style.position = "sticky";
	thead.style.top = 0;
	table.appendChild(thead);
	const tr = document.createElement("tr");
	thead.appendChild(tr);
	for (const header of headers) {
		tr.appendChild(
			createTableHeader(
				header.label,
				header.ariaLabel,
				header.classList,
				header.info,
			),
		);
	}
	const tbody = document.createElement("tbody");
	table.appendChild(tbody);
	return { table, tbody };
}

/**
 * Creates a checkbox cell for a table row
 * @param {number} [tabIndex=0] The index of the checkbox (for later retrieval)
 * @param {boolean} [checked=false] if the checkbox should be checked by default
 * @return {HTMLTableCellElement} The created td element with checkbox
 */
function createCheckboxCell(tabIndex = 0, checked = false) {
	const td = document.createElement("td");
	td.classList.add(
		"visualEditorSelectableTable",
		"containsSelectionCell",
	);
	const label = document.createElement("label");
	td.appendChild(label);
	label.classList.add("visualEditorTableActionCell");
	const checkbox = document.createElement("input");
	label.appendChild(checkbox);
	checkbox.type = "checkbox";
	checkbox.name = "assignmentTableCheckbox";
	checkbox.checked = checked;
	checkbox.dataset.tabIndex = tabIndex;
	return { td, checkbox };
}

/**
 * Creates a text cell for a table row
 * @param {string} text - The text content
 * @param {string} title - The title attribute (optional)
 * @return {HTMLTableCellElement} The created td element
 */
function createTextCell(text = "", title = "") {
	const td = document.createElement("td");
	const span = document.createElement("span");
	td.appendChild(span);
	span.classList.add("uiOutputText");
	span.style.display = "inline-block";
	span.textContent = text;
	if (title) {
		span.title = title;
	}
	return td;
}

/**
 * Creates a complete table row
 * @param {Object} [tab={}] object with the following keys
 * @param {string} [tab.label=null] The Tab Label
 * @param {string} [tab.url=null] The Tab Url
 * @param {string|undefined} [tab.org=null] The Tab Org (for org-specific Tabs)
 * @param {number} [index=0] the index of the current row
 * @return {HTMLTableRowElement} The created tr element
 */
function createTableRow(
	{ label = null, url = null, org = null } = {},
	index = 0,
) {
	const tr = document.createElement("tr");
	const { td, checkbox } = createCheckboxCell(index, true);
	tr.appendChild(td);
	tr.appendChild(createTextCell(label));
	tr.appendChild(createTextCell(url));
	tr.appendChild(createTextCell(org));
	return { tr, checkbox };
}

/**
 * Creates a Table with checkboxes to select the elements
 * @param {any[]} [tabs=[]] The Tabs to show in the Table
 * @param {Object{label,ariaLabel,classList[]}[]} [headers=[]] What should be displayed inside the each `th`
 * @param {() => void} [changeListener=() => {}] change listener to all checkboxes to update button states
 * @return Object{checkboxes:HTMLInputElement[],table:HTMLTableElement} all checkboxes created and the table generated
 */
function generateTableWithCheckboxes(
	tabs = [],
	headers = [],
	changeListener = () => {},
) {
	const res = {
		checkboxes: [],
	};
	const { table, tbody } = createTable(headers);
	for (const i in tabs) {
		const { tr, checkbox } = createTableRow(tabs[i], i);
		tr.addEventListener("click", (e) => {
			if (
				e.target.tagName !== "INPUT" ||
				e.target.type !== "checkbox"
			) {
				checkbox.checked = !checkbox.checked;
				changeListener();
			}
		});
		checkbox.addEventListener("click", changeListener);
		tbody.appendChild(tr);
		res.checkboxes.push(checkbox);
	}
	return Object.assign(res, { table });
}

/**
 * Generates a modal dialog for exporting selected Tabs.
 * This function creates a modal that displays all available Tabs with checkboxes,
 * allowing users to select which Tabs to export. It includes a "Select All" / "Unselect All" button
 * for convenience.
 *
 * @param {Array} tabs - An array of Tab objects to display in the export modal.
 * @param {Object} [param1={}] object with the following keys
 * @param {string} [param1.title="export_tabs"] the title of the modal
 * @param {string} [param1.saveButtonLabel="export"] the label for the submit button
 * @param {string} [param1.explainer="select_tabs_export"] the text used to explain what to do with this modal
 * @return {Object} An object containing key elements of the modal:
 * - modalParent: The main modal container element.
 * - saveButton: The button element for confirming the selected Tabs.
 * - closeButton: The close button element for closing the modal.
 * - getSelectedTabs: A function that returns an array of selected Tab objects.
 */
/**
 * Helper function to add title and explainer to a modal article.
 * Creates and prepends a centered explainer span with translated text.
 *
 * @param {HTMLElement} article - The modal article element
 * @param {string} explainerKey - The i18n key for the explainer text
 * @return {Promise<HTMLElement>} The explainer element
 */
async function addModalExplainer(article, explainerKey) {
	const translator = await ensureTranslatorAvailability();
	const explainerEl = document.createElement("span");
	explainerEl.textContent = await translator.translate(explainerKey);
	explainerEl.style.display = "flex";
	explainerEl.style.justifyContent = "center";
	explainerEl.style.textAlign = "center";
	explainerEl.classList.add(
		"slds-p-around_medium",
		"slds-p-bottom--none",
	);
	article.prepend(explainerEl);
	return explainerEl;
}

/**
 * Helper function to create and append a modal content container (divParent).
 * Applies standard SLDS styling for modal content areas.
 *
 * @param {HTMLElement} article - The modal article element
 * @return {HTMLElement} The created and appended container element
 */
function createModalContentContainer(article) {
	const divParent = document.createElement("div");
	article.appendChild(divParent);
	divParent.classList.add(
		"forceBaseListView",
		"visualEditorModal",
		"flexipageEditorActivateContent",
		"flexipageEditorActivateRecordPage",
		"slds-p-top--none",
	);
	divParent.style.padding =
		"var(--lwc-spacingLarge,1.5rem) var(--lwc-spacingXLarge,2rem)";
	return divParent;
}

/**
 * Helper function to create a styled table cell (td).
 *
 * @param {string} text - The cell content text
 * @param {Object} options - Configuration options
 * @param {boolean} [options.wordBreak=false] - Whether to apply word-break styling
 * @return {HTMLTableCellElement} The created td element
 */
function createTableCell({
	value = "",
	placeholder = "",
	className = "",
	wordBreak = false,
} = {}) {
	const td = document.createElement("td");
	td.style.padding = "0.75rem";
	td.classList.add("slds-cell-wrap");
	const input = document.createElement("input");
	input.type = "text";
	input.className = className;
	input.value = value ?? "";
	input.placeholder = placeholder;
	input.style.width = "100%";
	input.style.padding = "0.25rem";
	if (wordBreak) {
		input.style.wordBreak = "break-all";
	}
	td.appendChild(input);
	return { td, input };
}

/**
 * Generates a modal with the given Tabs. Each row can be selected using a checkbox
 * @param {Tab[]} [tabs=[]] - the Tab array that needs to be shown in the modal
 * @param {Object} [param1={}] an object with the following keys
 * @param {string} [param1.title="export_tabs"] the title so that the modal can be recognized
 * @param {string} [param1.saveButtonLabel="export"] the label used for the submit button
 * @param {string} [param1.explainer="select_tabs_export"] a brief explanation of what the modal is supposed to do
 * @return {Object} with these keys
 *  - modalParent: containing the element to append to show the modal,
 *  - saveButton: the submit button on which to add related submit logic,
 *  - closeButton: the cancel button which removes the modal,
 *  - getSelectedTabs: function to retrieve all currently selected Tabs,
 */
export async function generateSldsModalWithTabList(tabs = [], {
	title = "export_tabs",
	saveButtonLabel = "export",
	explainer = "select_tabs_export",
} = {}) {
	const translator = await ensureTranslatorAvailability();
	const { modalParent, article, saveButton, closeButton, buttonContainer } =
		await generateSldsModal({
			modalTitle: await translator.translate(title),
			saveButtonLabel: await translator.translate(saveButtonLabel),
		});
	await addModalExplainer(article, explainer);
	// counter for how many Tabs are selected
	const tabConterOpen = document.createElement("span");
	tabConterOpen.innerHTML = "&nbsp;(";
	saveButton.appendChild(tabConterOpen);
	const tabCounter = document.createElement("span");
	tabCounter.textContent = tabs.length;
	saveButton.appendChild(tabCounter);
	const tabCounterClose = document.createElement("span");
	tabCounterClose.textContent = ")";
	saveButton.appendChild(tabCounterClose);
	// Create checkboxes for each Tab
	const headers = [
		{ label: "" },
		{ label: await translator.translate("tab_label") },
		{ label: await translator.translate("tab_url") },
		{ label: await translator.translate("tab_org") },
	];
	const selectAllButton = document.createElement("button");
	const unselectAllButton = document.createElement("button");
	/**
	 * Function to update select all button text based on checkbox states
	 */
	function updateSelectAllButtonText() {
		// this checkboxes is the one returned from generateTableWithCheckboxes
		const checkedCount = checkboxes.filter((cb) => cb.checked).length;
		tabCounter.textContent = checkedCount;
		if (checkedCount === checkboxes.length) {
			selectAllButton.setAttribute("disabled", true);
		} else {
			selectAllButton.removeAttribute("disabled");
		}
		if (checkedCount === 0) {
			unselectAllButton.setAttribute("disabled", true);
		} else {
			unselectAllButton.removeAttribute("disabled");
		}
		if (unselectAllButton.hasAttribute("disabled")) {
			saveButton.setAttribute("disabled", true);
		} else {
			saveButton.removeAttribute("disabled");
		}
	}
	const { checkboxes, table: tabsListTable } =
		await generateTableWithCheckboxes(
			tabs,
			headers,
			updateSelectAllButtonText,
		);
	// Add Tabs list container
	const divParent = createModalContentContainer(article);
	divParent.appendChild(tabsListTable);
	// Create select/unselect all button container
	// Create Select All button
	selectAllButton.setAttribute("disabled", true);
	selectAllButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"slds-button_small",
	);
	selectAllButton.textContent = await translator.translate("select_all");
	buttonContainer.prepend(selectAllButton);
	// Create Unselect All button
	unselectAllButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"slds-button_small",
	);
	unselectAllButton.textContent = await translator.translate("unselect_all");
	buttonContainer.prepend(unselectAllButton);
	selectAllButton.addEventListener("click", () => {
		for (const checkbox of checkboxes) {
			checkbox.checked = true;
		}
		updateSelectAllButtonText();
	});
	unselectAllButton.addEventListener("click", () => {
		for (const checkbox of checkboxes) {
			checkbox.checked = false;
		}
		updateSelectAllButtonText();
	});
	/**
	 * Function to get selected tabs
	 * @return {Object{selectedAll: Boolean, tabs: Array}} an object with the selected Tabs and a boolean value to represent whether all Tabs where selected
	 */
	function getSelectedTabs() {
		const selectedAll = selectAllButton.hasAttribute("disabled");
		const selectedTabs = selectedAll ? tabs : checkboxes
			.filter((checkbox) => checkbox.checked)
			.map((checkbox) =>
				tabs[Number.parseInt(checkbox.dataset.tabIndex)]
			);
		return {
			selectedAll,
			tabs: selectedTabs,
		};
	}
	return {
		modalParent,
		saveButton,
		closeButton,
		getSelectedTabs,
	};
}

/**
 * Creates a drag handle SVG icon for reordering rows
 * @param {boolean} [draggable=false] - whether the handle should be set as draggable or not
 * @return {SVGSVGElement} The drag handle SVG element
 */
function createDragHandle(draggable = false) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("width", "20");
	svg.setAttribute("height", "20");
	svg.setAttribute("fill", "currentColor");
	svg.dataset.draggable = draggable;
	// Six dots on two columns
	const rect1 = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"rect",
	);
	rect1.setAttribute("x", "6");
	rect1.setAttribute("y", "4");
	rect1.setAttribute("width", "2");
	rect1.setAttribute("height", "2");
	svg.appendChild(rect1);
	const rect2 = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"rect",
	);
	rect2.setAttribute("x", "6");
	rect2.setAttribute("y", "11");
	rect2.setAttribute("width", "2");
	rect2.setAttribute("height", "2");
	svg.appendChild(rect2);
	const rect3 = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"rect",
	);
	rect3.setAttribute("x", "6");
	rect3.setAttribute("y", "18");
	rect3.setAttribute("width", "2");
	rect3.setAttribute("height", "2");
	svg.appendChild(rect3);
	const rect4 = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"rect",
	);
	rect4.setAttribute("x", "16");
	rect4.setAttribute("y", "4");
	rect4.setAttribute("width", "2");
	rect4.setAttribute("height", "2");
	svg.appendChild(rect4);
	const rect5 = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"rect",
	);
	rect5.setAttribute("x", "16");
	rect5.setAttribute("y", "11");
	rect5.setAttribute("width", "2");
	rect5.setAttribute("height", "2");
	svg.appendChild(rect5);
	const rect6 = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"rect",
	);
	rect6.setAttribute("x", "16");
	rect6.setAttribute("y", "18");
	rect6.setAttribute("width", "2");
	rect6.setAttribute("height", "2");
	svg.appendChild(rect6);
	return svg;
}

/**
 * Helper function to create a styled button with SLDS classes.
 *
 * @param {string} text - The button text
 * @param {Object} options - Configuration options
 * @param {string} [options.variant="neutral"] - Button variant: "neutral" or "destructive"
 * @param {string} [options.action] - The data-action attribute value
 * @param {number} [options.tabIndex] - The data-tabIndex attribute value
 * @return {HTMLButtonElement} The created button element
 */
function createStyledButton(
	text,
	{ variant = "neutral", action, tabIndex } = {},
) {
	const btn = document.createElement("a");
	btn.classList.add(
		"slds-button",
		`slds-button_${variant}`,
		"slds-button_small",
		"awsf-td-button",
	);
	btn.textContent = text;
	btn.style.marginLeft = "0";
	btn.style.width = "100%";
	btn.style.justifyContent = "flex-start";
	btn.style.paddingLeft = "0.75rem";
	btn.style.borderRadius = "0";
	btn.style.border = "none";
	btn.style.textAlign = "left";
	if (action != null) {
		btn.dataset.action = action;
	}
	if (tabIndex != null) {
		btn.dataset.tabIndex = tabIndex;
	}
	return btn;
}

/**
 * Creates a table row with editable inputs for label, URL, and org.
 * Used by generateManageTabsModal for creating editable tab rows.
 *
 * @param {Object} [tab={}] an Object with the following keys
 * @param {string} [tab.label=""] the label of the Tab
 * @param {string} [tab.url=""] the url of the Tab
 * @param {string|null} [tab.org=null] the org of the Tab
 * @param {Object} [config={}] an Object with the following keys
 * @param {number} [config.index=0] The row index for data-row-index
 * @param {boolean} [config.pinned=false] whether the Tab is pinned
 * @param {boolean} [config.draggable=false] whether the tr is draggable
 * @param {boolean} [config.disabled=true] whether the tr elements should be disabled
 * @param {boolean} [config.isThisOrgTab=true] whether the tr contains a Tab related to this Org
 * @return {Promise<HTMLTableRowElement>} The created tr element
 */
export async function createManageTabRow({
	label = "",
	url = "",
	org = null,
} = {}, {
	index = 0,
	pinned = false,
	disabled = true,
	isThisOrgTab = true,
} = {}) {
	const translator = await ensureTranslatorAvailability();
	const draggable = !disabled;
	const tr = document.createElement("tr");
	tr.dataset.rowIndex = index;
	tr.classList.add(
		"slds-hint-parent",
		EXTENSION_NAME,
	);
	if (!isThisOrgTab) {
		tr.classList.add(HIDDEN_CLASS);
	}
	tr.draggable = draggable;
	tr.dataset.draggable = draggable;
	tr.dataset.isThisOrgTab = isThisOrgTab;
	// Drag handle cell
	const dragCell = document.createElement("td");
	dragCell.style.padding = "0.75rem";
	dragCell.style.width = "30px";
	dragCell.style.textAlign = "center";
	dragCell.style.cursor = "grab";
	dragCell.classList.add("slds-cell-wrap");
	dragCell.appendChild(createDragHandle(draggable));
	dragCell.dataset.draggable = draggable;
	tr.appendChild(dragCell);
	// Label cell with input
	const { td: labelTd, input: labelInput } = createTableCell({
		value: label,
		placeholder: await translator.translate("tab_label"),
		className: "label",
	});
	tr.appendChild(labelTd);
	// URL cell with input
	const { td: urlTd, input: urlInput } = createTableCell({
		value: url,
		placeholder: await translator.translate("tab_url"),
		className: "url",
		wordBreak: true,
	});
	tr.appendChild(urlTd);
	// Org cell with input
	const { td: orgTd, input: orgInput } = createTableCell({
		value: org,
		placeholder: await translator.translate("tab_org"),
		className: "org",
	});
	tr.appendChild(orgTd);
	// Actions cell with dropdown
	const actionsCell = document.createElement("td");
	tr.appendChild(actionsCell);
	actionsCell.style.padding = "0.75rem";
	actionsCell.classList.add("slds-cell-wrap", "slds-text-align_center");
	actionsCell.style.overflow = "visible";
	// Position the dropdown relative to button
	const buttonContainer = document.createElement("div");
	actionsCell.appendChild(buttonContainer);
	buttonContainer.style.position = "relative";
	buttonContainer.style.display = "inline-block";
	// Dropdown button
	const dropdownButton = document.createElement("button");
	buttonContainer.appendChild(dropdownButton);
	dropdownButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"slds-button_small",
	);
	if (disabled) {
		dropdownButton.setAttribute("disabled", true);
	}
	dropdownButton.style.position = "relative";
	dropdownButton.textContent = `▼`; // downward arrow
	dropdownButton.title = await translator.translate("actions");
	dropdownButton.dataset.name = "dropdownButton";
	// Dropdown menu container
	const dropdownMenu = document.createElement("div");
	buttonContainer.appendChild(dropdownMenu);
	dropdownMenu.classList.add(
		"actions-dropdown-menu",
		HIDDEN_CLASS,
	);
	dropdownMenu.style.position = "absolute";
	dropdownMenu.style.top = "100%";
	dropdownMenu.style.right = "0";
	dropdownMenu.style.backgroundColor = "white";
	dropdownMenu.style.border = "1px solid #d3d3d3";
	dropdownMenu.style.borderRadius = "0.25rem";
	dropdownMenu.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
	dropdownMenu.style.zIndex = "1";
	dropdownMenu.style.minWidth = "120px";
	dropdownMenu.style.padding = "0.5rem 0";
	dropdownMenu.style.display = "flex";
	dropdownMenu.style.flexDirection = "column";
	// Open button
	const openBtn = createStyledButton(
		await translator.translate("act_open"),
		{ action: "open", tabIndex: index },
	);
	if (url) {
		openBtn.href = Tab.expandURL(url, getCurrentHref());
	}
	dropdownMenu.appendChild(openBtn);
	// Pin/Unpin button (toggle - only show one at a time)
	const pinBtn = createStyledButton(
		await translator.translate("cxm_pin_tab"),
		{ action: CXM_PIN_TAB, tabIndex: index },
	);
	pinBtn.classList.add("pin-btn");
	if (pinned) {
		dragCell.classList.add(PIN_TAB_CLASS);
		pinBtn.style.display = "none";
	}
	dropdownMenu.appendChild(pinBtn);
	const unpinBtn = createStyledButton(
		await translator.translate("cxm_unpin_tab"),
		{ action: CXM_UNPIN_TAB, tabIndex: index },
	);
	unpinBtn.classList.add("unpin-btn");
	if (!pinned) {
		unpinBtn.style.display = "none";
	}
	dropdownMenu.appendChild(unpinBtn);
	// Delete button
	const deleteBtn = createStyledButton(
		await translator.translate("act_delete"),
		{ action: CXM_REMOVE_TAB, tabIndex: index },
	);
	deleteBtn.classList.add("delete-btn");
	if (label === "" && url === "") {
		deleteBtn.setAttribute("disabled", true); // disabled for empty rows
	}
	dropdownMenu.appendChild(deleteBtn);
	// Dropdown toggle functionality
	dropdownButton.addEventListener("click", (e) => {
		e.preventDefault();
		dropdownMenu.classList.toggle(HIDDEN_CLASS);
	});
	return {
		tr,
		dropdownMenu,
		dropdownButton,
		logger: {
			label: labelInput,
			url: urlInput,
			org: orgInput,
			last_input: {
				label,
				url,
				org,
			},
		},
	};
}

/**
 * Generates a modal for managing saved tabs with editable fields and drag-to-reorder functionality.
 * Allows users to edit tabs, add new tabs, and manage pinning/unpinning directly from the modal.
 *
 * @param {Array<Tab>} tabs - Array of saved Tab objects
 * @param {Object} options - Configuration options
 * @param {string} [options.title="manage_tabs"] - i18n key for modal title
 * @param {string} [options.saveButtonLabel="save"] - i18n key for save button label
 * @param {string} [options.explainer="manage_tabs_explainer"] - i18n key for explainer text
 * @return {Promise<Object>} An object containing modalParent, closeButton, tbody (for event listeners), and loggers (for tracking inputs) + deleteAllTabsButton to remove the disabled attribute when needed
 */
export async function generateManageTabsModal(tabs = [], {
	title = "manage_tabs",
	saveButtonLabel = "save",
	explainer = "manage_tabs_explainer",
} = {}) {
	const translator = await ensureTranslatorAvailability();
	const {
		modalParent,
		article,
		closeButton,
		saveButton,
		buttonContainer,
	} = await generateSldsModal({
		modalTitle: await translator.translate(title),
		saveButtonLabel: await translator.translate(saveButtonLabel),
	});
	await addModalExplainer(article, explainer);
	// Create a table-like structure for tabs
	const divParent = createModalContentContainer(article);
	const wikiLinkTab = `${EXTENSION_GITHUB_LINK}/wiki/What-is-a-Tab`;
	// Table header with drag handle column
	const headers = [
		{
			label: "",
			info: {
				text: await translator.translate("help_drag_tabs"),
				link: "",
				showRight: true,
			},
		}, // drag handle column
		{
			label: await translator.translate("tab_label"),
			info: {
				text: await translator.translate("help_tab_label"),
				link: `${wikiLinkTab}#Label`,
				showBottom: true,
			},
		},
		{
			label: await translator.translate("tab_url"),
			info: {
				text: await translator.translate("help_tab_url"),
				link: `${wikiLinkTab}#Url`,
				showBottom: true,
			},
		},
		{
			label: await translator.translate("tab_org"),
			info: {
				text: await translator.translate("help_tab_org"),
				link: `${wikiLinkTab}#Org`,
				showBottom: true,
			},
		},
		{
			label: await translator.translate("actions"),
			info: {
				text: await translator.translate("help_tab_actions"),
				link: "",
				showLeft: true,
			},
		},
	];
	const { table, tbody } = createTable(headers);
	divParent.appendChild(table);
	// add 2 new buttons to hide & show not-this-org Tabs
	// Create Show All button
	const showAllTabsButton = document.createElement("button");
	showAllTabsButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"slds-button_small",
		"show_all_tabs",
	);
	showAllTabsButton.textContent = await translator.translate("show_all_tabs");
	buttonContainer.prepend(showAllTabsButton);
	// Create Unselect All button
	const hideOtherOrgTabsButton = document.createElement("button");
	hideOtherOrgTabsButton.setAttribute("disabled", true);
	hideOtherOrgTabsButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"slds-button_small",
		"hide_other_org_tabs",
	);
	hideOtherOrgTabsButton.textContent = await translator.translate(
		"hide_other_org_tabs",
	);
	buttonContainer.prepend(hideOtherOrgTabsButton);
	showAllTabsButton.addEventListener("click", () => {
		for (
			const otherOrgTr of tbody.querySelectorAll(
				"tr[data-is-this-org-tab=false]",
			)
		) {
			otherOrgTr.classList.remove(HIDDEN_CLASS);
		}
		showAllTabsButton.setAttribute("disabled", true);
		hideOtherOrgTabsButton.removeAttribute("disabled");
		updateModalBodyOverflow(article);
	});
	hideOtherOrgTabsButton.addEventListener("click", () => {
		for (
			const otherOrgTr of tbody.querySelectorAll(
				"tr[data-is-this-org-tab=false]",
			)
		) {
			otherOrgTr.classList.add(HIDDEN_CLASS);
		}
		hideOtherOrgTabsButton.setAttribute("disabled", true);
		showAllTabsButton.removeAttribute("disabled");
		updateModalBodyOverflow(article);
	});
	// Create Delete All button
	const deleteAllTabsButton = document.createElement("button");
	// we should never set disabled=false due to chrome making the button disabled anyways
	if (tabs.length < 1) {
		deleteAllTabsButton.setAttribute("disabled", true);
	}
	deleteAllTabsButton.classList.add(
		"slds-button",
		"slds-button_neutral",
		"slds-button_small",
	);
	deleteAllTabsButton.textContent = await translator.translate(
		"delete_all",
	);
	buttonContainer.prepend(deleteAllTabsButton);
	const loggers = []; // track input changes
	// Create rows for all existing tabs
	const allDropMenus = [];
	const allTrs = [];
	const pinnedNumber = tabs[TabContainer.keyPinnedTabsNo];
	let notThisOrgTabs = 0;
	for (const i in tabs) {
		const tab = tabs[i];
		const isThisOrgTab = tab.org == null ||
			tab.org === Tab.extractOrgName(getCurrentHref());
		if (!isThisOrgTab) {
			notThisOrgTabs++;
		}
		const {
			tr,
			dropdownMenu,
			dropdownButton,
			logger,
		} = await createManageTabRow(tab, {
			index: i,
			pinned: i < pinnedNumber,
			disabled: false,
			isThisOrgTab,
		});
		allTrs.push({ tr, button: dropdownButton });
		allDropMenus.push(dropdownMenu);
		loggers.push(logger);
		tbody.appendChild(tr);
	}
	// disable the showAllTabsButton if needed
	if (notThisOrgTabs <= 0) {
		showAllTabsButton.setAttribute("disabled", true);
	}
	// Add empty row for new tabs
	const {
		tr: emptyRow,
		dropdownMenu: lastMenu,
		dropdownButton: lastButton,
		logger: lastLogger,
	} = await createManageTabRow({}, {
		index: tabs.length,
	});
	allTrs.push({ tr: emptyRow, button: lastButton });
	allDropMenus.push(lastMenu);
	loggers.push(lastLogger);
	tbody.appendChild(emptyRow);
	return {
		modalParent,
		closeButton,
		tbody,
		saveButton,
		loggers,
		deleteAllTabsButton,
		trsAndButtons: allTrs,
		dropdownMenus: allDropMenus,
	};
}

/**
 * Creates a div with a review svg and a sponsor svg which can be used to redirect the user to the extension's review page or its sponsor one.
 * By default, the svgs are hidden.
 * @return {Object} An object containing root (to add to the DOM), reviewSvg, sponsorSvg, reviewLink, sponsorLink which can be used to add titles and alts
 */
export function generateReviewSponsorSvgs() {
	const reviewSponsorContainer = document.createElement("div");
	// review link
	const reviewLink = document.createElement("a");
	reviewLink.href = "#";
	reviewSponsorContainer.appendChild(reviewLink);
	reviewLink.dataset.i18n = "write_review+-+title";
	const reviewSvg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	);
	reviewSvg.setAttribute("viewBox", "0 0 24 24");
	reviewSvg.setAttribute("fill", "none");
	reviewSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	reviewSvg.id = "review";
	reviewSvg.classList.add(HIDDEN_CLASS);
	reviewSvg.dataset.i18n = "write_review+-+alt";
	for (
		const attrs of [
			{
				opacity: "0.5",
				d: "M22 10.5V12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2H13.5",
				"stroke-width": "1.5",
				"stroke-linecap": "round",
			},
			{
				d: "M17.3009 2.80624L16.652 3.45506L10.6872 9.41993C10.2832 9.82394 10.0812 10.0259 9.90743 10.2487C9.70249 10.5114 9.52679 10.7957 9.38344 11.0965C9.26191 11.3515 9.17157 11.6225 8.99089 12.1646L8.41242 13.9L8.03811 15.0229C7.9492 15.2897 8.01862 15.5837 8.21744 15.7826C8.41626 15.9814 8.71035 16.0508 8.97709 15.9619L10.1 15.5876L11.8354 15.0091C12.3775 14.8284 12.6485 14.7381 12.9035 14.6166C13.2043 14.4732 13.4886 14.2975 13.7513 14.0926C13.9741 13.9188 14.1761 13.7168 14.5801 13.3128L20.5449 7.34795L21.1938 6.69914C22.2687 5.62415 22.2687 3.88124 21.1938 2.80624C20.1188 1.73125 18.3759 1.73125 17.3009 2.80624Z",
				"stroke-width": "1.5",
			},
			{
				opacity: "0.5",
				d: "M16.6522 3.45508C16.6522 3.45508 16.7333 4.83381 17.9499 6.05034C19.1664 7.26687 20.5451 7.34797 20.5451 7.34797M10.1002 15.5876L8.4126 13.9",
				"stroke-width": "1.5",
			},
		]
	) {
		const path = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"path",
		);
		for (const [key, value] of Object.entries(attrs)) {
			path.setAttribute(key, value);
		}
		reviewSvg.appendChild(path);
	}
	reviewLink.appendChild(reviewSvg);
	// sponsor link
	const sponsorLink = document.createElement("a");
	sponsorLink.href = "#";
	reviewSponsorContainer.appendChild(sponsorLink);
	sponsorLink.dataset.i18n = "send_tip+-+title";
	const sponsorSvg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	);
	sponsorSvg.setAttribute("viewBox", "0 0 490 490");
	sponsorSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	sponsorSvg.id = "sponsor";
	sponsorSvg.classList.add(HIDDEN_CLASS);
	sponsorSvg.dataset.i18n = "send_tip+-+alt";
	const sponsorPath = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"path",
	);
	sponsorPath.setAttribute(
		"d",
		"M128.833,334.605c32.081,29.39,62.382,57.15,76.074,82.153L245.014,490l40.096-73.247c13.688-25.004,43.988-52.766,76.068-82.158c59.669-54.669,127.3-116.632,127.653-200.181c0.144-33.927-13.428-66.322-38.218-91.217C423.278,15.745,384.441,0,344.059,0c-38.281,0-73.14,13.846-99.055,36.422C219.087,13.846,184.224,0,145.939,0C66.112,0,1.168,60.211,1.168,134.221C1.518,217.967,69.157,279.933,128.833,334.605z M145.939,45.719c54.72,0,99.067,39.607,99.067,88.502c0-48.895,44.334-88.502,99.053-88.502c54.705,0,99.261,39.607,99.053,88.502C442.674,237.755,289.858,312.866,245.006,394.8C200.14,312.866,47.319,237.755,46.887,134.221C46.887,85.326,91.225,45.719,145.939,45.719z",
	);
	sponsorSvg.appendChild(sponsorPath);
	sponsorLink.appendChild(sponsorSvg);
	return {
		root: reviewSponsorContainer,
		reviewSvg,
		sponsorSvg,
		reviewLink,
		sponsorLink,
	};
}

/**
 * Generates the HTML elements required for the tutorial overlay system.
 * Creates an overlay that covers the entire page, a message box for displaying tutorial text,
 * and a highlight box for emphasizing specific elements on the page.
 *
 * @return {Object} An object containing the generated HTML elements:
 * - {HTMLElement} overlay: A semi-transparent overlay covering the entire viewport
 * - {HTMLElement} messageBox: A positioned box for displaying tutorial messages and buttons
 * - {HTMLElement} highlightBox: A box used to highlight specific elements on the page
 */
export function generateTutorialElements() {
	const overlay = document.createElement("div");
	overlay.style.position = "fixed";
	overlay.style.top = "0";
	overlay.style.left = "0";
	overlay.style.width = "100%";
	overlay.style.height = "100%";
	overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
	overlay.style.zIndex = "10000";
	overlay.style.pointerEvents = "none";

	const messageBox = document.createElement("div");
	messageBox.style.position = "fixed";
	messageBox.style.bottom = "20px";
	messageBox.style.left = "50%";
	messageBox.style.transform = "translateX(-50%)";
	messageBox.style.backgroundColor = "white";
	messageBox.style.padding = "20px";
	messageBox.style.borderRadius = "8px";
	messageBox.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
	messageBox.style.zIndex = "10001";
	messageBox.style.maxWidth = "400px";
	messageBox.style.pointerEvents = "auto";

	// Spinner element
	const spinner = document.createElement("div");
	spinner.classList.add("slds-spinner_container");
	spinner.style.position = "fixed";
	spinner.style.top = "0";
	spinner.style.left = "0";
	spinner.style.width = "100%";
	spinner.style.height = "100%";
	spinner.style.zIndex = "10002"; // Higher than messageBox
	spinner.style.display = "none"; // Hidden by default

	const spinnerInner = document.createElement("div");
	spinnerInner.setAttribute("role", "status");
	spinnerInner.classList.add(
		"slds-spinner",
		"slds-spinner_medium",
		"slds-spinner_brand",
	);
	spinner.appendChild(spinnerInner);

	const assistiveText = document.createElement("span");
	assistiveText.classList.add("slds-assistive-text");
	assistiveText.textContent = "Loading...";
	spinnerInner.appendChild(assistiveText);

	const dotA = document.createElement("div");
	dotA.classList.add("slds-spinner__dot-a");
	spinnerInner.appendChild(dotA);

	const dotB = document.createElement("div");
	dotB.classList.add("slds-spinner__dot-b");
	spinnerInner.appendChild(dotB);

	return {
		overlay,
		messageBox,
		spinner,
	};
}
