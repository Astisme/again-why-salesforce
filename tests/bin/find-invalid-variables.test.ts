import { test } from "#test";
import fs from "node:fs/promises";
import type { Stats } from "node:fs";
import { assertEquals, assertRejects } from "#test";
import { stub } from "#test";
import {
	buildInvalidVariablesReport,
	fileExists,
	getInvalidVariableEntries,
	getLocales,
	getMessageVariables,
	main,
	readLocaleFile,
	removeThenMain,
} from "../../bin/find-invalid-variables.ts";

test("getMessageVariables accepts punctuation and Japanese spacing", () => {
	assertEquals(getMessageVariables("$extension_label?"), ["extension_label"]);
	assertEquals(getMessageVariables("$extension_label の新しいバージョン"), [
		"extension_label",
	]);
	assertEquals(getMessageVariables("$account,$tab."), ["account", "tab"]);
});

test("getInvalidVariableEntries reports only unknown variables", () => {
	const allowedVariables = new Set(["account", "extension_label", "tab"]);
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
			missing_message: {
				description: "ignored",
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

test("locale helpers read existing locales and report missing paths", async () => {
	const locales = await getLocales();

	assertEquals(locales.includes("en"), true);
	assertEquals(await fileExists("src/_locales/en/messages.json"), true);
	assertEquals(await fileExists("src/_locales/missing/messages.json"), false);
});

test("buildInvalidVariablesReport accepts real Japanese locale variables", async () => {
	const report = await buildInvalidVariablesReport();

	assertEquals(report.ja, undefined);
});

test("main exits cleanly when no invalid locale variables exist", async () => {
	await main();
});

test("removeThenMain tolerates a missing stale report", async () => {
	await removeThenMain();
});

test("readLocaleFile rejects missing files", async () => {
	await assertRejects(
		() => readLocaleFile("src/_locales/missing/messages.json"),
		Error,
	);
});

test("buildInvalidVariablesReport skips locales without messages and reports invalid variables", async () => {
	const readDirStub = stub(fs, "readdir", async () => [
		createDirEntry("en", true),
		createDirEntry("it", true),
		createDirEntry("missing", true),
	]);
	const statStub = stub(fs, "stat", (path: string | URL): Promise<Stats> => {
		if (String(path).includes("missing")) {
			return Promise.reject(new Error("missing"));
		}
		return Promise.resolve({} as Stats);
	});
	const readTextFileStub = stub(
		fs,
		"readFile",
		(path: string | URL): Promise<string> => {
			if (String(path).includes("/en/")) {
				return Promise.resolve(
					JSON.stringify({
						account: { message: "Account" },
					}),
				);
			}
			return Promise.resolve(
				JSON.stringify({
					bad: { message: "$missing" },
				}),
			);
		},
	);

	try {
		const report = await buildInvalidVariablesReport("virtual-locales");
		assertEquals(report, {
			it: {
				bad: {
					message: "$missing",
					unknownVariables: ["missing"],
				},
			},
		});
	} finally {
		readDirStub.restore();
		statStub.restore();
		readTextFileStub.restore();
	}
});

test("main writes report and exits when invalid variables exist", async () => {
	const readDirStub = stub(fs, "readdir", async () => [
		createDirEntry("en", true),
		createDirEntry("it", true),
	]);
	const statStub = stub(fs, "stat", (): Promise<Stats> =>
		Promise.resolve({} as Stats),
	);
	const readTextFileStub = stub(
		fs,
		"readFile",
		(path: string | URL): Promise<string> => {
			if (String(path).includes("/en/")) {
				return Promise.resolve(
					JSON.stringify({
						account: { message: "Account" },
					}),
				);
			}
			return Promise.resolve(
				JSON.stringify({
					bad: { message: "$missing" },
				}),
			);
		},
	);
	let writtenReport = "";
	const writeTextFileStub = stub(
		fs,
		"writeFile",
		(path: string | URL, data: string): Promise<void> => {
			assertEquals(String(path), "invalid-variables-report.json");
			assertEquals(typeof data, "string");
			writtenReport = data as string;
			return Promise.resolve();
		},
	);
	try {
		assertEquals(await main(), 1);
		assertEquals(JSON.parse(writtenReport).it.bad.unknownVariables, [
			"missing",
		]);
	} finally {
		readDirStub.restore();
		statStub.restore();
		readTextFileStub.restore();
		writeTextFileStub.restore();
	}
});

/**
 * Creates async directory entries for virtual locale tests.
 */
function createDirEntry(name: string, directory: boolean) {
	return {
		name,
		isDirectory: () => directory,
		isFile: () => !directory,
		isSymbolicLink: () => false,
	};
}
