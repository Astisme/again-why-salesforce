import { assertEquals } from "@std/testing/asserts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

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
	 * @param {TestElement} child Child element.
	 * @return {void}
	 */
	appendChild(child: TestElement) {
		this.children.push(child);
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
 * @return {Promise<OpenOtherOrgFixture>} Loaded fixture.
 */
async function loadOpenOtherOrgFixture() {
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

	const { module } = await loadIsolatedModule<
		OpenOtherOrgModule,
		Record<string, unknown>
	>({
		modulePath: new URL(
			"../../../src/salesforce/openOtherOrg.js",
			import.meta.url,
		),
		dependencies: {
			HTTPS: "https://",
			LIGHTNING_FORCE_COM: ".lightning.force.com",
			MODAL_ID: "awsf-modal",
			SALESFORCE_URL_PATTERN: /^[a-z0-9.-]+$/i,
			SETUP_LIGHTNING: "/lightning/setup/",
			TOAST_ERROR: "error",
			TOAST_WARNING: "warning",
			Tab: {
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
			getTranslations: (payload: unknown) => {
				translations.push(payload);
				return Promise.resolve("confirm-msg");
			},
			showToast: (message: string | string[], status: string) => {
				toasts.push({ message, status });
			},
		},
		globals: {
			console: {
				info: () => {},
			},
			confirm: () => confirmResult,
			document: documentRef,
			location: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
			},
			open: (url: URL, target: string) => {
				openCalls.push({ target, url: String(url) });
			},
		},
	});

	return {
		closeButton,
		hanger,
		input,
		module,
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
