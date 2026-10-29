import { test } from "#test";
import { assertEquals, assertThrows } from "#test";
import { assertBuildSucceeded } from "../../bin/build-releases-runtime.ts";

test("assertBuildSucceeded accepts zero exit code", () => {
	assertEquals(
		assertBuildSucceeded({ browser: "safari", code: 0 }),
		undefined,
	);
});

test("assertBuildSucceeded rejects nonzero exit code", () => {
	const error = assertThrows(
		() => assertBuildSucceeded({ browser: "safari", code: 65 }),
		Error,
		"safari build failed with exit code 65",
	);

	assertEquals(error.message, "safari build failed with exit code 65");
});
