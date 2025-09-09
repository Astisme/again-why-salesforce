import { assert } from "https://deno.land/std@0.200.0/testing/asserts.ts";
import {
	checkAddRemoveContextMenus,
	getIntervalCxm,
} from "/background/context-menus.js";

Deno.test("should create and notify when URL matches pattern", async () => {
	let called = false;
	globalThis.BROWSER.tabs.setMockBrowserTabs([{
		id: 0,
		url: "https://mock.my.salesforce-setup.com/lightning/setup/mock",
		active: true,
		currentWindow: true,
	}, {
		id: 1,
		url: "https://mock1.url",
		active: false,
		currentWindow: true,
	}]);
	await checkAddRemoveContextMenus("testAction", () => {
		called = true;
	});
	assert(called, "the callback should be called");
	clearInterval(getIntervalCxm());
});
