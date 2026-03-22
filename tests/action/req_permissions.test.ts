import { assertEquals } from "@std/testing/asserts";
import {
	createMockWindow,
	MockDocument,
	MockElement,
} from "./mock-dom.test.ts";
import { loadIsolatedModule } from "../load-isolated-module.test.ts";

type PermissionDependencies = {
	BROWSER: {
		action: {
			setPopup: (options: { popup: string }) => void;
		};
		runtime: {
			getURL: (path: string) => string;
		};
	};
	DO_NOT_REQUEST_FRAME_PERMISSION: string;
	HIDDEN_CLASS: string;
	ensureTranslatorAvailability: () => Promise<void>;
	requestExportPermission: () => void;
	requestFramePatternsPermission: () => void;
};

/**
 * Simple in-memory storage implementation used by popup tests.
 */
class MemoryStorage {
	#values = new Map<string, string>();

	/**
	 * Returns the stored value for a key.
	 *
	 * @param {string} key Storage key.
	 * @return {string | null} Stored value or `null`.
	 */
	getItem(key: string) {
		return this.#values.get(key) ?? null;
	}

	/**
	 * Stores a string value for the provided key.
	 *
	 * @param {string} key Storage key.
	 * @param {string} value Value to store.
	 * @return {void}
	 */
	setItem(key: string, value: string) {
		this.#values.set(key, value);
	}
}

/**
 * Creates and appends a mock DOM element with an id.
 *
 * @param {MockDocument} document Mock document.
 * @param {string} tagName Element tag name.
 * @param {string} id Element id.
 * @return {MockElement} Created element.
 */
function appendElement(
	document: MockDocument,
	tagName: string,
	id: string,
): MockElement {
	const element = document.createElement(tagName);
	element.id = id;
	document.body.appendChild(element);
	return element;
}

/**
 * Loads the permissions popup with the provided query string.
 *
 * @param {string} url Full popup URL.
 * @return {Promise<{ allowPermissions: MockElement; allowPermissionsDown: MockElement; cleanup: () => void; counters: { closeCalls: number; exportRequests: number; frameRequests: number; translatorCalls: number; }; download: MockElement; getLocation: () => string | URL; hostPermissions: MockElement; localStorage: MemoryStorage; noPermissions: MockElement; noPermissionsDown: MockElement; popupUpdates: { popup: string; }[]; rememberSkip: MockElement; timeoutCalls: number[]; }>} Loaded popup fixtures.
 */
async function loadPermissionsModule(url: string) {
	const window = createMockWindow(url);
	const document = window.document;
	const hostPermissions = appendElement(document, "div", "host_permissions");
	const download = appendElement(document, "div", "download");
	const noPermissions = appendElement(document, "a", "no-permissions");
	const allowPermissions = appendElement(
		document,
		"button",
		"allow-permissions",
	);
	const rememberSkip = appendElement(document, "input", "remember-skip");
	const noPermissionsDown = appendElement(
		document,
		"a",
		"no-permissions-down",
	);
	const allowPermissionsDown = appendElement(
		document,
		"button",
		"allow-permissions-down",
	);
	const localStorage = new MemoryStorage();
	const counters = {
		closeCalls: 0,
		exportRequests: 0,
		frameRequests: 0,
		translatorCalls: 0,
	};
	const timeoutCalls: number[] = [];
	const popupUpdates: { popup: string }[] = [];

	const { cleanup } = await loadIsolatedModule<
		Record<string, never>,
		PermissionDependencies
	>({
		modulePath: new URL(
			"../../src/action/req_permissions/req_permissions.js",
			import.meta.url,
		),
		dependencies: {
			BROWSER: {
				action: {
					setPopup: (options) => {
						popupUpdates.push(options);
					},
				},
				runtime: {
					getURL: (path) => `chrome-extension://test/${path}`,
				},
			},
			DO_NOT_REQUEST_FRAME_PERMISSION: "no-frame-request",
			HIDDEN_CLASS: "hidden",
			ensureTranslatorAvailability: () => {
				counters.translatorCalls++;
				return Promise.resolve();
			},
			requestExportPermission: () => {
				counters.exportRequests++;
			},
			requestFramePatternsPermission: () => {
				counters.frameRequests++;
			},
		},
		globals: {
			close: () => {
				counters.closeCalls++;
			},
			document,
			localStorage,
			location: window.location,
			setTimeout: (callback: () => void, delay: number) => {
				timeoutCalls.push(delay);
				callback();
				return timeoutCalls.length;
			},
		},
		importsToReplace: new Set([
			"/core/constants.js",
			"/core/functions.js",
			"/core/translator.js",
			"../themeHandler.js",
		]),
	});

	return {
		allowPermissions,
		allowPermissionsDown,
		cleanup,
		counters,
		download,
		hostPermissions,
		localStorage,
		noPermissions,
		noPermissionsDown,
		popupUpdates,
		rememberSkip,
		timeoutCalls,
		getLocation: () => globalThis.location as unknown as string | URL,
	};
}

Deno.test("req_permissions handles the host-permission flow in isolation", async () => {
	const fixture = await loadPermissionsModule(
		"https://example.test/action/req_permissions.html?whichid=hostpermissions",
	);

	try {
		assertEquals(fixture.counters.translatorCalls, 1);
		assertEquals(
			fixture.noPermissions.href,
			"chrome-extension://test/action/popup/popup.html?no-frame-request=true",
		);

		fixture.allowPermissions.click();
		assertEquals(fixture.counters.frameRequests, 1);
		assertEquals(fixture.counters.closeCalls, 1);
		assertEquals(fixture.timeoutCalls, [100]);

		fixture.rememberSkip.checked = true;
		fixture.rememberSkip.click();
		fixture.noPermissions.click();
		assertEquals(
			fixture.localStorage.getItem("no-frame-request"),
			"true",
		);
		assertEquals(
			fixture.getLocation(),
			"chrome-extension://test/action/popup/popup.html?no-frame-request=true",
		);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("req_permissions handles the download-permission flow in isolation", async () => {
	const fixture = await loadPermissionsModule(
		"https://example.test/action/req_permissions.html?whichid=download",
	);

	try {
		assertEquals(fixture.counters.translatorCalls, 1);
		assertEquals(
			fixture.hostPermissions.classList.contains("hidden"),
			true,
		);
		assertEquals(fixture.download.classList.contains("hidden"), false);

		fixture.noPermissionsDown.click();
		assertEquals(fixture.popupUpdates, [{
			popup: "chrome-extension://test/action/popup/popup.html",
		}]);
		assertEquals(
			fixture.getLocation(),
			"chrome-extension://test/action/popup/popup.html",
		);

		fixture.allowPermissionsDown.click();
		assertEquals(fixture.counters.exportRequests, 1);
		assertEquals(fixture.counters.closeCalls, 1);
		assertEquals(fixture.timeoutCalls, [100]);
		assertEquals(fixture.popupUpdates, [
			{ popup: "chrome-extension://test/action/popup/popup.html" },
			{ popup: "chrome-extension://test/action/popup/popup.html" },
		]);
	} finally {
		fixture.cleanup();
	}
});

Deno.test("req_permissions treats a missing query value as host permissions and can remove the skip handler", async () => {
	const fixture = await loadPermissionsModule(
		"https://example.test/action/req_permissions.html",
	);

	try {
		fixture.rememberSkip.checked = true;
		fixture.rememberSkip.click();
		fixture.rememberSkip.checked = false;
		fixture.rememberSkip.click();
		fixture.noPermissions.click();

		assertEquals(
			fixture.noPermissions.href,
			"chrome-extension://test/action/popup/popup.html?no-frame-request=true",
		);
		assertEquals(fixture.localStorage.getItem("no-frame-request"), null);
		assertEquals(
			fixture.getLocation(),
			new URL("https://example.test/action/req_permissions.html"),
		);
	} finally {
		fixture.cleanup();
	}
});
