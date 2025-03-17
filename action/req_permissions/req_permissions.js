import { initTheme } from "../themeHandler.js";
import { MY_SALESFORCE_SETUP_COM_OPERATING_PATTERN } from "/constants.js";
initTheme();
const noPerm = document.getElementById("no-permissions");
const popup = await chrome.runtime.getURL("action/popup/popup.html");
noPerm.href = `${popup}?noPerm=true`;

document.getElementById("allow-permissions").addEventListener("click", (e) => {
	e.preventDefault();
	chrome.permissions.request({
		origins: [MY_SALESFORCE_SETUP_COM_OPERATING_PATTERN],
	});
	setTimeout(close, 100);
});

/**
 * Sets the `noPerm` item in localStorage then switches to the standard popup
 */
function setNoPerm(e) {
	e.preventDefault();
	localStorage.setItem("noPerm", "true");
	globalThis.location = noPerm.href;
}

const rememberSkip = document.getElementById("remember-skip");
rememberSkip.addEventListener("click", () => {
	const checked = rememberSkip.checked;
	if (checked) {
		noPerm.addEventListener("click", setNoPerm);
	} else {
		noPerm.removeEventListener("click", setNoPerm);
	}
});
