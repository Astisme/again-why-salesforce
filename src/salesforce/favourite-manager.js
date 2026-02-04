"use strict";
import {
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	EXTENSION_LABEL,
	EXTENSION_NAME,
	HIDDEN_CLASS,
	SKIP_LINK_DETECTION,
	TAB_ADD_FRONT,
	TAB_AS_ORG,
} from "/constants.js";
import { getSettings, sendExtensionMessage } from "/functions.js";
import Tab from "/tab.js";
import { ensureAllTabsAvailability } from "/tabContainer.js";
import ensureTranslatorAvailability from "/translator.js";

import {
	ACTION_ADD,
	ACTION_REMOVE_THIS,
	getCurrentHref,
	getIsCurrentlyOnSavedTab,
	getWasOnSavedTab,
	isOnSavedTab,
	performActionOnTabs,
	showToast,
} from "./content.js";

const BUTTON_ID = `${EXTENSION_NAME}-button`;
export const STAR_ID = `${EXTENSION_NAME}-star`;
export const SLASHED_STAR_ID = `${EXTENSION_NAME}-slashed-star`;

/**
 * Finds the parent node of the current Setup page
 * - The function looks for the element within a structured section of the page, including the `tabsetBody`, `main-content`, and related sub-elements.
 * - The `innerElement` parameter allows for further targeting of a nested element within this structure (e.g., a child element or a class).
 *
 * @param {string} [innerElement=""] - A CSS selector string that targets a specific child or inner element within the main structure. Defaults to an empty string, which returns the entire section.
 * @return {HTMLElement|null} The element matching the selector or `null` if no matching element is found.
 */
function getHeader(innerElement = "") {
	return document.querySelector(
		`div.tabsetBody.main-content.mainContentMark.fullheight.active.isSetupApp > div.split-right > section.tabContent.oneConsoleTab.active div.overflow.uiBlock ${innerElement}`,
	);
}

/**
 * Creates an SVG star element with customizable properties
 * @param {string} id - The id attribute for the SVG element
 * @param {string} alt - The alt attribute for accessibility
 * @param {string} [width='2em'] - The width of the star
 * @param {string} [height='2em'] - The height of the star
 * @param {string} [stroke='#000000'] - The stroke color (outline star only)
 * @param {string} [strokeWidth='2'] - The stroke width (outline star only)
 * @param {string} [fill='none'] - The fill color
 * @param {boolean} [slashed=false] - Whether to create a slashed star
 * @return {SVGElement} The created star SVG element
 */
function createStarSvg({
	id = null,
	alt = null,
}, slashed = false) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	if (id) svg.id = id;
	if (alt) svg.alt = alt;
	svg.style.width = "2em";
	svg.style.height = "2em";
	svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	const salesforceLightBlue = "#00a1e0";
	if (slashed) {
		path.style.fill = salesforceLightBlue;
		svg.setAttribute("viewBox", "0 0 56 56");
		path.setAttribute(
			"d",
			"M 40.3985 33.6133 L 52.2578 25.0820 C 53.7112 24.0508 54.2968 22.9727 53.9219 21.8008 C 53.5470 20.6758 52.4454 20.1133 50.6406 20.1367 L 35.2891 20.2305 L 30.6251 5.5820 C 30.0626 3.8476 29.2188 2.9805 28.0001 2.9805 C 26.8048 2.9805 25.9610 3.8476 25.3985 5.5820 L 22.2110 15.5195 L 25.0235 18.3086 L 27.8595 8.8633 C 27.9063 8.7227 27.9532 8.6758 28.0001 8.6758 C 28.0704 8.6758 28.1173 8.7227 28.1407 8.8633 L 32.2188 22.4336 C 32.5001 23.3945 33.1329 23.7930 34.0938 23.7695 L 48.2733 23.5117 C 48.4139 23.5117 48.4610 23.5117 48.4845 23.5820 C 48.508 23.6524 48.4610 23.6992 48.3674 23.7695 L 37.8204 31.0586 Z M 48.2733 50.5352 C 48.9765 51.2383 50.1251 51.2383 50.8283 50.5352 C 51.5315 49.8320 51.5315 48.6836 50.8283 47.9805 L 14.2891 11.5586 C 13.5860 10.8555 12.4376 10.8555 11.7110 11.5586 C 11.0079 12.2149 11.0313 13.4102 11.7110 14.1133 Z M 11.9688 52.2930 C 12.9298 53.0195 14.1485 52.7617 15.6016 51.7071 L 28.0001 42.6133 L 40.4220 51.7071 C 41.8751 52.7617 43.0469 52.9961 44.0548 52.2930 C 44.3360 52.0820 44.5469 51.8008 44.8985 51.2617 L 29.1954 39.0039 C 28.4454 38.4180 27.5782 38.4180 26.8282 39.0039 L 15.5548 47.6055 C 15.4610 47.6758 15.3907 47.7227 15.3438 47.6524 C 15.2969 47.6055 15.3204 47.5820 15.3438 47.4414 L 20.0079 34.0352 C 20.3126 33.1211 20.1485 32.3945 19.3282 31.8320 L 7.6563 23.7695 C 7.5391 23.6992 7.5157 23.6524 7.5391 23.5820 C 7.5626 23.5117 7.6095 23.5117 7.7501 23.5117 L 17.3595 23.6758 L 13.8438 20.1836 L 5.3829 20.1367 C 3.5782 20.1133 2.4766 20.6758 2.1016 21.8008 C 1.7032 22.9727 2.3126 24.0508 3.7657 25.0820 L 16.2813 34.0820 L 11.3829 48.6602 C 10.7969 50.3711 11.0079 51.5664 11.9688 52.2930 Z",
		);
	} else {
		path.style.stroke = salesforceLightBlue;
		path.style.strokeWidth = 2;
		path.style.fill = "transparent";
		svg.setAttribute("viewBox", "0 0 24 24");
		path.setAttribute(
			"d",
			"M11.2691 4.41115C11.5006 3.89177 11.6164 3.63208 11.7776 3.55211C11.9176 3.48263 12.082 3.48263 12.222 3.55211C12.3832 3.63208 12.499 3.89177 12.7305 4.41115L14.5745 8.54808C14.643 8.70162 14.6772 8.77839 14.7302 8.83718C14.777 8.8892 14.8343 8.93081 14.8982 8.95929C14.9705 8.99149 15.0541 9.00031 15.2213 9.01795L19.7256 9.49336C20.2911 9.55304 20.5738 9.58288 20.6997 9.71147C20.809 9.82316 20.8598 9.97956 20.837 10.1342C20.8108 10.3122 20.5996 10.5025 20.1772 10.8832L16.8125 13.9154C16.6877 14.0279 16.6252 14.0842 16.5857 14.1527C16.5507 14.2134 16.5288 14.2807 16.5215 14.3503C16.5132 14.429 16.5306 14.5112 16.5655 14.6757L17.5053 19.1064C17.6233 19.6627 17.6823 19.9408 17.5989 20.1002C17.5264 20.2388 17.3934 20.3354 17.2393 20.3615C17.0619 20.3915 16.8156 20.2495 16.323 19.9654L12.3995 17.7024C12.2539 17.6184 12.1811 17.5765 12.1037 17.56C12.0352 17.5455 11.9644 17.5455 11.8959 17.56C11.8185 17.5765 11.7457 17.6184 11.6001 17.7024L7.67662 19.9654C7.18404 20.2495 6.93775 20.3915 6.76034 20.3615C6.60623 20.3354 6.47319 20.2388 6.40075 20.1002C6.31736 19.9408 6.37635 19.6627 6.49434 19.1064L7.4341 14.6757C7.46898 14.5112 7.48642 14.429 7.47814 14.3503C7.47081 14.2807 7.44894 14.2134 7.41394 14.1527C7.37439 14.0842 7.31195 14.0279 7.18708 13.9154L3.82246 10.8832C3.40005 10.5025 3.18884 10.3122 3.16258 10.1342C3.13978 9.97956 3.19059 9.82316 3.29993 9.71147C3.42581 9.58288 3.70856 9.55304 4.27406 9.49336L8.77835 9.01795C8.94553 9.00031 9.02911 8.99149 9.10139 8.95929C9.16534 8.93081 9.2226 8.8892 9.26946 8.83718C9.32241 8.77839 9.35663 8.70162 9.42508 8.54808L11.2691 4.41115Z",
		);
		path.setAttribute("stroke-linecap", "round");
		path.setAttribute("stroke-linejoin", "round");
	}
	svg.appendChild(path);
	return svg;
}

/**
 * Generates a "Favourite" button with an icon that toggles between a star and a slashed star, depending on whether a tab is saved or not.
 * - The button is created with necessary ARIA attributes for accessibility and styled with Salesforce Lightning Design System (SLDS) classes.
 * - A click event listener is added to trigger the `actionFavourite` function when the button is clicked.
 * - The button contains a span for the label and image elements for the star icons.
 * - If the image fails to load, it falls back to displaying the text label.
 *
 * @return {HTMLButtonElement} The generated button element with its child elements (star images and styles).
 */
async function generateFavouriteButton() {
	const button = document.createElement("button");
	button.id = BUTTON_ID;
	button.classList.add("slds-button", "slds-button--neutral", "uiButton");
	button.setAttribute("type", "button");
	button.setAttribute("aria-live", "off");
	button.setAttribute("aria-label", "");
	button.addEventListener(
		"click",
		actionFavourite,
	);
	const span = document.createElement("span");
	span.classList.add("label", "bBody");
	span.setAttribute("dir", "ltr");
	button.appendChild(span);
	const commands = [CMD_SAVE_AS_TAB, CMD_REMOVE_TAB];
	const connectedCommands = await sendExtensionMessage({
		what: "get-commands",
		commands,
	});
	let starCmd = null;
	let slashedStarCmd = null;
	for (const cc of connectedCommands) {
		switch (cc.name) {
			case CMD_SAVE_AS_TAB:
				starCmd = cc.shortcut;
				break;
			case CMD_REMOVE_TAB:
				slashedStarCmd = cc.shortcut;
				break;
			default:
				break;
		}
	}
	const translator = await ensureTranslatorAvailability();
	const star = createStarSvg({
		id: STAR_ID,
		alt: `${await translator.translate("save_tab")}${
			starCmd == null ? "" : ` (${starCmd})`
		}`,
	}, false);
	span.appendChild(star);
	const slashedStar = createStarSvg({
		id: SLASHED_STAR_ID,
		alt: `${await translator.translate("remove_tab")}${
			slashedStarCmd == null ? "" : ` (${slashedStarCmd})`
		}`,
	}, true);
	slashedStar.classList.add(HIDDEN_CLASS);
	span.appendChild(slashedStar);
	const style = document.createElement("style");
	style.textContent = `.${HIDDEN_CLASS} { display: none; }`;
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
 * @return {HTMLElement|null} The favourite image element if found, otherwise null.
 * @throws {Error} Throws an error if `favouriteId` is null.
 */
function getFavouriteImage(favouriteId, button = null) {
	if (favouriteId == null) {
		throw new Error("error_missing_favourite_id");
	}
	return button?.querySelector(`#${favouriteId}`) ??
		document.getElementById(favouriteId);
}

/**
 * Toggles the visibility of the "Favourite" button's star icons based on the provided `isSaved` status.
 * - If `isSaved` is null, it simply toggles the visibility of both the star and slashed star icons.
 * - If `isSaved` is true, the star icon is hidden, and the slashed star icon is displayed.
 * - If `isSaved` is false, the slashed star icon is hidden, and the star icon is shown.
 *
 * @param {boolean|null} [isSaved=null] - A flag indicating whether the Tab is saved (true) or not saved (false).
 *                                       If null, both icons are toggled.
 * @param {HTMLButtonElement|null} [button=null] - The button element that contains the star images. Defaults to null (searches the entire document).
 * @return {void}
 */
function toggleFavouriteButton(isSaved = null, button = null) {
	// will use the class identifier if there was an error with the image (and was removed)
	if (isSaved == null) {
		return;
	}
	const star = getFavouriteImage(STAR_ID, button);
	const slashedStar = getFavouriteImage(SLASHED_STAR_ID, button);
	if (isSaved) {
		star.classList.add(HIDDEN_CLASS);
		slashedStar.classList.remove(HIDDEN_CLASS);
	} else {
		star.classList.remove(HIDDEN_CLASS);
		slashedStar.classList.add(HIDDEN_CLASS);
	}
}

/**
 * Adds a new Tab to the collection with the specified URL and label.
 * - Retrieves the label of the current page from the breadcrumb header.
 * - Attempts to extract the organization name from the current URL if it contains a Salesforce ID.
 * - Calls the `performActionOnTabs` function to add the new Tab with the extracted label, URL, and optional organization.
 *
 * @param {string} url - The URL of the Tab to be added.
 * @return {Promise<void>}
 */
async function addTab(url) {
	const label = getHeader(".breadcrumbDetail").innerText;
	const settings = await getSettings([
		SKIP_LINK_DETECTION,
		TAB_ADD_FRONT,
		TAB_AS_ORG,
	]);
	const href = getCurrentHref();
	let org;
	const isTabAsOrgEnabled = (
		Array.isArray(settings) &&
		!settings.some((s) => s.id === TAB_AS_ORG && !s.enabled) // no setting exists with TAB_AS_ORG id that is disabled.
	);
	const isLinkDetectionEnabled = ( // => isSkipLinkDetectionDisabled
		Array.isArray(settings) &&
		!settings.some((s) => s.id === SKIP_LINK_DETECTION && s.enabled) // no setting exists with SKIP_LINK_DETECTION id that is enabled.
	);
	if (
		isTabAsOrgEnabled ||
		(
			(
				settings == null ||
				isLinkDetectionEnabled
			) &&
			Tab.containsSalesforceId(href)
		)
	) {
		org = Tab.extractOrgName(href);
	}
	await performActionOnTabs(
		ACTION_ADD,
		{ label, url, org },
		{
			addInFront: Array.isArray(settings) &&
				settings.some((s) => s.id === TAB_ADD_FRONT && s.enabled), // some setting exists with TAB_ADD_FRONT id that is enabled
		},
	);
}

/**
 * Handles the action of toggling a Tab as a favourite.
 * - If the current Tab is already saved as a favourite, it removes it from the collection.
 * - If the current Tab is not saved, it adds the Tab as a favourite.
 * - The function performs actions based on whether the Tab is currently marked as a favourite.
 * - After performing the action, it updates the "Favourite" button's state.
 *
 * @return {Promise<void>}
 */
async function actionFavourite() {
	const url = Tab.minifyURL(getCurrentHref());
	if (getIsCurrentlyOnSavedTab()) {
		const allTabs = await ensureAllTabsAvailability();
		try {
			const tabToRemove = allTabs.getSingleTabByData({
				url,
				org: Tab.extractOrgName(getCurrentHref()),
			});
			await performActionOnTabs(ACTION_REMOVE_THIS, tabToRemove);
		} catch (e) {
			console.warn(e);
			showToast("error_remove_not_favourite", false, true);
		}
	} else {
		await addTab(url);
	}
	document.dispatchEvent(new CustomEvent("actionFavourite:completed"));
}

/**
 * Handles the action of toggling a Tab as a favourite.
 * - If the current Tab is already saved as a favourite, it removes it from the collection.
 * - If the current Tab is not saved, it adds the Tab as a favourite.
 * - The function performs actions based on whether the Tab is currently marked as a favourite.
 * - After performing the action, it updates the "Favourite" button's state.
 *
 * @param {number} [count=0] - the number of times this function has been called (auto increments)
 * @return {Promise<void>}
 */
export async function showFavouriteButton(count = 0) {
	if (count > 5) {
		const translator = await ensureTranslatorAvailability();
		const failHead = await translator.translate("error_no_headers");
		console.error(`${EXTENSION_LABEL} - ${failHead}`);
		return setTimeout(() => showFavouriteButton(), 5000);
	}
	const currentHref = getCurrentHref();
	const url = Tab.minifyURL(currentHref);
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
		const allTabs = await ensureAllTabsAvailability();
		toggleFavouriteButton(
			allTabs.existsWithOrWithoutOrg({
				url,
				org: Tab.extractOrgName(currentHref),
			}),
			oldButton,
		);
		return;
	}
	const button = await generateFavouriteButton();
	header.appendChild(button);
	toggleFavouriteButton(isCurrentlyOnSavedTab, button); // init correctly
}

/**
 * Performs an action on the "Favourite" Tab (either save or remove) based on the provided `save` flag.
 * - If `save` is true, it attempts to click the star image to save the current page as a favourite.
 * - If `save` is false, it attempts to click the slashed star image to remove the page from the favourites.
 * - If the Tab is already in the desired state (saved or not), it shows a toast message indicating the action cannot be performed.
 *
 * @param {boolean} [save=true] - A flag indicating whether to save (true) or remove (false) the current page from the favourites.
 * @return {void}
 */
export function pageActionTab(save = true) {
	const favourite = getFavouriteImage(save ? STAR_ID : SLASHED_STAR_ID);
	if (favourite.classList.contains(HIDDEN_CLASS)) {
		const message = save ? "error_useless_save" : "error_useless_remove";
		showToast(message, true, true);
	} else {
		favourite.closest("button").click(); // otherwise we would click on the svg
	}
}
