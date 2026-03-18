import { assertEquals } from "@std/testing/asserts";
import { installMockDom } from "./happydom.ts";

const OPTIONS_PATH = new URL("../src/settings/options.js", import.meta.url);
const TEST_CONSTANTS = {
	EXTENSION_NAME: "again-why-salesforce",
	FOLLOW_SF_LANG: "follow-sf-lang",
	GENERIC_PINNED_TAB_STYLE_KEY: "settings-tab_generic_style-pinned",
	GENERIC_TAB_STYLE_KEY: "settings-tab_generic_style",
	HIDDEN_CLASS: "hidden",
	KNOWLEDGE_SILO_DETECTION: "knowledge_silo_detection",
	LINK_NEW_BROWSER: "link_new_browser",
	NO_RELEASE_NOTES: "no_release_notes",
	NO_UPDATE_NOTIFICATION: "no_update_notification",
	ORG_PINNED_TAB_STYLE_KEY: "settings-tab_org_style-pinned",
	ORG_TAB_STYLE_KEY: "settings-tab_org_style",
	PERSIST_SORT: "persist_sort",
	POPUP_LOGIN_NEW_TAB: "popup_login_new_tab",
	POPUP_OPEN_LOGIN: "popup_open_login",
	POPUP_OPEN_SETUP: "popup_open_setup",
	POPUP_SETUP_NEW_TAB: "popup_setup_new_tab",
	PREVENT_ANALYTICS: "prevent_analytics",
	PREVENT_DEFAULT_OVERRIDE: "user-set",
	SETTINGS_KEY: "settings",
	SKIP_LINK_DETECTION: "skip_link_detection",
	SLDS_ACTIVE: "slds-is-active",
	TAB_ADD_FRONT: "tab_add_front",
	TAB_AS_ORG: "tab_as_org",
	TAB_GENERIC_STYLE: "tab_generic_style",
	TAB_ON_LEFT: "tab_position_left",
	TAB_ORG_STYLE: "tab_org_style",
	TAB_STYLE_BACKGROUND: "background",
	TAB_STYLE_BOLD: "bold",
	TAB_STYLE_BORDER: "border",
	TAB_STYLE_COLOR: "color",
	TAB_STYLE_HOVER: "hover",
	TAB_STYLE_ITALIC: "italic",
	TAB_STYLE_SHADOW: "shadow",
	TAB_STYLE_TOP: "top",
	TAB_STYLE_UNDERLINE: "underline",
	USE_LIGHTNING_NAVIGATION: "use_lightning_navigation",
	USER_LANGUAGE: "picked-language",
	WHAT_SET: "set",
};
const SETTINGS_CHECKBOX_IDS = [
	"allow-export",
	"allow-domains",
	TEST_CONSTANTS.LINK_NEW_BROWSER,
	TEST_CONSTANTS.SKIP_LINK_DETECTION,
	TEST_CONSTANTS.USE_LIGHTNING_NAVIGATION,
	TEST_CONSTANTS.POPUP_OPEN_LOGIN,
	TEST_CONSTANTS.POPUP_OPEN_SETUP,
	TEST_CONSTANTS.POPUP_LOGIN_NEW_TAB,
	TEST_CONSTANTS.POPUP_SETUP_NEW_TAB,
	TEST_CONSTANTS.TAB_ON_LEFT,
	TEST_CONSTANTS.TAB_ADD_FRONT,
	TEST_CONSTANTS.TAB_AS_ORG,
	TEST_CONSTANTS.NO_RELEASE_NOTES,
	TEST_CONSTANTS.NO_UPDATE_NOTIFICATION,
	TEST_CONSTANTS.PREVENT_ANALYTICS,
	TEST_CONSTANTS.KNOWLEDGE_SILO_DETECTION,
	"keep_sorted",
];
const SETTINGS_CONTAINER_NAMES = [
	"general",
	TEST_CONSTANTS.TAB_GENERIC_STYLE,
	TEST_CONSTANTS.TAB_ORG_STYLE,
	`pinned_${TEST_CONSTANTS.TAB_GENERIC_STYLE}`,
	`pinned_${TEST_CONSTANTS.TAB_ORG_STYLE}`,
];

/**
 * Replaces an import statement with blank lines so line numbers stay stable.
 *
 * @param {string} source Module source code.
 * @param {string} fileName Import specifier to blank out.
 * @return {string} Source with the import removed.
 */
function blankImport(source: string, fileName: string) {
	const escapedFileName = fileName.replaceAll("/", "\\/");
	return source
		.replace(
			new RegExp(
				String.raw`import[\s\S]*?from\s*"${escapedFileName}";\n`,
			),
			(match) => "\n".repeat(match.split("\n").length - 1),
		)
		.replace(
			new RegExp(String.raw`import\s*"${escapedFileName}";\n`),
			(match) => "\n".repeat(match.split("\n").length - 1),
		);
}

/**
 * Encodes a signed integer using base64-VLQ for source-map generation.
 *
 * @param {number} value Integer to encode.
 * @return {string} Encoded VLQ segment.
 */
function encodeVlqValue(value: number) {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	let encoded = "";
	let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
	do {
		let digit = vlq & 31;
		vlq >>>= 5;
		if (vlq > 0) {
			digit |= 32;
		}
		encoded += alphabet[digit];
	} while (vlq > 0);
	return encoded;
}

/**
 * Builds a simple per-line inline source map back to the original options file.
 *
 * @param {Object} options Source-map options.
 * @param {number[]} options.originalLines 1-based original line numbers per generated line.
 * @param {string} options.sourceUrl Absolute source URL for the original module.
 * @return {string} Base64-encoded JSON source-map payload.
 */
function buildInlineSourceMap({
	originalLines,
	sourceUrl,
}: {
	originalLines: number[];
	sourceUrl: string;
}) {
	let previousOriginalLine = 0;
	const mappings = originalLines.map((lineNumber) => {
		if (lineNumber < 1) {
			return "";
		}
		const segment = [
			encodeVlqValue(0),
			encodeVlqValue(0),
			encodeVlqValue((lineNumber - 1) - previousOriginalLine),
			encodeVlqValue(0),
		].join("");
		previousOriginalLine = lineNumber - 1;
		return segment;
	}).join(";");
	return btoa(JSON.stringify({
		version: 3,
		file: OPTIONS_PATH.href,
		sources: [sourceUrl],
		names: [],
		mappings,
	}));
}

/**
 * Loads the options module with injected test doubles.
 *
 * @param {Record<string, unknown>} deps Test doubles for module imports.
 * @return {Promise<Record<string, unknown>>} Imported module namespace.
 */
async function loadOptionsModule(deps: Record<string, unknown>) {
	let source = await Deno.readTextFile(OPTIONS_PATH);
	for (
		const fileName of [
			"/constants.js",
			"/functions.js",
			"/translator.js",
			"/components/theme-selector/theme-selector.js",
		]
	) {
		source = blankImport(source, fileName);
	}
	const prelude = `
const __deps = globalThis.__optionsTestDeps;
const {
	EXTENSION_NAME,
	FOLLOW_SF_LANG,
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	HIDDEN_CLASS,
	KNOWLEDGE_SILO_DETECTION,
	LINK_NEW_BROWSER,
	NO_RELEASE_NOTES,
	NO_UPDATE_NOTIFICATION,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	PERSIST_SORT,
	POPUP_LOGIN_NEW_TAB,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_SETUP_NEW_TAB,
	PREVENT_ANALYTICS,
	PREVENT_DEFAULT_OVERRIDE,
	SETTINGS_KEY,
	SKIP_LINK_DETECTION,
	SLDS_ACTIVE,
	TAB_ADD_FRONT,
	TAB_AS_ORG,
	TAB_GENERIC_STYLE,
	TAB_ON_LEFT,
	TAB_ORG_STYLE,
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_BOLD,
	TAB_STYLE_BORDER,
	TAB_STYLE_COLOR,
	TAB_STYLE_HOVER,
	TAB_STYLE_ITALIC,
	TAB_STYLE_SHADOW,
	TAB_STYLE_TOP,
	TAB_STYLE_UNDERLINE,
	USE_LIGHTNING_NAVIGATION,
	USER_LANGUAGE,
	WHAT_SET,
} = __deps.constants;
const {
	areFramePatternsAllowed,
	getCssRule,
	getCssSelector,
	getPinnedSpecificKey,
	getSettings,
	getStyleSettings,
	injectStyle,
	isExportAllowed,
	isGenericKey,
	isPinnedKey,
	isStyleKey,
	requestCookiesPermission,
	requestExportPermission,
	requestFramePatternsPermission,
	sendExtensionMessage,
} = __deps.functions;
const ensureTranslatorAvailability = __deps.ensureTranslatorAvailability;
`;
	const sourceLines = source.split("\n");
	const preludeLines = prelude.split("\n");
	const originalLines = [
		...preludeLines.map(() => 0),
		...sourceLines.map((_, index) => index + 1),
	];
	const inlineSourceMap = buildInlineSourceMap({
		originalLines,
		sourceUrl: OPTIONS_PATH.href,
	});
	const moduleUrl = URL.createObjectURL(
		new Blob([`${preludeLines.join("\n")}\n${sourceLines.join("\n")}
//# sourceMappingURL=data:application/json;base64,${inlineSourceMap}
//# sourceURL=${OPTIONS_PATH.href}
`], {
			type: "text/javascript",
		}),
	);
	try {
		(globalThis as typeof globalThis & {
			__optionsTestDeps?: Record<string, unknown>;
		}).__optionsTestDeps = deps;
		return await import(`${moduleUrl}#${crypto.randomUUID()}`);
	} finally {
		delete (globalThis as typeof globalThis & {
			__optionsTestDeps?: Record<string, unknown>;
		}).__optionsTestDeps;
		URL.revokeObjectURL(moduleUrl);
	}
}

/**
 * Appends a mock element to the current document body.
 *
 * @param {Object} [options={}] Element options.
 * @param {string} [options.className=""] CSS classes to assign.
 * @param {string} [options.id=""] Element id.
 * @param {HTMLElement} [options.parent=document.body] Parent element.
 * @param {string} [options.tagName="div"] Element tag name.
 * @param {string} [options.type=""] Input type attribute.
 * @return {HTMLElement} The appended element.
 */
function appendOptionsElement({
	className = "",
	id = "",
	parent = document.body,
	tagName = "div",
	type = "",
}: {
	className?: string;
	id?: string;
	parent?: HTMLElement;
	tagName?: string;
	type?: string;
} = {}) {
	const element = document.createElement(tagName);
	if (className !== "") {
		element.className = className;
	}
	if (id !== "") {
		element.id = id;
	}
	if (type !== "") {
		element.setAttribute("type", type);
	}
	parent.appendChild(element);
	return element;
}

/**
 * Appends the toast structure required by the options page.
 *
 * @param {string} id Toast container id.
 * @return {HTMLElement} The toast container.
 */
function appendToast(id: string) {
	const toast = appendOptionsElement({ id });
	appendOptionsElement({
		className: "toastMessage slds-text-heading--small forceActionsText",
		parent: toast,
	});
	return toast;
}

/**
 * Appends one settings section with the required header, container, and preview.
 *
 * @param {string} name Section name used by the options page id convention.
 * @return {void}
 */
function appendSettingsSection(name: string) {
	appendOptionsElement({ id: `${name}-container` });
	appendOptionsElement({ id: `${name}-settings`, tagName: "button" });
	appendOptionsElement({ id: `${name}-preview`, tagName: "li" });
}

/**
 * Patches the mock document to support selectors used by the options bootstrap.
 *
 * @return {void}
 */
function patchOptionsSelectors() {
	const originalQuerySelector = document.querySelector.bind(document);
	document.querySelector = ((selector: string) => {
		if (selector === "#save-container > button") {
			return document.getElementById("save-button");
		}
		return originalQuerySelector(selector);
	}) as typeof document.querySelector;
}

/**
 * Builds the minimal DOM required for the options module to bootstrap.
 *
 * @return {void}
 */
function buildOptionsDom() {
	appendOptionsElement({ tagName: "theme-selector-aws" });
	for (const id of SETTINGS_CHECKBOX_IDS) {
		appendOptionsElement({ id, tagName: "input", type: "checkbox" });
	}
	appendOptionsElement({ id: TEST_CONSTANTS.USER_LANGUAGE, tagName: "select" });
	appendOptionsElement({ id: "sort-wrapper" });
	appendOptionsElement({ id: "picked-sort", tagName: "select" });
	appendOptionsElement({
		id: "picked-sort-direction",
		tagName: "select",
	});
	appendToast("toast-display-success");
	appendToast("toast-display-error");
	appendToast("save-confirm");
	for (const name of SETTINGS_CONTAINER_NAMES) {
		appendSettingsSection(name);
	}
	const saveContainer = appendOptionsElement({ id: "save-container" });
	appendOptionsElement({
		id: "save-button",
		parent: saveContainer,
		tagName: "button",
	});
}

/**
 * Creates a minimal options page DOM and module dependency harness.
 *
 * @param {Array<Record<string, unknown>>} settings Settings returned by getSettings.
 * @return {Promise<{
 * 	cleanup: () => void;
 * 	document: Document;
 * 	records: { messages: Record<string, unknown>[] };
 * }>} Harness state.
 */
async function createOptionsHarness(settings: Array<Record<string, unknown>>) {
	const dom = installMockDom("https://example.test/settings/options.html");
	patchOptionsSelectors();
	buildOptionsDom();
	const records = {
		messages: [] as Record<string, unknown>[],
	};
	await loadOptionsModule({
		constants: TEST_CONSTANTS,
		functions: {
			areFramePatternsAllowed: () => Promise.resolve(false),
			getCssRule: () => "",
			getCssSelector: () => ".again-why-salesforce",
			getPinnedSpecificKey: ({ isGeneric = true, isPinned = false } = {}) =>
				isGeneric
					? isPinned
						? "settings-tab_generic_style-pinned"
						: "settings-tab_generic_style"
					: isPinned
					? "settings-tab_org_style-pinned"
					: "settings-tab_org_style",
			getSettings: () => Promise.resolve(settings),
			getStyleSettings: () => Promise.resolve(null),
			injectStyle: () => {},
			isExportAllowed: () => false,
			isGenericKey: (key = "settings-tab_generic_style") =>
				key.includes("tab_generic_style"),
			isPinnedKey: (key = "settings-tab_generic_style") =>
				key.includes("pinned"),
			isStyleKey: (key = "") => key.startsWith("settings-tab_"),
			requestCookiesPermission: () => Promise.resolve(true),
			requestExportPermission: () => Promise.resolve(true),
			requestFramePatternsPermission: () => Promise.resolve(true),
			sendExtensionMessage: (message: Record<string, unknown>) => {
				records.messages.push(message);
				return Promise.resolve(true);
			},
		},
		ensureTranslatorAvailability: () =>
			Promise.resolve({
				translate: (message: string | string[]) =>
					Promise.resolve(
						Array.isArray(message) ? message.join(" ") : message,
					),
			}),
	});
	return {
		document,
		records,
		cleanup() {
			dom.cleanup();
		},
	};
}

Deno.test("options restores the knowledge silo checkbox state", async () => {
	const harness = await createOptionsHarness([{
		id: "knowledge_silo_detection",
		enabled: true,
	}]);
	try {
		assertEquals(
			(harness.document.getElementById(
				"knowledge_silo_detection",
			) as HTMLInputElement).checked,
			true,
		);
		assertEquals(harness.records.messages.length, 0);
	} finally {
		harness.cleanup();
	}
});

Deno.test("options persists the knowledge silo checkbox through the shared settings flow", async () => {
	const harness = await createOptionsHarness([{
		id: "knowledge_silo_detection",
		enabled: false,
	}]);
	try {
		const checkbox = harness.document.getElementById(
			"knowledge_silo_detection",
		) as HTMLInputElement;
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event("change", { bubbles: true }));
		assertEquals(harness.records.messages, [{
			what: "set",
			key: "settings",
			set: [{
				id: "knowledge_silo_detection",
				enabled: true,
			}],
		}]);
	} finally {
		harness.cleanup();
	}
});
