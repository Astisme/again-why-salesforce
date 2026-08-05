/**
 * Runs the request-permissions action page behavior.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ action: { setPopup: (options: { popup: string }) => void | Promise<void> }; runtime: { getURL: (path: string) => string; }; }} options.browser Browser API wrapper.
 * @param {() => Promise<void> | void} options.ensureTranslatorAvailability Translator initializer.
 * @param {string} options.doNotRequestFramePermissionKey Local-storage key used to persist skip choice.
 * @param {string} options.hiddenClass CSS class used to hide/show sections.
 * @param {{ getElementById: (id: string) => any }} [options.documentRef=document] Document-like host.
 * @param {{ href: string }} [options.locationRef=globalThis.location] Mutable location reference.
 * @param {{ setItem: (key: string, value: string) => void }} [options.localStorageRef=localStorage] Local-storage compatible object.
 * @param {() => Promise<void> | void} [options.requestExportPermission] Downloads permission request handler.
 * @param {() => Promise<void> | void} [options.requestFramePatternsPermission] Host-permission request handler.
 * @param {() => void} [options.closePopup=close] Close callback.
 * @param {(callback: () => void, delay: number) => unknown} [options.setTimeout=setTimeout] Timeout scheduler.
 * @return {Promise<{ mode: "download" | "hostpermissions"; popupLink: string }>} Setup mode details.
 */
export async function runReqPermissions({
	browser,
	ensureTranslatorAvailability,
	doNotRequestFramePermissionKey,
	hiddenClass,
	documentRef = document,
	locationRef = globalThis.location,
	localStorageRef = localStorage,
	requestExportPermission,
	requestFramePatternsPermission,
	closePopup = close,
	setTimeout = setTimeout,
} = {}) {
	await ensureTranslatorAvailability();
	const whichPermissions = new URL(locationRef.href).searchParams.get(
		"whichid",
	);
	const popuplink = browser.runtime.getURL("action/popup/popup.html");
	if (
		whichPermissions == null ||
		whichPermissions === "hostpermissions"
	) {
		const noPerm = documentRef.getElementById("no-permissions");
		noPerm.href = `${popuplink}?${doNotRequestFramePermissionKey}=true`;
		documentRef.getElementById("allow-permissions").addEventListener(
			"click",
			(event) => {
				event.preventDefault();
				requestFramePatternsPermission?.();
				setTimeout(closePopup, 100);
			},
		);
		/**
		 * Persists the skip flag and redirects to the popup.
		 *
		 * @param {Event} event Click event from the skip link.
		 * @return {void}
		 */
		const setNoPerm = (event) => {
			event.preventDefault();
			localStorageRef.setItem(doNotRequestFramePermissionKey, "true");
			locationRef.href = noPerm.href;
		};
		const rememberSkip = documentRef.getElementById("remember-skip");
		rememberSkip.addEventListener("click", () => {
			const checked = rememberSkip.checked;
			if (checked) {
				noPerm.addEventListener("click", setNoPerm);
				return;
			}
			noPerm.removeEventListener("click", setNoPerm);
		});
		return {
			mode: "hostpermissions",
			popupLink: popuplink,
		};
	}
	if (whichPermissions === "download") {
		documentRef.getElementById("host_permissions").classList.add(
			hiddenClass,
		);
		documentRef.getElementById("download").classList.remove(hiddenClass);
		/**
		 * Resets the browser action popup back to the standard popup page.
		 *
		 * @return {void}
		 */
		const setOriginalPopup = () => {
			browser.action.setPopup({
				popup: popuplink,
			});
		};
		documentRef.getElementById("no-permissions-down").addEventListener(
			"click",
			(event) => {
				event.preventDefault();
				setOriginalPopup();
				locationRef.href = popuplink;
			},
		);
		documentRef.getElementById("allow-permissions-down").addEventListener(
			"click",
			(event) => {
				event.preventDefault();
				requestExportPermission?.();
				setOriginalPopup();
				setTimeout(closePopup, 100);
			},
		);
	}
	return {
		mode: "download",
		popupLink: popuplink,
	};
}
