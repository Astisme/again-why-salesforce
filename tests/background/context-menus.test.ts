import "../mocks.ts";
import {
	assert,
	assertEquals,
	assertStringIncludes,
} from "@std/testing/asserts";
import {
	checkAddRemoveContextMenus,
	getIntervalCxm,
	refreshContextMenus,
} from "/background/context-menus.js";
import { BROWSER, CMD_SAVE_AS_TAB, CXM_PAGE_SAVE_TAB } from "/constants.js";

clearInterval(getIntervalCxm());

async function setActiveTab(url: string) {
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
	name: "should create and notify when URL matches pattern",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		let called = false;
		await setActiveTab(
			"https://mock.my.salesforce-setup.com/lightning/setup/mock",
		);
		await checkAddRemoveContextMenus("testAction", () => {
			called = true;
		});
		assert(called, "the callback should be called");
		await setActiveTab("https://mock1.url");
		await checkAddRemoveContextMenus("cleanup");
	},
});

Deno.test({
	name: "should refresh shortcut labels without waiting for tab activation",
	sanitizeOps: false,
	sanitizeResources: false,
	fn: async () => {
		await setActiveTab(
			"https://mock.my.salesforce-setup.com/lightning/setup/mock",
		);
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

		await setActiveTab("https://mock1.url");
		await checkAddRemoveContextMenus("cleanup");
		assertEquals(BROWSER.contextMenus._contextMenus.length, 0);
	},
});

Deno.test.afterEach(async () => {
	await setActiveTab("https://mock1.url");
	await checkAddRemoveContextMenus("cleanup");
	clearInterval(getIntervalCxm());
});
