/**
 * Creates request-permissions behavior with explicit dependencies.
 *
 * @param {Object} options Module dependencies.
 * @param {{ action: { setPopup: (options: { popup: string }) => void | Promise<void> }; runtime: { getURL: (path: string) => string; }; }} options.browser Browser API wrapper.
 * @param {() => Promise<void> | void} options.ensureTranslatorAvailability Translator initializer.
 * @param {string} options.doNotRequestFramePermissionKey Local-storage key used to persist skip choice.
 * @param {string} options.hiddenClass CSS class used to hide/show sections.
 * @param {{ getElementById: (id: string) => { addEventListener: (type: string, listener: (event: { preventDefault: () => void }) => void) => void; classList: { add: (className: string) => void; remove: (className: string) => void; }; checked?: boolean; href: string; } }} options.documentRef Document-like host.
 * @param {{ href: string }} options.locationRef Mutable location reference.
 * @param {{ setItem: (key: string, value: string) => void }} options.localStorageRef Local-storage compatible object.
 * @param {() => Promise<void> | void} options.requestExportPermission Downloads permission request handler.
 * @param {() => Promise<void> | void} options.requestFramePatternsPermission Host-permission request handler.
 * @param {() => void} options.closePopup Close callback.
 * @param {(callback: () => void, delay: number) => unknown} options.setTimeout Timeout scheduler.
 * @return {{ runReqPermissions: () => Promise<{ mode: "download" | "hostpermissions"; popupLink: string }>; }} Request-permissions module API.
 */
export function createReqPermissionsModule({
	browser,
	ensureTranslatorAvailability,
	doNotRequestFramePermissionKey,
	hiddenClass,
	documentRef,
	locationRef,
	localStorageRef,
	requestExportPermission,
	requestFramePatternsPermission,
	closePopup,
	setTimeout,
} = {}) {
	/**
	 * Runs request-permissions action page behavior.
	 *
	 * @return {Promise<{ mode: "download" | "hostpermissions"; popupLink: string }>} Setup mode details.
	 */
	async function runReqPermissions() {
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
					requestFramePatternsPermission();
					setTimeout(closePopup, 100);
				},
			);
			/**
			 * Persists skip flag and redirects to popup.
			 *
			 * @param {{ preventDefault: () => void }} event Click event from skip link.
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
			 * Restores standard browser action popup page.
			 *
			 * @return {void}
			 */
			const setOriginalPopup = () => {
				browser.action.setPopup({ popup: popuplink });
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
					requestExportPermission();
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

	return {
		runReqPermissions,
	};
}
