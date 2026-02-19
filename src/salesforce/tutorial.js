"use strict";
import {
	CMD_OPEN_SETTINGS,
	CXM_UNPIN_TAB,
	EXTENSION_GITHUB_LINK,
	SALESFORCE_SETUP_HOME_MINI,
	SETUP_LIGHTNING,
	TOAST_WARNING,
	TUTORIAL_EVENT_ACTION_FAVOURITE,
	TUTORIAL_EVENT_ACTION_UNFAVOURITE,
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
	TUTORIAL_EVENT_PIN_TAB,
	TUTORIAL_EVENT_REORDERED_TABS_TABLE,
	TUTORIAL_KEY,
	WHAT_ADD,
	WHAT_GET,
	WHAT_GET_COMMANDS,
	WHAT_SET,
} from "/constants.js";
import { performLightningRedirect, sendExtensionMessage } from "/functions.js";
import ensureTranslatorAvailability from "/translator.js";
import { getSetupTabUl, performActionOnTabs, showToast } from "./content.js";
import {
	FAVOURITE_BUTTON_ID,
	showFavouriteButton,
} from "./favourite-manager.js";
import { generateTutorialElements, MODAL_ID } from "./generator.js";
import { ensureAllTabsAvailability, TabContainer } from "../tabContainer.js";
import { handleActionButtonClick } from "./manageTabs.js";

const TUTORIAL_HIGHLIGHT_CLASS = "awsf-tutorial-highlight";
const usablePages = {
	objectManager: [
		{
			label: "account",
			url: "ObjectManager/Account/FieldsAndRelationships/view",
		},
		{
			label: "case",
			url: "ObjectManager/Case/FieldsAndRelationships/view",
		},
		{
			label: "contact",
			url: "ObjectManager/Contact/FieldsAndRelationships/view",
		},
		{
			label: "opportunity",
			url: "ObjectManager/Opportunity/FieldsAndRelationships/view",
		},
		{
			label: "lead",
			url: "ObjectManager/Lead/FieldsAndRelationships/view",
		},
		{
			label: "task",
			url: "ObjectManager/Task/FieldsAndRelationships/view",
		},
		{
			label: "campaign",
			url: "ObjectManager/Campaign/FieldsAndRelationships/view",
		},
		{
			label: "product2",
			url: "ObjectManager/Product2/FieldsAndRelationships/view",
		},
		{
			label: "pricebook2",
			url: "ObjectManager/Pricebook2/FieldsAndRelationships/view",
		},
		{
			label: "asset",
			url: "ObjectManager/Asset/FieldsAndRelationships/view",
		},
	],
	standAlone: [
		{
			label: "permission_sets",
			url: "PermSets/home",
		},
		{
			label: "login_history",
			url: "OrgLoginHistory/home",
		},
		{
			label: "sessions",
			url: "SecuritySession/home",
		},
		{
			label: "setup_audit_trail",
			url: "SecurityEvents/home",
		},
		{
			label: "sharing_settings",
			url: "SecuritySharing/home",
		},
		{
			label: "field_accessibility",
			url: "FieldAccessibility/home",
		},
		{
			label: "classic_email_templates",
			url: "CommunicationTemplatesEmail/home",
		},
		{
			label: "reports_and_dashboards_settings",
			url: "ReportUI/home",
		},
		{
			label: "manage_connected_apps",
			url: "ConnectedApplication/home",
		},
		{
			label: "company_information",
			url: "CompanyProfileInfo/home",
		},
	],
};

function customLightningRedirect(miniUrl = "") {
	performLightningRedirect(`${SETUP_LIGHTNING}${miniUrl}`);
}

function redirectToHomeAndStart(tutorial) {
	customLightningRedirect(SALESFORCE_SETUP_HOME_MINI);
	tutorial?.start();
}

/**
 * Tutorial class to guide users through the extension features.
 * Manages the step-by-step tutorial process, including element highlighting,
 * message display, and user interaction handling.
 */
class Tutorial {
	/**
	 * The current step index in the tutorial sequence.
	 * @type {number}
	 */
	currentStep = -1;
	/**
	 * Semi-transparent overlay covering the entire page.
	 * @type {HTMLElement|null}
	 */
	overlay = null;
	/**
	 * Box for displaying tutorial messages and interaction buttons.
	 * @type {HTMLElement|null}
	 */
	messageBox = null;
	/**
	 * The currently highlighted element.
	 * @type {HTMLElement|null}
	 */
	highlightedElement = null; // New property
	/**
	 * The dynamically created style element for highlighting.
	 * @type {HTMLStyleElement|null}
	 */
	highlightStyleElement = null; // New property
	/**
	 * Spinner element to show loading states.
	 * @type {HTMLElement|null}
	 */
	spinner = null;
	/**
	 * Flag indicating whether the tutorial is currently active.
	 * @type {boolean}
	 */
	isActive = false;
	/**
	 * Array of tutorial steps with their configurations.
	 * @type {Array<Object>}
	 */
	steps = [];
	retryCount = 0;

	/**
	 * Finds up to two elements whose URLs don't match any saved Tab and sets them up as class elements
	 * @returns {Promise<void>}
	 */
	async #findRedirectLinks() {
		const allTabs = await ensureAllTabsAvailability();
		const usersSavedUrls = new Set(allTabs.map((t) => t.url));
		let viableObjManEl = null;
		const objManElementLen = usablePages.objectManager.length;
		const allObjects = [
			...usablePages.objectManager,
			...usablePages.standAlone,
		];
		for (
			const elementIndex in allObjects
		) {
			const el = allObjects[elementIndex];
			if (!usersSavedUrls.has(el.url)) {
				if (!this.firstRedirectElement) this.firstRedirectElement = el;
				else if (!this.secondRedirectElement) {
					if (elementIndex < objManElementLen) viableObjManEl = el;
					else {
						// we're looking at standAlone pages
						this.secondRedirectElement = el;
						break;
					}
				}
			}
		}
		if (!this.secondRedirectElement && viableObjManEl != null) {
			this.secondRedirectElement = viableObjManEl;
		}
	}

	#getExtensionElementWithLinkInSetup(redirectElement) {
		const goToUrl =
			(redirectElement ?? this.steps[this.currentStep]?.redirectElement)
				?.url;
		const ul = getSetupTabUl();
		return ul.querySelector(
			`a:not([title^="/"]):not([title^="http"])`,
		) ?? ul.querySelector(
			`a[title="${goToUrl}"]`,
		);
	}

	#generateExtensionElementWithLinkInSetup() {
		const redirectElement = this.steps[this.currentStep]?.redirectElement;
		try {
			performActionOnTabs(WHAT_ADD, redirectElement);
		} catch (e) {
			console.info(e);
		}
		return this.#getExtensionElementWithLinkInSetup(redirectElement);
	}

	#getStarsContainer() {
		// Salesforce has 2 "pages" for ObjectManager and standard pages so we have 2 buttons actually
		for (
			const btn of document.querySelectorAll(`#${FAVOURITE_BUTTON_ID}`)
		) {
			const bounds = btn.getBoundingClientRect();
			if (bounds.width !== 0 && bounds.height !== 0) {
				return btn;
			}
		}
	}

	async #showStarsContainerAndReturnIt() {
		await showFavouriteButton();
		return this.#getStarsContainer();
	}

	/**
	 * Initializes the tutorial steps array with all predefined tutorial phases.
	 * Each step contains configuration for messages, element highlighting, and user actions.
	 * This method is asynchronous to fetch the keyboard shortcut for settings.
	 *
	 * @return {Promise<boolean>} Resolves with `true` when the steps are fully initialized.
	 */
	async initSteps() {
		await this.#findRedirectLinks();
		if (
			this.firstRedirectElement == null ||
			this.secondRedirectElement == null
		) {
			// we could not find 2 links which were not saved by the user...
			// ask the user to export their Tabs and restart the tutorial with only the default Tabs?
			showToast("tutorial_export_and_reset_for_tutorial", TOAST_WARNING);
			return false;
		}
		const translator = await ensureTranslatorAvailability();
		this.firstRedirectElement.label = await translator.translate(
			this.firstRedirectElement.label,
		);
		this.secondRedirectElement.label = await translator.translate(
			this.secondRedirectElement.label,
		);
		const settingsShortcut = await this.getSettingsShortcut();
		this.steps = [
			{
				message: "tutorial_restart",
				pageUrl: SALESFORCE_SETUP_HOME_MINI,
				beginsBlock: true,
			},
			{
				message: "tutorial_favourite_tabs",
				pageUrl: SALESFORCE_SETUP_HOME_MINI,
				beginsBlock: true,
				element: () => getSetupTabUl(),
				action: "highlight",
			},
			{
				message: "tutorial_click_highlighted_tab",
				pageUrl: SALESFORCE_SETUP_HOME_MINI,
				beginsBlock: true,
				redirectElement: this.firstRedirectElement,
				element: () => this.#getExtensionElementWithLinkInSetup(),
				fakeElement: () =>
					(this.#generateExtensionElementWithLinkInSetup.bind(
						this,
					))(),
				action: "highlight",
				waitFor: "redirect",
			},
			{
				message: "tutorial_remove_favourite",
				pageUrl: this.firstRedirectElement.url,
				element: this.#getStarsContainer,
				fakeElement: () =>
					(this.#showStarsContainerAndReturnIt.bind(
						this,
					))(),
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_ACTION_UNFAVOURITE,
			},
			{
				message: "tutorial_redirect_account",
				pageUrl: this.firstRedirectElement.url,
				redirectElement: this.secondRedirectElement,
				action: "confirm",
				onConfirm: () => {
					customLightningRedirect(
						this.secondRedirectElement.url,
					);
				},
				waitFor: "redirect",
			},
			{
				message: "tutorial_add_favourite",
				pageUrl: this.secondRedirectElement.url,
				beginsBlock: true,
				element: this.#getStarsContainer,
				fakeElement: () =>
					(this.#showStarsContainerAndReturnIt.bind(
						this,
					))(),
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_ACTION_FAVOURITE,
			},
			{
				message: "tutorial_pin_tab",
				pageUrl: this.secondRedirectElement.url,
				beginsBlock: true,
				redirectElement: this.secondRedirectElement,
				element: () => {
					return this.#getExtensionElementWithLinkInSetup()?.closest(
						"li",
					);
				},
				fakeElement: () =>
					(this.#generateExtensionElementWithLinkInSetup.bind(
						this,
					))()?.closest("li"),
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_PIN_TAB,
			},
			{
				message: "tutorial_pinned_tab",
				pageUrl: this.secondRedirectElement.url,
				redirectElement: this.secondRedirectElement,
				element: () => this.#getExtensionElementWithLinkInSetup(),
				fakeElement: () =>
					(this.#generateExtensionElementWithLinkInSetup.bind(
						this,
					))(),
				action: "highlight",
			},
			{
				message: "tutorial_manage_tabs",
				pageUrl: this.secondRedirectElement.url,
				beginsBlock: true,
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
			},
			{
				message: "tutorial_manage_tabs_link",
				pageUrl: this.secondRedirectElement.url, // Still on this page
				link: `${EXTENSION_GITHUB_LINK}/wiki/Manage-Tabs-modal`,
			},
			{
				message: "tutorial_drag_flows",
				pageUrl: this.secondRedirectElement.url, // Modal is open on this page
				element: async () => {
					const allTabs = await ensureAllTabsAvailability();
					const pinnedNumber = allTabs[TabContainer.keyPinnedTabsNo];
					const tabsLen = allTabs.length;
					let nthChild;
					if (tabsLen > pinnedNumber) {
						nthChild = Math.min(pinnedNumber + 2, tabsLen);
					} else {
						// the pinned list and the total length is the same
						// unpin the last 2 Tabs
						const unpinUpTo = pinnedNumber <= 2 ? 2 : 3;
						for (let i = 1; i < unpinUpTo; i++) {
							await handleActionButtonClick({
								preventDefault: () => {},
								stopPropagation: () => {},
								currentTarget: document.querySelector(
									`#sortable-table tbody tr:nth-child(${
										tabsLen - i
									}) [data-action="${CXM_UNPIN_TAB}"]`,
								),
							}, { allTabs });
						}
						nthChild = tabsLen;
					}
					return document.querySelector(
						`#${MODAL_ID} #sortable-table tr:nth-child(${nthChild}) .slds-cell-wrap`,
					);
				},
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_REORDERED_TABS_TABLE,
			},
			{
				message: "tutorial_pinned_explanation",
				pageUrl: this.secondRedirectElement.url,
			},
			{
				message: "tutorial_save_modal",
				pageUrl: this.secondRedirectElement.url,
				element: () =>
					document.querySelector(
						`#${MODAL_ID} #again-why-salesforce-modal-confirm`,
					),
				action: "highlight",
				waitFor: "click",
			},
			{
				message: "tutorial_keyboard_shortcut",
				pageUrl: this.secondRedirectElement.url, // After modal closes
				beginsBlock: true,
				shortcut: settingsShortcut,
			},
			{
				message: "tutorial_end",
				// No pageUrl
			},
		];
		this.beginBlockStepIndexes = [];
		for (const i in this.steps) {
			if (this.steps[i].beginsBlock) {
				this.beginBlockStepIndexes.push(Number(i));
			}
		}
		return true;
	}

	/**
	 * Starts the tutorial by initializing steps, creating overlay elements, and beginning the first step.
	 * Ensures the tutorial is not already active before proceeding.
	 *
	 * @param {number} [startStep=0] - The step index to start the tutorial from.
	 * @return {Promise<void>} Resolves when the tutorial has started successfully.
	 */
	async start(startStep = 0) {
		if (this.isActive) return;
		if (this.steps?.length < 1 && !(await this.initSteps())) {
			return;
		}
		this.isActive = true;
		// Set the starting step, either from parameter or default 0
		if (startStep >= 0 && startStep < this.steps.length) {
			this.currentStep = startStep;
		} else {
			this.currentStep = 0;
		}
		this.createOverlay();
		this.currentStep--; // because nextStep increases before starting
		const pageUrl = this.steps[this.currentStep]?.pageUrl;
		if (pageUrl != null) {
			customLightningRedirect(pageUrl);
		}
		this.nextStep();
	}

	/**
	 * Creates and appends the overlay elements to the document body.
	 * Generates the necessary HTML elements for the tutorial interface
	 * and adds them to the DOM for user interaction.
	 */
	createOverlay() {
		const elements = generateTutorialElements();
		this.overlay = elements.overlay;
		this.messageBox = elements.messageBox;
		this.spinner = elements.spinner;
		// Define the custom highlight CSS class
		this.highlightStyleElement = document.createElement("style");
		this.highlightStyleElement.textContent = `
        .${TUTORIAL_HIGHLIGHT_CLASS} {
            background: yellow !important;
            color: black !important;
            position: relative !important;
            z-index: 10000 !important;
            box-shadow: 0 0 2em !important;
        }
    `;
		document.head.appendChild(this.highlightStyleElement);
		document.body.appendChild(this.overlay);
		document.body.appendChild(this.messageBox);
		document.body.appendChild(this.spinner);
	}

	/**
	 * Shows the Salesforce-like spinner.
	 */
	showSpinner() {
		this.spinner.style.display = "block";
	}

	/**
	 * Hides the Salesforce-like spinner.
	 */
	hideSpinner() {
		this.spinner.style.display = "none";
	}

	/**
	 * Sends a message to the background page with the tutorial progress passed as input
	 * @param {number} [stepNo=this.currentStep] - the step at which the tutorial has arrived
	 * @async
	 */
	persistTutorialProgress(stepNo = this.currentStep) {
		if (typeof stepNo !== "number") {
			throw new TypeError("stepNo should be a number");
		}
		return sendExtensionMessage({
			what: WHAT_SET,
			key: TUTORIAL_KEY,
			set: stepNo,
		});
	}

	/**
	 * Proceeds to the next step in the tutorial sequence.
	 * If all steps are completed, ends the tutorial.
	 * Otherwise, executes the current step's logic.
	 */
	async nextStep() {
		this.currentStep++;
		this.showSpinner();
		if (this.currentStep >= this.steps.length) {
			this.end();
			return;
		}
		this.retryCount = 0;
		const step = this.steps[this.currentStep];
		await this.executeStep(step);
		if (step.beginsBlock) {
			this.persistTutorialProgress();
		}
	}

	async getElementNowOrLater(step, callback) {
		const el = await step.element();
		if (el != null) {
			return el;
		}
		this.retryCount++;
		if (this.retryCount > 5) {
			const fakeEl = await step.fakeElement();
			if (fakeEl != null) {
				return fakeEl;
			}
		}
		setTimeout(
			() => callback(step),
			1000,
		);
	}

	/**
	 * Executes a specific tutorial step based on its configuration.
	 * Handles element highlighting, message display, and determines the next action
	 * (waiting for user input, showing confirmation, or auto-progressing).
	 *
	 * @param {Object} step - The tutorial step configuration object.
	 * @param {Function} [step.element] - Function that returns the HTMLElement to highlight.
	 * @param {string} step.message - The i18n key for the message to display.
	 * @param {string} step.action - The type of action ("highlight", "confirm").
	 * @param {string} [step.waitFor] - The type of user action to wait for ("click", "timeout").
	 * @param {Function} [step.onConfirm] - Callback function for confirmation steps.
	 * @param {string} [step.link] - Optional link to append to the message.
	 * @param {string} [step.shortcut] - Optional keyboard shortcut to display.
	 * @return {Promise<void>} Resolves when the step execution is complete.
	 */
	async executeStep(step) {
		if (step.element) {
			let el;
			const canFakeElement = step.fakeElement;
			if (canFakeElement) {
				el = await this.getElementNowOrLater(
					step,
					this.executeStep.bind(this),
				);
			} else {
				el = await step.element();
			}
			if (el == null) {
				if (!canFakeElement) {
					showToast("tutorial_step_was_missed", TOAST_WARNING);
					// reset to the beginning of the block
					let maxIndex = 0;
					for (
						let b = maxIndex;
						b < this.beginBlockStepIndexes.length &&
						this.beginBlockStepIndexes[b] <= this.currentStep &&
						this.beginBlockStepIndexes[b] >= maxIndex;
						b++
					) {
						maxIndex = this.beginBlockStepIndexes[b];
					}
					this.currentStep = maxIndex - 1;
					this.nextStep();
				}
				return;
			}
			this.highlightElement(el);
			if (step.waitFor === "click") {
				el.addEventListener("click", () => this.nextStep(), {
					once: true,
				});
			}
		} else if (this.highlightedElement) {
			// Step has no element to highlight, remove any existing highlight
			this.highlightedElement.classList.remove(
				TUTORIAL_HIGHLIGHT_CLASS,
			);
			this.highlightedElement = null;
		}
		await this.showMessage(step);
		if (step.waitFor == null) {
			this.showConfirm(step);
		} else if (step.waitFor === "event" && step.awaitsCustomEvent) {
			document.addEventListener(
				step.awaitsCustomEvent,
				() => this.nextStep(),
				{ once: true },
			);
		} else if (step.waitFor === "redirect") {
			if (step.action === "confirm") {
				this.showConfirm(step, { continueAfterClick: false });
			}
			const cleanup = this.#listenToLightningNavigation(() => {
				cleanup();
				this.nextStep();
			});
		}
	}

	/**
	 * Wraps a history method to intercept calls.
	 * @param {function} original - The original history method.
	 * @param {function(string): void} onNavigate - Called with the new URL.
	 * @returns {function} Wrapped method.
	 */
	#wrapHistoryMethod(original, onNavigate) {
		return function (...args) {
			original(...args);
			onNavigate(location.href);
		};
	}
	/**
	 * Patches history methods and listens for Lightning soft navigation events.
	 * @param {function(string): void} onNavigate - Called with the new URL on navigation.
	 * @returns {function(): void} Cleanup function to remove all listeners.
	 */
	#listenToLightningNavigation(onNavigate) {
		const originalPushState = history.pushState.bind(history);
		const originalReplaceState = history.replaceState.bind(history);
		history.pushState = this.#wrapHistoryMethod(
			originalPushState,
			onNavigate,
		);
		history.replaceState = this.#wrapHistoryMethod(
			originalReplaceState,
			onNavigate,
		);
		const lastUrl = location.href;
		const observer = new MutationObserver(() => {
			if (location.href !== lastUrl) {
				onNavigate(location.href);
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		const onPopState = () => onNavigate(location.href);
		globalThis.addEventListener("popstate", onPopState, { once: true });
		return () => {
			history.pushState = originalPushState;
			history.replaceState = originalReplaceState;
			globalThis.removeEventListener("popstate", onPopState);
			observer.disconnect();
		};
	}

	/**
	 * Highlights a specific HTML element by adding a CSS class.
	 *
	 * @param {HTMLElement} el - The HTML element to highlight.
	 */
	highlightElement(el) {
		// Remove highlight from previously highlighted element
		this.highlightedElement?.classList.remove(TUTORIAL_HIGHLIGHT_CLASS);
		// Add highlight to the new element
		this.highlightedElement = el;
		this.highlightedElement.classList.add(TUTORIAL_HIGHLIGHT_CLASS);
	}

	/**
	 * Displays the message for the current tutorial step in the message box.
	 * Translates the message key and appends any additional information like links or shortcuts.
	 *
	 * @param {Object} step - The tutorial step object containing message details.
	 * @param {string} step.message - The i18n key for the message.
	 * @param {string} [step.link] - Optional link to append to the message.
	 * @param {string} [step.shortcut] - Optional keyboard shortcut to display.
	 * @return {Promise<void>} Resolves when the message has been translated and displayed.
	 */
	async showMessage(step) {
		const translator = await ensureTranslatorAvailability();
		let message = await translator.translate(step.message);
		if (step.link && !message.includes(step.link)) {
			message += `\n\n${step.link}`;
		}
		if (step.shortcut && !message.includes(step.shortcut)) {
			message += `\n\nShortcut: ${step.shortcut}`;
		}
		this.hideSpinner();
		this.messageBox.textContent = message;
		step.message = message;
	}

	/**
	 * Displays a confirmation dialog for steps requiring user confirmation.
	 * Creates and appends an "OK" button to the message box that triggers the next step
	 * and executes any associated confirmation callback.
	 *
	 * @param {Object} step - The tutorial step object.
	 * @param {Function} [step.onConfirm] - Optional callback to execute on confirmation.
	 */
	showConfirm(step, {
		continueAfterClick = true,
	} = {}) {
		const confirmBtn = document.createElement("button");
		confirmBtn.textContent = "OK";
		this.messageBox.appendChild(confirmBtn);
		this.messageBox.addEventListener("click", () => {
			step.onConfirm?.();
			if (continueAfterClick) {
				this.nextStep();
			}
		}, { once: true });
	}

	/**
	 * Retrieves the keyboard shortcut for opening the extension settings.
	 * Sends a message to the background script to get available commands and extracts
	 * the shortcut for the "cmd-open-settings" command.
	 *
	 * @return {Promise<string>} The keyboard shortcut string, or a default value if not found.
	 */
	async getSettingsShortcut() {
		const commands = await sendExtensionMessage({
			what: WHAT_GET_COMMANDS,
			commands: [CMD_OPEN_SETTINGS],
		});
		return commands?.[0]?.shortcut;
	}

	/**
	 * Ends the tutorial by cleaning up DOM elements and marking completion.
	 * Removes the overlay, message box, and highlight box from the document,
	 * sets the active flag to false, and stores completion status in localStorage.
	 *
	 * @param {boolean} [shouldSaveProgress=true] - Whether to save the tutorial's completion status.
	 */
	end(shouldSaveProgress = true) {
		this.isActive = false;
		this.overlay?.remove();
		this.messageBox?.remove();
		this.spinner?.remove();
		this.highlightedElement?.classList.remove(TUTORIAL_HIGHLIGHT_CLASS);
		this.highlightStyleElement?.remove();
		if (shouldSaveProgress) {
			this.persistTutorialProgress(this.steps.length);
		}
	}
}

/**
 * Checks if the tutorial should be shown automatically on first visit.
 * If the tutorial has not been completed before, prompts the user to start it.
 * Uses localStorage to track completion status.
 *
 * @return {Promise<void>} Resolves after checking and potentially starting the tutorial.
 */
export async function checkTutorial() {
	const tutorialProgress = await sendExtensionMessage({
		what: WHAT_GET,
		key: TUTORIAL_KEY,
	});
	const tutorial = new Tutorial();
	if (!await tutorial.initSteps()) { // Initialize steps to get their properties
		return;
	}
	const translator = await ensureTranslatorAvailability();
	if (tutorialProgress == null) {
		if (confirm(await translator.translate("tutorial_start_prompt"))) {
			redirectToHomeAndStart(tutorial);
		}
		return;
	}
	if (
		confirm(
			await translator.translate(
				"tutorial_continue_prompt",
			),
		)
	) {
		tutorial.start(tutorialProgress - 1);
	} else if (
		// User doesn't want to continue, ask to start from beginning and clear progress if accepted
		confirm(
			await translator.translate(
				"tutorial_restart_prompt",
			),
		)
	) {
		await tutorial.persistTutorialProgress(0);
		redirectToHomeAndStart(tutorial);
	}
}

/**
 * Starts the tutorial manually, typically called from the popup button.
 * Creates a new Tutorial instance and begins the guided tour.
 *
 * @return {Promise<void>} Resolves when the tutorial has started.
 */
export function startTutorial() {
	return new Tutorial().start();
}
