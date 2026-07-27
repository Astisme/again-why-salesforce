import { assertEquals, assertRejects } from "@std/testing/asserts";
import {
	buildInvalidVariablesReport,
	getInvalidVariableEntries,
	getMessageVariables,
	readLocaleFile,
} from "../../bin/find-invalid-variables.ts";

Deno.test("getMessageVariables accepts punctuation and Japanese spacing", () => {
	assertEquals(getMessageVariables("$extension_label?"), [
		"extension_label",
	]);
	assertEquals(
		getMessageVariables("$extension_label の新しいバージョン"),
		["extension_label"],
	);
	assertEquals(getMessageVariables("$account,$tab."), [
		"account",
		"tab",
	]);
});

Deno.test("getInvalidVariableEntries reports only unknown variables", () => {
	const allowedVariables = new Set([
		"account",
		"extension_label",
		"tab",
	]);
	const result = getInvalidVariableEntries(
		{
			ok_punctuation: {
				message: "$extension_label?",
			},
			ok_japanese: {
				message: "$account の $tab",
			},
			bad_variable: {
				message: "$missing_key!",
			},
		},
		allowedVariables,
	);

	assertEquals(result, {
		bad_variable: {
			message: "$missing_key!",
			unknownVariables: ["missing_key"],
		},
	});
});

Deno.test("buildInvalidVariablesReport accepts real Japanese locale variables", async () => {
	const report = await buildInvalidVariablesReport();

	assertEquals(report.ja, undefined);
});

Deno.test("readLocaleFile rejects missing files", async () => {
	await assertRejects(
		() => readLocaleFile("src/_locales/missing/messages.json"),
		Error,
	);
});
