import { test } from "#test";
import { mockBrowser } from "../../mocks.test.ts";
import { assertEquals, assertFalse, assertRejects } from "#test";
import { stub } from "#test";
import { bg_getStorage } from "../../../src/background/storage.js";
import { bg_getSalesforceLanguage } from "../../../src/background/salesforce-language.js";
import { LOCALE_KEY } from "../../../src/core/constants.js";
import { sendExtensionMessage } from "../../../src/core/functions.js";
import { waitForNextTask } from "../../async.test.ts";

test("storage bridge propagates rejected browser reads", async () => {
	using get = stub(mockBrowser.storage.sync, "get", () =>
		Promise.reject(new Error("storage-read-failed")),
	);

	await assertRejects(() => bg_getStorage(), Error, "storage-read-failed");
	assertEquals(get.calls.length, 1);
});

test("storage callback bridge returns an awaitable result", async () => {
	using get = stub(mockBrowser.storage.sync, "get", () =>
		Promise.resolve({ [LOCALE_KEY]: "en" }),
	);
	let callbackLanguage = "";

	const result = await bg_getStorage((language: string) => {
		callbackLanguage = language;
	}, LOCALE_KEY);

	assertEquals(callbackLanguage, "en");
	assertEquals(result, { [LOCALE_KEY]: "en" });
	assertEquals(get.calls.length, 1);
});

test("storage callback bridge propagates callback failures", async () => {
	using get = stub(mockBrowser.storage.sync, "get", () =>
		Promise.resolve({ [LOCALE_KEY]: "en" }),
	);

	await assertRejects(
		() =>
			bg_getStorage(() => {
				throw new Error("storage-callback-failed");
			}, LOCALE_KEY),
		Error,
		"storage-callback-failed",
	);
	assertEquals(get.calls.length, 1);
});

test("message bridge propagates rejected browser sends without a callback", async () => {
	using send = stub(mockBrowser.runtime, "sendMessage", () =>
		Promise.reject(new Error("message-send-failed")),
	);

	await assertRejects(
		() => sendExtensionMessage({ what: "echo" }),
		Error,
		"message-send-failed",
	);
	assertEquals(send.calls.length, 1);
});

test("Salesforce language waits for persistence and callback completion", async () => {
	mockBrowser.tabs.setMockBrowserTabs([
		{
			id: 0,
			url: "https://mycustomorg--sandbox.lightning.force.com",
			active: true,
			currentWindow: true,
		},
	]);
	mockBrowser.cookies.setMockCookies([
		{
			domain: "mycustomorg--sandbox.my.salesforce.com",
			name: "sid",
			value: "test-session",
		},
	]);
	const stored = Promise.withResolvers<boolean>();
	const started = Promise.withResolvers<void>();
	using set = stub(mockBrowser.storage.sync, "set", () => {
		started.resolve();
		return stored.promise;
	});
	let callbackLanguage = "";
	let settled = false;
	const pending = bg_getSalesforceLanguage((language: string) => {
		callbackLanguage = language;
	}).then(
		(language) => {
			settled = true;
			return language;
		},
		(error: Error) => {
			throw error;
		},
	);

	try {
		await started.promise;
		await waitForNextTask();
		assertFalse(settled);
		assertEquals(callbackLanguage, "");
		stored.resolve(true);
		assertEquals(await pending, "sf-lang-en");
		assertEquals(callbackLanguage, "sf-lang-en");
		assertEquals(set.calls[0].args, [{ [LOCALE_KEY]: "sf-lang-en" }]);
	} finally {
		stored.resolve(true);
		await pending;
	}
});
