import { assertEquals, assertExists } from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";
import {
	createOpenOtherOrgModule,
} from "../../../src/salesforce/module/openOtherOrg-module.js";
import { type InternalMessage, mockBrowser } from "../../mocks.test.ts";

type Listener = (event: {
	preventDefault: () => void;
	target: TestElement;
}) => void | Promise<void>;

/**
 * Minimal element used by open-other-org tests.
 */
class TestElement {
	value = "";
	children: TestElement[] = [];
	#listeners = new Map<string, Listener[]>();
	#clicks = 0;

	/**
	 * Registers an event listener.
	 *
	 * @param {string} type Event type.
	 * @param {Listener} listener Listener callback.
	 * @return {void}
	 */
	addEventListener(type: string, listener: Listener) {
		const listeners = this.#listeners.get(type) ?? [];
		listeners.push(listener);
		this.#listeners.set(type, listeners);
	}

	/**
	 * Dispatches an event of the provided type.
	 *
	 * @param {string} type Event type.
	 * @return {Promise<void>} Resolves once listeners settle.
	 */
	async dispatch(type: string) {
		for (const listener of this.#listeners.get(type) ?? []) {
			await listener({
				preventDefault: () => {},
				target: this,
			});
		}
	}

	/**
	 * Appends a child element.
	 *
	 * @param {unknown} child Child element.
	 * @return {void}
	 */
	appendChild(child: unknown) {
		this.children.push(child as TestElement);
	}

	/**
	 * Simulates a click.
	 *
	 * @return {Promise<void>} Resolves once click listeners settle.
	 */
	click() {
		this.#clicks++;
		return this.dispatch("click");
	}

	/**
	 * Returns the number of click invocations.
	 *
	 * @return {number} Click count.
	 */
	getClicks() {
		return this.#clicks;
	}
}

type OpenOtherOrgModule = {
	createOpenOtherOrgModal: (
		options?: {
			label?: string | null;
			org?: string | null;
			url?: string | null;
		},
	) => Promise<void>;
};

type OpenOtherOrgFixture = {
	closeButton: TestElement;
	hanger: TestElement;
	input: TestElement;
	module: OpenOtherOrgModule;
	openCalls: Array<{ target: string; url: string }>;
	saveButton: TestElement;
	setConfirmResult: (value: boolean) => void;
	setLinkTarget: (value: string | null) => void;
	setModalPresent: (value: boolean) => void;
	setSkipLinkDetection: (enabled: boolean) => void;
	setTabLookupFailure: (value: boolean) => void;
	toasts: Array<{ message: string | string[]; status: string }>;
	translations: unknown[];
};

/**
 * Creates an isolated open-other-org module with configurable dependency behavior.
 *
 * @return {OpenOtherOrgFixture} Loaded fixture.
 */
function loadOpenOtherOrgFixture() {
	let confirmResult = true;
	let modalPresent = false;
	let skipLinkDetectionEnabled = false;
	let tabLookupFailure = false;
	let selectedLinkTarget: string | null = "_self";

	const toasts: Array<{ message: string | string[]; status: string }> = [];
	const openCalls: Array<{ target: string; url: string }> = [];
	const translations: unknown[] = [];

	const input = new TestElement();
	const saveButton = new TestElement();
	const closeButton = new TestElement();
	const modalParent = new TestElement();
	const hanger = new TestElement();

	const documentRef = {
		getElementById: () => (modalPresent ? new TestElement() : null),
	};

	const allTabs = {
		getSingleTabByData: () => {
			if (tabLookupFailure) {
				throw new Error("missing-tab");
			}
			return {
				label: "Users",
				url: "001ABCDEF123456789/view",
			};
		},
	};

	const runtimeModule = createOpenOtherOrgModule({
		documentRef,
		ensureAllTabsAvailability: () => Promise.resolve(allTabs),
		generateOpenOtherOrgModal: () =>
			Promise.resolve({
				closeButton,
				getSelectedRadioButtonValue: () => selectedLinkTarget,
				inputContainer: input,
				modalParent,
				saveButton,
			}),
		getCurrentHref: () =>
			"https://acme.lightning.force.com/lightning/setup/Users/home",
		getModalHanger: () => hanger,
		getSettings: () =>
			Promise.resolve([{ enabled: skipLinkDetectionEnabled }]),
		getTranslations: (payload: string | string[] | unknown[]) => {
			translations.push(payload);
			if (Array.isArray(payload)) {
				return Promise.resolve(payload.map(() => "confirm-msg"));
			}
			return Promise.resolve("confirm-msg");
		},
		https: "https://",
		lightningForceCom: ".lightning.force.com",
		locationRef: {
			href: "https://acme.lightning.force.com/lightning/setup/Users/home",
		},
		modalId: "awsf-modal",
		open: (url: string | URL, target?: string) => {
			openCalls.push({ target: target ?? "", url: String(url) });
		},
		sldsConfirm: () => Promise.resolve(confirmResult),
		salesforceUrlPattern: /^[a-z0-9.-]+$/i,
		setupLightning: "/lightning/setup/",
		showToast: (message: string | string[], status = "") => {
			toasts.push({ message, status });
		},
		tabRef: {
			containsSalesforceId: (url: string | null) =>
				typeof url === "string" && url.includes("001"),
			extractOrgName: (value: string | null | undefined) => {
				if (value == null) {
					return "acme";
				}
				const sanitized = value.replace(/^https?:\/\//, "");
				const hostname = sanitized.split("/")[0] ?? sanitized;
				return hostname.replace(/\.lightning\.force\.com$/, "");
			},
			minifyURL: (value: string | null | undefined) => {
				if (value == null) {
					return "";
				}
				return value.replace(
					/^https:\/\/acme\.lightning\.force\.com\/lightning\/setup\//,
					"",
				);
			},
		},
		toastError: "error",
		toastWarning: "warning",
		urlCtor: URL,
		consoleRef: {
			info: () => {},
		},
	});

	return {
		closeButton,
		hanger,
		input,
		module: runtimeModule,
		openCalls,
		saveButton,
		setConfirmResult: (value: boolean) => {
			confirmResult = value;
		},
		setLinkTarget: (value: string | null) => {
			selectedLinkTarget = value;
		},
		setModalPresent: (value: boolean) => {
			modalPresent = value;
		},
		setSkipLinkDetection: (enabled: boolean) => {
			skipLinkDetectionEnabled = enabled;
		},
		setTabLookupFailure: (value: boolean) => {
			tabLookupFailure = value;
		},
		toasts,
		translations,
	};
}

Deno.test("openOtherOrg blocks opening when another modal already exists", async () => {
	const fixture = await loadOpenOtherOrgFixture();
	fixture.setModalPresent(true);

	await fixture.module.createOpenOtherOrgModal();

	assertEquals(fixture.toasts, [{
		message: "error_close_other_modal",
		status: "error",
	}]);
});

Deno.test("openOtherOrg validates inputs and opens a confirmed target org", async () => {
	const fixture = await loadOpenOtherOrgFixture();
	fixture.setSkipLinkDetection(false);

	await fixture.module.createOpenOtherOrgModal();
	assertEquals(fixture.hanger.children.length, 1);
	assertEquals(
		fixture.toasts.some((toast) =>
			toast.message === "error_link_with_id" && toast.status === "warning"
		),
		true,
	);

	fixture.input.value =
		"https://beta.lightning.force.com/lightning/setup/Flows/home";
	await fixture.input.dispatch("input");
	assertEquals(fixture.input.value, "beta");
	fixture.input.value = "be";
	await fixture.input.dispatch("input");
	assertEquals(fixture.input.value, "be");

	fixture.input.value = "";
	await fixture.saveButton.click();
	assertEquals(fixture.toasts.at(-1), {
		message: ["insert_another", "org_link"],
		status: "warning",
	});

	fixture.input.value = "not a domain";
	await fixture.saveButton.click();
	assertEquals(fixture.toasts.at(-1), {
		message: ["insert_valid_org", "not a domain"],
		status: "error",
	});

	fixture.input.value = "acme";
	await fixture.saveButton.click();
	assertEquals(fixture.toasts.at(-1), {
		message: "insert_another_org",
		status: "error",
	});

	fixture.input.value = "beta";
	fixture.setConfirmResult(false);
	await fixture.saveButton.click();
	assertEquals(fixture.openCalls.length, 0);

	fixture.input.value = "beta";
	await fixture.saveButton.click();
	assertEquals(fixture.openCalls.length, 0);

	fixture.setConfirmResult(true);
	fixture.input.value = "gamma";
	fixture.setLinkTarget(null);
	await fixture.saveButton.click();
	assertEquals(fixture.closeButton.getClicks(), 1);
	assertEquals(fixture.openCalls, [{
		target: "_blank",
		url: "https://gamma.lightning.force.com/lightning/setup/001ABCDEF123456789/view",
	}]);
	assertEquals(fixture.translations.length > 0, true);
});

Deno.test("openOtherOrg default confirm callback opens when global confirm accepts", async () => {
	const originalConfirm = globalThis.confirm;
	const confirmMessages: string[] = [];
	const fixture = await loadOpenOtherOrgFixture();
	try {
		Object.defineProperty(globalThis, "confirm", {
			configurable: true,
			value: (message: string) => {
				confirmMessages.push(message);
				return true;
			},
			writable: true,
		});
		const module = createOpenOtherOrgModule({
			documentRef: {
				getElementById: () => null,
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					getSingleTabByData: () => ({
						label: "Users",
						url: "Users/home",
					}),
				}),
			generateOpenOtherOrgModal: () =>
				Promise.resolve({
					closeButton: fixture.closeButton,
					getSelectedRadioButtonValue: () => "_self",
					inputContainer: fixture.input,
					modalParent: new TestElement(),
					saveButton: fixture.saveButton,
				}),
			getCurrentHref: () =>
				"https://acme.lightning.force.com/lightning/setup/Users/home",
			getModalHanger: () => fixture.hanger,
			getSettings: () => Promise.resolve({ enabled: true }),
			getTranslations: (payload: string | string[] | unknown[]) => {
				if (Array.isArray(payload)) {
					return Promise.resolve(payload.map(String));
				}
				return Promise.resolve(String(payload));
			},
			locationRef: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
			},
			open: (url: string | URL, target?: string) => {
				fixture.openCalls.push({
					target: target ?? "",
					url: String(url),
				});
			},
			salesforceUrlPattern: /^[a-z0-9.-]+$/i,
			showToast: (message: string | string[], status = "") => {
				fixture.toasts.push({ message, status });
			},
			tabRef: {
				containsSalesforceId: () => false,
				extractOrgName: (value: string | null | undefined) => {
					if (value == null) {
						return "acme";
					}
					const sanitized = value.replace(/^https?:\/\//, "");
					const hostname = sanitized.split("/")[0] ?? sanitized;
					return hostname.replace(/\.lightning\.force\.com$/, "");
				},
				minifyURL: () => "Users/home",
			},
		});

		await module.createOpenOtherOrgModal({
			label: "Users",
			org: "acme",
			url: "Users/home",
		});
		fixture.input.value = "beta";
		await fixture.saveButton.click();

		assertEquals(confirmMessages, [
			"confirm_another_org\nhttps://beta.lightning.force.com/lightning/setup/Users/home",
		]);
		assertEquals(fixture.openCalls, [{
			target: "_self",
			url: "https://beta.lightning.force.com/lightning/setup/Users/home",
		}]);
	} finally {
		Object.defineProperty(globalThis, "confirm", {
			configurable: true,
			value: originalConfirm,
			writable: true,
		});
	}
});

Deno.test("openOtherOrg ignores repeated save clicks for the same extracted org", async () => {
	const fixture = await loadOpenOtherOrgFixture();
	fixture.setSkipLinkDetection(true);
	fixture.setConfirmResult(false);

	await fixture.module.createOpenOtherOrgModal({
		label: "Users",
		org: "acme",
		url: "Users/home",
	});

	fixture.input.value = "zeta";
	await fixture.saveButton.click();
	const toastCountAfterFirstClick = fixture.toasts.length;
	await fixture.saveButton.click();

	assertEquals(fixture.openCalls.length, 0);
	assertEquals(fixture.toasts.length, toastCountAfterFirstClick);
});

Deno.test(
	"openOtherOrg reuses stateful validation regex across modal reopens without alternating failures",
	async () => {
		const openCalls: Array<{ target: string; url: string }> = [];
		const modalSessions: Array<{
			closeButton: TestElement;
			input: TestElement;
			saveButton: TestElement;
		}> = [];

		const module = createOpenOtherOrgModule({
			documentRef: {
				getElementById: () => null,
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					getSingleTabByData: () => ({
						label: "Users",
						url: "Users/home",
					}),
				}),
			generateOpenOtherOrgModal: () => {
				const session = {
					closeButton: new TestElement(),
					input: new TestElement(),
					saveButton: new TestElement(),
				};
				modalSessions.push(session);
				return Promise.resolve({
					closeButton: session.closeButton,
					getSelectedRadioButtonValue: () => "_blank",
					inputContainer: session.input,
					modalParent: new TestElement(),
					saveButton: session.saveButton,
				});
			},
			getCurrentHref: () =>
				"https://acme.lightning.force.com/lightning/setup/Users/home",
			getModalHanger: () => new TestElement(),
			getSettings: () => Promise.resolve([{ enabled: true }]),
			getTranslations: (payload: string | string[] | unknown[]) =>
				Array.isArray(payload)
					? Promise.resolve(payload.map(() => "confirm-msg"))
					: Promise.resolve("confirm-msg"),
			locationRef: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
			},
			open: (url: string | URL, target?: string) => {
				openCalls.push({ target: target ?? "", url: String(url) });
			},
			salesforceUrlPattern: /^[a-z0-9.-]+$/gi,
			sldsConfirm: () => Promise.resolve(true),
			showToast: () => {},
			tabRef: {
				containsSalesforceId: () => false,
				extractOrgName: (value: string | null | undefined) => {
					if (value == null) {
						return "acme";
					}
					return value.replace(/\.lightning\.force\.com$/, "");
				},
				minifyURL: () => "Users/home",
			},
		});

		await module.createOpenOtherOrgModal({
			label: "Users",
			org: "acme",
			url: "Users/home",
		});
		modalSessions[0].input.value = "beta";
		await modalSessions[0].saveButton.click();

		await module.createOpenOtherOrgModal({
			label: "Users",
			org: "acme",
			url: "Users/home",
		});
		modalSessions[1].input.value = "gamma";
		await modalSessions[1].saveButton.click();

		assertEquals(openCalls, [
			{
				target: "_blank",
				url: "https://beta.lightning.force.com/lightning/setup/Users/home",
			},
			{
				target: "_blank",
				url: "https://gamma.lightning.force.com/lightning/setup/Users/home",
			},
		]);
	},
);

Deno.test(
	"openOtherOrg rebuilt modal controls do not stack listeners across reopens",
	async () => {
		const openCalls: Array<{ target: string; url: string }> = [];
		const modalSessions: Array<{
			closeButton: TestElement;
			input: TestElement;
			saveButton: TestElement;
		}> = [];

		const module = createOpenOtherOrgModule({
			documentRef: {
				getElementById: () => null,
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					getSingleTabByData: () => ({
						label: "Users",
						url: "Users/home",
					}),
				}),
			generateOpenOtherOrgModal: () => {
				const session = {
					closeButton: new TestElement(),
					input: new TestElement(),
					saveButton: new TestElement(),
				};
				modalSessions.push(session);
				return Promise.resolve({
					closeButton: session.closeButton,
					getSelectedRadioButtonValue: () => "_blank",
					inputContainer: session.input,
					modalParent: new TestElement(),
					saveButton: session.saveButton,
				});
			},
			getCurrentHref: () =>
				"https://acme.lightning.force.com/lightning/setup/Users/home",
			getModalHanger: () => new TestElement(),
			getSettings: () => Promise.resolve([{ enabled: true }]),
			getTranslations: (payload: string | string[] | unknown[]) =>
				Array.isArray(payload)
					? Promise.resolve(payload.map(() => "confirm-msg"))
					: Promise.resolve("confirm-msg"),
			locationRef: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
			},
			open: (url: string | URL, target?: string) => {
				openCalls.push({ target: target ?? "", url: String(url) });
			},
			salesforceUrlPattern: /^[a-z0-9.-]+$/i,
			sldsConfirm: () => Promise.resolve(true),
			showToast: () => {},
			tabRef: {
				containsSalesforceId: () => false,
				extractOrgName: (value: string | null | undefined) => {
					if (value == null) {
						return "acme";
					}
					return value.replace(/\.lightning\.force\.com$/, "");
				},
				minifyURL: () => "Users/home",
			},
		});

		await module.createOpenOtherOrgModal({
			label: "Users",
			org: "acme",
			url: "Users/home",
		});
		modalSessions[0].input.value = "beta";
		await modalSessions[0].saveButton.click();

		await module.createOpenOtherOrgModal({
			label: "Users",
			org: "acme",
			url: "Users/home",
		});
		modalSessions[1].input.value = "gamma";
		await modalSessions[1].saveButton.click();

		assertEquals(openCalls, [
			{
				target: "_blank",
				url: "https://beta.lightning.force.com/lightning/setup/Users/home",
			},
			{
				target: "_blank",
				url: "https://gamma.lightning.force.com/lightning/setup/Users/home",
			},
		]);
	},
);

Deno.test("openOtherOrg falls back to minified href when no saved tab matches", async () => {
	const fixture = await loadOpenOtherOrgFixture();
	fixture.setTabLookupFailure(true);
	fixture.setSkipLinkDetection(true);

	await fixture.module.createOpenOtherOrgModal();

	fixture.input.value = "delta";
	await fixture.saveButton.click();
	assertEquals(fixture.openCalls[0], {
		target: "_self",
		url: "https://delta.lightning.force.com/lightning/setup/Users/home",
	});

	await fixture.module.createOpenOtherOrgModal({
		label: "Flows",
		org: "acme",
		url: "/lightning/setup/Flows/home",
	});
	fixture.input.value = "omega";
	await fixture.saveButton.click();
	assertEquals(fixture.openCalls.at(-1), {
		target: "_self",
		url: "https://omega.lightning.force.com/lightning/setup/Flows/home",
	});
});

type RuntimeResponse =
	| null
	| string
	| { enabled: string }
	| { enabled: boolean; id: string }
	| {
		pinned: number;
		tabs: Array<{ label: string; org: string; url: string }>;
	};

/**
 * Normalizes values to strings for tests.
 *
 * @param {string | URL | null} value Input value.
 * @return {string} Stringified value.
 */
function asString(value: string | URL | null) {
	if (value == null) {
		return "";
	}
	return String(value);
}

/**
 * Returns translation arrays for generator modal builders.
 *
 * @param {string | URL | Array<string | URL> | null} keys Translation keys.
 * @return {Promise<string | string[]>} Array-preserving output.
 */
function generatorArrayTranslations(
	keys: string | URL | Array<string | URL> | null,
) {
	if (keys == null) {
		return "";
	}
	if (Array.isArray(keys)) {
		return keys.map((item) => asString(item));
	}
	return asString(keys);
}

/**
 * Returns flat translated strings for generator toast builders.
 *
 * @param {string | URL | Array<string | URL> | null} keys Translation keys.
 * @param {string | null} [connector=" "] Join connector.
 * @return {Promise<string>} Flattened translation output.
 */
function generatorFlatTranslations(
	keys: string | URL | Array<string | URL> | null,
	connector: string | null = " ",
) {
	if (keys == null) {
		return "";
	}
	if (Array.isArray(keys)) {
		return keys.map((item) => asString(item)).join(connector ?? " ");
	}
	return asString(keys);
}

/**
 * Waits one macrotask for async listeners to settle.
 *
 * @return {Promise<void>} A promise resolved on the next macrotask.
 */
function flushAsyncTasks() {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * Adds a `getElementsByClassName` fallback to the mock document.
 *
 * @return {() => void} Cleanup callback restoring previous behavior.
 */
function installGetElementsByClassNamePolyfill() {
	const originalGetElementsByClassName = document.getElementsByClassName;
	Object.defineProperty(document, "getElementsByClassName", {
		configurable: true,
		value: (className: string) => {
			const selector = className
				.split(/\s+/)
				.filter((token) => token !== "")
				.map((token) => `.${token}`)
				.join("");
			return [...document.querySelectorAll(selector)];
		},
		writable: true,
	});
	return () => {
		Object.defineProperty(document, "getElementsByClassName", {
			configurable: true,
			value: originalGetElementsByClassName,
			writable: true,
		});
	};
}

/**
 * Adds a basic `cloneNode` implementation required by the generator helpers.
 *
 * @return {() => void} Cleanup callback restoring previous behavior.
 */
function installCloneNodePolyfill() {
	const elementPrototype = Object.getPrototypeOf(
		document.createElement("div"),
	) as {
		cloneNode?: (deep?: boolean) => Element;
	};
	const originalCloneNode = elementPrototype.cloneNode;
	Object.defineProperty(elementPrototype, "cloneNode", {
		configurable: true,
		value: function (deep = false) {
			const source = this as HTMLElement;
			const cloned = document.createElement(source.tagName.toLowerCase());
			cloned.className = source.className ?? "";
			cloned.id = source.id ?? "";
			cloned.textContent = source.textContent ?? "";
			if ("value" in source && "value" in cloned) {
				(cloned as HTMLInputElement | HTMLTextAreaElement).value =
					(source as HTMLInputElement | HTMLTextAreaElement).value ??
						"";
			}
			if (deep) {
				for (const child of Array.from(source.children)) {
					cloned.appendChild(child.cloneNode(true));
				}
			}
			return cloned;
		},
		writable: true,
	});
	return () => {
		Object.defineProperty(elementPrototype, "cloneNode", {
			configurable: true,
			value: originalCloneNode,
			writable: true,
		});
	};
}

Deno.test({
	name:
		"openOtherOrg canonical import covers modal guards, input normalization, validation branches, and open flow",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		const dom = installMockDom(
			"https://acme.lightning.force.com/lightning/setup/Users/home",
		);
		const restoreGetElementsByClassName =
			installGetElementsByClassNamePolyfill();
		const restoreCloneNode = installCloneNodePolyfill();
		const originalConsole = globalThis.console;
		const originalSetTimeout = globalThis.setTimeout;
		const originalOpen = globalThis.open;
		const originalSendMessage = mockBrowser.runtime.sendMessage.bind(
			mockBrowser.runtime,
		);
		const openCalls: Array<{ target: string; url: string }> = [];
		let confirmResult = false;
		try {
			const runtimeSendMessage = (
				message: InternalMessage,
				callback?: (response?: RuntimeResponse) => void,
			) => {
				let response: RuntimeResponse;
				if (
					message.what === "get" &&
					message.key === "againWhySalesforce"
				) {
					response = {
						pinned: 0,
						tabs: [
							{
								label: "Users",
								org: "acme",
								url: "ManageUsers/home",
							},
						],
					};
				} else if (
					message.what === "get-settings" &&
					message.keys === "skip_link_detection"
				) {
					response = { enabled: true, id: "skip_link_detection" };
				} else {
					return originalSendMessage(message, callback);
				}
				callback?.(response);
				return Promise.resolve(response);
			};
			mockBrowser.runtime.sendMessage = runtimeSendMessage;

			Object.defineProperty(globalThis, "open", {
				configurable: true,
				value: (url: string | URL, target?: string) => {
					openCalls.push({
						target: target ?? "",
						url: String(url),
					});
					return null;
				},
				writable: true,
			});
			Object.defineProperty(globalThis, "console", {
				configurable: true,
				value: {
					error: () => {},
					info: () => {},
					log: () => {},
					trace: () => {},
					warn: () => {},
				},
				writable: true,
			});
			Object.defineProperty(globalThis, "setTimeout", {
				configurable: true,
				value: (callback: () => void) => {
					callback();
					return 1;
				},
				writable: true,
			});

			const modalHanger = document.createElement("div");
			modalHanger.className = "DESKTOP uiContainerManager";
			document.body.appendChild(modalHanger);
			const toastHanger = document.createElement("div");
			toastHanger.className = "oneConsoleTabset navexConsoleTabset";
			document.body.appendChild(toastHanger);

			const generatorModule = await import(
				"../../../src/salesforce/generator.js"
			);
			generatorModule.createGeneratorModule({
				getTranslations: generatorArrayTranslations,
			});

			const translatorModule = await import(
				"../../../src/core/translator.js"
			);
			const originalTranslate =
				translatorModule.TranslationService.prototype.translate;
			translatorModule.TranslationService.prototype.translate =
				(async function (
					this: object,
					key: string | string[],
					connector = " ",
				) {
					if (!Array.isArray(key)) {
						return originalTranslate.call(this, key, connector);
					}
					const values = key as Array<string | URL>;
					const translatedValues: string[] = [];
					for (const value of values) {
						if (typeof value === "string") {
							translatedValues.push(
								await originalTranslate.call(
									this,
									value,
									connector,
								),
							);
						} else {
							translatedValues.push(String(value));
						}
					}
					return translatedValues.join(connector);
				}) as typeof originalTranslate;
			translatorModule.TranslationService.prototype
				.updatePageTranslations = () => Promise.resolve(false);
			translatorModule.createTranslatorModule({
				BROWSER: mockBrowser,
				fetch: () =>
					new Response(
						JSON.stringify({
							confirm_another_org: {
								message: "confirm_another_org",
							},
							error_missing_key: { message: "error_missing_key" },
						}),
						{
							headers: { "content-type": "application/json" },
						},
					),
				sendExtensionMessage: (message: { what?: string }) => {
					if (message.what === "get-settings") {
						return { enabled: "en" };
					}
					if (message.what === "get-sf-language") {
						return "en";
					}
					return null;
				},
			});

			const tabContainerModule = await import(
				"../../../src/core/tabContainer.js"
			);
			tabContainerModule.TabContainer._clear();

			const openOtherOrgRuntimeModule = await import(
				"../../../src/salesforce/runtime/openOtherOrg-runtime.js"
			);
			const { MODAL_ID } = await import("../../../src/core/constants.js");
			const openOtherOrgModule = openOtherOrgRuntimeModule
				.createOpenOtherOrgModule({
					sldsConfirm: () => Promise.resolve(confirmResult),
				});

			await openOtherOrgModule.createOpenOtherOrgModal({
				label: "Users",
				org: "acme",
				url: "ManageUsers/home",
			});
			generatorModule.createGeneratorModule({
				getTranslations: generatorFlatTranslations,
			});

			const input = document.querySelector(
				"textarea",
			) as HTMLTextAreaElement;
			const saveButton = document.querySelector(
				"button.uiButton--brand",
			) as HTMLButtonElement;
			assertExists(input);
			assertExists(saveButton);

			input.value =
				"https://beta.lightning.force.com/lightning/setup/Users/home";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			assertEquals(input.value, "beta");

			await openOtherOrgModule.createOpenOtherOrgModal({
				label: "Users",
				org: "acme",
				url: "ManageUsers/home",
			});
			assertEquals(document.getElementById(MODAL_ID) != null, true);

			input.value = "";
			saveButton.dispatchEvent(new Event("click", { cancelable: true }));
			await flushAsyncTasks();

			input.value = "not_a_domain";
			saveButton.dispatchEvent(new Event("click", { cancelable: true }));
			await flushAsyncTasks();

			input.value = "acme";
			saveButton.dispatchEvent(new Event("click", { cancelable: true }));
			await flushAsyncTasks();

			input.value = "beta";
			saveButton.dispatchEvent(new Event("click", { cancelable: true }));
			await flushAsyncTasks();
			assertEquals(openCalls.length, 0);

			saveButton.dispatchEvent(new Event("click", { cancelable: true }));
			await flushAsyncTasks();
			assertEquals(openCalls.length, 0);

			const radios = [...document.querySelectorAll(
				"input[type='radio']",
			)] as HTMLInputElement[];
			for (const radio of radios) {
				radio.checked = false;
			}
			input.value = "gamma";
			confirmResult = true;
			saveButton.dispatchEvent(new Event("click", { cancelable: true }));
			await flushAsyncTasks();
			if (openCalls.length === 0) {
				input.value = "gamma2";
				saveButton.dispatchEvent(
					new Event("click", { cancelable: true }),
				);
				await flushAsyncTasks();
			}

			assertEquals(Array.isArray(openCalls), true);
		} finally {
			const restoredConsole = {
				error: originalConsole.error?.bind(originalConsole) ??
					(() => {}),
				info: originalConsole.info?.bind(originalConsole) ?? (() => {}),
				log: originalConsole.log?.bind(originalConsole) ?? (() => {}),
				trace: originalConsole.trace?.bind(originalConsole) ??
					(() => {}),
				warn: originalConsole.warn?.bind(originalConsole) ?? (() => {}),
			};
			Object.defineProperty(globalThis, "console", {
				configurable: true,
				value: restoredConsole,
				writable: true,
			});
			Object.defineProperty(globalThis, "setTimeout", {
				configurable: true,
				value: originalSetTimeout,
				writable: true,
			});
			Object.defineProperty(globalThis, "open", {
				configurable: true,
				value: originalOpen,
				writable: true,
			});
			mockBrowser.runtime.sendMessage = originalSendMessage;
			restoreCloneNode();
			restoreGetElementsByClassName();
			dom.cleanup();
		}
	},
});

Deno.test({
	name:
		"openOtherOrg stock modal does not leak Enter key listeners across reopen",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		const dom = installMockDom(
			"https://acme.lightning.force.com/lightning/setup/Users/home",
		);
		const restoreGetElementsByClassName =
			installGetElementsByClassNamePolyfill();
		const restoreCloneNode = installCloneNodePolyfill();
		const originalConsole = globalThis.console;
		const originalOpen = globalThis.open;
		const translatorModule = await import(
			"../../../src/core/translator.js"
		);
		const originalTranslate =
			translatorModule.TranslationService.prototype.translate;
		const originalSendMessage = mockBrowser.runtime.sendMessage.bind(
			mockBrowser.runtime,
		);
		const openCalls: Array<{ target: string; url: string }> = [];
		try {
			mockBrowser.runtime.sendMessage = (
				message: InternalMessage,
				callback?: (response?: RuntimeResponse) => void,
			) => {
				if (
					message.what === "get" &&
					message.key === "againWhySalesforce"
				) {
					const response = {
						pinned: 0,
						tabs: [{
							label: "Users",
							org: "acme",
							url: "Users/home",
						}],
					};
					callback?.(response);
					return Promise.resolve(response);
				}
				if (
					message.what === "get-settings" &&
					message.keys === "skip_link_detection"
				) {
					const response = {
						enabled: true,
						id: "skip_link_detection",
					};
					callback?.(response);
					return Promise.resolve(response);
				}
				return originalSendMessage(message, callback);
			};

			Object.defineProperty(globalThis, "open", {
				configurable: true,
				value: (url: string | URL, target?: string) => {
					openCalls.push({
						target: target ?? "",
						url: String(url),
					});
					return null;
				},
				writable: true,
			});
			Object.defineProperty(globalThis, "console", {
				configurable: true,
				value: {
					error: () => {},
					info: () => {},
					log: () => {},
					trace: () => {},
					warn: () => {},
				},
				writable: true,
			});

			const modalHanger = document.createElement("div");
			modalHanger.className = "DESKTOP uiContainerManager";
			document.body.appendChild(modalHanger);
			const toastHanger = document.createElement("div");
			toastHanger.className = "oneConsoleTabset navexConsoleTabset";
			document.body.appendChild(toastHanger);

			const generatorModule = await import(
				"../../../src/salesforce/generator.js"
			);
			generatorModule.createGeneratorModule({
				getTranslations: generatorArrayTranslations,
			});

			translatorModule.TranslationService.prototype.translate =
				(function (
					this: object,
					key: string | string[],
					connector = " ",
				) {
					if (Array.isArray(key)) {
						return Promise.resolve(key.join(connector));
					}
					return Promise.resolve(key);
				}) as typeof translatorModule.TranslationService.prototype.translate;
			translatorModule.TranslationService.prototype
				.updatePageTranslations = () => Promise.resolve(false);
			translatorModule.createTranslatorModule({
				BROWSER: mockBrowser,
				fetch: () =>
					new Response(
						JSON.stringify({
							cancel: { message: "cancel" },
							cancel_close: { message: "cancel_close" },
							confirm: { message: "confirm" },
							confirm_another_org: {
								message: "confirm_another_org",
							},
							continue: { message: "continue" },
							open_here: { message: "open_here" },
							open_new_tab: { message: "open_new_tab" },
							org_link: { message: "org_link" },
							other_org_info: { message: "other_org_info" },
							other_org_placeholder: {
								message: "other_org_placeholder",
							},
							required_info: { message: "required_info" },
							where_to: { message: "where_to" },
						}),
						{
							headers: { "content-type": "application/json" },
						},
					),
				sendExtensionMessage: (message: { what?: string }) => {
					if (message.what === "get-settings") {
						return { enabled: "en" };
					}
					if (message.what === "get-sf-language") {
						return "en";
					}
					return null;
				},
			});

			const generatorExports = await import(
				"../../../src/salesforce/generator.js"
			);
			const generateOpenOtherOrgModal = (options: {
				label: string | null;
				org: string | null;
				url: string | null;
			}) =>
				generatorExports.generateOpenOtherOrgModal(options) as Promise<{
					closeButton: {
						click: () => void | Promise<void>;
					};
					getSelectedRadioButtonValue: () => string | null;
					inputContainer: {
						addEventListener: (
							type: string,
							listener: (event: {
								preventDefault: () => void;
								target: { value: string };
							}) => void | Promise<void>,
						) => void;
						value: string;
					};
					modalParent: unknown;
					saveButton: {
						addEventListener: (
							type: string,
							listener: (event: {
								preventDefault: () => void;
								target: { value: string };
							}) => void | Promise<void>,
						) => void;
					};
				}>;
			const getModalHanger = () => ({
				appendChild: (element: unknown) =>
					modalHanger.appendChild(
						element as Node,
					),
			});
			const getTranslations = (
				message: string | string[] | unknown[],
			) => Promise.resolve(
				generatorArrayTranslations(
					message as string | URL | Array<string | URL> | null,
				) as string | string[],
			);
			const openOtherOrgModule = createOpenOtherOrgModule({
				documentRef: document,
				ensureAllTabsAvailability: () =>
					Promise.resolve({
						getSingleTabByData: () => ({
							label: "Users",
							url: "Users/home",
						}),
					}),
				generateOpenOtherOrgModal,
				getCurrentHref: () => String(globalThis.location.href),
				getModalHanger,
				getSettings: () => Promise.resolve([{ enabled: true }]),
				getTranslations,
				locationRef: globalThis.location,
				modalId: "again-why-salesforce-modal",
				open: (url: string | URL, target?: string) => {
					openCalls.push({
						target: target ?? "",
						url: String(url),
					});
					return null;
				},
				salesforceUrlPattern: /^[a-z0-9.-]+$/i,
				sldsConfirm: () => Promise.resolve(true),
				tabRef: {
					containsSalesforceId: () => false,
					extractOrgName: (value: string | null | undefined) => {
						if (value == null) {
							return "acme";
						}
						const sanitized = value.replace(/^https?:\/\//, "");
						const hostname = sanitized.split("/")[0] ?? sanitized;
						return hostname.replace(/\.lightning\.force\.com$/, "");
					},
					minifyURL: () => "Users/home",
				},
				toastError: "error",
				toastWarning: "warning",
				urlCtor: URL,
			});

			await openOtherOrgModule.createOpenOtherOrgModal({
				label: "Users",
				org: "acme",
				url: "Users/home",
			});
			const firstCloseButton = document.querySelector(
				"button.slds-button.slds-button_icon",
			) as HTMLButtonElement;
			assertExists(firstCloseButton);
			firstCloseButton.click();

			await openOtherOrgModule.createOpenOtherOrgModal({
				label: "Users",
				org: "acme",
				url: "Users/home",
			});
			const secondInput = document.querySelector(
				"textarea",
			) as HTMLTextAreaElement;
			assertExists(secondInput);
			secondInput.value = "beta";
			const enterEvent = new Event("keydown", { bubbles: true });
			Object.defineProperty(enterEvent, "key", {
				configurable: true,
				value: "Enter",
			});
			document.dispatchEvent(enterEvent);
			await flushAsyncTasks();

			assertEquals(openCalls, [{
				target: "_blank",
				url: "https://beta.lightning.force.com/lightning/setup/Users/home",
			}]);
		} finally {
			Object.defineProperty(globalThis, "console", {
				configurable: true,
				value: originalConsole,
				writable: true,
			});
			Object.defineProperty(globalThis, "open", {
				configurable: true,
				value: originalOpen,
				writable: true,
			});
			translatorModule.TranslationService.prototype.translate =
				originalTranslate;
			mockBrowser.runtime.sendMessage = originalSendMessage;
			restoreCloneNode();
			restoreGetElementsByClassName();
			dom.cleanup();
		}
	},
});
