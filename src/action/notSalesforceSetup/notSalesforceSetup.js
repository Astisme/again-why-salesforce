import {
	BROWSER,
	HIDDEN_CLASS,
	POPUP_LOGIN_NEW_TAB,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_SETUP_NEW_TAB,
	SALESFORCE_LIGHTNING_PATTERN,
	SALESFORCE_SETUP_HOME_MINI,
	SETUP_LIGHTNING,
	WHAT_GET_BROWSER_TAB,
} from "/constants.js";
import { getSettings, sendExtensionMessage } from "/functions.js";
import ensureTranslatorAvailability from "/translator.js";
import "../themeHandler.js";

/**
 * Dynamically creates and inserts content into the page based on the "url" query parameter.
 * Validates if the URL corresponds to a valid Salesforce Lightning Setup page.
 * Updates the DOM with appropriate text and button visibility based on the validation.
 */

const sfsetupTextEl = document.getElementById("plain");
const invalidUrl = document.getElementById("invalid-url");
const loginId = "login";
const setupId = "go-setup";
let willOpenLogin = true;

const page = new URLSearchParams(globalThis.location.search).get("url");
if (page != null) { // we're in a salesforce page
	let domain = null;
	try {
		domain = new URL(page).origin;
		// domain is null if an error occurred
		// Validate the domain (make sure it's a Salesforce domain)
		if (SALESFORCE_LIGHTNING_PATTERN.test(page)) {
			// we're in a Salesforce page (not setup)
			// switch which button is shown
			document.getElementById(loginId).classList.add(HIDDEN_CLASS);
			const goSetup = document.getElementById(setupId);
			goSetup.classList.remove(HIDDEN_CLASS);
			// update the button href to use the domain
			goSetup.href =
				`${domain}${SETUP_LIGHTNING}${SALESFORCE_SETUP_HOME_MINI}`;
			// update the bold on the text
			willOpenLogin = false;
		}
	} catch (e) {
		console.warn(e);
		sfsetupTextEl.classList.add(HIDDEN_CLASS);
		invalidUrl.classList.remove(HIDDEN_CLASS);
	}
}

let currentTab = null;
let openPageInSameTab = false;
/**
 * Finds the carrently active tab and if the callback was provided, it is then called.
 *
 * @param {function} callback - the function to call when the current tab is found.
 * @param {string} url - the url to pass to the callback function
 */
function nss_getCurrentBrowserTab(callback, url) {
	sendExtensionMessage(
		{ what: WHAT_GET_BROWSER_TAB },
		(browserTab) => {
			currentTab = browserTab;
			if (callback != null) {
				callback(url);
			}
		},
	);
}

/**
 * Creates a new tab with the given URL next to the current tab and it associates the new tab with the current tab (this ensures the same container is used).
 *
 * @param {string} url - the URL to be opened
 * @param {number} [count=0] - the number of times this function has been called (will autoincrement)
 * @return undefined
 * @throws {Error} when the function is called with count > 5
 */
function createTab(url, count = 0) {
	if (count > 5) {
		throw new Error("error_no_browser_tab");
	}
	if (openPageInSameTab) {
		BROWSER.tabs.update({
			url: url,
		});
		return;
	}
	if (currentTab == null) {
		return nss_getCurrentBrowserTab(
			(url) => createTab(url, count + 1),
			url,
		);
	}
	BROWSER.tabs.create({
		url: url,
		index: Math.floor(currentTab.index) + 1,
		openerTabId: currentTab.id,
	});
}

// close the popup when the user clicks on the redirection link
const shownRedirectBtn = document.getElementById(
	willOpenLogin ? loginId : setupId,
);
shownRedirectBtn.addEventListener("click", (e) => {
	e.preventDefault();
	currentTab == null && !openPageInSameTab
		? nss_getCurrentBrowserTab(createTab, shownRedirectBtn.href)
		: createTab(shownRedirectBtn.href);
	setTimeout(close, 200);
});

const automaticClick = willOpenLogin ? POPUP_OPEN_LOGIN : POPUP_OPEN_SETUP;
const useSameTab = willOpenLogin ? POPUP_LOGIN_NEW_TAB : POPUP_SETUP_NEW_TAB;
const settings = await getSettings([automaticClick, useSameTab]);
openPageInSameTab = settings?.some((setting) =>
	setting.id === useSameTab && setting.enabled
);
if (
	settings?.some((setting) =>
		setting.id === automaticClick && setting.enabled
	)
) {
	shownRedirectBtn.click();
} else await ensureTranslatorAvailability();
