import { assert, assertEquals } from "@std/testing/asserts";
import { mockStorage } from "../mocks.test.ts";
import {
	EXTENSION_LAST_ACTIVE_DAY,
	PREVENT_ANALYTICS,
	SETTINGS_KEY,
} from "/constants.js";
import { getTodayDateKey } from "/functions.js";
import { executeOncePerDay } from "/salesforce/once-a-day.js";

const todayStorageKey = "again-why-salesforce-today";

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

/**
 * Replaces the global sessionStorage with a test double.
 *
 * @param {Storage} storage - the storage implementation to expose globally
 */
function setGlobalSessionStorage(storage: Storage) {
	Object.defineProperty(globalThis, "sessionStorage", {
		configurable: true,
		value: storage,
		writable: true,
	});
}

Deno.test("executeOncePerDay runs the first time but not the second", async () => {
	const originalSettings = structuredClone(mockStorage[SETTINGS_KEY]);
	const originalSessionStorage = globalThis.sessionStorage;
	const sessionStorageMock = createSessionStorageMock();
	const runtimeRecorder = installRuntimeRecorder();
	const today = getTodayDateKey();
	try {
		setGlobalSessionStorage(sessionStorageMock as Storage);
		mockStorage[SETTINGS_KEY] = [{
			id: PREVENT_ANALYTICS,
			enabled: true,
		}];

		await executeOncePerDay();
		await flushAsyncWork();
		const firstCallMessageCount = runtimeRecorder.messages.length;
		await executeOncePerDay();
		await flushAsyncWork();
		const secondCallMessageCount = runtimeRecorder.messages.length;

		assert(firstCallMessageCount > 0);
		assertEquals(secondCallMessageCount, firstCallMessageCount);
		assertEquals(sessionStorageMock.getItem(todayStorageKey), today);
		assertEquals(
			mockStorage[SETTINGS_KEY].find((setting) =>
				setting.id === EXTENSION_LAST_ACTIVE_DAY
			)?.enabled,
			today,
		);
	} finally {
		runtimeRecorder.restore();
		mockStorage[SETTINGS_KEY] = originalSettings;
		setGlobalSessionStorage(originalSessionStorage);
	}
});

Deno.test("executeOncePerDay skips persisted same-day calls and backfills sessionStorage", async () => {
	const originalSettings = structuredClone(mockStorage[SETTINGS_KEY]);
	const originalSessionStorage = globalThis.sessionStorage;
	const sessionStorageMock = createSessionStorageMock();
	const runtimeRecorder = installRuntimeRecorder();
	const today = getTodayDateKey();
	try {
		setGlobalSessionStorage(sessionStorageMock as Storage);
		mockStorage[SETTINGS_KEY] = [
			{ id: PREVENT_ANALYTICS, enabled: false },
			{ id: EXTENSION_LAST_ACTIVE_DAY, enabled: today },
		];

		await executeOncePerDay();
		await flushAsyncWork();

		assertEquals(runtimeRecorder.messages.length, 1);
		assertEquals(runtimeRecorder.messages[0]?.what, "get-settings");
		assertEquals(sessionStorageMock.getItem(todayStorageKey), today);
	} finally {
		runtimeRecorder.restore();
		mockStorage[SETTINGS_KEY] = originalSettings;
		setGlobalSessionStorage(originalSessionStorage);
	}
});
