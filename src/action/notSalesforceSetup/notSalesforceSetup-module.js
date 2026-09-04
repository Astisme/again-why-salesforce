/**
 * Creates non-Salesforce setup popup behavior with explicit dependencies.
 *
 * @param {Object} options Module dependencies.
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
 * @param {(keys: string[]) => Promise<Array<{ id: string; enabled: boolean }>>} options.getSettings Settings loader.
 * @param {(message: { what: string }) => Promise<{ id: number; index: number } | null>} options.sendExtensionMessage Message dispatcher.
 * @param {() => Promise<void> | void} options.ensureTranslatorAvailability Translator initializer.
 * @param {{ getElementById: (id: string) => { addEventListener: (type: string, listener: (event: { preventDefault: () => void }) => Promise<void> | void) => void; classList: { add: (className: string) => void; remove: (className: string) => void; }; click: () => Promise<void> | void; href: string; } }} options.documentRef Document-like host.
 * @param {{ search: string }} options.locationRef Location reference.
 * @param {(callback: () => void, delay: number) => unknown} options.setTimeout Timeout scheduler.
 * @param {() => void} options.closePopup Popup close callback.
 * @param {{ warn: (error: object) => void }} options.consoleRef Console-like logger.
 * @return {{ runNotSalesforceSetup: () => Promise<{ willOpenLogin: boolean }>; }} Non-Salesforce setup module API.
 */
export function createNotSalesforceSetupModule({
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
	getSettings,
	sendExtensionMessage,
	ensureTranslatorAvailability,
	documentRef,
	locationRef,
	setTimeout,
	closePopup,
	consoleRef,
} = {}) {
	/**
	 * Fetches active tab then invokes callback with target URL.
	 *
	 * @param {(url: string) => void | Promise<void>} [callback] Callback invoked with target URL.
	 * @param {string} url URL passed back to callback.
	 * @param {(tab: { id: number; index: number } | null) => void} onTabFound Receiver for fetched tab.
	 * @return {Promise<void>} Resolves after lookup and callback handling complete.
	 */
	async function getCurrentBrowserTab({
		callback,
		url,
		onTabFound,
	} = {}) {
		const browserTab = await sendExtensionMessage({
			what: whatGetBrowserTab,
		});
		onTabFound(browserTab);
		await callback?.(url);
	}

	/**
	 * Runs non-Salesforce setup popup behavior.
	 *
	 * @return {Promise<{ willOpenLogin: boolean }>} State describing active redirect button.
	 */
	async function runNotSalesforceSetup() {
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
		 * Creates new tab or updates current tab for provided URL.
		 *
		 * @param {string} url Target URL to open.
		 * @param {number} [count=0] Retry count for tab lookup.
		 * @return {Promise<void>} Resolves once tab action dispatches.
		 */
		const createTab = async (url, count = 0) => {
			if (count > 5) {
				throw new Error("error_no_browser_tab");
			}
			if (openPageInSameTab) {
				browser.tabs.update({ url });
				return;
			}
			if (currentTab == null) {
				await getCurrentBrowserTab({
					sendExtensionMessage,
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
				await getCurrentBrowserTab({
					callback: (url) => createTab(url),
					url: shownRedirectBtn.href,
					onTabFound: (tab) => {
						currentTab = tab;
					},
				});
			} else {
				await createTab(shownRedirectBtn.href);
			}
			setTimeout(closePopup, 200);
		});
		const automaticClick = willOpenLogin ? popupOpenLogin : popupOpenSetup;
		const useSameTab = willOpenLogin ? popupLoginNewTab : popupSetupNewTab;
		const settings = await getSettings([automaticClick, useSameTab]);
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
			await ensureTranslatorAvailability();
		}
		return { willOpenLogin };
	}

	return {
		runNotSalesforceSetup,
	};
}
