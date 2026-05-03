"use strict";

/**
 * Creates Salesforce page-element helpers with injectable dependencies.
 *
 * @param {Object} [options={}] Runtime overrides.
 * @param {{
 *   createElement: (tag: string) => {
 *     addEventListener: (type: string, listener: (event: { deltaY: number; preventDefault: () => void; }) => void) => void;
 *     classList: { add: (...tokens: string[]) => void };
 *     dataset: Record<string, string>;
 *     getAttribute: (name: string) => string | null;
 *     id: string;
 *     querySelector: (selector: string) => unknown;
 *     scrollLeft: number;
 *     setAttribute: (name: string, value: string) => void;
 *     style: { overflowX: string };
 *   };
 *   getElementsByClassName: (name: string) => ArrayLike<{
 *     parentElement: {
 *       appendChild: (child: unknown) => void;
 *       querySelector: (selector: string) => unknown;
 *     } | null;
 *   }> | null;
 *   querySelector: (selector: string) => unknown;
 * }} [options.documentRef=document] Document-like object.
 * @param {string} [options.extensionName="again-why-salesforce"] Extension id used for setup tab UL id.
 * @param {{ href?: string }} [options.locationRef=globalThis.location] Location-like object.
 * @return {{
 *   __testHooks: {
 *     addListeners: (setupTabUl?: {
 *       addEventListener: (type: string, listener: (event: { deltaY: number; preventDefault: () => void; }) => void) => void;
 *       dataset: Record<string, string>;
 *       getAttribute: (name: string) => string | null;
 *       scrollLeft: number;
 *       setAttribute: (name: string, value: string) => void;
 *       style: { overflowX: string };
 *     } | null) => void;
 *   };
 *   findSetupTabUlInSalesforcePage: () => boolean;
 *   getCurrentHref: () => string;
 *   getModalHanger: () => unknown;
 *   getSetupTabUl: () => unknown;
 *   setSetupTabUl: (newSetupTabUl: unknown) => void;
 * }} Salesforce element helpers.
 */
export function createSfElementsModule({
	documentRef = document,
	extensionName = "again-why-salesforce",
	locationRef = globalThis.location,
} = {}) {
	/** @type {unknown} */
	let setupTabUl;
	/** @type {unknown} */
	let modalHanger = null;

	/**
	 * Returns the setup tab UL element.
	 *
	 * @return {unknown} Setup tab UL.
	 */
	function getSetupTabUl() {
		return setupTabUl;
	}

	/**
	 * Stores the setup tab UL element.
	 *
	 * @param {unknown} newSetupTabUl Setup tab UL.
	 * @return {void}
	 */
	function setSetupTabUl(newSetupTabUl) {
		setupTabUl = newSetupTabUl;
	}

	/**
	 * Adds overflow and wheel listeners to the setup tab UL.
	 *
	 * @param {{
	 *   addEventListener: (type: string, listener: (event: { deltaY: number; preventDefault: () => void; }) => void) => void;
	 *   dataset: Record<string, string>;
	 *   getAttribute: (name: string) => string | null;
	 *   scrollLeft: number;
	 *   setAttribute: (name: string, value: string) => void;
	 *   style: { overflowX: string };
	 * } | null | undefined} [setupTabUlRef=getSetupTabUl()] Setup tab UL.
	 * @return {void}
	 */
	function addListeners(setupTabUlRef = getSetupTabUl()) {
		if (setupTabUlRef == null) {
			return;
		}
		if (!setupTabUlRef.style.overflowX.includes("auto")) {
			setupTabUlRef.setAttribute(
				"style",
				`overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; ${
					setupTabUlRef.getAttribute("style") ?? ""
				}`,
			);
		}
		if (!setupTabUlRef.dataset.wheelListenerApplied) {
			setupTabUlRef.addEventListener("wheel", (e) => {
				e.preventDefault();
				setupTabUlRef.scrollLeft += e.deltaY;
			});
			setupTabUlRef.dataset.wheelListenerApplied = "true";
		}
	}

	/**
	 * Finds and initializes the extension setup tab UL in Salesforce setup pages.
	 *
	 * @return {boolean} True when setup tab UL exists or gets created.
	 */
	function findSetupTabUlInSalesforcePage() {
		const parentOfSetupTabUl =
			(documentRef.querySelector("ul.pinnedItems.slds-grid") ??
				documentRef.getElementsByClassName("pinnedItems slds-grid")
					?.[0])
				?.parentElement;
		if (parentOfSetupTabUl == null) {
			return false;
		}
		let newSetupTabUl = parentOfSetupTabUl.querySelector(
			`#${extensionName}`,
		);
		if (newSetupTabUl == null) {
			newSetupTabUl = documentRef.createElement("ul");
			newSetupTabUl.id = extensionName;
			newSetupTabUl.classList.add("tabBarItems", "slds-grid");
			parentOfSetupTabUl.appendChild(newSetupTabUl);
		}
		setSetupTabUl(newSetupTabUl);
		addListeners();
		return true;
	}

	/**
	 * Returns and caches the modal hanger element.
	 *
	 * @return {unknown} Modal hanger element.
	 */
	function getModalHanger() {
		if (modalHanger != null) {
			return modalHanger;
		}
		modalHanger = documentRef.querySelector(
			"div.DESKTOP.uiContainerManager",
		);
		return modalHanger;
	}

	/**
	 * Returns the current href string.
	 *
	 * @return {string} Current href value.
	 */
	function getCurrentHref() {
		return locationRef?.href;
	}

	return {
		__testHooks: {
			addListeners,
		},
		findSetupTabUlInSalesforcePage,
		getCurrentHref,
		getModalHanger,
		getSetupTabUl,
		setSetupTabUl,
	};
}
