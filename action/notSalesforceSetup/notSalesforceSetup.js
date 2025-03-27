// deno-lint-ignore-file no-window
import { BROWSER, SALESFORCE_LIGHTNING_PATTERN, SETUP_LIGHTNING } from "/constants.js";
import { initTheme } from "../themeHandler.js";
initTheme();

/**
 * Dynamically creates and inserts content into the page based on the "url" query parameter.
 * Validates if the URL corresponds to a valid Salesforce Lightning Setup page.
 * Updates the DOM with appropriate text and button visibility based on the validation.
 */

const div = document.createElement("div");
const prefix = document.createTextNode("This is not a ");
const strongEl = document.createElement("strong");
const otherText = document.createTextNode("");

const sfsetupTextEl = document.querySelector("h3");
sfsetupTextEl.innerText = "";
sfsetupTextEl.appendChild(div);

let insertPrefix = true;
let strongFirst = true;

const page = new URLSearchParams(window.location.search).get("url");
if (page != null) { // we're in a salesforce page
	let domain = null;
	try {
		domain = new URL(page).origin;
	} catch (_) {
		strongEl.textContent = "Invalid URL";
		otherText.textContent = " detected.";
		insertPrefix = false;
	}
	// domain is null if an error occurred
	if (domain != null) {
		// Validate the domain (make sure it's a Salesforce domain)
		if (!SALESFORCE_LIGHTNING_PATTERN.test(page)) {
			strongEl.textContent = "Salesforce Lightning";
			otherText.textContent = " Setup Page";
		} else {
			// we're in a Salesforce page (not setup)
			// switch which button is shown
			document.getElementById("login").classList.add("hidden");
			const goSetup = document.getElementById("go-setup");
			goSetup.classList.remove("hidden");
			// update the button href to use the domain
			goSetup.href = `${domain}${SETUP_LIGHTNING}SetupOneHome/home`;
			// update the bold on the text
			otherText.textContent = "Salesforce Lightning";
			strongEl.textContent = " Setup Page";
			strongFirst = false;
		}
	}
} else {
	strongEl.textContent = "Salesforce Lightning";
	otherText.textContent = " Setup Page";
}
if (insertPrefix) {
	div.appendChild(prefix);
}
if (strongFirst) {
	div.appendChild(strongEl);
	div.appendChild(otherText);
} else {
	div.appendChild(otherText);
	div.appendChild(strongEl);
}

let currentTab;
/**
 * Finds the carrently active tab and if the callback was provided, it is then called.
 *
 * @param {function} callback - the function to call when the current tab is found.
 * @param {string} url - the url to pass to the callback function
 */
function nss_getCurrentBrowserTab(callback, url) {
	BROWSER.runtime.sendMessage(
		{ message: { what: "browser-tab" } },
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
 */
function createTab(url, count = 0) {
	if (count > 5) {
		throw new Error("Could not find browser tab.");
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
document.querySelectorAll("a").forEach((a) => {
	a.addEventListener("click", (e) => {
		e.preventDefault();
		currentTab == null
			? nss_getCurrentBrowserTab(createTab, a.href)
			: createTab(a.href);
		setTimeout(() => close(), 200);
	});
});
