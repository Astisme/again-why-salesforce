"use strict";
import {
	EXTENSION_GITHUB_LINK,
	SALESFORCE_SETUP_HOME_MINI,
	SETUP_LIGHTNING,
	TUTORIAL_EVENT_ACTION_FAVOURITE,
	TUTORIAL_EVENT_ACTION_UNFAVOURITE,
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
	TUTORIAL_EVENT_PIN_TAB,
	TUTORIAL_EVENT_REORDERED_TABS_TABLE,
	TUTORIAL_KEY,
} from "/constants.js";
import { performLightningRedirect, sendExtensionMessage } from "/functions.js";
import ensureTranslatorAvailability from "/translator.js";
import {
	ACTION_ADD,
	getSetupTabUl,
	performActionOnTabs,
	showToast,
} from "./content.js";
import { showFavouriteButton, STAR_ID } from "./favourite-manager.js";
import { generateTutorialElements, MODAL_ID } from "./generator.js";

const TUTORIAL_HIGHLIGHT_CLASS = "awsf-tutorial-highlight";
const usersPage = "ManageUsers/home";

function redirectToHomeAndStart(tutorial) {
	performLightningRedirect(`${SETUP_LIGHTNING}${SALESFORCE_SETUP_HOME_MINI}`);
	tutorial?.start();
}

/**
 * Tutorial class to guide users through the extension features.
 * Manages the step-by-step tutorial process, including element highlighting,
 * message display, and user interaction handling.
 */
class Tutorial {
	/**
	 * Initializes a new Tutorial instance.
	 * Sets up initial state variables for managing the tutorial flow.
	 */
	constructor() {
		/**
		 * The current step index in the tutorial sequence.
		 * @type {number}
		 */
		this.currentStep = 0;
		/**
		 * Semi-transparent overlay covering the entire page.
		 * @type {HTMLElement|null}
		 */
		this.overlay = null;
		/**
		 * Box for displaying tutorial messages and interaction buttons.
		 * @type {HTMLElement|null}
		 */
		this.messageBox = null;
		/**
		 * The currently highlighted element.
		 * @type {HTMLElement|null}
		 */
		this.highlightedElement = null; // New property
		/**
		 * The dynamically created style element for highlighting.
		 * @type {HTMLStyleElement|null}
		 */
		this.highlightStyleElement = null; // New property
		/**
		 * Spinner element to show loading states.
		 * @type {HTMLElement|null}
		 */
		this.spinner = null;
		/**
		 * Flag indicating whether the tutorial is currently active.
		 * @type {boolean}
		 */
		this.isActive = false;
		/**
		 * Cached keyboard shortcut for opening settings.
		 * @type {string|null}
		 */
		this.shortcut = null;
		/**
		 * Array of tutorial steps with their configurations.
		 * @type {Array<Object>}
		 */
		this.steps = [];
		this.retryCount = 0;
	}

	#getExtensionElementWithLinkInSetup() {
		const ul = getSetupTabUl();
		return ul.querySelector('a:not([title^="/"])');
	}

	async #generateExtensionElementWithLinkInSetup() {
		const translator = await ensureTranslatorAvailability();
		try {
			performActionOnTabs(ACTION_ADD, {
				label: await translator.translate("users"),
				url: usersPage,
			});
		} catch (e) {
			console.info(e);
		}
		return this.#getExtensionElementWithLinkInSetup();
	}

	#getStarsContainer() {
		return document.getElementById(STAR_ID)?.closest("button");
	}

	/**
	 * Initializes the tutorial steps array with all predefined tutorial phases.
	 * Each step contains configuration for messages, element highlighting, and user actions.
	 * This method is asynchronous to fetch the keyboard shortcut for settings.
	 *
	 * @return {Promise<void>} Resolves when the steps are fully initialized.
	 */
	async initSteps() {
		this.shortcut = await this.getSettingsShortcut();
		const accountPage = "ObjectManager/Account/FieldsAndRelationships/view";
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
				element: this.#getExtensionElementWithLinkInSetup,
				fakeElement: () =>
					(this.#generateExtensionElementWithLinkInSetup.bind(
						this,
					))(),
				action: "highlight",
				waitFor: "click",
			},
			{
				message: "tutorial_remove_favourite",
				pageUrl: usersPage, // After clicking "Users" tab
				element: this.#getStarsContainer,
				fakeElement: async () => {
					await showFavouriteButton();
					return this.#getStarsContainer();
				},
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_ACTION_UNFAVOURITE,
			},
			{
				message: "tutorial_redirect_account",
				pageUrl: usersPage,
				action: "confirm",
				onConfirm: () => {
					performLightningRedirect(
						`${SETUP_LIGHTNING}${accountPage}`,
					);
				},
				waitFor: "redirect",
			},
			{
				message: "tutorial_add_favourite",
				pageUrl: accountPage,
				beginsBlock: true,
				element: this.#getStarsContainer,
				fakeElement: async () => {
					await showFavouriteButton();
					return this.#getStarsContainer();
				},
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_ACTION_FAVOURITE,
			},
			{
				message: "tutorial_pin_tab",
				pageUrl: accountPage,
				beginsBlock: true,
				element: () => {
					return getSetupTabUl()?.querySelector(
						`a[title="${accountPage}"]`,
					)?.closest("li");
				},
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_PIN_TAB,
			},
			{
				message: "tutorial_pinned_tab",
				pageUrl: accountPage,
				element: this.#getExtensionElementWithLinkInSetup,
				fakeElement: this.#generateExtensionElementWithLinkInSetup,
				action: "highlight",
			},
			{
				message: "tutorial_manage_tabs",
				pageUrl: accountPage,
				beginsBlock: true,
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
			},
			{
				message: "tutorial_manage_tabs_link",
				pageUrl: accountPage, // Still on this page
				link: `${EXTENSION_GITHUB_LINK}/wiki/Manage-Tabs-modal`,
			},
			{
				message: "tutorial_drag_flows",
				pageUrl: accountPage, // Modal is open on this page
				element: () =>
					document.querySelector(
						`#${MODAL_ID} #sortable-table tr:nth-child(3) .slds-cell-wrap`,
					),
				action: "highlight",
				waitFor: "event",
				awaitsCustomEvent: TUTORIAL_EVENT_REORDERED_TABS_TABLE,
			},
			{
				message: "tutorial_pinned_explanation",
				pageUrl: accountPage,
			},
			{
				message: "tutorial_save_modal",
				pageUrl: accountPage,
				element: () =>
					document.querySelector(
						`#${MODAL_ID} #again-why-salesforce-modal-confirm`,
					),
				action: "highlight",
				waitFor: "click",
			},
			{
				message: "tutorial_keyboard_shortcut",
				pageUrl: accountPage, // After modal closes
				beginsBlock: true,
				shortcut: this.shortcut,
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
		this.isActive = true;
		if (this.steps?.length < 1) {
			await this.initSteps();
		}

		// Set the starting step, either from parameter or default 0
		if (startStep >= 0 && startStep < this.steps.length) {
			this.currentStep = startStep;
		} else {
			this.currentStep = 0;
		}
		this.createOverlay();
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
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5) !important;
            position: relative !important;
            z-index: 10000 !important;
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
		if (this.spinner) {
			this.spinner.style.display = "block";
		}
	}

	/**
	 * Hides the Salesforce-like spinner.
	 */
	hideSpinner() {
		if (this.spinner) {
			this.spinner.style.display = "none";
		}
	}

	/**
	 * Proceeds to the next step in the tutorial sequence.
	 * If all steps are completed, ends the tutorial.
	 * Otherwise, executes the current step's logic.
	 */
	async nextStep() {
		this.showSpinner();
		if (this.currentStep >= this.steps.length) {
			this.end();
			return;
		}
		this.retryCount = 0;
		const step = this.steps[this.currentStep];
		await this.executeStep(step);
		if (step.beginsBlock) {
			sendExtensionMessage({
				what: "set",
				key: TUTORIAL_KEY,
				set: this.currentStep,
			});
		}
		this.currentStep++;
	}

	async getElementNowOrLater(step, callback) {
		const el = step.element();
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
				el = step.element();
			}
			if (el == null) {
				if (!canFakeElement) {
					showToast("tutorial_step_was_missed", false, true);
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
					this.currentStep = maxIndex;
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
		} else {
			// Step has no element to highlight, remove any existing highlight
			if (this.highlightedElement) {
				this.highlightedElement.classList.remove(
					TUTORIAL_HIGHLIGHT_CLASS,
				);
				this.highlightedElement = null;
			}
		}
		await this.showMessage(step);
		if (step.action === "confirm" || step.waitFor == null) {
			this.showConfirm(step);
		} else if (step.waitFor === "event" && step.awaitsCustomEvent) {
			document.addEventListener(
				step.awaitsCustomEvent,
				() => this.nextStep(),
				{ once: true },
			);
		}
	}

	/**
	 * Highlights a specific HTML element by adding a CSS class.
	 *
	 * @param {HTMLElement} el - The HTML element to highlight.
	 */
	highlightElement(el) {
		// Remove highlight from previously highlighted element
		if (this.highlightedElement) {
			this.highlightedElement.classList.remove(TUTORIAL_HIGHLIGHT_CLASS);
		}
		// Add highlight to the new element
		el.classList.add(TUTORIAL_HIGHLIGHT_CLASS);
		this.highlightedElement = el;
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
	showConfirm(step) {
		const confirmBtn = document.createElement("button");
		confirmBtn.textContent = "OK";
		confirmBtn.addEventListener("click", () => {
			if (step.onConfirm) step.onConfirm();
			this.nextStep();
		});
		this.messageBox.appendChild(confirmBtn);
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
			what: "get-commands",
			commands: ["cmd-open-settings"],
		});
		const cmd = commands.find((c) => c.name === "cmd-open-settings");
		return cmd ? cmd.shortcut : "Alt+Comma";
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
		if (this.overlay) {
			document.body.removeChild(this.overlay);
			document.body.removeChild(this.messageBox);
			document.body.removeChild(this.spinner);

			// Clean up highlight
			if (this.highlightedElement) {
				this.highlightedElement.classList.remove(
					TUTORIAL_HIGHLIGHT_CLASS,
				);
			}
			if (
				this.highlightStyleElement &&
				this.highlightStyleElement.parentNode
			) {
				this.highlightStyleElement.parentNode.removeChild(
					this.highlightStyleElement,
				);
			}
		}
		if (shouldSaveProgress) {
			sendExtensionMessage({
				what: "set",
				key: TUTORIAL_KEY,
				set: this.steps.length,
			});
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
		what: "get",
		key: TUTORIAL_KEY,
	});
	const tutorial = new Tutorial();
	await tutorial.initSteps(); // Initialize steps to get their properties
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
				[tutorialProgress + 1],
			),
		)
	) {
		const step = tutorial.steps[tutorialProgress];
		if (step.pageUrl) {
			performLightningRedirect(
				`${SETUP_LIGHTNING}${step.pageUrl}`,
			);
		}
		tutorial.start(tutorialProgress);
	} else {
		// User doesn't want to continue, clear progress and ask to start from beginning
		if (
			confirm(
				await translator.translate(
					"tutorial_restart_prompt",
				),
			)
		) {
			await sendExtensionMessage({
				what: "set",
				key: TUTORIAL_KEY,
				set: 0,
			});
			redirectToHomeAndStart(tutorial);
		}
	}
}

/**
 * Starts the tutorial manually, typically called from the popup button.
 * Creates a new Tutorial instance and begins the guided tour.
 *
 * @return {Promise<void>} Resolves when the tutorial has started.
 */
export function startTutorial() {
	const tutorial = new Tutorial();
	return tutorial.start();
}
