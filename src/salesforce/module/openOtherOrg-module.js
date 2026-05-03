"use strict";

/**
 * Creates the open-other-org module with injectable dependencies.
 *
 * @param {Object} [options={}] Runtime overrides.
 * @param {string} [options.https="https://"] Protocol prefix.
 * @param {string} [options.lightningForceCom=".lightning.force.com"] Salesforce domain suffix.
 * @param {RegExp} [options.salesforceUrlPattern=/^[a-z0-9.-]+$/i] Validation pattern for org hosts.
 * @param {string} [options.setupLightning="/lightning/setup/"] Setup path prefix.
 * @param {string} [options.toastError="error"] Error toast status.
 * @param {string} [options.toastWarning="warning"] Warning toast status.
 * @param {(keys: string | string[]) => Promise<unknown>} [options.getSettingsFn] Settings resolver.
 * @param {(message: string | string[] | unknown[], connector?: string) => Promise<string | string[]>} [options.getTranslationsFn] Translation resolver.
 * @param {{
 *   containsSalesforceId: (url: string | null) => boolean;
 *   extractOrgName: (value: string | null | undefined) => string;
 *   minifyURL: (value: string | null | undefined) => string;
 * }} [options.tabRef] Tab helper object.
 * @param {() => Promise<{ getSingleTabByData: (data: Record<string, unknown>) => { label?: string; url?: string; } }>} [options.ensureAllTabsAvailabilityFn] Saved-tab container resolver.
 * @param {(options: { label: string | null; org: string | null; url: string | null; }) => Promise<{
 *   closeButton: {
 *     click: () => void | Promise<void>;
 *   };
 *   getSelectedRadioButtonValue: () => string | null;
 *   inputContainer: {
 *     addEventListener: (type: string, listener: (event: {
 *       preventDefault: () => void;
 *       target: { value: string };
 *     }) => void | Promise<void>) => void;
 *     value: string;
 *   };
 *   modalParent: unknown;
 *   saveButton: {
 *     addEventListener: (type: string, listener: (event: {
 *       preventDefault: () => void;
 *       target: { value: string };
 *     }) => void | Promise<void>) => void;
 *   };
 * }>} [options.generateOpenOtherOrgModalFn] Modal generator.
 * @param {string} [options.modalId=""] Active modal element id.
 * @param {(message: string | string[], status?: string) => Promise<void> | void} [options.showToastFn] Toast function.
 * @param {() => string} [options.getCurrentHrefFn] Current href resolver.
 * @param {() => { appendChild: (element: unknown) => unknown } | null} [options.getModalHangerFn] Modal hanger resolver.
 * @param {{ getElementById: (id: string) => unknown } | undefined} [options.documentRef=globalThis.document] Document-like object.
 * @param {{ href?: string } | undefined} [options.locationRef=globalThis.location] Location-like object.
 * @param {{ info: (message: unknown) => void }} [options.consoleRef=console] Console-like object.
 * @param {(options?: {
 *   body?: string | string[];
 *   cancelLabel?: string;
 *   closeLabel?: string;
 *   confirmLabel?: string;
 * }) => boolean | Promise<boolean>} [options.sldsConfirmFn] Confirm callback.
 * @param {(url: string | URL, target?: string) => unknown} [options.openFn=globalThis.open] Window open callback.
 * @param {{ new(input: string): URL }} [options.urlCtor=URL] URL constructor.
 * @return {{
 *   createOpenOtherOrgModal: (options?: { label?: string | null; org?: string | null; url?: string | null; }) => Promise<void>;
 * }} Open-other-org module API.
 */
export function createOpenOtherOrgModule({
	https = "https://",
	lightningForceCom = ".lightning.force.com",
	salesforceUrlPattern = /^[a-z0-9.-]+$/i,
	setupLightning = "/lightning/setup/",
	toastError = "error",
	toastWarning = "warning",
	getSettingsFn,
	getTranslationsFn,
	tabRef,
	ensureAllTabsAvailabilityFn,
	generateOpenOtherOrgModalFn,
	modalId = "",
	showToastFn,
	getCurrentHrefFn,
	getModalHangerFn,
	documentRef = globalThis.document,
	locationRef = globalThis.location,
	consoleRef = console,
	sldsConfirmFn = ({ body } = {}) =>
		globalThis.confirm?.(
			Array.isArray(body) ? body.join("\n") : body ?? "",
		) ??
			false,
	openFn = globalThis.open,
	urlCtor = URL,
} = {}) {
	/**
	 * Displays a modal for opening a page in another Salesforce organization.
	 *
	 * @param {Object} [options={}] Modal context values.
	 * @param {string|null} [options.label=null] Tab label.
	 * @param {string|null} [options.url=null] Tab URL suffix.
	 * @param {string|null} [options.org=null] Current org name.
	 * @return {Promise<void>} Promise resolved once setup is complete.
	 */
	async function createOpenOtherOrgModal(
		{ label = null, url = null, org = null } = {},
	) {
		if (
			typeof getSettingsFn !== "function" ||
			typeof getTranslationsFn !== "function" ||
			typeof ensureAllTabsAvailabilityFn !== "function" ||
			typeof generateOpenOtherOrgModalFn !== "function" ||
			tabRef == null
		) {
			throw new Error("error_required_params");
		}
		const resolvedDocumentRef = documentRef;
		const resolvedLocationRef = locationRef ?? { href: "" };

		if (resolvedDocumentRef.getElementById?.(modalId) != null) {
			return showToastFn?.("error_close_other_modal", toastError);
		}
		const [allTabs, skipLinkDetection] = await Promise.all([
			ensureAllTabsAvailabilityFn(),
			getSettingsFn("skip_link_detection"),
		]);
		const href = resolvedLocationRef?.href;
		if (label == null && url == null) {
			const minyURL = tabRef.minifyURL(href);
			try {
				const matchingTab = allTabs.getSingleTabByData({
					url: minyURL,
				});
				label = matchingTab.label;
				url = matchingTab.url;
			} catch (error) {
				consoleRef.info(error);
				url = minyURL;
			}
		}
		if (org == null) {
			org = tabRef.extractOrgName(href);
		}
		if (
			skipLinkDetection != null && !skipLinkDetection.enabled &&
			tabRef.containsSalesforceId(url)
		) {
			showToastFn?.("error_link_with_id", toastWarning);
		}
		const {
			modalParent,
			saveButton,
			closeButton,
			inputContainer,
			getSelectedRadioButtonValue,
		} = await generateOpenOtherOrgModalFn({
			label,
			url,
			org,
		});
		getModalHangerFn?.()?.appendChild(modalParent);
		let lastInput = "";
		inputContainer.addEventListener("input", (e) => {
			const target = e.target;
			const value = target.value;
			const delta = value.length - lastInput.length;
			if (delta > 2) {
				const newTarget = tabRef.extractOrgName(value);
				if (newTarget != null && newTarget !== value) {
					target.value = newTarget;
					lastInput = newTarget;
				}
				return;
			}
			lastInput = value;
		});
		let lastExtracted = null;
		saveButton.addEventListener("click", async (e) => {
			e.preventDefault();
			const linkTarget = getSelectedRadioButtonValue();
			const inputVal = inputContainer.value;
			if (inputVal == null || inputVal === "") {
				return showToastFn?.(
					["insert_another", "org_link"],
					toastWarning,
				);
			}
			const newTarget = tabRef.extractOrgName(inputVal);
			if (lastExtracted === newTarget) {
				return;
			}
			lastExtracted = newTarget;
			if (!salesforceUrlPattern.test(newTarget)) {
				return showToastFn?.(
					["insert_valid_org", newTarget],
					toastError,
				);
			}
			if (
				newTarget ===
					tabRef.extractOrgName(
						getCurrentHrefFn?.() ?? resolvedLocationRef?.href ?? "",
					)
			) {
				return showToastFn?.("insert_another_org", toastError);
			}
			const targetUrl = new urlCtor(
				`${https}${newTarget}${lightningForceCom}${
					url.startsWith("/") ? "" : setupLightning
				}${url}`,
			);
			const [confirmMsg, confirmLabel, cancelLabel, closeLabel] =
				await getTranslationsFn([
					"confirm_another_org",
					"confirm",
					"cancel",
					"cancel_close",
				]);
			if (
				await sldsConfirmFn?.({
					body: [confirmMsg, String(targetUrl)],
					confirmLabel,
					cancelLabel,
					closeLabel,
				})
			) {
				closeButton.click();
				openFn?.(targetUrl, linkTarget ?? "_blank");
			}
		});
	}

	return {
		createOpenOtherOrgModal,
	};
}
