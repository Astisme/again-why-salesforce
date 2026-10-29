import { afterEach, expect, test as bunTest } from "bun:test";
import {
	assert,
	assertEquals,
	assertExists,
	assertFalse,
	assertRejects,
	assertStrictEquals,
	assertStringIncludes,
	assertThrows,
	stub,
	test,
} from "./test-helpers.ts";

test({
	name: "test adapter supports object definitions and sequential steps",
	fn: async (context) => {
		const steps: number[] = [];
		await context.step("first", () => {
			steps.push(1);
		});
		await context.step("second", () => {
			steps.push(2);
		});
		assertEquals(steps, [1, 2]);
	},
});

bunTest(
	"test adapter rejects missing callbacks and exposes native cleanup",
	() => {
		expect(() => test("missing callback")).toThrow(
			"Test callback is required",
		);
		assertStrictEquals(test.afterEach, afterEach);
	},
);

bunTest("assertion helpers accept valid values and reject mismatches", () => {
	const object = { value: 1 };
	assert(true);
	assertEquals(object, { value: 1 });
	assertStrictEquals(object, object);
	assertExists(0);
	assertFalse(false);
	assertStringIncludes("message text", "text");
	expect(() => assert(false)).toThrow();
	expect(() => assertEquals(1, 2)).toThrow();
	expect(() => assertStrictEquals({}, {})).toThrow();
	expect(() => assertExists(null)).toThrow("Expected value to exist");
	expect(() => assertExists(undefined, "missing")).toThrow("missing");
	expect(() => assertFalse(true)).toThrow();
	expect(() => assertStringIncludes("text", "missing")).toThrow();
	expect(() => assertStringIncludes("text", "missing", "custom")).toThrow(
		"custom",
	);
});

bunTest("assertThrows checks error types, messages and missing throws", () => {
	const error = new TypeError("expected message");
	assertStrictEquals(
		assertThrows(() => {
			throw error;
		}),
		error,
	);
	assertStrictEquals(
		assertThrows(
			() => {
				throw error;
			},
			TypeError,
			"message",
		),
		error,
	);
	expect(() => assertThrows(() => {})).toThrow("Expected callback to throw");
	expect(() =>
		assertThrows(() => {
			throw "not an error";
		}),
	).toThrow("Expected callback to throw an Error");
	expect(() =>
		assertThrows(() => {
			throw error;
		}, RangeError),
	).toThrow("Expected RangeError");
	expect(() =>
		assertThrows(
			() => {
				throw error;
			},
			TypeError,
			"missing",
		),
	).toThrow();
});

bunTest(
	"assertRejects supports callbacks, promises and non-Error rejections",
	async () => {
		const error = new TypeError("expected message");
		assertStrictEquals(
			await assertRejects(async () => {
				throw error;
			}),
			error,
		);
		assertStrictEquals(
			await assertRejects(Promise.reject(error), TypeError, "message"),
			error,
		);
		assertEquals(
			await assertRejects(Promise.reject("rejected value")),
			"rejected value",
		);
		await expect(assertRejects(async () => {})).rejects.toThrow(
			"Expected action to reject",
		);
		await expect(
			assertRejects(Promise.reject(error), RangeError),
		).rejects.toThrow("Expected RangeError");
		await expect(
			assertRejects(Promise.reject("text"), undefined, "text"),
		).rejects.toThrow("Expected rejection with an Error");
		await expect(
			assertRejects(Promise.reject(error), TypeError, "missing"),
		).rejects.toThrow();
	},
);

bunTest("stub records arguments and restores methods idempotently", () => {
	const target = {
		method: (value: number) => value + 1,
	};
	const original = target.method;
	const replacement = stub(target, "method", (value: number) => value * 2);
	assertEquals(target.method(3), 6);
	assertEquals(replacement.calls, [{ args: [3] }]);
	replacement.restore();
	replacement[Symbol.dispose]();
	assertStrictEquals(target.method, original);
	assertEquals(target.method(3), 4);
});
