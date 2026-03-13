import "../mocks.ts";
import {
	assert,
	assertEquals,
	assertStringIncludes,
} from "@std/testing/asserts";
import {
	checkAddRemoveContextMenus,
	refreshContextMenus,
	resetContextMenuStateForTests,
} from "/background/context-menus.js";
import { BROWSER, CMD_SAVE_AS_TAB, CXM_PAGE_SAVE_TAB } from "/constants.js";

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
		assertStringIncludes(matchingMenus[0].title, "(Alt+Shift+P)");
	},
});

Deno.test.afterEach(async () => {
	await setActiveTab("https://mock1.url");
	await BROWSER.contextMenus.removeAll();
	resetContextMenuStateForTests();
});
