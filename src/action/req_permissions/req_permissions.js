import {
	BROWSER,
	DO_NOT_REQUEST_FRAME_PERMISSION,
	HIDDEN_CLASS,
} from "/constants.js";
import {
	requestExportPermission,
	requestFramePatternsPermission,
} from "/functions.js";
import ensureTranslatorAvailability from "/translator.js";
import "../themeHandler.js";
await ensureTranslatorAvailability();

const whichPermissions = new URL(globalThis.location.href).searchParams.get(
	"whichid",
);
const popuplink = BROWSER.runtime.getURL("action/popup/popup.html");

if (whichPermissions == null || whichPermissions === "hostpermissions") {
	const noPerm = document.getElementById("no-permissions");
	noPerm.href = `${popuplink}?${DO_NOT_REQUEST_FRAME_PERMISSION}=true`;

	document.getElementById("allow-permissions").addEventListener(
		"click",
		(e) => {
			e.preventDefault();
			requestFramePatternsPermission();
			setTimeout(close, 100);
		},
	);

	/**
	 * Sets the DO_NOT_REQUEST_FRAME_PERMISSION item in localStorage then switches to the standard popup
	 * @param {Event} e - the event connected to the event listener
	 */
	const setNoPerm = (e) => {
		e.preventDefault();
		localStorage.setItem(DO_NOT_REQUEST_FRAME_PERMISSION, "true");
		globalThis.location = noPerm.href;
	};

	const rememberSkip = document.getElementById("remember-skip");
	rememberSkip.addEventListener("click", () => {
		const checked = rememberSkip.checked;
		if (checked) {
			noPerm.addEventListener("click", setNoPerm);
		} else {
			noPerm.removeEventListener("click", setNoPerm);
		}
	});
} else if (whichPermissions === "download") {
	document.getElementById("host_permissions").classList.add(HIDDEN_CLASS);
	document.getElementById("download").classList.remove(HIDDEN_CLASS);
	/**
	 * Tells the browser to reset the Popup to the original one
	 * @return undefined
	 */
	const setOriginalPopup = () =>
		BROWSER.action.setPopup({
			popup: popuplink,
		});
	document.getElementById("no-permissions-down").addEventListener(
		"click",
		(e) => {
			e.preventDefault();
			setOriginalPopup();
			globalThis.location = popuplink;
		},
	);
	document.getElementById("allow-permissions-down").addEventListener(
		"click",
		(e) => {
			e.preventDefault();
			requestExportPermission();
			setOriginalPopup();
			setTimeout(close, 100);
		},
	);
}
