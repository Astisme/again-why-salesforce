import { assertEquals, assertRejects } from "@std/testing/asserts";
import { stub } from "@std/testing/mock";
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

Deno.test("locale helpers read existing locales and report missing paths", async () => {
	const locales = await getLocales();

	assertEquals(locales.includes("en"), true);
	assertEquals(await fileExists("src/_locales/en/messages.json"), true);
	assertEquals(await fileExists("src/_locales/missing/messages.json"), false);
});

Deno.test("buildInvalidVariablesReport accepts real Japanese locale variables", async () => {
	const report = await buildInvalidVariablesReport();

	assertEquals(report.ja, undefined);
});

Deno.test("main exits cleanly when no invalid locale variables exist", async () => {
	await main();
});

Deno.test("removeThenMain tolerates a missing stale report", async () => {
	await removeThenMain();
});

Deno.test("readLocaleFile rejects missing files", async () => {
	await assertRejects(
		() => readLocaleFile("src/_locales/missing/messages.json"),
		Error,
	);
});

Deno.test("buildInvalidVariablesReport skips locales without messages and reports invalid variables", async () => {
	const readDirStub = stub(
		Deno,
		"readDir",
		(): AsyncIterable<Deno.DirEntry> =>
			createDirEntries([
				{
					isDirectory: true,
					isFile: false,
					isSymlink: false,
					name: "en",
				},
				{
					isDirectory: true,
					isFile: false,
					isSymlink: false,
					name: "it",
				},
				{
					isDirectory: true,
					isFile: false,
					isSymlink: false,
					name: "missing",
				},
			]),
	);
	const statStub = stub(
		Deno,
		"stat",
		(path: string | URL): Promise<Deno.FileInfo> => {
			if (String(path).includes("missing")) {
				return Promise.reject(new Error("missing"));
			}
			return Promise.resolve({} as Deno.FileInfo);
		},
	);
	const readTextFileStub = stub(
		Deno,
		"readTextFile",
		(path: string | URL): Promise<string> => {
			if (String(path).includes("/en/")) {
				return Promise.resolve(JSON.stringify({
					account: { message: "Account" },
				}));
			}
			return Promise.resolve(JSON.stringify({
				bad: { message: "$missing" },
			}));
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

Deno.test("main writes report and exits when invalid variables exist", async () => {
	const readDirStub = stub(
		Deno,
		"readDir",
		(): AsyncIterable<Deno.DirEntry> =>
			createDirEntries([
				{
					isDirectory: true,
					isFile: false,
					isSymlink: false,
					name: "en",
				},
				{
					isDirectory: true,
					isFile: false,
					isSymlink: false,
					name: "it",
				},
			]),
	);
	const statStub = stub(
		Deno,
		"stat",
		(): Promise<Deno.FileInfo> => Promise.resolve({} as Deno.FileInfo),
	);
	const readTextFileStub = stub(
		Deno,
		"readTextFile",
		(path: string | URL): Promise<string> => {
			if (String(path).includes("/en/")) {
				return Promise.resolve(JSON.stringify({
					account: { message: "Account" },
				}));
			}
			return Promise.resolve(JSON.stringify({
				bad: { message: "$missing" },
			}));
		},
	);
	let writtenReport = "";
	const writeTextFileStub = stub(
		Deno,
		"writeTextFile",
		(
			path: string | URL,
			data: string | ReadableStream<string>,
		): Promise<void> => {
			assertEquals(String(path), "invalid-variables-report.json");
			assertEquals(typeof data, "string");
			writtenReport = data as string;
			return Promise.resolve();
		},
	);
	const exitStub = stub(Deno, "exit", (code?: number): never => {
		throw new Error(`exit:${code}`);
	});

	try {
		await assertRejects(() => main(), Error, "exit:1");
		assertEquals(JSON.parse(writtenReport).it.bad.unknownVariables, [
			"missing",
		]);
	} finally {
		readDirStub.restore();
		statStub.restore();
		readTextFileStub.restore();
		writeTextFileStub.restore();
		exitStub.restore();
	}
});

/**
 * Creates async directory entries for virtual locale tests.
 */
async function* createDirEntries(
	entries: Deno.DirEntry[],
): AsyncIterableIterator<Deno.DirEntry> {
	for (const entry of entries) {
		yield entry;
	}
}
