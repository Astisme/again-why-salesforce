"use strict";
import {
	EXTENSION_NAME,
} from "../constants.js"
import {
    // functions
    //sf_sendMessage,
    getIsCurrentlyOnSavedTab,
    isOnSavedTab,
    performActionOnTabs,
    getWasOnSavedTab,
    getAllTabs,
    ensureAllTabsAvailability,
    showToast,
    getCurrentHref,
} from "./content.js"

let allTabs;
const interval = setInterval(() => {
    try {
        allTabs = getAllTabs();
        clearInterval(interval);
    } catch (error) {
    }
}, 100)

const BUTTON_ID = `${EXTENSION_NAME}-button`;
const STAR_ID = `${EXTENSION_NAME}-star`;
const SLASHED_STAR_ID = `${EXTENSION_NAME}-slashed-star`;

/**
 * Finds on the page
 */
function getHeader(innerElement = "") {
	return document.querySelector(
		`div.tabsetBody.main-content.mainContentMark.fullheight.active.isSetupApp > div.split-right > section.tabContent.oneConsoleTab.active div.overflow.uiBlock ${innerElement}`,
	);
}
/**
 * Generates the element for the favourite button.
 *
 * @returns {Element} - The generated element for the favourite button.
 */
function generateFavouriteButton() {
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
	const { img: starImg, span: starSpan } = createImageElement(
		STAR_ID,
		star,
		"Save as Tab",
	);
	span.appendChild(starImg);
	span.appendChild(starSpan);

	const slashedStar = chrome.runtime.getURL("assets/svgs/slashed-star.svg");
	const { img: slashedStarImg, span: slashedStarSpan } = createImageElement(
		SLASHED_STAR_ID,
		slashedStar,
		"Remove Tab",
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
 * Retrieves the favourite image with the specified Id from the page.
 *
 * @param {string} favouriteId - the Id of the favourite button to find.
 * @param {HTMLElement} [button=null] - the HTMLElement of the button which is parent of the favouriteId.
 */
function getFavouriteImage(favouriteId, button = null) {
    if(favouriteId == null)
        throw new Error("Cannot get favourite image without the Id");
	return button?.querySelector(`#${favouriteId}`) ??
		button?.querySelector(`.${favouriteId}`) ??
		document.getElementById(favouriteId) ??
		document.querySelector(`#${BUTTON_ID} .${favouriteId}`);
}
/**
 * Toggles the visibility of the favourite button based on whether the tab is saved.
 *
 * @param {HTMLElement} button - The favourite button element.
 * @param {boolean} isSaved - Optional flag indicating whether the tab is saved.
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
 * Adds the tab with the given URL and finds its title from the page
 *
 * @param {string} url - the minified URL of the tab to add
 * @param {HTMLElement} parent - the parent node of the favourite button
 */
async function addTab(url) {
	const label = getHeader(".breadcrumbDetail").innerText;
	let org;

    const href = location.href;
    if (await Tab.containsSalesforceId(href)) {
		org = Tab.extractOrgName(href);
    }

	await performActionOnTabs("add",{ label, url, org })
}
/**
 * Adds or removes the current tab from the saved tabs list based on the button's state.
 *
 * @param {HTMLElement} parent - The parent element of the favourite button.
 */
async function actionFavourite() {
	const url = Tab.minifyURL(getCurrentHref());

    if (getIsCurrentlyOnSavedTab()) {
        await ensureAllTabsAvailability();
        const tabToRemove = allTabs.getTabsByData({url})[0];
        if(tabToRemove == null){
            showToast("Cannot remove a non favourite Tab!", false, true);
            return;
        }
		await performActionOnTabs("remove-this",tabToRemove);
    } else {
        await addTab(url);
    }

    toggleFavouriteButton();
}

/**
 * Displays the favourite button in the UI if applicable.
 *
 * @param {number} [count=0] - The number of retry attempts to find headers.
 */
export async function showFavouriteButton(count = 0) {
	if (count > 5) {
		console.error("Again, Why Salesforce - failed to find headers.");
		return setTimeout(() => showFavouriteButton(), 5000);
	}
    const miniURL = Tab.minifyURL(getCurrentHref());

	// Do not add favourite button on Home and Object Manager
	const standardTabs = ["SetupOneHome/home", "ObjectManager/home"];
	if (standardTabs.includes(miniURL)) {
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
        await ensureAllTabsAvailability();
        toggleFavouriteButton(await allTabs.exists({url: miniURL}));
		return;
	}
	const button = generateFavouriteButton();
	header.appendChild(button);
	toggleFavouriteButton(isCurrentlyOnSavedTab, button); // init correctly
}

/**
 * Performs the specified action for the current page, adding or removing from the tab list.
 *
 * @param {boolean} [save=true] - whether the current page should be added or removed as tab
 */
export function pageActionTab(save = true) {
	const favourite = getFavouriteImage(save ? STAR_ID : SLASHED_STAR_ID);
	if (!favourite.classList.contains("hidden")) favourite.click();
	else {
		const message = save
			? "Cannot save:\nThis page has already been saved!"
			: "Cannot remove:\nCannot remove a page that has not been saved before";
		showToast(message, true, true);
	}
}
