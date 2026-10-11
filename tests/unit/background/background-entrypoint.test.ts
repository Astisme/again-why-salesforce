import "../../mocks.test.ts";
import { assert } from "@std/testing/asserts";
import { BROWSER } from "../../../src/core/constants.js";

/**
 * Verifies production entrypoint starts background listeners.
 *
 * @return {Promise<void>}
 */
async function testBackgroundEntrypoint() {
	assert(BROWSER.runtime.onMessage._listeners.length === 0);

	await import("../../../src/entrypoints/background.js");

	assert(BROWSER.runtime.onMessage._listeners.length > 0);
}

Deno.test("background entrypoint starts extension listeners", testBackgroundEntrypoint);
