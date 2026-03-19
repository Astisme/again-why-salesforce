import "../mocks.test.ts";
import {
	assert,
	assertEquals,
	assertExists,
	assertStringIncludes,
} from "@std/testing/asserts";
import { waitForCondition } from "../async.test.ts";
import {
	checkAddRemoveContextMenus,
	refreshContextMenus,
	resetContextMenuStateForTests,
} from "/background/context-menus.js";
import {
	BROWSER,
	CMD_EXPORT_ALL,
	CMD_IMPORT,
	CMD_OPEN_OTHER_ORG,
	CMD_OPEN_SETTINGS,
	CMD_REMOVE_TAB,
	CMD_SAVE_AS_TAB,
	CMD_TOGGLE_ORG,
	CMD_UPDATE_TAB,
	CXM_EXPORT_TABS,
	CXM_OPEN_OTHER_ORG,
	CXM_PAGE_REMOVE_TAB,
	CXM_PAGE_SAVE_TAB,
} from "/constants.js";

/**
 * Sets the active mocked browser tab used by the background tests.
 *
 * @param {string} url - The URL that should be treated as the active tab.
 * @return {Promise<void>}
 */
function setActiveTab(url: string) {
	BROWSER.tabs.setMockBrowserTabs([{
		id: 0,
		url,
		active: true,
		currentWindow: true,
	}, {
		id: 1,
		url: "https://mock1.url",
		active: false,
		currentWindow: true,
	}]);
}

Deno.test({
	name: "should create and notify without depending on the active tab",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		let called = false;
		await setActiveTab("https://mock1.url");
		await checkAddRemoveContextMenus("testAction", () => {
			called = true;
		});
		assert(called, "the callback should be called");
		assert(BROWSER.contextMenus._contextMenus.length > 0);
	},
});

Deno.test({
	name: "should refresh shortcut labels without waiting for tab activation",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		await setActiveTab("https://mock1.url");
		BROWSER.commands.setMockCommands([{
			name: CMD_SAVE_AS_TAB,
			shortcut: "Alt+Shift+P",
		}]);

		await checkAddRemoveContextMenus("create");

		const initialMenu = BROWSER.contextMenus._contextMenus.find((menu) =>
			menu.id === CXM_PAGE_SAVE_TAB
		);
		assert(initialMenu != null);
		assertExists(initialMenu.title);
		assertStringIncludes(initialMenu.title, "(Alt+Shift+P)");

		BROWSER.commands.setMockCommands([{
			name: CMD_SAVE_AS_TAB,
			shortcut: "Ctrl+Shift+P",
		}]);

		await refreshContextMenus("testRefresh");

		const refreshedMenu = BROWSER.contextMenus._contextMenus.find((menu) =>
			menu.id === CXM_PAGE_SAVE_TAB
		);
		assert(refreshedMenu != null);
		assertExists(refreshedMenu.title);
		assertStringIncludes(refreshedMenu.title, "(Ctrl+Shift+P)");
		assertEquals(
			BROWSER.contextMenus._contextMenus.filter((menu) =>
				menu.id === CXM_PAGE_SAVE_TAB
			).length,
			1,
		);
	},
});

Deno.test({
	name: "should replace stale browser menu entries before creating new ones",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		await setActiveTab(
			"https://mock.my.salesforce-setup.com/lightning/setup/mock",
		);
		BROWSER.contextMenus._contextMenus.push({
			id: CXM_PAGE_SAVE_TAB,
			title: "stale",
		});
		BROWSER.commands.setMockCommands([{
			name: CMD_SAVE_AS_TAB,
			shortcut: "Alt+Shift+P",
		}]);

		await checkAddRemoveContextMenus("create");

		const matchingMenus = BROWSER.contextMenus._contextMenus.filter((
			menu,
		) => menu.id === CXM_PAGE_SAVE_TAB);
		assertEquals(matchingMenus.length, 1);
		assertExists(matchingMenus[0].title);
		assertStringIncludes(matchingMenus[0].title, "(Alt+Shift+P)");
	},
});

Deno.test({
	name: "should append shortcut labels to all supported context menu entries",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		await setActiveTab("https://mock1.url");
		BROWSER.commands.setMockCommands([
			{ name: CMD_SAVE_AS_TAB, shortcut: "Alt+1" },
			{ name: CMD_REMOVE_TAB, shortcut: "Alt+2" },
			{ name: CMD_TOGGLE_ORG, shortcut: "Alt+3" },
			{ name: CMD_UPDATE_TAB, shortcut: "Alt+4" },
			{ name: CMD_OPEN_SETTINGS, shortcut: "Alt+5" },
			{ name: CMD_OPEN_OTHER_ORG, shortcut: "Alt+6" },
			{ name: CMD_IMPORT, shortcut: "Alt+7" },
			{ name: CMD_EXPORT_ALL, shortcut: "Alt+8" },
		]);
		await checkAddRemoveContextMenus("all-shortcuts");

		const expectedById = new Map<string, string>([
			[CXM_PAGE_SAVE_TAB, "Alt+1"],
			[CXM_PAGE_REMOVE_TAB, "Alt+2"],
			["update-org", "Alt+3"],
			["update-tab", "Alt+4"],
			[CMD_OPEN_SETTINGS, "Alt+5"],
			[CXM_OPEN_OTHER_ORG, "Alt+6"],
			["import-tabs", "Alt+7"],
			[CXM_EXPORT_TABS, "Alt+8"],
		]);
		for (const [id, shortcut] of expectedById.entries()) {
			const entry = BROWSER.contextMenus._contextMenus.find((menu) =>
				menu.id === id
			);
			assertExists(entry);
			assertExists(entry.title);
			assertStringIncludes(entry.title, `(${shortcut})`);
		}
	},
});

Deno.test({
	name:
		"should route context-menu click variants to their expected behaviors",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		await setActiveTab(
			"https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
		);
		const originalSendMessage = BROWSER.tabs.sendMessage;
		const sentMessages: Array<{ what?: string; [key: string]: unknown }> =
			[];
		BROWSER.tabs.sendMessage = (_tabId: number, message: unknown) => {
			sentMessages.push(
				message as { what?: string; [key: string]: unknown },
			);
			return Promise.resolve(true);
		};

		try {
			BROWSER.contextMenus.onClicked.triggerClick({
				menuItemId: CXM_OPEN_OTHER_ORG,
				linkText: "Open account",
				pageUrl:
					"https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
				linkUrl:
					"https://acme.lightning.force.com/lightning/setup/ObjectManager/home",
			}, {
				id: 1,
				url: "https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
				active: true,
				currentWindow: true,
			});

			BROWSER.contextMenus.onClicked.triggerClick({
				menuItemId: "unknown-context-menu",
				linkText: "Unknown",
				pageUrl:
					"https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
			}, {
				id: 1,
				url: "https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
				active: true,
				currentWindow: true,
			});

			BROWSER.contextMenus.onClicked.triggerClick({
				menuItemId: CXM_EXPORT_TABS,
				pageUrl:
					"https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
			}, {
				id: 1,
				url: "https://acme.lightning.force.com/lightning/setup/SetupOneHome/home",
				active: true,
				currentWindow: true,
			});

			await waitForCondition(() => sentMessages.length >= 2);
			assert(
				sentMessages.some((message) =>
					message.linkTabLabel === "Open account"
				),
			);
			assert(
				sentMessages.some((message) =>
					`${message.message ?? ""}`.includes("unknown context menu")
				),
			);
		} finally {
			BROWSER.tabs.sendMessage = originalSendMessage;
		}
	},
});

Deno.test.afterEach(async () => {
	await setActiveTab("https://mock1.url");
	await BROWSER.contextMenus.removeAll();
	resetContextMenuStateForTests();
});
