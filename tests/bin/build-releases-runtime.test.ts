import { assertEquals, assertThrows } from "@std/testing/asserts";
import { assertBuildSucceeded } from "../../bin/build-releases-runtime.ts";

Deno.test("assertBuildSucceeded accepts zero exit code", () => {
	assertEquals(
		assertBuildSucceeded({ browser: "safari", code: 0 }),
		undefined,
	);
});

Deno.test("assertBuildSucceeded rejects nonzero exit code", () => {
	const error = assertThrows(
		() => assertBuildSucceeded({ browser: "safari", code: 65 }),
		Error,
		"safari build failed with exit code 65",
	);

	assertEquals(error.message, "safari build failed with exit code 65");
});
