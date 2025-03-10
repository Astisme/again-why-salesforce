"use strict";

const buttonId = `${prefix}-button`;
const starId = `${prefix}-star`;
const slashedStarId = `${prefix}-slashed-star`;

/**
 * Generates the element for the favourite button.
 *
 * @returns {Element} - The generated element for the favourite button.
 */
function generateFavouriteButton() {
	const button = document.createElement("button");
	button.id = buttonId;
	button.classList.add("slds-button", "slds-button--neutral", "uiButton");
	button.setAttribute("type", "button");
	button.setAttribute("aria-live", "off");
	button.setAttribute("aria-label", "");
	button.setAttribute("data-aura-rendered-by", "3:829;a");
	button.setAttribute("data-aura-class", "uiButton");
	button.addEventListener(
		"click",
		() => actionFavourite(document.querySelector("div.overflow.uiBlock")),
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
		starId,
		star,
		"Save as Tab",
	);
	span.appendChild(starImg);
	span.appendChild(starSpan);

	const slashedStar = chrome.runtime.getURL("assets/svgs/slashed-star.svg");
	const { img: slashedStarImg, span: slashedStarSpan } = createImageElement(
		slashedStarId,
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
	return button?.querySelector(`#${favouriteId}`) ??
		button?.querySelector(`.${favouriteId}`) ??
		document.getElementById(favouriteId) ??
		document.querySelector(`#${buttonId} .${favouriteId}`);
}
/**
 * Toggles the visibility of the favourite button based on whether the tab is saved.
 *
 * @param {HTMLElement} button - The favourite button element.
 * @param {boolean} isSaved - Optional flag indicating whether the tab is saved.
 */
function toggleFavouriteButton(isSaved, button) {
	// will use the class identifier if there was an error with the image (and was removed)
	const star = getFavouriteImage(starId, button);
	const slashedStar = getFavouriteImage(slashedStarId, button);

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
function addTab(url, parent) {
	const tabTitle = parent.querySelector(".breadcrumbDetail").innerText;
	currentTabs.push({ tabTitle, url });
	setStorage();
}
/**
 * Adds or removes the current tab from the saved tabs list based on the button's state.
 *
 * @param {HTMLElement} parent - The parent element of the favourite button.
 */
function actionFavourite(parent) {
	minifyURL(href)
		.then((url) => {
			_minifiedURL = url;

			if (isCurrentlyOnSavedTab) {
				removeTab(url);
			} else {
				addTab(url, parent);
			}

			toggleFavouriteButton();
		});
}

/**
 * Checks if the current URL is saved and updates the favourite button accordingly.
 */
function checkUpdateFavouriteButton() {
	// check if the current page is being imported
	minifyURL(href)
		.then((miniURL) => {
			_minifiedURL = miniURL;
			const isOnFavouriteTab = currentTabs.some((current) =>
				current.url === miniURL
			);
			toggleFavouriteButton(isOnFavouriteTab);
		});
}

/**
 * Displays the favourite button in the UI if applicable.
 *
 * @param {number} [count=0] - The number of retry attempts to find headers.
 */
function showFavouriteButton(count = 0) {
	if (count > 5) {
		console.error("Again, Why Salesforce - failed to find headers.");
		return setTimeout(() => showFavouriteButton(), 5000);
	}

	// Do not add favourite button on Home and Object Manager
	const standardTabs = ["SetupOneHome/home", "ObjectManager/home"];
	if (standardTabs.includes(_minifiedURL)) {
		return;
	}

	// there's possibly 2 headers: one for Setup home and one for Object Manager
	const headers = Array.from(
		document.querySelectorAll("div.overflow.uiBlock > div.bRight"),
	);
	if (headers == null || headers.length < 1) {
		return setTimeout(() => showFavouriteButton(count + 1), 500);
	}

	// ensure we have clean data
	if (wasOnSavedTab == null && isCurrentlyOnSavedTab == null) {
		isOnSavedTab();
	}

	for (const header of headers) {
		if (header.querySelector(`#${buttonId}`) != null) {
			// already inserted my button, check if I should switch it
			checkUpdateFavouriteButton();
			continue;
		}
		const button = generateFavouriteButton();
		header.appendChild(button);
		toggleFavouriteButton(isCurrentlyOnSavedTab, button); // init correctly
	}
}
