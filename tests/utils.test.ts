import {
	assert,
	assertRejects,
} from "https://deno.land/std/testing/asserts.ts";

import {
	bg_getCurrentBrowserTab,
	bg_notify,
	checkForUpdates,
	checkLaunchExport,
} from "/background/utils.js";

Deno.test("bg_getCurrentBrowserTab behavior", async (t) => {
	await t.step("rejects if no tab found after retries", async () => {
		await assertRejects(
			() => bg_getCurrentBrowserTab(),
			Error,
			"error_no_browser_tab",
		);
	});

	BROWSER.tabs.setMockBrowserTabs([{
		id: 0,
		url: "https://mock0.url",
		active: true,
		currentWindow: true,
	}, {
		id: 1,
		url: "https://mock1.url",
		active: false,
		currentWindow: true,
	}]);

	await t.step("resolves with active tab (promise)", async () => {
		const tab = await bg_getCurrentBrowserTab();
		assert(typeof tab.id === "number", "Tab id should be a number");
		assert(typeof tab.url === "string", "Tab url should be a string");
		assert(tab.active);
		assert(tab.currentWindow);
	});

	await t.step("invokes callback with active tab", () => {
		return new Promise<void>((resolve, reject) => {
			bg_getCurrentBrowserTab((tab) => {
				try {
					assert(typeof tab.id === "number");
					assert(typeof tab.url === "string");
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});
	});
});

Deno.test("bg_notify behavior", async (t) => {
	await t.step("sends message to current tab without throwing", async () => {
		await bg_notify({ test: true });
	});

	await t.step("throws if message is null", () => {
		assertRejects(
			async () => await bg_notify(),
			Error,
			"error_no_message",
		);
	});
});

Deno.test("checkLaunchExport behavior", async (t) => {
	await t.step("does not throw when downloads available", () => {
		checkLaunchExport();
	});

	await t.step("accepts an explicit tabs array parameter", () => {
		const dummyTabs = [{ id: 1, url: "https://foo.bar" }];
		checkLaunchExport(dummyTabs as any);
	});
});

Deno.test("checkForUpdates idempotency", async (t) => {
	await t.step("completes gracefully on first run", async () => {
		await checkForUpdates();
	});

	await t.step("skips update within a week on second run", async () => {
		await checkForUpdates();
	});
});
