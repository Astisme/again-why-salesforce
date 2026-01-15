"use strict";
import { BROWSER, EXTENSION_GITHUB_LINK } from "/constants.js";
import { sendExtensionMessage } from "/functions.js";
import { getSetupTabUl } from "./content.js";
import { STAR_ID, SLASHED_STAR_ID } from "./favourite-manager.js";

/**
 * Tutorial class to guide users through the extension features.
 */
class Tutorial {
	constructor() {
		this.currentStep = 0;
		this.overlay = null;
		this.messageBox = null;
		this.highlightBox = null;
		this.isActive = false;
		this.shortcut = null;
		this.steps = [];
	}

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
				element: () => {
					const ul = getSetupTabUl();
					return ul.querySelector('a[title="Users"]');
				},
				message: "tutorial_click_users",
				action: "highlight",
				waitFor: "click",
			},
			{
				element: () => document.getElementById(SLASHED_STAR_ID),
				message: "tutorial_remove_favourite",
				action: "highlight",
				waitFor: "click",
			},
			{
				message: "tutorial_redirect_account",
				action: "confirm",
				onConfirm: () => {
					window.location.href = "/setup/lightning/ObjectManager/Account/FieldsAndRelationships/view";
				},
			},
			{
				element: () => document.getElementById(STAR_ID),
				message: "tutorial_add_favourite",
				action: "highlight",
				waitFor: "click",
			},
			{
				element: () => {
					const ul = getSetupTabUl();
					return ul.querySelector('a[title*="Account"]');
				},
				message: "tutorial_pin_tab",
				action: "highlight",
				waitFor: "timeout",
			},
			{
				element: () => {
					const ul = getSetupTabUl();
					return ul.querySelector('a[title*="Account"]');
				},
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
				element: () => document.querySelector('.modal .slds-table tbody tr:nth-child(2) .slds-icon-utility-drag'),
				message: "tutorial_drag_users",
				action: "highlight",
				waitFor: "timeout",
			},
			{
				message: "tutorial_pinned_explanation",
				action: "info",
			},
			{
				element: () => document.querySelector('.modal button[data-i18n="save"]'),
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
	 * Starts the tutorial.
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
	 * Creates the overlay for highlighting and messages.
	 */
	createOverlay() {
		this.overlay = document.createElement("div");
		this.overlay.style.position = "fixed";
		this.overlay.style.top = "0";
		this.overlay.style.left = "0";
		this.overlay.style.width = "100%";
		this.overlay.style.height = "100%";
		this.overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
		this.overlay.style.zIndex = "10000";
		this.overlay.style.pointerEvents = "none";

		this.messageBox = document.createElement("div");
		this.messageBox.style.position = "fixed";
		this.messageBox.style.bottom = "20px";
		this.messageBox.style.left = "50%";
		this.messageBox.style.transform = "translateX(-50%)";
		this.messageBox.style.backgroundColor = "white";
		this.messageBox.style.padding = "20px";
		this.messageBox.style.borderRadius = "8px";
		this.messageBox.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
		this.messageBox.style.zIndex = "10001";
		this.messageBox.style.maxWidth = "400px";
		this.messageBox.style.pointerEvents = "auto";

		this.highlightBox = document.createElement("div");
		this.highlightBox.style.position = "absolute";
		this.highlightBox.style.backgroundColor = "rgba(255,255,0,0.5)";
		this.highlightBox.style.border = "2px solid yellow";
		this.highlightBox.style.zIndex = "9999";
		this.highlightBox.style.pointerEvents = "none";

		document.body.appendChild(this.overlay);
		document.body.appendChild(this.messageBox);
		document.body.appendChild(this.highlightBox);
	}

	/**
	 * Proceeds to the next step.
	 */
	nextStep() {
		if (this.currentStep >= this.steps.length) {
			this.end();
			return;
		}
		const step = this.steps[this.currentStep];
		this.executeStep(step);
		this.currentStep++;
	}

	/**
	 * Executes a tutorial step.
	 */
	async executeStep(step) {
		// Clear previous highlights
		this.highlightBox.style.display = "none";

		if (step.element) {
			const el = step.element();
			if (el) {
				this.highlightElement(el);
			}
		}

		await this.showMessage(step);

		if (step.waitFor) {
			this.waitForAction(step);
		} else if (step.action === "confirm") {
			this.showConfirm(step);
		} else {
			// Auto proceed after message
			setTimeout(() => this.nextStep(), 3000);
		}
	}

	/**
	 * Highlights an element.
	 */
	highlightElement(el) {
		const rect = el.getBoundingClientRect();
		this.highlightBox.style.top = rect.top + "px";
		this.highlightBox.style.left = rect.left + "px";
		this.highlightBox.style.width = rect.width + "px";
		this.highlightBox.style.height = rect.height + "px";
		this.highlightBox.style.display = "block";
	}

	/**
	 * Shows a message for the step.
	 */
	async showMessage(step) {
		const translator = await import("/translator.js").then(m => m.default);
		let message = await translator.translate(step.message);
		if (step.link) {
			message += `\n\n${step.link}`;
		}
		if (step.shortcut) {
			message += `\n\nShortcut: ${step.shortcut}`;
		}
		this.messageBox.textContent = message;
	}

	/**
	 * Waits for a user action.
	 */
	waitForAction(step) {
		if (step.waitFor === "click") {
			const el = step.element();
			if (el) {
				el.addEventListener("click", () => this.nextStep(), { once: true });
			} else {
				setTimeout(() => this.nextStep(), 1000);
			}
		} else if (step.waitFor === "timeout") {
			setTimeout(() => this.nextStep(), 5000);
		}
	}

	/**
	 * Shows a confirmation dialog.
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
	 * Gets the settings keyboard shortcut.
	 */
	async getSettingsShortcut() {
		const commands = await sendExtensionMessage({ what: "get-commands", commands: ["cmd-open-settings"] });
		const cmd = commands.find(c => c.name === "cmd-open-settings");
		return cmd ? cmd.shortcut : "Alt+Comma";
	}

	/**
	 * Ends the tutorial.
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
 * Checks if tutorial should be shown automatically.
 */
export async function checkTutorial() {
	const completed = localStorage.getItem("tutorialCompleted");
	if (!completed) {
		if (confirm("Do you want to start the tutorial?")) {
			const tutorial = new Tutorial();
			await tutorial.start();
		}
	}
}

/**
 * Starts the tutorial manually.
 */
export function startTutorial() {
	const tutorial = new Tutorial();
	tutorial.start();
}