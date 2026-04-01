"use strict";

import { EXTENSION_NAME } from "../core/constants.js";

/**
 * The main UL on Salesforce Setup
 */
let setupTabUl;
/**
 * Returns the main UL element in Salesforce Setup.
 *
 * @return {HTMLElement} The main UL element in Salesforce Setup.
 */
export function getSetupTabUl() {
	return setupTabUl;
}
/**
 * Saves the main UL element in Salesforce Setup for later retrieval
 * @param {HTMLUlElement} newSetupTabUl - the setup tab UL used by the extension
 */
export function setSetupTabUl(newSetupTabUl) {
	setupTabUl = newSetupTabUl;
}

/**
 * Adds listeners for overflow and wheel to the setupTabUl
 * @param {HTMLElement} [setupTabUl=getSetupTabUl()] - the main Ul element in Salesforce Setup
 */
function addListeners(setupTabUl = getSetupTabUl()) {
	// Add overflow scroll behavior only if not already present
	if (!setupTabUl.style.overflowX.includes("auto")) {
		setupTabUl.setAttribute(
			"style",
			`overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; ${
				setupTabUl.getAttribute("style") ?? ""
			}`,
		);
	}
	// Listen to mouse wheel to easily move left & right
	if (!setupTabUl.dataset.wheelListenerApplied) {
		setupTabUl.addEventListener("wheel", (e) => {
			e.preventDefault();
			setupTabUl.scrollLeft += e.deltaY;
		});
		setupTabUl.dataset.wheelListenerApplied = true;
	}
}

/**
 * Looks for the setupTabUl in the Salesforce Setup page
 * @return {boolean} based on whether the setupTabUl was found
 */
export function findSetupTabUlInSalesforcePage() {
	const parentOfSetupTabUl =
		(document.querySelector("ul.pinnedItems.slds-grid") ??
			document.getElementsByClassName("pinnedItems slds-grid")?.[0])
			?.parentElement;
	if (parentOfSetupTabUl == null) {
		return false;
	}
	let newSetupTabUl = parentOfSetupTabUl.querySelector(`#${EXTENSION_NAME}`);
	if (newSetupTabUl == null) {
		newSetupTabUl = document.createElement("ul");
		newSetupTabUl.id = EXTENSION_NAME;
		newSetupTabUl.classList.add("tabBarItems", "slds-grid");
		parentOfSetupTabUl.appendChild(newSetupTabUl);
	}
	setSetupTabUl(newSetupTabUl);
	addListeners();
	return true;
}

/**
 * Where modals should be inserted in Salesforce Setup
 */
let modalHanger = null;

/**
 * Retrieves the modal hanger element, caching it for future use.
 * - If the `modalHanger` is already set, it returns the cached value.
 * - Otherwise, it finds it in the page.
 *
 * @return {HTMLElement|null} The modal hanger element if found, otherwise null.
 */
export function getModalHanger() {
	if (modalHanger != null) {
		return modalHanger;
	}
	modalHanger = document.querySelector("div.DESKTOP.uiContainerManager");
	return modalHanger;
}

/**
 * Returns the current href string, always up-to-date.
 *
 * @return {string} The current page href.
 */
export function getCurrentHref() {
	return globalThis.location?.href;
}
