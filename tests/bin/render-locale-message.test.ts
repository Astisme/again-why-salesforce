import { assertEquals, assertThrows } from "@std/testing/asserts";
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

Deno.test("getMessagesFilePath builds locale messages path", () => {
	assertEquals(
		getMessagesFilePath("bg"),
		"src/_locales/bg/messages.json",
	);
});

Deno.test("getMessagesFilePath accepts custom locale directory", () => {
	assertEquals(
		getMessagesFilePath("bg", "fixtures/locales"),
		"fixtures/locales/bg/messages.json",
	);
});

Deno.test("normalizeMessageKey removes leading parameter marker", () => {
	assertEquals(normalizeMessageKey("$action"), "action");
});

Deno.test("normalizeMessageKey keeps plain key", () => {
	assertEquals(normalizeMessageKey("action"), "action");
});

Deno.test("getOriginalMessage returns raw message", () => {
	assertEquals(getOriginalMessage(localeFile, "action"), "Pick $thing.");
});

Deno.test("getOriginalMessage accepts parameter key", () => {
	assertEquals(getOriginalMessage(localeFile, "$action"), "Pick $thing.");
});

Deno.test("getOriginalMessage rejects missing key", () => {
	const error = assertThrows(
		() => getOriginalMessage(localeFile, "missing"),
		Error,
		"Missing message key: missing",
	);

	assertEquals(error.message, "Missing message key: missing");
});

Deno.test("renderLocaleMessage replaces nested parameters", () => {
	assertEquals(renderLocaleMessage(localeFile, "action"), "Pick Pinned Tab.");
});

Deno.test("renderLocaleMessage accepts parameter key", () => {
	assertEquals(
		renderLocaleMessage(localeFile, "$action"),
		"Pick Pinned Tab.",
	);
});

Deno.test("renderLocaleMessage rejects circular parameters", () => {
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

Deno.test("formatLocaleMessageResult prints original and result", () => {
	assertEquals(
		formatLocaleMessageResult(localeFile, "action"),
		"original: Pick $thing.\nresult: Pick Pinned Tab.",
	);
});

Deno.test("readLocaleFile reads project locale messages", async () => {
	const bgLocaleFile = await readLocaleFile("bg");

	assertEquals(bgLocaleFile.tabs.message, "Tab");
});

Deno.test("main prints original and rendered locale message", async () => {
	const logs: string[] = [];
	const errors: string[] = [];
	const exitCode = await main(
		["bg", "import_pinned_tabs"],
		(message) => logs.push(message),
		(message) => errors.push(message),
	);

	assertEquals(exitCode, 0);
	assertEquals(errors, []);
	assertEquals(
		logs,
		[
			"original: Импортиране броя на закачените $tabs.\nresult: Импортиране броя на закачените Tab.",
		],
	);
});

Deno.test("main prints usage for invalid args", async () => {
	const logs: string[] = [];
	const errors: string[] = [];
	const exitCode = await main(
		["bg"],
		(message) => logs.push(message),
		(message) => errors.push(message),
	);

	assertEquals(exitCode, 1);
	assertEquals(logs, []);
	assertEquals(
		errors,
		[
			"Usage: deno run --allow-read bin/render-locale-message.ts <language> <key>",
		],
	);
});
