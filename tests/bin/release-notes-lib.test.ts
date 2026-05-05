import { assertEquals } from "@std/testing/asserts";
import {
	classifyCommit,
	COMMIT_FIELD_SEPARATOR,
	COMMIT_RECORD_SEPARATOR,
	extractChangelogNotes,
	type GitCommandResult,
	parseCommitLog,
	readCommitLog,
	renderReleaseNotes,
	resolveDefaultFromRef,
	type RunGitCommand,
} from "../../bin/release-notes-lib.ts";

Deno.test("parseCommitLog parses serialized records", () => {
	const raw = [
		`aaaaaaaa${COMMIT_FIELD_SEPARATOR}feat: add parser${COMMIT_FIELD_SEPARATOR}body line${COMMIT_RECORD_SEPARATOR}`,
		`bbbbbbbb${COMMIT_FIELD_SEPARATOR}fix(ui): resolve bug${COMMIT_FIELD_SEPARATOR}${COMMIT_RECORD_SEPARATOR}`,
	].join("");
	const parsed = parseCommitLog(raw);
	assertEquals(parsed.length, 2);
	assertEquals(parsed[0].hash, "aaaaaaaa");
	assertEquals(parsed[0].subject, "feat: add parser");
	assertEquals(parsed[0].body, "body line");
	assertEquals(parsed[1].subject, "fix(ui): resolve bug");
});

Deno.test("classifyCommit maps prefixes and keywords into canonical sections", () => {
	assertEquals(
		classifyCommit({ hash: "1", subject: "feat: add api", body: "" }),
		"Added",
	);
	assertEquals(
		classifyCommit({ hash: "2", subject: "fix: resolve crash", body: "" }),
		"Fixed",
	);
	assertEquals(
		classifyCommit({ hash: "3", subject: "chore: update deps", body: "" }),
		"Changed",
	);
	assertEquals(
		classifyCommit({
			hash: "4",
			subject: "refactor: remove legacy flow",
			body: "",
		}),
		"Removed",
	);
	assertEquals(
		classifyCommit({
			hash: "5",
			subject: "docs: harden auth against xss",
			body: "",
		}),
		"Security",
	);
	assertEquals(
		classifyCommit({ hash: "6", subject: "merge branch alpha", body: "" }),
		"Other",
	);
});

Deno.test("renderReleaseNotes keeps deterministic section ordering", () => {
	const notes = renderReleaseNotes([
		{ hash: "aaaaaaa", subject: "fix: patch bug", body: "" },
		{ hash: "bbbbbbb", subject: "feat: add drafter", body: "" },
		{ hash: "ccccccc", subject: "chore: update workflow", body: "" },
		{ hash: "ddddddd", subject: "docs: mitigate xss", body: "" },
	]);
	assertEquals(
		notes,
		[
			"## Added",
			"",
			"- add drafter (bbbbbbb)",
			"",
			"## Changed",
			"",
			"- update workflow (ccccccc)",
			"",
			"## Fixed",
			"",
			"- patch bug (aaaaaaa)",
			"",
			"## Security",
			"",
			"- mitigate xss (ddddddd)",
		].join("\n"),
	);
});

Deno.test("extractChangelogNotes keeps tag-targeted extraction with latest fallback", () => {
	const changelog = [
		"# CHANGELOG",
		"",
		"# v2.0.0",
		"",
		"## Changed",
		"",
		"- current notes",
		"",
		"# v1.9.0",
		"",
		"## Fixed",
		"",
		"- older notes",
	].join("\n");
	assertEquals(
		extractChangelogNotes(changelog, "v2.0.0-alpha"),
		["## Changed", "", "- current notes"].join("\n"),
	);
	assertEquals(
		extractChangelogNotes(changelog, "v9.9.9"),
		["## Changed", "", "- current notes"].join("\n"),
	);
});

Deno.test("resolveDefaultFromRef excludes current tag and picks previous merged tag", async () => {
	const calls: string[][] = [];
	const runGit: RunGitCommand = (
		args: string[],
	): Promise<GitCommandResult> => {
		calls.push(args);
		if (args[0] === "tag") {
			return Promise.resolve({
				success: true,
				stdout: "v2.0.0\nlatest",
				stderr: "",
			});
		}
		if (args[0] === "for-each-ref") {
			return Promise.resolve({
				success: true,
				stdout: "latest\nv2.0.0\nv1.9.0\nv1.8.0",
				stderr: "",
			});
		}
		return Promise.resolve({
			success: false,
			stdout: "",
			stderr: "unexpected",
		});
	};

	const resolved = await resolveDefaultFromRef("v2.0.0", "v2.0.0", runGit);
	assertEquals(resolved, "v1.9.0");
	assertEquals(calls[0], ["tag", "--points-at", "v2.0.0"]);
	assertEquals(calls[1][0], "for-each-ref");
});

Deno.test("readCommitLog supports explicit ranges and single-ref fallback", async () => {
	const calls: string[][] = [];
	const runGit: RunGitCommand = (
		args: string[],
	): Promise<GitCommandResult> => {
		calls.push(args);
		return Promise.resolve({
			success: true,
			stdout: "serialized",
			stderr: "",
		});
	};

	const rangeLog = await readCommitLog("HEAD", "v1.0.0", runGit);
	const headLog = await readCommitLog("HEAD", null, runGit);
	assertEquals(rangeLog, "serialized");
	assertEquals(headLog, "serialized");
	assertEquals(calls[0].at(-1), "v1.0.0..HEAD");
	assertEquals(calls[1].at(-1), "HEAD");
});
