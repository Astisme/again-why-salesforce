import { assertEquals, assertRejects, assertThrows } from "@std/testing/asserts";
import { main, parseArgs } from "../../bin/draft-release-notes.ts";
import type {
	GitCommandResult,
	RunGitCommand,
} from "../../bin/release-notes-lib.ts";

Deno.test("parseArgs parses defaults and explicit options", () => {
	const parsed = parseArgs([
		"--from=v1.0.0",
		"--to=v1.1.0",
		"--tag=v1.1.0",
		"--output=tmp/release-notes.txt",
		"--fallback-file=docs/CHANGELOG.md",
	], "/repo");

	assertEquals(parsed.fromRef, "v1.0.0");
	assertEquals(parsed.toRef, "v1.1.0");
	assertEquals(parsed.tag, "v1.1.0");
	assertEquals(parsed.outputFile, "/repo/tmp/release-notes.txt");
	assertEquals(parsed.fallbackFile, "/repo/docs/CHANGELOG.md");

	const defaults = parseArgs([], "/repo");
	assertEquals(defaults.toRef, "HEAD");
	assertEquals(defaults.fromRef, null);
	assertEquals(defaults.outputFile, "/repo/release-notes.txt");
	assertEquals(defaults.fallbackFile, "/repo/docs/CHANGELOG.md");
});

Deno.test("parseArgs rejects unknown arguments", () => {
	assertThrows(
		() => parseArgs(["--unknown=1"], "/repo"),
		Error,
		"Unknown argument",
	);
});

Deno.test("main writes notes derived from git commits", async () => {
	let outputPath = "";
	let outputContent = "";
	const calls: string[][] = [];

	const runGit: RunGitCommand = (
		args: string[],
	): Promise<GitCommandResult> => {
		calls.push(args);
		if (args[0] === "tag") {
			return Promise.resolve({
				success: true,
				stdout: "v2.0.0",
				stderr: "",
			});
		}
		if (args[0] === "for-each-ref") {
			return Promise.resolve({
				success: true,
				stdout: "v2.0.0\nv1.9.0",
				stderr: "",
			});
		}
		if (args[0] === "log") {
			return Promise.resolve({
				success: true,
				stdout: [
					"abc1234\x1ffeat: add release drafter\x1f\x1e",
					"def5678\x1ffix: resolve range bug\x1f\x1e",
				].join(""),
				stderr: "",
			});
		}
		return Promise.resolve({
			success: false,
			stdout: "",
			stderr: "unexpected",
		});
	};

	const code = await main([
		"--to=v2.0.0",
		"--tag=v2.0.0",
		"--output=release-notes.txt",
	], {
		cwd: () => "/repo",
		runGit,
		readTextFile: () => Promise.resolve("unused"),
		writeTextFile: (path: string, content: string): Promise<void> => {
			outputPath = path;
			outputContent = content;
			return Promise.resolve();
		},
	});

	assertEquals(code, 0);
	assertEquals(outputPath, "/repo/release-notes.txt");
	assertEquals(
		outputContent,
		[
			"## Added",
			"",
			"- add release drafter (abc1234)",
			"",
			"## Fixed",
			"",
			"- resolve range bug (def5678)",
			"",
		].join("\n"),
	);
	assertEquals(calls.some((entry) => entry.includes("v1.9.0..v2.0.0")), true);
});

Deno.test("main falls back to changelog when commit range is empty", async () => {
	let outputContent = "";
	let fallbackReadCount = 0;
	const runGit: RunGitCommand = (
		args: string[],
	): Promise<GitCommandResult> => {
		if (args[0] === "tag") {
			return Promise.resolve({
				success: true,
				stdout: "v2.1.0",
				stderr: "",
			});
		}
		if (args[0] === "for-each-ref") {
			return Promise.resolve({
				success: true,
				stdout: "v2.1.0\nv2.0.0",
				stderr: "",
			});
		}
		if (args[0] === "log") {
			return Promise.resolve({ success: true, stdout: "", stderr: "" });
		}
		return Promise.resolve({
			success: false,
			stdout: "",
			stderr: "unexpected",
		});
	};

	await main([
		"--to=v2.1.0",
		"--tag=v2.1.0",
	], {
		cwd: () => "/repo",
		runGit,
		readTextFile: (): Promise<string> => {
			fallbackReadCount += 1;
			return Promise.resolve([
				"# CHANGELOG",
				"",
				"# v2.1.0",
				"",
				"## Changed",
				"",
				"- fallback section",
			].join("\n"));
		},
		writeTextFile: (
			_path: string,
			content: string,
		): Promise<void> => {
			outputContent = content;
			return Promise.resolve();
		},
	});

	assertEquals(fallbackReadCount, 1);
	assertEquals(
		outputContent,
		["## Changed", "", "- fallback section", ""].join("\n"),
	);
});

Deno.test("main throws when git history lookup fails", async () => {
	let fallbackReadCount = 0;
	const runGit: RunGitCommand = (
		args: string[],
	): Promise<GitCommandResult> => {
		if (args[0] === "tag") {
			return Promise.resolve({
				success: true,
				stdout: "v2.1.0",
				stderr: "",
			});
		}
		if (args[0] === "for-each-ref") {
			return Promise.resolve({
				success: true,
				stdout: "v2.1.0\nv2.0.0",
				stderr: "",
			});
		}
		if (args[0] === "log") {
			return Promise.resolve({
				success: false,
				stdout: "",
				stderr: "fatal: bad revision",
			});
		}
		return Promise.resolve({
			success: false,
			stdout: "",
			stderr: "unexpected",
		});
	};

	await assertRejects(
		() =>
			main([
				"--to=v2.1.0",
				"--tag=v2.1.0",
			], {
				cwd: () => "/repo",
				runGit,
				readTextFile: (): Promise<string> => {
					fallbackReadCount += 1;
					return Promise.resolve("# CHANGELOG");
				},
				writeTextFile: (): Promise<void> => Promise.resolve(),
			}),
		Error,
		"fatal: bad revision",
	);
	assertEquals(fallbackReadCount, 0);
});
