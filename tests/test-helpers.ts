import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach as bunAfterEach, test as bunTest } from "bun:test";

interface TestContext {
	step(name: string, callback: () => void | Promise<void>): Promise<void>;
}

type TestCallback = (context: TestContext) => void | Promise<void>;

interface TestDefinition {
	name: string;
	fn: TestCallback;
	[key: string]: unknown;
}

/**
 * Registers a test and runs legacy sequential steps inline.
 *
 * @param {string | TestDefinition} name Test name or definition.
 * @param {TestCallback} [callback] Test callback for string-name form.
 */
export function test(
	name: string | TestDefinition,
	callback?: TestCallback,
): void {
	const testName = typeof name === "string" ? name : name.name;
	const testCallback = typeof name === "string" ? callback : name.fn;
	if (testCallback == null) {
		throw new TypeError("Test callback is required");
	}
	bunTest(
		testName,
		async () => {
			await testCallback({
				step: async (_stepName, stepCallback) => {
					await stepCallback();
				},
			});
		},
		30_000,
	);
}

export namespace test {
	export const afterEach = bunAfterEach;
}

/**
 * Asserts deep equality.
 *
 * @param {unknown} actual Actual value.
 * @param {unknown} expected Expected value.
 * @param {string} [message] Failure message.
 */
export function assertEquals(
	actual: unknown,
	expected: unknown,
	message?: string,
): void {
	deepStrictEqual(actual, expected, message);
}

/**
 * Asserts strict identity.
 *
 * @param {unknown} actual Actual value.
 * @param {unknown} expected Expected value.
 * @param {string} [message] Failure message.
 */
export function assertStrictEquals(
	actual: unknown,
	expected: unknown,
	message?: string,
): void {
	strictEqual(actual, expected, message);
}

/**
 * Asserts truthiness.
 *
 * @param {unknown} value Value to check.
 * @param {string} [message] Failure message.
 */
export function assert(value: unknown, message?: string): asserts value {
	ok(value, message);
}

/**
 * Asserts value is neither null nor undefined.
 *
 * @param {unknown} value Value to check.
 * @param {string} [message] Failure message.
 */
export function assertExists(value: unknown, message?: string): asserts value {
	assert(value != null, message ?? "Expected value to exist");
}

/**
 * Asserts value is false.
 *
 * @param {unknown} value Value to check.
 * @param {string} [message] Failure message.
 */
export function assertFalse(value: unknown, message?: string): void {
	strictEqual(value, false, message);
}

/**
 * Asserts string contains expected substring.
 *
 * @param {string} value Actual string.
 * @param {string} expected Expected substring.
 * @param {string} [message] Failure message.
 */
export function assertStringIncludes(
	value: string,
	expected: string,
	message?: string,
): void {
	ok(
		value.includes(expected),
		message ?? `Expected ${value} to include ${expected}`,
	);
}

/**
 * Asserts callback throws and returns its error.
 *
 * @param {() => unknown} callback Callback to execute.
 * @param {new (...args: never[]) => Error} [errorClass] Expected error class.
 * @param {string} [messageIncludes] Expected error-message substring.
 * @return {Error} Thrown error.
 */
export function assertThrows(
	callback: () => unknown,
	errorClass?: new (...args: never[]) => Error,
	messageIncludes?: string,
): Error {
	try {
		callback();
	} catch (error) {
		assert(error instanceof Error, "Expected callback to throw an Error");
		assertExpectedError(error, errorClass, messageIncludes);
		return error;
	}
	throw new Error("Expected callback to throw");
}

/**
 * Asserts promise rejects and returns its rejection value.
 *
 * @param {(() => unknown) | Promise<unknown>} action Action to execute.
 * @param {new (...args: never[]) => Error} [errorClass] Expected error class.
 * @param {string} [messageIncludes] Expected error-message substring.
 * @return {Promise<unknown>} Rejected value.
 */
export async function assertRejects(
	action: (() => unknown) | Promise<unknown>,
	errorClass?: new (...args: never[]) => Error,
	messageIncludes?: string,
): Promise<unknown> {
	try {
		await (typeof action === "function" ? action() : action);
	} catch (error) {
		if (errorClass != null) {
			assert(error instanceof errorClass, `Expected ${errorClass.name}`);
		}
		if (messageIncludes != null) {
			assert(error instanceof Error, "Expected rejection with an Error");
			assertStringIncludes(error.message, messageIncludes);
		}
		return error;
	}
	throw new Error("Expected action to reject");
}

/**
 * Checks expected error class and message.
 *
 * @param {Error} error Thrown error.
 * @param {new (...args: never[]) => Error} [errorClass] Expected error class.
 * @param {string} [messageIncludes] Expected message substring.
 */
function assertExpectedError(
	error: Error,
	errorClass?: new (...args: never[]) => Error,
	messageIncludes?: string,
): void {
	if (errorClass != null) {
		assert(error instanceof errorClass, `Expected ${errorClass.name}`);
	}
	if (messageIncludes != null) {
		assertStringIncludes(error.message, messageIncludes);
	}
}

interface Stub<Arguments extends unknown[], Result> {
	readonly calls: { args: Arguments }[];
	restore(): void;
	[Symbol.dispose](): void;
}

/**
 * Replaces object method with tracked implementation until restored.
 *
 * @param {Target} target Object containing method.
 * @param {Key} key Method name.
 * @param {(...args: Arguments) => Result} replacement Replacement method.
 * @return {Stub<Arguments, Result>} Method stub and call history.
 */
export function stub<
	Arguments extends unknown[],
	Result,
	Key extends keyof Target,
	Target extends Record<Key, (...args: Arguments) => Result>,
>(
	target: Target,
	key: Key,
	replacement: (...args: Arguments) => Result,
): Stub<Arguments, Result> {
	const original = target[key];
	const calls: { args: Arguments }[] = [];
	let restored = false;
	target[key] = ((...args: Arguments) => {
		calls.push({ args });
		return replacement(...args);
	}) as Target[Key];
	const restore = () => {
		if (!restored) {
			target[key] = original;
			restored = true;
		}
	};
	return {
		calls,
		restore,
		[Symbol.dispose]: restore,
	};
}
