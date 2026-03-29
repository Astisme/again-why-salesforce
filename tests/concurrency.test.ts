import {
	type InternalMessage,
	mockBrowser,
	mockStorage,
} from "./mocks.test.ts";
import { assert, assertEquals } from "@std/testing/asserts";
import { WHY_KEY } from "/core/constants.js";
import { ensureAllTabsAvailability, TabContainer } from "/core/tabContainer.js";

type SendMessage = typeof mockBrowser.runtime.sendMessage;

interface GetMessage {
	what: string;
	key: string;
}

Deno.test("TabContainer - Concurrency Race", async (t) => {
	await t.step("multiple simultaneous create() calls", async () => {
		mockStorage[WHY_KEY] = [
			{ label: "Tab 1", url: "url1" },
			{ label: "Tab 2", url: "url2" },
		];
		TabContainer._clear();
		const originalSendMessage = mockBrowser.runtime.sendMessage;
		let callCount = 0;
		mockBrowser.runtime.sendMessage = (
			message: InternalMessage,
			callback?: (response: unknown) => void,
		) => {
			if (message.what === "get" && message.key === WHY_KEY) {
				callCount++;
				return new Promise((resolve) => {
					setTimeout(() => {
						const response = mockStorage[WHY_KEY];
						if (callback) callback(response);
						resolve(response);
					}, 50);
				});
			}
			return originalSendMessage(message, callback);
		};
		try {
			const p1 = TabContainer.create();
			const p2 = TabContainer.create();
			const p3 = TabContainer.create();
			const [c1, c2, c3] = await Promise.all([p1, p2, p3]);
			assert(c1 === c2);
			assert(c1 === c3);
			assertEquals(c1.length, 2);
			assertEquals(c1[0].label, "Tab 1");
			assertEquals(callCount, 1, "Storage should be fetched only once");
		} finally {
			mockBrowser.runtime.sendMessage = originalSendMessage;
			await TabContainer._reset();
		}
	});
	await t.step(
		"ensureAllTabsAvailability during initialization",
		async () => {
			mockStorage[WHY_KEY] = [
				{ label: "Tab 1", url: "url1" },
			];
			TabContainer._clear();
			const originalSendMessage = mockBrowser.runtime.sendMessage;
			let resolveStorage!: () => void;
			const storagePromise = new Promise<void>((res) =>
				resolveStorage = res
			);
			mockBrowser.runtime.sendMessage = (
				message: InternalMessage,
				callback?: (response: unknown) => void,
			) => {
				if (message.what === "get" && message.key === WHY_KEY) {
					return storagePromise.then(() => {
						const response = mockStorage[WHY_KEY];
						if (callback) callback(response);
						return response;
					});
				}
				return originalSendMessage(message, callback);
			};
			try {
				const createPromise = TabContainer.create();
				const availabilityPromise = ensureAllTabsAvailability();
				resolveStorage();
				const [c1, c2] = await Promise.all([
					createPromise,
					availabilityPromise,
				]);
				assert(c1 === c2);
				assertEquals(c1.length, 1);
			} finally {
				mockBrowser.runtime.sendMessage = originalSendMessage;
				await TabContainer._reset();
			}
		},
	);
});
