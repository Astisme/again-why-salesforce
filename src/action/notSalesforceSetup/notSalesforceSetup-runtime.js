/**
 * Handles active-tab lookup and stores the latest result.
 *
 * @param {Object} options Lookup options.
 * @param {(message: { what: string }) => Promise<unknown>} options.sendExtensionMessageFn Message dispatcher.
 * @param {string} options.whatGetBrowserTab Message type used to query the active tab.
 * @param {(url: string) => void | Promise<void>} [options.callback] Callback invoked with the target URL.
 * @param {string} options.url URL passed back to the callback.
 * @param {(tab: unknown) => void} options.onTabFound Receiver for the fetched tab.
 * @return {Promise<void>} Resolves once lookup and callback handling complete.
 */
async function nss_getCurrentBrowserTab({
	sendExtensionMessageFn,
	whatGetBrowserTab,
	callback,
	url,
	onTabFound,
} = {}) {
	const browserTab = await sendExtensionMessageFn({
		what: whatGetBrowserTab,
	});
	onTabFound(browserTab);
	await callback?.(url);
}

/**
 * Runs the non-Salesforce-setup popup behavior.
 *
 * @param {Object} options Runtime dependencies.
 * @param {{ tabs: { create: (details: { url: string; index: number; openerTabId: number }) => void; update: (details: { url: string }) => void; }; }} options.browser Browser tabs API.
 * @param {string} options.hiddenClass CSS class used to hide/show UI sections.
 * @param {string} options.popupLoginNewTab Setting key for login-tab behavior.
 * @param {string} options.popupOpenLogin Setting key for login auto-open.
 * @param {string} options.popupOpenSetup Setting key for setup auto-open.
 * @param {string} options.popupSetupNewTab Setting key for setup-tab behavior.
 * @param {RegExp} options.salesforceLightningPattern Salesforce Lightning URL validator.
 * @param {string} options.salesforceSetupHomeMini Setup home path suffix.
 * @param {string} options.setupLightning Setup path prefix.
 * @param {string} options.whatGetBrowserTab Message type for active-tab lookup.
 * @param {(keys: string[]) => Promise<Array<{ id: string; enabled: boolean }>>} options.getSettingsFn Settings loader.
 * @param {(message: { what: string }) => Promise<{ id: number; index: number } | null>} options.sendExtensionMessageFn Message dispatcher.
 * @param {() => Promise<void> | void} options.ensureTranslatorAvailabilityFn Translator initializer.
 * @param {{ getElementById: (id: string) => any }} [options.documentRef=document] Document-like host.
 * @param {{ href: string; search: string }} [options.locationRef=globalThis.location] Mutable location reference.
 * @param {(callback: () => void, delay: number) => unknown} [options.setTimeoutFn=setTimeout] Timeout scheduler.
 * @param {() => void} [options.closePopupFn=close] Popup close callback.
 * @param {{ warn: (error: unknown) => void }} [options.consoleRef=console] Console-like logger.
 * @return {Promise<{ willOpenLogin: boolean }>} State describing which redirect button is active.
 */
export async function runNotSalesforceSetup({
	browser,
	hiddenClass,
	popupLoginNewTab,
	popupOpenLogin,
	popupOpenSetup,
	popupSetupNewTab,
	salesforceLightningPattern,
	salesforceSetupHomeMini,
	setupLightning,
	whatGetBrowserTab,
	getSettingsFn,
	sendExtensionMessageFn,
	ensureTranslatorAvailabilityFn,
	documentRef = document,
	locationRef = globalThis.location,
	setTimeoutFn = setTimeout,
	closePopupFn = close,
	consoleRef = console,
} = {}) {
	const sfsetupTextEl = documentRef.getElementById("plain");
	const invalidUrl = documentRef.getElementById("invalid-url");
	const loginId = "login";
	const setupId = "go-setup";
	let willOpenLogin = true;
	const page = new URLSearchParams(locationRef.search).get("url");
	if (page != null) {
		try {
			const domain = new URL(page).origin;
			if (salesforceLightningPattern.test(page)) {
				documentRef.getElementById(loginId).classList.add(hiddenClass);
				const goSetup = documentRef.getElementById(setupId);
				goSetup.classList.remove(hiddenClass);
				goSetup.href =
					`${domain}${setupLightning}${salesforceSetupHomeMini}`;
				willOpenLogin = false;
			}
		} catch (error) {
			consoleRef.warn(error);
			sfsetupTextEl.classList.add(hiddenClass);
			invalidUrl.classList.remove(hiddenClass);
		}
	}
	let currentTab = null;
	let openPageInSameTab = false;
	/**
	 * Creates a new tab (or updates current tab) for the provided URL.
	 *
	 * @param {string} url Target URL to open.
	 * @param {number} [count=0] Retry count for tab lookup.
	 * @return {Promise<void>} Resolves once the tab action has been dispatched.
	 */
	const createTab = async (url, count = 0) => {
		if (count > 5) {
			throw new Error("error_no_browser_tab");
		}
		if (openPageInSameTab) {
			browser.tabs.update({
				url,
			});
			return;
		}
		if (currentTab == null) {
			await nss_getCurrentBrowserTab({
				sendExtensionMessageFn,
				whatGetBrowserTab,
				callback: (nextUrl) => void createTab(nextUrl, count + 1),
				url,
				onTabFound: (tab) => {
					currentTab = tab;
				},
			});
			return;
		}
		browser.tabs.create({
			url,
			index: Math.floor(currentTab.index) + 1,
			openerTabId: currentTab.id,
		});
	};
	const shownRedirectBtn = documentRef.getElementById(
		willOpenLogin ? loginId : setupId,
	);
	shownRedirectBtn.addEventListener("click", async (event) => {
		event.preventDefault();
		if (currentTab == null && !openPageInSameTab) {
			await nss_getCurrentBrowserTab({
				sendExtensionMessageFn,
				whatGetBrowserTab,
				callback: (url) => createTab(url),
				url: shownRedirectBtn.href,
				onTabFound: (tab) => {
					currentTab = tab;
				},
			});
		} else {
			await createTab(shownRedirectBtn.href);
		}
		setTimeoutFn(closePopupFn, 200);
	});
	const automaticClick = willOpenLogin ? popupOpenLogin : popupOpenSetup;
	const useSameTab = willOpenLogin ? popupLoginNewTab : popupSetupNewTab;
	const settings = await getSettingsFn([automaticClick, useSameTab]);
	openPageInSameTab = settings?.some((setting) =>
		setting.id === useSameTab && setting.enabled
	);
	if (
		settings?.some((setting) =>
			setting.id === automaticClick && setting.enabled
		)
	) {
		const autoClickResult = shownRedirectBtn.click();
		if (autoClickResult instanceof Promise) {
			await autoClickResult;
		}
	} else {
		await ensureTranslatorAvailabilityFn();
	}
	return { willOpenLogin };
}
