"use strict";
import {
	HTTPS,
	LIGHTNING_FORCE_COM,
	SALESFORCE_URL_PATTERN,
	SETUP_LIGHTNING,
	TOAST_ERROR,
	TOAST_WARNING,
} from "../core/constants.js";
import { getSettings } from "../core/functions.js";
import { getTranslations } from "../core/translator.js";
import Tab from "../core/tab.js";
import { ensureAllTabsAvailability } from "../core/tabContainer.js";

import {
	generateOpenOtherOrgModal,
	MODAL_ID,
	sldsConfirm,
} from "./generator.js";
import { showToast } from "./toast.js";
import { getCurrentHref, getModalHanger } from "./sf-elements.js";

/**
 * Displays a modal for opening a page in another Salesforce organization.
 * - If a modal is already open, shows a toast to prompt the user to close the existing modal first.
 * - If the current page contains a Salesforce ID, shows a warning toast indicating the page cannot exist in another Org.
 * - Generates the modal with an input field for the user to specify the organization URL.
 * - If the user enters a valid Salesforce Org URL, the modal provides a confirmation prompt before opening the page in a new tab.
 * - The modal includes event listeners for user input and for saving the new organization link.
 *
 * @param {Object} options - An object containing optional parameters:
 * @param {string|null} [options.label=null] - The label for the modal. Defaults to a label fetched from saved tabs if not provided.
 * @param {string|null} [options.url=null] - The URL for the page to open in another organization.
 * @param {string|null} [options.org=null] - The org of the current page.
 * @return {Promise<void>} A promise that resolves once the modal has been displayed and the user interacts with it.
 */
export async function createOpenOtherOrgModal(
	{ label = null, url = null, org = null } = {},
) {
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", TOAST_ERROR);
	}
	const [allTabs, skip_link_detection] = await Promise.all([
		ensureAllTabsAvailability(),
		getSettings("skip_link_detection"),
	]);
	const href = globalThis.location?.href;
	if (label == null && url == null) {
		const minyURL = Tab.minifyURL(href);
		try {
			const matchingTab = allTabs.getSingleTabByData({ url: minyURL });
			label = matchingTab.label;
			url = matchingTab.url;
		} catch (e) {
			console.info(e);
			url = minyURL;
		}
	}
	if (org == null) {
		org = Tab.extractOrgName(href);
	}
	if (
		skip_link_detection != null && !skip_link_detection.enabled &&
		Tab.containsSalesforceId(url)
	) {
		showToast(
			"error_link_with_id",
			TOAST_WARNING,
		);
	}
	const {
		modalParent,
		saveButton,
		closeButton,
		inputContainer,
		getSelectedRadioButtonValue,
	} = await generateOpenOtherOrgModal({
		label,
		url, // if the url is "", we may still open the link in another Org without any issue
		org,
	});
	getModalHanger().appendChild(modalParent);
	let lastInput = "";
	inputContainer.addEventListener("input", (e) => {
		const target = e.target;
		const value = target.value;
		const delta = value.length - lastInput.length;
		if (delta > 2) {
			const newTarget = Tab.extractOrgName(value);
			if (newTarget != null && newTarget !== value) {
				target.value = newTarget;
				lastInput = newTarget;
			}
			return;
		}
		lastInput = value;
	});
	let lastExtracted = null;
	saveButton.addEventListener("click", async (e) => {
		e.preventDefault();
		const linkTarget = getSelectedRadioButtonValue();
		const inputVal = inputContainer.value;
		if (inputVal == null || inputVal === "") {
			return showToast(["insert_another", "org_link"], TOAST_WARNING);
		}
		const newTarget = Tab.extractOrgName(inputVal);
		if (lastExtracted === newTarget) return; // could be called more than once
		lastExtracted = newTarget;
		if (
			!SALESFORCE_URL_PATTERN.test(newTarget)
		) {
			return showToast(["insert_valid_org", newTarget], TOAST_ERROR);
		}
		if (newTarget === Tab.extractOrgName(getCurrentHref())) {
			return showToast(
				"insert_another_org",
				TOAST_ERROR,
			);
		}
		const targetUrl = new URL(
			`${HTTPS}${newTarget}${LIGHTNING_FORCE_COM}${
				url.startsWith("/") ? "" : SETUP_LIGHTNING
			}${url}`,
		);
		const [confirm_msg, confirmLabel, cancelLabel, closeLabel] =
			await getTranslations([
				"confirm_another_org",
				"confirm",
				"cancel",
				"cancel_close",
			]);
		if (
			await sldsConfirm({
				body: [confirm_msg, targetUrl],
				confirmLabel,
				cancelLabel,
				closeLabel,
			})
		) {
			closeButton.click();
			open(targetUrl, linkTarget ?? "_blank");
		}
	});
}
