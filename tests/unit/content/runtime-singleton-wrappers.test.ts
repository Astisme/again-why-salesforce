import { assertEquals, assertStrictEquals } from "@std/testing/asserts";
import "../../mocks.test.ts";
import * as favouriteManager from "../../../src/salesforce/favourite-manager.js";
import * as importFeature from "../../../src/salesforce/import.js";
import * as manageTabs from "../../../src/salesforce/manageTabs.js";
import * as openOtherOrg from "../../../src/salesforce/openOtherOrg.js";
import * as contentRuntime from "../../../src/salesforce/runtime/content-runtime.js";
import * as sfElements from "../../../src/salesforce/sf-elements.js";
import * as toast from "../../../src/salesforce/toast.js";
import * as tutorial from "../../../src/salesforce/tutorial.js";
import * as favouriteRuntime from "../../../src/salesforce/runtime/favourite-manager-runtime.js";
import { installMockDom } from "../../happydom.test.ts";

type SingletonHooks<T> = {
	resetModule: () => void;
	setModule: (module: T) => void;
};

type LifecycleHooks<T> = SingletonHooks<T> & {
	getModule: () => T | undefined;
};

type ContentModule = ReturnType<typeof contentRuntime.createContentModule>;

type FavouriteModule = {
	pageActionTab: (save: boolean) => void;
	showFavouriteButton: (count: number) => Promise<number | void>;
};

type ImportModule = {
	createImportModal: () => Promise<void>;
};

type ManageTabsModule = {
	createManageTabsModal: () => Promise<void>;
	handleActionButtonClick: (
		event: Event,
		options: Record<string, string>,
	) => Promise<void>;
};

type OpenOtherOrgModule = {
	createOpenOtherOrgModal: (
		options: { label?: string | null; org?: string | null; url?: string | null },
	) => Promise<void>;
};

type SfElementsModule = {
	findSetupTabUlInSalesforcePage: () => boolean;
	getCurrentHref: () => string;
	getModalHanger: () => string | null;
	getSetupTabUl: () => string | undefined;
	setSetupTabUl: (element: string) => void;
};

type ToastModule = {
	showToast: (message: string | string[], status: string | undefined) => Promise<void>;
};

type TutorialModule = {
	checkTutorial: (fromPopup: boolean) => Promise<void>;
};

type FavouriteRuntimeModule = ReturnType<
	typeof favouriteRuntime.createFavouriteManagerModule
>;

/**
 * Records an asynchronous wrapper invocation.
 *
 * @param {Array<Record<string, string>>} calls Recorded calls.
 * @param {Record<string, string>} call Call details.
 * @return {Promise<void>} Resolved recording result.
 */
function record(calls: Array<Record<string, string>>, call: Record<string, string>) {
	calls.push(call);
	return Promise.resolve();
}

/**
 * Verifies canonical wrapper imports delegate every singleton-backed export.
 *
 * @return {Promise<void>} Resolves after all delegate assertions.
 */
async function assertCanonicalDelegation() {
	const calls: Array<Record<string, string>> = [];
	const favouriteHooks: SingletonHooks<FavouriteModule> = favouriteManager.__testHooks;
	const importHooks: SingletonHooks<ImportModule> = importFeature.__testHooks;
	const manageTabsHooks: SingletonHooks<ManageTabsModule> = manageTabs.__testHooks;
	const openOtherOrgHooks: SingletonHooks<OpenOtherOrgModule> = openOtherOrg.__testHooks;
	const sfElementsHooks: SingletonHooks<SfElementsModule> = sfElements.__testHooks;
	const toastHooks: SingletonHooks<ToastModule> = toast.__testHooks;
	const tutorialHooks: SingletonHooks<TutorialModule> = tutorial.__testHooks;
	const event = new Event("click");
	const tabUl = "tab-ul";

	favouriteHooks.setModule({
		pageActionTab: (save) => calls.push({ name: "pageActionTab", save: String(save) }),
		showFavouriteButton: (count) =>
			Promise.resolve(calls.push({ name: "showFavouriteButton", count: String(count) })),
	});
	importHooks.setModule({
		createImportModal: () => record(calls, { name: "createImportModal" }),
	});
	manageTabsHooks.setModule({
		createManageTabsModal: () => record(calls, { name: "createManageTabsModal" }),
		handleActionButtonClick: (passedEvent, options) =>
			record(calls, {
				name: "handleActionButtonClick",
				event: String(passedEvent === event),
				options: JSON.stringify(options),
			}),
	});
	openOtherOrgHooks.setModule({
		createOpenOtherOrgModal: (options) =>
			record(calls, {
				name: "createOpenOtherOrgModal",
				options: JSON.stringify(options),
			}),
	});
	sfElementsHooks.setModule({
		findSetupTabUlInSalesforcePage: () => {
			calls.push({ name: "findSetupTabUlInSalesforcePage" });
			return true;
		},
		getCurrentHref: () => {
			calls.push({ name: "getCurrentHref" });
			return "href";
		},
		getModalHanger: () => {
			calls.push({ name: "getModalHanger" });
			return null;
		},
		getSetupTabUl: () => {
			calls.push({ name: "getSetupTabUl" });
			return undefined;
		},
		setSetupTabUl: (element) => calls.push({
			name: "setSetupTabUl",
			element: String(element === tabUl),
		}),
	});
	toastHooks.setModule({
		showToast: (message, status) =>
			record(calls, {
				name: "showToast",
				message: String(message),
				status: String(status),
			}),
	});
	tutorialHooks.setModule({
		checkTutorial: (fromPopup) =>
			record(calls, { name: "checkTutorial", fromPopup: String(fromPopup) }),
	});

	try {
		assertStrictEquals(
			favouriteManager.__testHooks.getModule(),
			favouriteManager.__testHooks.getModule(),
		);
		assertStrictEquals(
			importFeature.__testHooks.getModule(),
			importFeature.__testHooks.getModule(),
		);
		assertStrictEquals(
			manageTabs.__testHooks.getModule(),
			manageTabs.__testHooks.getModule(),
		);
		assertStrictEquals(
			openOtherOrg.__testHooks.getModule(),
			openOtherOrg.__testHooks.getModule(),
		);
		assertStrictEquals(
			sfElements.__testHooks.getModule(),
			sfElements.__testHooks.getModule(),
		);
		assertStrictEquals(toast.__testHooks.getModule(), toast.__testHooks.getModule());
		assertStrictEquals(
			tutorial.__testHooks.getModule(),
			tutorial.__testHooks.getModule(),
		);
		assertEquals(typeof favouriteManager.createFavouriteManagerModule(), "object");
		favouriteManager.pageActionTab();
		await favouriteManager.showFavouriteButton();
		assertEquals(typeof importFeature.createImportModule(), "object");
		await importFeature.createImportModal();
		assertEquals(typeof manageTabs.createManageTabsModule(), "object");
		await manageTabs.createManageTabsModal();
		await manageTabs.handleActionButtonClick(event);
		assertEquals(typeof openOtherOrg.createOpenOtherOrgModule(), "object");
		await openOtherOrg.createOpenOtherOrgModal();
		assertStrictEquals(sfElements.findSetupTabUlInSalesforcePage(), true);
		assertStrictEquals(sfElements.getCurrentHref(), "href");
		assertStrictEquals(sfElements.getModalHanger(), null);
		assertStrictEquals(sfElements.getSetupTabUl(), undefined);
		sfElements.setSetupTabUl(tabUl);
		assertEquals(
			typeof sfElements.createSfElementsModule({ documentRef: null as never }),
			"object",
		);
		assertEquals(typeof toast.createToastModule(), "object");
		await toast.showToast("toast_message");
		assertEquals(typeof tutorial.createTutorialModule(), "object");
		await tutorial.checkTutorial();

		assertEquals(calls, [
			{ name: "pageActionTab", save: "true" },
			{ name: "showFavouriteButton", count: "0" },
			{ name: "createImportModal" },
			{ name: "createManageTabsModal" },
			{ name: "handleActionButtonClick", event: "true", options: "{}" },
			{ name: "createOpenOtherOrgModal", options: "{}" },
			{ name: "findSetupTabUlInSalesforcePage" },
			{ name: "getCurrentHref" },
			{ name: "getModalHanger" },
			{ name: "getSetupTabUl" },
			{ name: "setSetupTabUl", element: "true" },
			{ name: "showToast", message: "toast_message", status: "success" },
			{ name: "checkTutorial", fromPopup: "false" },
		]);
	} finally {
		favouriteHooks.resetModule();
		importHooks.resetModule();
		manageTabsHooks.resetModule();
		openOtherOrgHooks.resetModule();
		sfElementsHooks.resetModule();
		toastHooks.resetModule();
		tutorialHooks.resetModule();
	}
}

Deno.test("canonical Salesforce wrappers delegate singleton exports and defaults", assertCanonicalDelegation);

/**
 * Verifies content-runtime exports delegate through its lazy singleton.
 *
 * @return {Promise<void>} Resolves after all delegate assertions.
 */
async function assertContentRuntimeDelegation() {
	const calls: Array<Record<string, string>> = [];
	const contentHooks: LifecycleHooks<ContentModule> = contentRuntime.__testHooks;
	const contentModule: ContentModule = {
		__testHooks: {},
		bootstrapIfNeeded: () => {
			calls.push({ name: "bootstrapIfNeeded" });
			return true;
		},
		getCurrentHref: () => {
			calls.push({ name: "getCurrentHref" });
			return "href";
		},
		getIsCurrentlyOnSavedTab: () => {
			calls.push({ name: "getIsCurrentlyOnSavedTab" });
			return true;
		},
		getModalHanger: () => {
			calls.push({ name: "getModalHanger" });
			return null;
		},
		getSetupTabUl: () => {
			calls.push({ name: "getSetupTabUl" });
			return null;
		},
		getWasOnSavedTab: () => {
			calls.push({ name: "getWasOnSavedTab" });
			return false;
		},
		isOnSavedTab: (isFromHrefUpdate, callback) =>
			record(calls, {
				name: "isOnSavedTab",
				callback: String(callback),
				isFromHrefUpdate: String(isFromHrefUpdate),
			}),
		makeDuplicatesBold: (miniURL) => {
			calls.push({ name: "makeDuplicatesBold", miniURL });
		},
		performActionOnTabs: (action, tab, options) =>
			record(calls, {
				action,
				name: "performActionOnTabs",
				options: String(options),
				tab: String(tab),
			}),
		reorderTabsUl: () => record(calls, { name: "reorderTabsUl" }),
		sf_afterSet: (options) => {
			calls.push({ name: "sf_afterSet", options: JSON.stringify(options) });
		},
		showToast: (message, status) =>
			record(calls, {
				message: Array.isArray(message) ? message.join(",") : message,
				name: "showToast",
				status: String(status),
			}),
	};

	contentHooks.resetModule();
	assertStrictEquals(contentHooks.getModule(), undefined);
	assertEquals(typeof contentRuntime.__testHooks.getCurrentHref, "function");
	assertEquals(typeof contentHooks.getModule(), "object");
	contentHooks.resetModule();
	contentHooks.setModule(contentModule);

	try {
		assertStrictEquals(contentHooks.getModule(), contentModule);
		assertStrictEquals(contentRuntime.bootstrapIfNeeded(), true);
		assertStrictEquals(contentRuntime.getCurrentHref(), "href");
		assertStrictEquals(contentRuntime.getIsCurrentlyOnSavedTab(), true);
		assertStrictEquals(contentRuntime.getModalHanger(), null);
		assertStrictEquals(contentRuntime.getSetupTabUl(), null);
		assertStrictEquals(contentRuntime.getWasOnSavedTab(), false);
		await contentRuntime.isOnSavedTab();
		contentRuntime.makeDuplicatesBold("Users/home");
		await contentRuntime.performActionOnTabs("move");
		await contentRuntime.reorderTabsUl();
		contentRuntime.sf_afterSet();
		await contentRuntime.showToast("toast_message");

		assertEquals(calls, [
			{ name: "bootstrapIfNeeded" },
			{ name: "getCurrentHref" },
			{ name: "getIsCurrentlyOnSavedTab" },
			{ name: "getModalHanger" },
			{ name: "getSetupTabUl" },
			{ name: "getWasOnSavedTab" },
			{
				name: "isOnSavedTab",
				callback: "null",
				isFromHrefUpdate: "false",
			},
			{ name: "makeDuplicatesBold", miniURL: "Users/home" },
			{
				action: "move",
				name: "performActionOnTabs",
				options: "undefined",
				tab: "undefined",
			},
			{ name: "reorderTabsUl" },
			{ name: "sf_afterSet", options: "{}" },
			{
				message: "toast_message",
				name: "showToast",
				status: "undefined",
			},
		]);
	} finally {
		contentHooks.resetModule();
	}

	assertStrictEquals(contentHooks.getModule(), undefined);
}

Deno.test(
	"content runtime singleton wrappers delegate every export and defaults",
	assertContentRuntimeDelegation,
);

/**
 * Verifies every favourite-manager runtime export delegates through its
 * replaceable singleton.
 *
 * @return {Promise<void>} Resolves after runtime delegation assertions.
 */
async function assertFavouriteRuntimeDelegation() {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	const calls: string[] = [];
	const module: FavouriteRuntimeModule = {
		actionFavourite: () => {
			calls.push("actionFavourite");
			return Promise.resolve();
		},
		addTab: () => {
			calls.push("addTab");
			return Promise.resolve();
		},
		createStarSvg: () => {
			calls.push("createStarSvg");
			return document.createElementNS("http://www.w3.org/2000/svg", "svg");
		},
		generateFavouriteButton: () => {
			calls.push("generateFavouriteButton");
			return Promise.resolve(document.createElement("button"));
		},
		getFavouriteImage: () => {
			calls.push("getFavouriteImage");
			return null;
		},
		pageActionTab: () => {
			calls.push("pageActionTab");
		},
		showFavouriteButton: () => {
			calls.push("showFavouriteButton");
			return Promise.resolve();
		},
		toggleFavouriteButton: () => {
			calls.push("toggleFavouriteButton");
		},
		FAVOURITE_BUTTON_ID: "button",
		SLASHED_STAR_ID: "slashed",
		STAR_ID: "star",
	};
	const hooks: LifecycleHooks<FavouriteRuntimeModule> =
		favouriteRuntime.__testHooks;
	hooks.resetModule();
	hooks.setModule(module);

	try {
		await favouriteRuntime.actionFavourite();
		await favouriteRuntime.addTab("Users/home");
		assertEquals(favouriteRuntime.createStarSvg().tagName, "SVG");
		await favouriteRuntime.generateFavouriteButton();
		assertStrictEquals(favouriteRuntime.getFavouriteImage("star"), null);
		favouriteRuntime.pageActionTab();
		await favouriteRuntime.showFavouriteButton();
		favouriteRuntime.toggleFavouriteButton();
		assertEquals(calls, [
			"actionFavourite",
			"addTab",
			"createStarSvg",
			"generateFavouriteButton",
			"getFavouriteImage",
			"pageActionTab",
			"showFavouriteButton",
			"toggleFavouriteButton",
		]);
	} finally {
		hooks.resetModule();
		dom.cleanup();
	}
}

Deno.test(
	"favourite runtime singleton delegates every export and defaults",
	assertFavouriteRuntimeDelegation,
);
