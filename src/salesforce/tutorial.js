"use strict";
import { EXTENSION_GITHUB_LINK, SETUP_LIGHTNING } from "/constants.js";
import { performLightningRedirect, sendExtensionMessage } from "/functions.js";
import ensureTranslatorAvailability from "/translator.js";
import { ACTION_ADD, getSetupTabUl, performActionOnTabs } from "./content.js";
import { showFavouriteButton, STAR_ID } from "./favourite-manager.js";
import { generateTutorialElements } from "./generator.js";

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
		 * Box used to highlight specific elements on the page.
		 * @type {HTMLElement|null}
		 */
		this.highlightBox = null;
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
				url: "ManageUsers/home",
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
		this.steps = [
			{
				message: "tutorial_restart",
				action: "info",
			},
			{
				element: () => getSetupTabUl(),
				message: "tutorial_favourite_tabs",
				action: "highlight",
			},
			{
				element: this.#getExtensionElementWithLinkInSetup,
				fakeElement: () =>
					(this.#generateExtensionElementWithLinkInSetup.bind(
						this,
					))(),
				message: "tutorial_click_highlighted_tab",
				action: "highlight",
				waitFor: "click",
			},
			{
				element: this.#getStarsContainer,
				fakeElement: async () => {
					await showFavouriteButton();
					return this.#getStarsContainer();
				},
				message: "tutorial_remove_favourite",
				action: "highlight",
				waitFor: "click",
			},
			{
				message: "tutorial_redirect_account",
				action: "confirm",
				onConfirm: () => {
					performLightningRedirect(
						`${SETUP_LIGHTNING}ObjectManager/Account/FieldsAndRelationships/view`,
					);
				},
				waitFor: "redirect",
			},
			{
				element: this.#getStarsContainer,
				fakeElement: async () => {
					await showFavouriteButton();
					return this.#getStarsContainer();
				},
				message: "tutorial_add_favourite",
				action: "highlight",
				waitFor: "click",
			},
			{
				element: this.#getExtensionElementWithLinkInSetup,
				fakeElement: this.#generateExtensionElementWithLinkInSetup,
				message: "tutorial_pin_tab",
				action: "highlight",
			},
			{
				element: this.#getExtensionElementWithLinkInSetup,
				fakeElement: this.#generateExtensionElementWithLinkInSetup,
				message: "tutorial_pinned_tab",
				action: "highlight",
			},
			{
				message: "tutorial_manage_tabs",
				action: "info",
			},
			{
				message: "tutorial_manage_tabs_link",
				action: "info",
				link: `${EXTENSION_GITHUB_LINK}/wiki/Manage-Tabs-modal`,
			},
			{
				element: () =>
					document.querySelector(
						".modal .slds-table tbody tr:nth-child(2) .slds-icon-utility-drag",
					),
				message: "tutorial_drag_users",
				action: "highlight",
			},
			{
				message: "tutorial_pinned_explanation",
				action: "info",
			},
			{
				element: () =>
					document.querySelector('.modal button[data-i18n="save"]'),
				message: "tutorial_save_modal",
				action: "highlight",
				waitFor: "click",
			},
			{
				message: "tutorial_keyboard_shortcut",
				action: "info",
				shortcut: this.shortcut,
			},
			{
				message: "tutorial_settings_explanation",
				action: "info",
			},
			{
				message: "tutorial_end",
				action: "info",
			},
		];
	}

	/**
	 * Starts the tutorial by initializing steps, creating overlay elements, and beginning the first step.
	 * Ensures the tutorial is not already active before proceeding.
	 *
	 * @return {Promise<void>} Resolves when the tutorial has started successfully.
	 */
	async start() {
		if (this.isActive) return;
		this.isActive = true;
		await this.initSteps();
		this.createOverlay();
		this.currentStep = 0;
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
		this.highlightBox = elements.highlightBox;

		document.body.appendChild(this.overlay);
		document.body.appendChild(this.messageBox);
		document.body.appendChild(this.highlightBox);
	}

	/**
	 * Proceeds to the next step in the tutorial sequence.
	 * If all steps are completed, ends the tutorial.
	 * Otherwise, executes the current step's logic.
	 */
	nextStep() {
		if (this.currentStep >= this.steps.length) {
			this.end();
			return;
		}
		this.retryCount = 0;
		const step = this.steps[this.currentStep];
		this.executeStep(step);
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
	 * @param {string} step.action - The type of action ("highlight", "info", "confirm").
	 * @param {string} [step.waitFor] - The type of user action to wait for ("click", "timeout").
	 * @param {Function} [step.onConfirm] - Callback function for confirmation steps.
	 * @param {string} [step.link] - Optional link to append to the message.
	 * @param {string} [step.shortcut] - Optional keyboard shortcut to display.
	 * @return {Promise<void>} Resolves when the step execution is complete.
	 */
	async executeStep(step) {
		/*
    if(step.waitFor === "redirect"){
    }
    */
		if (step.element) {
			const el = await this.getElementNowOrLater(
				step,
				this.executeStep.bind(this),
			);
			if (el == null) {
				return;
			}
			this.highlightElement(el);
			if (step.waitFor === "click") {
				el.addEventListener("click", () => this.nextStep(), {
					once: true,
				});
			}
		} else {
			// Step has no element to highlight, hide any existing highlight
			if (this.highlightBox) {
				this.highlightBox.style.display = "none";
			}
		}
		await this.showMessage(step);
		if (step.action === "confirm" || step.waitFor == null) {
			this.showConfirm(step);
		}
	}

	/**
	 * Highlights a specific HTML element by positioning the highlight box over it.
	 * Calculates the element's bounding rectangle and adjusts the highlight box accordingly.
	 *
	 * @param {HTMLElement} el - The HTML element to highlight.
	 */
	highlightElement(el) {
		this.highlightBox.style.display = "none";
		const rect = el.getBoundingClientRect();
		this.highlightBox.style.top = `${rect.top}px`;
		this.highlightBox.style.left = `${rect.left}px`;
		this.highlightBox.style.width = `${rect.width}px`;
		this.highlightBox.style.height = `${rect.height}px`;
		this.highlightBox.style.display = "block";
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
		if (step.link) {
			message += `\n\n${step.link}`;
		}
		if (step.shortcut) {
			message += `\n\nShortcut: ${step.shortcut}`;
		}
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
	 */
	end() {
		this.isActive = false;
		if (this.overlay) {
			document.body.removeChild(this.overlay);
			document.body.removeChild(this.messageBox);
			document.body.removeChild(this.highlightBox);
		}
		// Mark tutorial as completed
		localStorage.setItem("tutorialCompleted", "true");
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
	const completed = localStorage.getItem("tutorialCompleted");
	if (!completed) {
		if (confirm("Do you want to start the tutorial?")) {
			// redirect to setup home
			performLightningRedirect(`${SETUP_LIGHTNING}SetupOneHome/home`);
			const tutorial = new Tutorial();
			await tutorial.start();
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
