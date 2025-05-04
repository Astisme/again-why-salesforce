import { BROWSER, OPERATING_PATTERNS } from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";
import "../themeHandler.js";
await ensureTranslatorAvailability();

const noPerm = document.getElementById("no-permissions");
const popup = await BROWSER.runtime.getURL("action/popup/popup.html");
noPerm.href = `${popup}?noPerm=true`;

document.getElementById("allow-permissions").addEventListener("click", (e) => {
	e.preventDefault();
	BROWSER.permissions.request({
		origins: OPERATING_PATTERNS,
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
