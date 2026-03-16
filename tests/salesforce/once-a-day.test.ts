import { assert, assertEquals } from "@std/testing/asserts";
import { mockStorage } from "../mocks.ts";
import { PREVENT_ANALYTICS, SETTINGS_KEY } from "/constants.js";
import { executeOncePerDay, getTodayDateKey } from "/salesforce/once-a-day.js";

/**
 * Creates a minimal in-memory sessionStorage mock for tests.
 *
 * @return {{
 *   getItem: (key: string) => string | null,
 *   setItem: (key: string, value: string) => void,
 *   clear: () => void
 * }} A sessionStorage-compatible object.
 */
function createSessionStorageMock() {
	const values = new Map<string, string>();
	return {
		getItem(key: string) {
			return values.get(key) ?? null;
		},
		setItem(key: string, value: string) {
			values.set(key, value);
		},
		clear() {
			values.clear();
		},
	};
}

/**
 * Wraps the runtime mock so tests can inspect outbound messages.
 *
 * @return {{
 *   messages: { what?: string }[],
 *   restore: () => void
 * }} Recorded messages and a cleanup hook.
 */
function installRuntimeRecorder() {
	const runtime = globalThis.BROWSER.runtime;
	const originalSendMessage = runtime.sendMessage.bind(runtime);
	const messages: { what?: string }[] = [];
	runtime.sendMessage = (message, callback) => {
		messages.push(structuredClone(message));
		return originalSendMessage(message, callback);
	};
	return {
		messages,
		restore() {
			runtime.sendMessage = originalSendMessage;
		},
	};
}

/**
 * Waits for queued microtasks to settle before assertions.
 *
 * @return {Promise<void>} A promise that resolves on the next macrotask.
 */
function flushAsyncWork() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

Deno.test("getTodayDateKey formats the local calendar day", () => {
	assertEquals(
		getTodayDateKey(new Date(2026, 2, 12, 0, 30, 0, 0)),
		"2026-03-12",
	);
	assertEquals(
		getTodayDateKey(new Date(2026, 10, 2, 23, 59, 59, 999)),
		"2026-11-02",
	);
});

Deno.test("executeOncePerDay runs the first time but not the second", async () => {
	const originalSettings = structuredClone(mockStorage[SETTINGS_KEY]);
	const originalSessionStorage = globalThis.sessionStorage;
	const sessionStorageMock = createSessionStorageMock();
	const runtimeRecorder = installRuntimeRecorder();
	try {
		globalThis.sessionStorage = sessionStorageMock as Storage;
		mockStorage[SETTINGS_KEY] = [{
			id: PREVENT_ANALYTICS,
			enabled: true,
		}];

		executeOncePerDay();
		await flushAsyncWork();
		const firstCallMessageCount = runtimeRecorder.messages.length;
		executeOncePerDay();
		await flushAsyncWork();
		const secondCallMessageCount = runtimeRecorder.messages.length;

		assert(firstCallMessageCount > 0);
		assertEquals(secondCallMessageCount, firstCallMessageCount);
	} finally {
		runtimeRecorder.restore();
		mockStorage[SETTINGS_KEY] = originalSettings;
		globalThis.sessionStorage = originalSessionStorage;
	}
});
