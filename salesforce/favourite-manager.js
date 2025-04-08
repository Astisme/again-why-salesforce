"use strict";
import Tab from "/tab.js";
import { EXTENSION_LABEL, EXTENSION_NAME } from "/constants.js";
import { ensureTranslatorAvailability } from "/translator.js";

import {
	ensureAllTabsAvailability,
	getAllTabs,
	getCurrentHref,
	getIsCurrentlyOnSavedTab,
	getWasOnSavedTab,
	isOnSavedTab,
	performActionOnTabs,
	showToast,
} from "./content.js";

let allTabs;
const interval = setInterval(() => {
	try {
		allTabs = getAllTabs();
		clearInterval(interval);
	} catch (_) {
		// wait next interval
	}
}, 100);

const BUTTON_ID = `${EXTENSION_NAME}-button`;
const STAR_ID = `${EXTENSION_NAME}-star`;
const SLASHED_STAR_ID = `${EXTENSION_NAME}-slashed-star`;

/**
 * Finds the parent node of the current Setup page
 * - The function looks for the element within a structured section of the page, including the `tabsetBody`, `main-content`, and related sub-elements.
 * - The `innerElement` parameter allows for further targeting of a nested element within this structure (e.g., a child element or a class).
 *
 * @param {string} [innerElement=""] - A CSS selector string that targets a specific child or inner element within the main structure. Defaults to an empty string, which returns the entire section.
 * @returns {HTMLElement|null} The element matching the selector or `null` if no matching element is found.
 */
function getHeader(innerElement = "") {
	return document.querySelector(
		`div.tabsetBody.main-content.mainContentMark.fullheight.active.isSetupApp > div.split-right > section.tabContent.oneConsoleTab.active div.overflow.uiBlock ${innerElement}`,
	);
}

/**
 * Generates a "Favourite" button with an icon that toggles between a star and a slashed star, depending on whether a tab is saved or not.
 * - The button is created with necessary ARIA attributes for accessibility and styled with Salesforce Lightning Design System (SLDS) classes.
 * - A click event listener is added to trigger the `actionFavourite` function when the button is clicked.
 * - The button contains a span for the label and image elements for the star icons.
 * - If the image fails to load, it falls back to displaying the text label.
 *
 * @returns {HTMLButtonElement} The generated button element with its child elements (star images and styles).
 */
async function generateFavouriteButton() {
	const button = document.createElement("button");
	button.id = BUTTON_ID;
	button.classList.add("slds-button", "slds-button--neutral", "uiButton");
	button.setAttribute("type", "button");
	button.setAttribute("aria-live", "off");
	button.setAttribute("aria-label", "");
	button.setAttribute("data-aura-rendered-by", "3:829;a");
	button.setAttribute("data-aura-class", "uiButton");
	button.addEventListener(
		"click",
		actionFavourite,
	);
	const span = document.createElement("span");
	span.classList.add("label", "bBody");
	span.setAttribute("dir", "ltr");
	span.setAttribute("data-aura-rendered-by", "6:829;a");
	button.appendChild(span);
	/**
	 * Creates an image element with a specified `id`, `src` (source URL), and `alt` (alternative text) description.
	 * - The image element is styled with custom filter effects for visibility and design.
	 * - If the image fails to load (on error), a `span` with the `alt` text is displayed instead.
	 *
	 * @param {string} id - The ID to be assigned to the image element.
	 * @param {string} src - The source URL of the image.
	 * @param {string} alt - The alt text for the image, used for accessibility and as fallback content.
	 * @returns {Object} An object containing the `img` element and the corresponding `span` element (which is displayed in case of an error).
	 */
	function createImageElement(id, src, alt) {
		const img = document.createElement("img");
		img.id = id;
		img.setAttribute("src", src);
		img.setAttribute("alt", alt);
		img.setAttribute(
			"style",
			"height: 2rem; filter: invert(60%) sepia(100%) saturate(500%) hue-rotate(170deg) brightness(90%);",
		);
		const span = document.createElement("span");
		span.textContent = alt;
		span.classList.add("hidden", id);
		img.addEventListener("error", function () {
			if (!img.classList.contains("hidden")) {
				span.classList.remove("hidden");
			}
			img.remove();
		});
		return { img, span };
	}
	const star = chrome.runtime.getURL("assets/svgs/star.svg");
    const translator = await ensureTranslatorAvailability();
	const { img: starImg, span: starSpan } = createImageElement(
		STAR_ID,
		star,
		await translator.translate("save_tab"),
	);
	span.appendChild(starImg);
	span.appendChild(starSpan);
	const slashedStar = chrome.runtime.getURL("assets/svgs/slashed-star.svg");
	const { img: slashedStarImg, span: slashedStarSpan } = createImageElement(
		SLASHED_STAR_ID,
		slashedStar,
        await translator.translate("remove_tab"),
	);
	slashedStarSpan.classList.add("hidden");
	span.appendChild(slashedStarImg);
	span.appendChild(slashedStarSpan);
	const style = document.createElement("style");
	style.textContent = ".hidden { display: none; }";
	span.appendChild(style);
	return button;
}

/**
 * Retrieves the favourite image element by its ID or class name, searching through the button or the entire document.
 * - If the `favouriteId` is provided, it attempts to find the corresponding image element by ID or class within the provided button,
 *   or in the entire document if the button is not specified.
 * - If no element is found with the given `favouriteId`, it returns `null`.
 *
 * @param {string} favouriteId - The ID or class name of the favourite image element.
 * @param {HTMLButtonElement|null} [button=null] - The button element to limit the search to, or null to search the entire document.
 * @returns {HTMLElement|null} The favourite image element if found, otherwise null.
 * @throws {Error} Throws an error if `favouriteId` is null.
 */
function getFavouriteImage(favouriteId, button = null) {
	if (favouriteId == null) {
		throw new Error("error_missing_favourite_id");
	}
	return button?.querySelector(`#${favouriteId}`) ??
		button?.querySelector(`.${favouriteId}`) ??
		document.getElementById(favouriteId) ??
		document.querySelector(`#${BUTTON_ID} .${favouriteId}`);
}

/**
 * Toggles the visibility of the "Favourite" button's star icons based on the provided `isSaved` status.
 * - If `isSaved` is null, it simply toggles the visibility of both the star and slashed star icons.
 * - If `isSaved` is true, the star icon is hidden, and the slashed star icon is displayed.
 * - If `isSaved` is false, the slashed star icon is hidden, and the star icon is shown.
 *
 * @param {boolean|null} [isSaved=null] - A flag indicating whether the tab is saved (true) or not saved (false).
 *                                       If null, both icons are toggled.
 * @param {HTMLButtonElement|null} [button=null] - The button element that contains the star images. Defaults to null (searches the entire document).
 * @returns {void}
 */
function toggleFavouriteButton(isSaved = null, button = null) {
	// will use the class identifier if there was an error with the image (and was removed)
	const star = getFavouriteImage(STAR_ID, button);
	const slashedStar = getFavouriteImage(SLASHED_STAR_ID, button);

	if (isSaved == null) {
		star.classList.toggle("hidden");
		slashedStar.classList.toggle("hidden");
		return;
	}

	if (isSaved) {
		star.classList.add("hidden");
		slashedStar.classList.remove("hidden");
	} else {
		star.classList.remove("hidden");
		slashedStar.classList.add("hidden");
	}
}

/**
 * Adds a new tab to the collection with the specified URL and label.
 * - Retrieves the label of the current page from the breadcrumb header.
 * - Attempts to extract the organization name from the current URL if it contains a Salesforce ID.
 * - Calls the `performActionOnTabs` function to add the new tab with the extracted label, URL, and optional organization.
 *
 * @param {string} url - The URL of the tab to be added.
 * @returns {Promise<void>}
 */
async function addTab(url) {
	const label = getHeader(".breadcrumbDetail").innerText;
	let org = undefined;
	const href = getCurrentHref();
	if (Tab.containsSalesforceId(href)) {
		org = Tab.extractOrgName(href);
	}
	await performActionOnTabs("add", { label, url, org });
}

/**
 * Handles the action of toggling a tab as a favourite.
 * - If the current tab is already saved as a favourite, it removes it from the collection.
 * - If the current tab is not saved, it adds the tab as a favourite.
 * - The function performs actions based on whether the tab is currently marked as a favourite.
 * - After performing the action, it updates the "Favourite" button's state.
 *
 * @returns {Promise<void>}
 */
async function actionFavourite() {
	const url = Tab.minifyURL(getCurrentHref());
	if (getIsCurrentlyOnSavedTab()) {
		allTabs = await ensureAllTabsAvailability();
		const tabToRemove = allTabs.getTabsByData({ url })[0];
		if (tabToRemove == null) {
			showToast("error_remove_not_favourite", false, true);
			return;
		}
		await performActionOnTabs("remove-this", tabToRemove);
	} else {
		await addTab(url);
	}
	toggleFavouriteButton();
}

/**
 * Handles the action of toggling a tab as a favourite.
 * - If the current tab is already saved as a favourite, it removes it from the collection.
 * - If the current tab is not saved, it adds the tab as a favourite.
 * - The function performs actions based on whether the tab is currently marked as a favourite.
 * - After performing the action, it updates the "Favourite" button's state.
 *
 * @returns {Promise<void>}
 */
export async function showFavouriteButton(count = 0) {
	if (count > 5) {
        const translator = await ensureTranslatorAvailability();
        const failHead = await translator.translate("error_no_headers");
		console.error(`${EXTENSION_LABEL} - ${failHead}`);
		return setTimeout(() => showFavouriteButton(), 5000);
	}
	const url = Tab.minifyURL(getCurrentHref());
	// Do not add favourite button on Home and Object Manager
	const standardTabs = ["SetupOneHome/home", "ObjectManager/home"];
	if (standardTabs.includes(url)) {
		return;
	}
	// there's possibly 2 headers: one for Setup home and one for Object Manager by getting the active one, we're sure to get the correct one (and only one)
	const header = getHeader("div.bRight");
	if (header == null) {
		return setTimeout(() => showFavouriteButton(count + 1), 500);
	}
	// ensure we have clean data
	const isCurrentlyOnSavedTab = getIsCurrentlyOnSavedTab();
	if (getWasOnSavedTab() == null && isCurrentlyOnSavedTab == null) {
		await isOnSavedTab();
	}
	const oldButton = header.querySelector(`#${BUTTON_ID}`);
	if (oldButton != null) {
		// already inserted my button, check if I should switch it
		allTabs = await ensureAllTabsAvailability();
		toggleFavouriteButton(allTabs.exists({ url }));
		return;
	}
	const button = await generateFavouriteButton();
	header.appendChild(button);
	toggleFavouriteButton(isCurrentlyOnSavedTab, button); // init correctly
}

/**
 * Performs an action on the "Favourite" tab (either save or remove) based on the provided `save` flag.
 * - If `save` is true, it attempts to click the star image to save the current page as a favourite.
 * - If `save` is false, it attempts to click the slashed star image to remove the page from the favourites.
 * - If the tab is already in the desired state (saved or not), it shows a toast message indicating the action cannot be performed.
 *
 * @param {boolean} [save=true] - A flag indicating whether to save (true) or remove (false) the current page from the favourites.
 * @returns {void}
 */
export function pageActionTab(save = true) {
	const favourite = getFavouriteImage(save ? STAR_ID : SLASHED_STAR_ID);
	if (!favourite.classList.contains("hidden")) favourite.click();
	else {
		const message = save
			? "error_useless_save"
			: "error_useless_remove";
		showToast(message, true, true);
	}
}
