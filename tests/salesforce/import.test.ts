import { assertEquals } from "@std/testing/asserts";

const IMPORT_PATH = new URL(
	"../../src/salesforce/import.js",
	import.meta.url,
);

/**
 * Replaces an import statement with blank lines to preserve source line numbers.
 *
 * @param {string} source Full module source.
 * @param {string} fileName Imported module path to replace.
 * @return {string} Source with the import statement removed.
 */
function blankImport(source: string, fileName: string) {
	return source.replace(
		new RegExp(
			String.raw`import[\s\S]*?from\s*"${
				fileName.replaceAll("/", "\\/")
			}";\n`,
		),
		(match) => "\n".repeat(match.split("\n").length - 1),
	);
}

/**
 * Builds a testable import module by stripping runtime imports and exposing internal helpers.
 *
 * @return {Promise<{__testHooks: {getTabsFromJSON: (jsonWithTabs?: Record<string, unknown> | null) => Record<string, unknown>[]}}>}
 */
async function loadImportModule() {
	let source = await Deno.readTextFile(IMPORT_PATH);
	for (
		const fileName of [
			"/constants.js",
			"/functions.js",
			"/tab.js",
			"/tabContainer.js",
			"/translator.js",
			"./generator.js",
			"./content.js",
		]
	) {
		source = blankImport(source, fileName);
	}
	const prelude = `
const __deps = globalThis.__importCompatDeps;
const { EXTENSION_NAME, HIDDEN_CLASS, TOAST_ERROR, TOAST_WARNING } = __deps.constants;
const { injectStyle } = __deps.functions;
const Tab = __deps.Tab;
const { ensureAllTabsAvailability, TabContainer } = __deps.tabContainer;
const ensureTranslatorAvailability = __deps.ensureTranslatorAvailability;
const {
	generateCheckboxWithLabel,
	generateSection,
	generateSldsFileInput,
	generateSldsModal,
	generateSldsModalWithTabList,
	MODAL_ID,
} = __deps.generator;
const { getModalHanger, getSetupTabUl, showToast } = __deps.content;
`;
	const suffix =
		"\nexport const __testHooks = { getTabsFromJSON };\n";

	const allowedKeys = new Set([
		"label",
		"url",
		"org",
		"click-count",
		"click-date",
	]);
	(globalThis as unknown as {
		__importCompatDeps?: Record<string, unknown>;
	}).__importCompatDeps = {
		constants: {
			EXTENSION_NAME: "again-why-salesforce",
			HIDDEN_CLASS: "is-hidden",
			TOAST_ERROR: "error",
			TOAST_WARNING: "warning",
		},
		functions: {
			injectStyle: () => ({}),
		},
		Tab: {
			hasUnexpectedKeys: (tab: Record<string, unknown>) =>
				tab != null &&
				Object.keys(tab).some((key) => !allowedKeys.has(key)),
		},
		tabContainer: {
			ensureAllTabsAvailability: () => Promise.resolve([]),
			TabContainer: {
				keyTabs: "tabs",
				keyPinnedTabsNo: "pinned",
				getThrowawayInstance: () => [],
			},
		},
		ensureTranslatorAvailability: () =>
			Promise.resolve({
				translate: (key: string) => Promise.resolve(key),
			}),
		generator: {
			generateCheckboxWithLabel: () => Promise.resolve({}),
			generateSection: () => Promise.resolve({
				section: {},
				divParent: { style: {}, appendChild: () => {}, append: () => {} },
			}),
			generateSldsFileInput: () => Promise.resolve({
				fileInputWrapper: { style: {} },
				inputContainer: {},
			}),
			generateSldsModal: () => Promise.resolve({
				modalParent: {},
				article: { appendChild: () => {} },
				saveButton: {},
				closeButton: {},
			}),
			generateSldsModalWithTabList: () => Promise.resolve({
				modalParent: {},
				saveButton: { addEventListener: () => {} },
				closeButton: { click: () => {} },
				getSelectedTabs: () => ({ tabs: [], selectedAll: false }),
			}),
			MODAL_ID: "modal-id",
		},
		content: {
			getModalHanger: () => ({ appendChild: () => {} }),
			getSetupTabUl: () => ({ querySelector: () => null }),
			showToast: () => {},
		},
	};
	try {
		const sourceUrl = `data:application/javascript;base64,${
			btoa(prelude + source + suffix)
		}`;
		return await import(`${sourceUrl}#${crypto.randomUUID()}`) as {
			__testHooks: {
				getTabsFromJSON: (
					jsonWithTabs?: Record<string, unknown> | null,
				) => Record<string, unknown>[];
			};
		};
	} finally {
		delete (globalThis as unknown as {
			__importCompatDeps?: Record<string, unknown>;
		}).__importCompatDeps;
	}
}

Deno.test("import compatibility maps legacy tabTitle and title keys", async () => {
	const importModule = await loadImportModule();
	const { getTabsFromJSON } = importModule.__testHooks;

	assertEquals(
		getTabsFromJSON({
			tabs: [
				{ tabTitle: "Legacy Users", url: "legacy-users", org: "legacy" },
				{ tabTitle: "Legacy Flows", url: "legacy-flows" },
			],
		}),
		[
			{ label: "Legacy Users", url: "legacy-users", org: "legacy" },
			{ label: "Legacy Flows", url: "legacy-flows", org: undefined },
		],
	);

	assertEquals(
		getTabsFromJSON({
			bookmarks: [
				{ title: "Navigator Users", url: "navigator-users", org: "ext" },
				{ title: "Navigator Flows", url: "navigator-flows" },
			],
		}),
		[
			{ label: "Navigator Users", url: "navigator-users", org: "ext" },
			{ label: "Navigator Flows", url: "navigator-flows", org: undefined },
		],
	);
});

Deno.test("import compatibility rejects mixed legacy payloads", async () => {
	const importModule = await loadImportModule();
	const { getTabsFromJSON } = importModule.__testHooks;

	assertEquals(
		getTabsFromJSON({
			tabs: [
				{ tabTitle: "Legacy Users", url: "legacy-users" },
				{ title: "Navigator Users", url: "navigator-users" },
			],
		}),
		[],
	);

	assertEquals(
		getTabsFromJSON({
			bookmarks: [
				{ title: "Navigator Users", url: "navigator-users" },
				{ tabTitle: "Legacy Users", url: "legacy-users" },
			],
		}),
		[],
	);
});
