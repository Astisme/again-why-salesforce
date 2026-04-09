"use strict";

let cmdRemoveTabRuntime;
let cmdSaveAsTabRuntime;
let cxmRemoveTabRuntime;
let extensionLabelRuntime;
let extensionNameRuntime;
let hiddenClassRuntime;
let salesforceSetupHomeMiniRuntime;
let skipLinkDetectionRuntime;
let tabAddFrontRuntime;
let tabAsOrgRuntime;
let toastInfoRuntime;
let toastWarningRuntime;
let tutorialEventActionFavouriteRuntime;
let tutorialEventActionUnfavouriteRuntime;
let whatAddRuntime;
let whatGetCommandsRuntime;
let tabRuntime;
let ensureAllTabsAvailabilityRuntime;
let getTranslationsRuntime;
let getCurrentHrefRuntime;
let getIsCurrentlyOnSavedTabRuntime;
let getSettingsRuntime;
let getWasOnSavedTabRuntime;
let injectStyleRuntime;
let isOnSavedTabRuntime;
let performActionOnTabsRuntime;
let sendExtensionMessageRuntime;
let showToastRuntime;
let documentRuntime;
let setTimeoutRuntime;
let customEventRuntime;
let consoleRuntime = console;
let FAVOURITE_BUTTON_ID_RUNTIME;
let STAR_ID_RUNTIME;
let SLASHED_STAR_ID_RUNTIME;

/**
 * Updates IDs that depend on the current extension name.
 */
function updateFavouriteRuntimeIds() {
	FAVOURITE_BUTTON_ID_RUNTIME = `${extensionNameRuntime}-button`;
	STAR_ID_RUNTIME = `${extensionNameRuntime}-star`;
	SLASHED_STAR_ID_RUNTIME = `${extensionNameRuntime}-slashed-star`;
}

/**
 * Finds the parent node of the current Setup page.
 *
 * @param {string} [innerElement=""] Selector suffix.
 * @return {HTMLElement|null} Matching element.
 */
function getHeader(innerElement = "") {
	return documentRuntime.querySelector(
		`div.tabsetBody.main-content.mainContentMark.fullheight.active.isSetupApp > div.split-right > section.tabContent.oneConsoleTab.active div.overflow.uiBlock ${innerElement}`,
	);
}

/**
 * Creates a star SVG icon.
 *
 * @param {Object} [param0={}] SVG options.
 * @param {string|null} [param0.id=null] SVG id.
 * @param {string|null} [param0.alt=null] Accessible label.
 * @param {boolean} [slashed=false] Whether to create slashed star.
 * @return {SVGElement} Created SVG icon.
 */
function createStarSvg({
	id = null,
	alt = null,
} = {}, slashed = false) {
	const svg = documentRuntime.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	);
	if (id) svg.id = id;
	if (alt) svg.alt = alt;
	svg.style.width = "2em";
	svg.style.height = "2em";
	svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	const path = documentRuntime.createElementNS(
		"http://www.w3.org/2000/svg",
		"path",
	);
	const salesforceLightBlue = "#00a1e0";
	if (slashed) {
		path.style.fill = salesforceLightBlue;
		svg.setAttribute("viewBox", "0 0 56 56");
		path.setAttribute(
			"d",
			"M 40.3985 33.6133 L 52.2578 25.0820 C 53.7112 24.0508 54.2968 22.9727 53.9219 21.8008 C 53.5470 20.6758 52.4454 20.1133 50.6406 20.1367 L 35.2891 20.2305 L 30.6251 5.5820 C 30.0626 3.8476 29.2188 2.9805 28.0001 2.9805 C 26.8048 2.9805 25.9610 3.8476 25.3985 5.5820 L 22.2110 15.5195 L 25.0235 18.3086 L 27.8595 8.8633 C 27.9063 8.7227 27.9532 8.6758 28.0001 8.6758 C 28.0704 8.6758 28.1173 8.7227 28.1407 8.8633 L 32.2188 22.4336 C 32.5001 23.3945 33.1329 23.7930 34.0938 23.7695 L 48.2733 23.5117 C 48.4139 23.5117 48.4610 23.5117 48.4845 23.5820 C 48.508 23.6524 48.4610 23.6992 48.3674 23.7695 L 37.8204 31.0586 Z M 48.2733 50.5352 C 48.9765 51.2383 50.1251 51.2383 50.8283 50.5352 C 51.5315 49.8320 51.5315 48.6836 50.8283 47.9805 L 14.2891 11.5586 C 13.5860 10.8555 12.4376 10.8555 11.7110 11.5586 C 11.0079 12.2149 11.0313 13.4102 11.7110 14.1133 Z M 11.9688 52.2930 C 12.9298 53.0195 14.1485 52.7617 15.6016 51.7071 L 28.0001 42.6133 L 40.4220 51.7071 C 41.8751 52.7617 43.0469 52.9961 44.0548 52.2930 C 44.3360 52.0820 44.5469 51.8008 44.8985 51.2617 L 29.1954 39.0039 C 28.4454 38.4180 27.5782 38.4180 26.8282 39.0039 L 15.5548 47.6055 C 15.4610 47.6758 15.3907 47.7227 15.3438 47.6524 C 15.2969 47.6055 15.3204 47.5820 15.3438 47.4414 L 20.0079 34.0352 C 20.3126 33.1211 20.1485 32.3945 19.3282 31.8320 L 7.6563 23.7695 C 7.5391 23.6992 7.5157 23.6524 7.5391 23.5820 C 7.5626 23.5117 7.6095 23.5117 7.7501 23.5117 L 17.3595 23.6758 L 13.8438 20.1836 L 5.3829 20.1367 C 3.5782 20.1133 2.4766 20.6758 2.1016 21.8008 C 1.7032 22.9727 2.3126 24.0508 3.7657 25.0820 L 16.2813 34.0820 L 11.3829 48.6602 C 10.7969 50.3711 11.0079 51.5664 11.9688 52.2930 Z",
		);
	} else {
		path.style.stroke = salesforceLightBlue;
		path.style.strokeWidth = 2;
		path.style.fill = "transparent";
		svg.setAttribute("viewBox", "0 0 24 24");
		path.setAttribute(
			"d",
			"M11.2691 4.41115C11.5006 3.89177 11.6164 3.63208 11.7776 3.55211C11.9176 3.48263 12.082 3.48263 12.222 3.55211C12.3832 3.63208 12.499 3.89177 12.7305 4.41115L14.5745 8.54808C14.643 8.70162 14.6772 8.77839 14.7302 8.83718C14.777 8.8892 14.8343 8.93081 14.8982 8.95929C14.9705 8.99149 15.0541 9.00031 15.2213 9.01795L19.7256 9.49336C20.2911 9.55304 20.5738 9.58288 20.6997 9.71147C20.809 9.82316 20.8598 9.97956 20.837 10.1342C20.8108 10.3122 20.5996 10.5025 20.1772 10.8832L16.8125 13.9154C16.6877 14.0279 16.6252 14.0842 16.5857 14.1527C16.5507 14.2134 16.5288 14.2807 16.5215 14.3503C16.5132 14.429 16.5306 14.5112 16.5655 14.6757L17.5053 19.1064C17.6233 19.6627 17.6823 19.9408 17.5989 20.1002C17.5264 20.2388 17.3934 20.3354 17.2393 20.3615C17.0619 20.3915 16.8156 20.2495 16.323 19.9654L12.3995 17.7024C12.2539 17.6184 12.1811 17.5765 12.1037 17.56C12.0352 17.5455 11.9644 17.5455 11.8959 17.56C11.8185 17.5765 11.7457 17.6184 11.6001 17.7024L7.67662 19.9654C7.18404 20.2495 6.93775 20.3915 6.76034 20.3615C6.60623 20.3354 6.47319 20.2388 6.40075 20.1002C6.31736 19.9408 6.37635 19.6627 6.49434 19.1064L7.4341 14.6757C7.46898 14.5112 7.48642 14.429 7.47814 14.3503C7.47081 14.2807 7.44894 14.2134 7.41394 14.1527C7.37439 14.0842 7.31195 14.0279 7.18708 13.9154L3.82246 10.8832C3.40005 10.5025 3.18884 10.3122 3.16258 10.1342C3.13978 9.97956 3.19059 9.82316 3.29993 9.71147C3.42581 9.58288 3.70856 9.55304 4.27406 9.49336L8.77835 9.01795C8.94553 9.00031 9.02911 8.99149 9.10139 8.95929C9.16534 8.93081 9.2226 8.8892 9.26946 8.83718C9.32241 8.77839 9.35663 8.70162 9.42508 8.54808L11.2691 4.41115Z",
		);
		path.setAttribute("stroke-linecap", "round");
		path.setAttribute("stroke-linejoin", "round");
	}
	svg.appendChild(path);
	return svg;
}

/**
 * Generates the favourite button element.
 *
 * @return {Promise<HTMLButtonElement>} Created button.
 */
async function generateFavouriteButton() {
	const button = documentRuntime.createElement("button");
	button.id = FAVOURITE_BUTTON_ID_RUNTIME;
	button.classList.add("slds-button", "slds-button--neutral", "uiButton");
	button.setAttribute("type", "button");
	button.setAttribute("aria-live", "off");
	button.setAttribute("aria-pressed", "false");
	button.addEventListener("click", actionFavourite);
	const span = documentRuntime.createElement("span");
	span.classList.add("label", "bBody");
	span.setAttribute("dir", "ltr");
	button.appendChild(span);
	const [connectedCommands, [saveTab, removeTab]] = await Promise.all([
		sendExtensionMessageRuntime({
			what: whatGetCommandsRuntime,
			commands: [cmdSaveAsTabRuntime, cmdRemoveTabRuntime],
		}),
		getTranslationsRuntime([
			"save_tab",
			"remove_tab",
		]),
	]);
	let starCmd = null;
	let slashedStarCmd = null;
	for (const connectedCommand of connectedCommands) {
		switch (connectedCommand.name) {
			case cmdSaveAsTabRuntime:
				starCmd = connectedCommand.shortcut;
				break;
			case cmdRemoveTabRuntime:
				slashedStarCmd = connectedCommand.shortcut;
				break;
			default:
				break;
		}
	}
	const saveTabAssistive = `${saveTab}${
		starCmd == null ? "" : ` (${starCmd})`
	}`;
	const removeTabAssistive = `${removeTab}${
		slashedStarCmd == null ? "" : ` (${slashedStarCmd})`
	}`;
	button.dataset.saveAssistiveText = saveTabAssistive;
	button.dataset.removeAssistiveText = removeTabAssistive;
	button.setAttribute("aria-label", saveTabAssistive);
	button.title = saveTabAssistive;
	const assistiveText = documentRuntime.createElement("span");
	assistiveText.classList.add("slds-assistive-text");
	assistiveText.textContent = saveTabAssistive;
	button.appendChild(assistiveText);
	const star = createStarSvg({
		id: STAR_ID_RUNTIME,
		alt: saveTabAssistive,
	}, false);
	span.appendChild(star);
	const slashedStar = createStarSvg({
		id: SLASHED_STAR_ID_RUNTIME,
		alt: removeTabAssistive,
	}, true);
	slashedStar.classList.add(hiddenClassRuntime);
	span.appendChild(slashedStar);
	const style = injectStyleRuntime(
		"awsf-hidden-favman",
		{ css: `.${hiddenClassRuntime} { display: none; }` },
	);
	span.appendChild(style);
	return button;
}

/**
 * Resolves a favourite icon element from a button or the document.
 *
 * @param {string|null} favouriteId Target favourite id.
 * @param {HTMLButtonElement|null} [button=null] Optional button scope.
 * @return {HTMLElement|null} Matching element.
 */
function getFavouriteImage(favouriteId, button = null) {
	if (favouriteId == null) {
		throw new Error("error_missing_favourite_id");
	}
	return button?.querySelector(`#${favouriteId}`) ??
		documentRuntime.getElementById(favouriteId);
}

/**
 * Toggles the favourite/unfavourite icon state.
 *
 * @param {boolean|null} [isSaved=null] Whether tab is saved.
 * @param {HTMLButtonElement|null} [button=null] Optional button scope.
 */
function toggleFavouriteButton(isSaved = null, button = null) {
	if (isSaved == null) {
		return;
	}
	const favouriteButton = button ??
		documentRuntime.getElementById(FAVOURITE_BUTTON_ID_RUNTIME);
	const star = getFavouriteImage(STAR_ID_RUNTIME, button);
	const slashedStar = getFavouriteImage(SLASHED_STAR_ID_RUNTIME, button);
	if (isSaved) {
		star.classList.add(hiddenClassRuntime);
		slashedStar.classList.remove(hiddenClassRuntime);
	} else {
		star.classList.remove(hiddenClassRuntime);
		slashedStar.classList.add(hiddenClassRuntime);
	}
	if (favouriteButton != null) {
		const assistiveLabel = isSaved
			? favouriteButton.dataset.removeAssistiveText
			: favouriteButton.dataset.saveAssistiveText;
		favouriteButton.setAttribute("aria-pressed", `${isSaved}`);
		favouriteButton.setAttribute("aria-label", assistiveLabel);
		favouriteButton.title = assistiveLabel;
		const assistiveText = favouriteButton.querySelector(
			".slds-assistive-text",
		);
		if (assistiveText != null) {
			assistiveText.textContent = assistiveLabel;
		}
	}
}

/**
 * Adds the current page as a tab.
 *
 * @param {string} url Minified tab URL.
 * @return {Promise<void>}
 */
async function addTab(url) {
	const label = getHeader(".breadcrumbDetail").innerText;
	const settings = await getSettingsRuntime([
		skipLinkDetectionRuntime,
		tabAddFrontRuntime,
		tabAsOrgRuntime,
	]);
	const href = getCurrentHrefRuntime();
	let org;
	const isTabAsOrgEnabled = Array.isArray(settings) &&
		!settings.some((setting) =>
			setting.id === tabAsOrgRuntime && !setting.enabled
		);
	const isLinkDetectionEnabled = Array.isArray(settings) &&
		!settings.some((setting) =>
			setting.id === skipLinkDetectionRuntime && setting.enabled
		);
	if (
		isTabAsOrgEnabled ||
		(
			(
				settings == null ||
				isLinkDetectionEnabled
			) &&
			tabRuntime.containsSalesforceId(href)
		)
	) {
		org = tabRuntime.extractOrgName(href);
	}
	await performActionOnTabsRuntime(
		whatAddRuntime,
		{ label, url, org },
		{
			addInFront: Array.isArray(settings) &&
				settings.some((setting) =>
					setting.id === tabAddFrontRuntime && setting.enabled
				),
		},
	);
}

/**
 * Toggles current page as favourite.
 *
 * @return {Promise<void>}
 */
async function actionFavourite() {
	const url = tabRuntime.minifyURL(getCurrentHrefRuntime());
	if (getIsCurrentlyOnSavedTabRuntime()) {
		const allTabs = await ensureAllTabsAvailabilityRuntime();
		try {
			const tabToRemove = allTabs.getSingleTabByData({
				url,
				org: tabRuntime.extractOrgName(getCurrentHrefRuntime()),
			});
			await performActionOnTabsRuntime(cxmRemoveTabRuntime, tabToRemove);
		} catch (error) {
			consoleRuntime.warn(error);
			showToastRuntime("error_remove_not_favourite", toastWarningRuntime);
		}
		documentRuntime.dispatchEvent(
			new customEventRuntime(tutorialEventActionUnfavouriteRuntime),
		);
	} else {
		await addTab(url);
		documentRuntime.dispatchEvent(
			new customEventRuntime(tutorialEventActionFavouriteRuntime),
		);
	}
}

/**
 * Shows or refreshes the favourite button in the setup header.
 *
 * @param {number} [count=0] Retry counter.
 * @return {Promise<number | void>}
 */
async function showFavouriteButton(count = 0) {
	if (count > 5) {
		const failHead = await getTranslationsRuntime("error_no_headers");
		consoleRuntime.error(`${extensionLabelRuntime} - ${failHead}`);
		return setTimeoutRuntime(() => showFavouriteButton(), 5000);
	}
	const currentHref = getCurrentHrefRuntime();
	const url = tabRuntime.minifyURL(currentHref);
	const standardTabs = [salesforceSetupHomeMiniRuntime, "ObjectManager/home"];
	if (standardTabs.includes(url)) {
		return;
	}
	const header = getHeader("div.bRight");
	if (header == null) {
		return setTimeoutRuntime(() => showFavouriteButton(count + 1), 500);
	}
	const isCurrentlyOnSavedTab = getIsCurrentlyOnSavedTabRuntime();
	if (getWasOnSavedTabRuntime() == null && isCurrentlyOnSavedTab == null) {
		await isOnSavedTabRuntime();
	}
	const oldButton = header.querySelector(`#${FAVOURITE_BUTTON_ID_RUNTIME}`);
	if (oldButton != null) {
		const allTabs = await ensureAllTabsAvailabilityRuntime();
		toggleFavouriteButton(
			allTabs.existsWithOrWithoutOrg({
				url,
				org: tabRuntime.extractOrgName(currentHref),
			}),
			oldButton,
		);
		return;
	}
	const button = await generateFavouriteButton();
	header.appendChild(button);
	toggleFavouriteButton(isCurrentlyOnSavedTab, button);
}

/**
 * Executes page save/remove favourite action.
 *
 * @param {boolean} [save=true] Whether to save (`true`) or remove (`false`).
 */
function pageActionTab(save = true) {
	const favourite = getFavouriteImage(
		save ? STAR_ID_RUNTIME : SLASHED_STAR_ID_RUNTIME,
	);
	if (favourite.classList.contains(hiddenClassRuntime)) {
		const message = save
			? "error_useless_save"
			: "error_useless_remove";
		showToastRuntime(message, toastInfoRuntime);
	} else {
		favourite.closest("button").click();
	}
}

/**
 * Creates favourite-tab manager helpers with injected dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {string} options.cmdRemoveTab Remove-tab command key.
 * @param {string} options.cmdSaveAsTab Save-tab command key.
 * @param {string} options.cxmRemoveTab Remove-tab context-menu key.
 * @param {string} options.extensionLabel Extension label.
 * @param {string} options.extensionName Extension id/name.
 * @param {string} options.hiddenClass CSS hidden class.
 * @param {string} options.salesforceSetupHomeMini Salesforce setup home identifier.
 * @param {string} options.skipLinkDetection Skip-link-detection setting id.
 * @param {string} options.tabAddFront Add-in-front setting id.
 * @param {string} options.tabAsOrg Tab-as-org setting id.
 * @param {string} options.toastInfo Info toast type.
 * @param {string} options.toastWarning Warning toast type.
 * @param {string} options.tutorialEventActionFavourite Tutorial event key.
 * @param {string} options.tutorialEventActionUnfavourite Tutorial event key.
 * @param {string} options.whatAdd Add-action key.
 * @param {string} options.whatGetCommands Command-query key.
 * @param {{
 *   containsSalesforceId: (href: string) => boolean;
 *   extractOrgName: (href: string) => string;
 *   minifyURL: (href: string) => string;
 * }} options.tabRef Tab helpers.
 * @param {() => Promise<{
 *   existsWithOrWithoutOrg: (tab: { org: string; url: string }) => boolean;
 *   getSingleTabByData: (tab: { org: string; url: string }) => { label?: string; org?: string; url: string };
 * }>} options.ensureAllTabsAvailabilityFn Tabs resolver.
 * @param {(keys: string | string[], connector?: string) => Promise<string | string[]>} options.getTranslationsFn Translator helper.
 * @param {() => string} options.getCurrentHrefFn Current URL getter.
 * @param {() => boolean | null} options.getIsCurrentlyOnSavedTabFn Saved-tab state getter.
 * @param {(keys: string[]) => Promise<Array<{ enabled: boolean; id: string }> | null>} options.getSettingsFn Settings getter.
 * @param {() => boolean | null} options.getWasOnSavedTabFn Previous saved-tab state getter.
 * @param {(id: string, options: { css: string }) => HTMLElement} options.injectStyleFn Style injector.
 * @param {() => Promise<void>} options.isOnSavedTabFn Saved-tab resolver.
 * @param {(action: string, payload: { label?: string; org?: string; url: string }, options?: { addInFront: boolean }) => Promise<void>} options.performActionOnTabsFn Tabs action executor.
 * @param {(message: { commands: string[]; what: string }) => Promise<Array<{ name: string; shortcut: string | null }>>} options.sendExtensionMessageFn Command fetcher.
 * @param {(message: string, status: string) => void} options.showToastFn Toast renderer.
 * @param {{ createElement: (tag: string) => HTMLElement; createElementNS: (ns: string, tag: string) => SVGElement; getElementById: (id: string) => HTMLElement | null; querySelector: (selector: string) => HTMLElement | null; dispatchEvent: (event: Event) => boolean }} options.documentRef Document wrapper.
 * @param {(callback: () => void, delay: number) => number} options.setTimeoutFn Timeout scheduler.
 * @param {new (type: string) => Event} options.customEventCtor Custom event constructor.
 * @param {{ error: (message: string) => void; warn: (message: Error | string) => void }} [options.consoleRef=console] Console wrapper.
 * @return {{
 *   FAVOURITE_BUTTON_ID: string;
 *   SLASHED_STAR_ID: string;
 *   STAR_ID: string;
 *   actionFavourite: () => Promise<void>;
 *   addTab: (url: string) => Promise<void>;
 *   createStarSvg: (options?: { alt?: string | null; id?: string | null }, slashed?: boolean) => SVGElement;
 *   generateFavouriteButton: () => Promise<HTMLButtonElement>;
 *   getFavouriteImage: (favouriteId: string | null, button?: HTMLButtonElement | null) => HTMLElement | null;
 *   pageActionTab: (save?: boolean) => void;
 *   showFavouriteButton: (count?: number) => Promise<number | void>;
 *   toggleFavouriteButton: (isSaved?: boolean | null, button?: HTMLButtonElement | null) => void;
 * }} Favourite-manager API.
 */
export function createFavouriteManagerModule({
	cmdRemoveTab,
	cmdSaveAsTab,
	cxmRemoveTab,
	extensionLabel,
	extensionName,
	hiddenClass,
	salesforceSetupHomeMini,
	skipLinkDetection,
	tabAddFront,
	tabAsOrg,
	toastInfo,
	toastWarning,
	tutorialEventActionFavourite,
	tutorialEventActionUnfavourite,
	whatAdd,
	whatGetCommands,
	tabRef,
	ensureAllTabsAvailabilityFn,
	getTranslationsFn,
	getCurrentHrefFn,
	getIsCurrentlyOnSavedTabFn,
	getSettingsFn,
	getWasOnSavedTabFn,
	injectStyleFn,
	isOnSavedTabFn,
	performActionOnTabsFn,
	sendExtensionMessageFn,
	showToastFn,
	documentRef,
	setTimeoutFn,
	customEventCtor,
	consoleRef = console,
}) {
	cmdRemoveTabRuntime = cmdRemoveTab;
	cmdSaveAsTabRuntime = cmdSaveAsTab;
	cxmRemoveTabRuntime = cxmRemoveTab;
	extensionLabelRuntime = extensionLabel;
	extensionNameRuntime = extensionName;
	hiddenClassRuntime = hiddenClass;
	salesforceSetupHomeMiniRuntime = salesforceSetupHomeMini;
	skipLinkDetectionRuntime = skipLinkDetection;
	tabAddFrontRuntime = tabAddFront;
	tabAsOrgRuntime = tabAsOrg;
	toastInfoRuntime = toastInfo;
	toastWarningRuntime = toastWarning;
	tutorialEventActionFavouriteRuntime = tutorialEventActionFavourite;
	tutorialEventActionUnfavouriteRuntime = tutorialEventActionUnfavourite;
	whatAddRuntime = whatAdd;
	whatGetCommandsRuntime = whatGetCommands;
	tabRuntime = tabRef;
	ensureAllTabsAvailabilityRuntime = ensureAllTabsAvailabilityFn;
	getTranslationsRuntime = getTranslationsFn;
	getCurrentHrefRuntime = getCurrentHrefFn;
	getIsCurrentlyOnSavedTabRuntime = getIsCurrentlyOnSavedTabFn;
	getSettingsRuntime = getSettingsFn;
	getWasOnSavedTabRuntime = getWasOnSavedTabFn;
	injectStyleRuntime = injectStyleFn;
	isOnSavedTabRuntime = isOnSavedTabFn;
	performActionOnTabsRuntime = performActionOnTabsFn;
	sendExtensionMessageRuntime = sendExtensionMessageFn;
	showToastRuntime = showToastFn;
	documentRuntime = documentRef;
	setTimeoutRuntime = setTimeoutFn;
	customEventRuntime = customEventCtor;
	consoleRuntime = consoleRef;
	updateFavouriteRuntimeIds();

	return {
		FAVOURITE_BUTTON_ID: FAVOURITE_BUTTON_ID_RUNTIME,
		SLASHED_STAR_ID: SLASHED_STAR_ID_RUNTIME,
		STAR_ID: STAR_ID_RUNTIME,
		actionFavourite,
		addTab,
		createStarSvg,
		generateFavouriteButton,
		getFavouriteImage,
		pageActionTab,
		showFavouriteButton,
		toggleFavouriteButton,
	};
}
