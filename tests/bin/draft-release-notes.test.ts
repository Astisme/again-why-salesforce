import { assert, assertEquals, assertThrows } from "@std/testing/asserts";
import { join } from "@std/path";
import {
	main,
	parseArgs,
	resolveDefaultFromRef,
} from "../../bin/draft-release-notes.ts";

Deno.test("parseArgs supports equals and spaced flags", () => {
	const parsed = parseArgs([
		"--from=v1.0.0",
		"--to",
		"HEAD~1",
		"--tag",
		"v2.0.0",
		"--output=out/notes.txt",
		"--fallback-file",
		"docs/CHANGELOG.md",
	], "/repo");

	assertEquals(parsed.fromRef, "v1.0.0");
	assertEquals(parsed.toRef, "HEAD~1");
	assertEquals(parsed.tag, "v2.0.0");
	assertEquals(parsed.outputPath, "/repo/out/notes.txt");
	assertEquals(parsed.fallbackFilePath, "/repo/docs/CHANGELOG.md");
});

Deno.test("parseArgs rejects unknown flags", () => {
	assertThrows(
		() => parseArgs(["--unknown"], "/repo"),
		Error,
		"Unknown argument",
	);
});

Deno.test("main uses changelog fallback when commit range is empty", async () => {
	const writes = new Map<string, string>();
	const exitCode = await main([
		"--from=v1.0.0",
		"--to=HEAD",
		"--tag=2.0.0",
		"--output=release-notes.txt",
	], {
		executeGit: (args: string[]): Promise<string> => {
			assertEquals(args[0], "log");
			return Promise.resolve("");
		},
		readTextFile: (): Promise<string> =>
			Promise.resolve([
				"# CHANGELOG",
				"",
				"# v2.0.0",
				"",
				"## Fixed",
				"- bug",
			].join("\n")),
		writeTextFile: (path: string, content: string): Promise<void> => {
			writes.set(path, content);
			return Promise.resolve();
		},
		cwd: () => "/repo",
	});

	assertEquals(exitCode, 0);
	assertEquals(writes.get("/repo/release-notes.txt"), "## Fixed\n- bug\n");
});

Deno.test("main handles empty range without fallback by writing default note", async () => {
	const writes = new Map<string, string>();
	await main([
		"--from=HEAD",
		"--to=HEAD",
		"--output=notes.md",
		"--fallback-file=",
	], {
		executeGit: (): Promise<string> => Promise.resolve(""),
		readTextFile: (): Promise<string> => Promise.resolve(""),
		writeTextFile: (path: string, content: string): Promise<void> => {
			writes.set(path, content);
			return Promise.resolve();
		},
		cwd: () => "/repo",
	});

	assertEquals(writes.get("/repo/notes.md"), "- No notable changes.\n");
});

Deno.test("main renders stable section ordering for git-derived notes", async () => {
	const writes = new Map<string, string>();
	const rawLog = [
		"h1\x1ffix: patch crash\x1f\x1e",
		"h2\x1ffeat: add importer\x1f\x1e",
		"h3\x1fsecurity: harden auth\x1f\x1e",
	].join("");
	await main([
		"--from=v1.0.0",
		"--to=HEAD",
		"--output=ordered.md",
	], {
		executeGit: (): Promise<string> => Promise.resolve(rawLog),
		readTextFile: (): Promise<string> => Promise.resolve(""),
		writeTextFile: (path: string, content: string): Promise<void> => {
			writes.set(path, content);
			return Promise.resolve();
		},
		cwd: () => "/repo",
	});

	const output = writes.get("/repo/ordered.md");
	assert(output != null);
	assertEquals(
		output,
		[
			"## Added",
			"",
			"- add importer",
			"",
			"## Fixed",
			"",
			"- patch crash",
			"",
			"## Security",
			"",
			"- harden auth",
			"",
		].join("\n"),
	);
});

Deno.test("resolveDefaultFromRef returns null when describe fails", async () => {
	const resolved = await resolveDefaultFromRef(
		"HEAD",
		() => Promise.reject(new Error("no tag")),
	);
	assertEquals(resolved, null);
});

Deno.test("parseArgs default paths are rooted at cwd", () => {
	const cwd = "/repo";
	const parsed = parseArgs([], cwd);
	assertEquals(parsed.outputPath, join(cwd, "release-notes.txt"));
	assertEquals(parsed.fallbackFilePath, join(cwd, "docs", "CHANGELOG.md"));
});
