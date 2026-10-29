import { test } from "#test";
import { assertEquals, assertThrows } from "#test";
import {
	formatLocaleMessageResult,
	getMessagesFilePath,
	getOriginalMessage,
	main,
	normalizeMessageKey,
	readLocaleFile,
	renderLocaleMessage,
} from "../../bin/render-locale-message.ts";

const localeFile = {
	action: {
		message: "Pick $thing.",
	},
	thing: {
		message: "$prefix Tab",
	},
	prefix: {
		message: "Pinned",
	},
};

test("getMessagesFilePath builds locale messages path", () => {
	assertEquals(getMessagesFilePath("bg"), "src/_locales/bg/messages.json");
});

test("getMessagesFilePath accepts custom locale directory", () => {
	assertEquals(
		getMessagesFilePath("bg", "fixtures/locales"),
		"fixtures/locales/bg/messages.json",
	);
});

test("normalizeMessageKey removes leading parameter marker", () => {
	assertEquals(normalizeMessageKey("$action"), "action");
});

test("normalizeMessageKey keeps plain key", () => {
	assertEquals(normalizeMessageKey("action"), "action");
});

test("getOriginalMessage returns raw message", () => {
	assertEquals(getOriginalMessage(localeFile, "action"), "Pick $thing.");
});

test("getOriginalMessage accepts parameter key", () => {
	assertEquals(getOriginalMessage(localeFile, "$action"), "Pick $thing.");
});

test("getOriginalMessage rejects missing key", () => {
	const error = assertThrows(
		() => getOriginalMessage(localeFile, "missing"),
		Error,
		"Missing message key: missing",
	);

	assertEquals(error.message, "Missing message key: missing");
});

test("renderLocaleMessage replaces nested parameters", () => {
	assertEquals(renderLocaleMessage(localeFile, "action"), "Pick Pinned Tab.");
});

test("renderLocaleMessage accepts parameter key", () => {
	assertEquals(
		renderLocaleMessage(localeFile, "$action"),
		"Pick Pinned Tab.",
	);
});

test("renderLocaleMessage rejects circular parameters", () => {
	const circularLocaleFile = {
		first: {
			message: "$second",
		},
		second: {
			message: "$first",
		},
	};
	const error = assertThrows(
		() => renderLocaleMessage(circularLocaleFile, "first"),
		Error,
		"Circular message reference: first",
	);

	assertEquals(error.message, "Circular message reference: first");
});

test("formatLocaleMessageResult prints original and result", () => {
	assertEquals(
		formatLocaleMessageResult(localeFile, "action"),
		"original: Pick $thing.\nresult: Pick Pinned Tab.",
	);
});

test("readLocaleFile reads project locale messages", async () => {
	const bgLocaleFile = await readLocaleFile("bg");

	assertEquals(bgLocaleFile.tabs.message, "Tab");
});

test("main prints original and rendered locale message", async () => {
	const logs: string[] = [];
	const errors: string[] = [];
	const exitCode = await main(
		["bg", "import_pinned_tabs"],
		(message) => logs.push(message),
		(message) => errors.push(message),
	);

	assertEquals(exitCode, 0);
	assertEquals(errors, []);
	assertEquals(logs, [
		"original: Импортиране броя на закачените $tabs.\nresult: Импортиране броя на закачените Tab.",
	]);
});

test("main prints usage for invalid args", async () => {
	const logs: string[] = [];
	const errors: string[] = [];
	const exitCode = await main(
		["bg"],
		(message) => logs.push(message),
		(message) => errors.push(message),
	);

	assertEquals(exitCode, 1);
	assertEquals(logs, []);
	assertEquals(errors, [
		"Usage: bun run bin/render-locale-message.ts <language> <key>",
	]);
});
