import { assertEquals } from "@std/testing/asserts";
import {
	classifyCommitMessage,
	extractLatestNotes,
	extractNotesForTag,
	groupCommitsBySection,
	normalizeCommitSubject,
	normalizeTag,
	parseGitLogOutput,
	renderReleaseNotes,
} from "../../bin/release-notes-lib.ts";

Deno.test("parseGitLogOutput parses records using separators", () => {
	const raw = [
		"a1\x1ffeat: add menu\x1fdetails\x1e",
		"b2\x1ffix(parser): handle empty\x1f\x1e",
	].join("");
	assertEquals(parseGitLogOutput(raw), [
		{ hash: "a1", subject: "feat: add menu", body: "details" },
		{ hash: "b2", subject: "fix(parser): handle empty", body: "" },
	]);
	assertEquals(parseGitLogOutput("\n\t"), []);
});

Deno.test("classifyCommitMessage maps prefixes and keywords", () => {
	assertEquals(classifyCommitMessage("feat: add support"), "Added");
	assertEquals(classifyCommitMessage("fix(ui): button crash"), "Fixed");
	assertEquals(classifyCommitMessage("security: patch XSS"), "Security");
	assertEquals(classifyCommitMessage("delete unused handler"), "Removed");
	assertEquals(
		classifyCommitMessage("refactor: improve internals"),
		"Changed",
	);
	assertEquals(classifyCommitMessage("bump deps"), "Other");
});

Deno.test("groupCommitsBySection and renderReleaseNotes keep deterministic order", () => {
	const grouped = groupCommitsBySection([
		{ hash: "1", subject: "fix: close edge case", body: "" },
		{ hash: "2", subject: "feat(core): add endpoint", body: "" },
		{ hash: "3", subject: "docs: update docs", body: "" },
		{ hash: "4", subject: "remove dead config", body: "" },
		{ hash: "5", subject: "security hardening", body: "" },
		{ hash: "6", subject: "misc notes", body: "" },
	]);
	const markdown = renderReleaseNotes(grouped);
	assertEquals(
		markdown,
		[
			"## Added",
			"",
			"- add endpoint",
			"",
			"## Changed",
			"",
			"- update docs",
			"",
			"## Fixed",
			"",
			"- close edge case",
			"",
			"## Removed",
			"",
			"- remove dead config",
			"",
			"## Security",
			"",
			"- security hardening",
			"",
			"## Other",
			"",
			"- misc notes",
		].join("\n"),
	);
});

Deno.test("normalizeCommitSubject strips conventional prefix and handles empty", () => {
	assertEquals(
		normalizeCommitSubject("feat(parser)!: add safety"),
		"add safety",
	);
	assertEquals(normalizeCommitSubject(""), "(no subject)");
});

Deno.test("changelog extraction returns tagged section and latest fallback", () => {
	const changelog = [
		"# CHANGELOG",
		"",
		"# v2.0.0",
		"",
		"## Added",
		"- major release",
		"",
		"# v1.9.0",
		"",
		"## Fixed",
		"- bugfix",
	].join("\n");

	assertEquals(
		extractNotesForTag(changelog, "2.0.0"),
		"## Added\n- major release",
	);
	assertEquals(extractNotesForTag(changelog, "v8.8.8"), "");
	assertEquals(extractLatestNotes(changelog), "## Added\n- major release");
	assertEquals(normalizeTag("refs/tags/v2.0.0-beta"), "v2.0.0");
	assertEquals(normalizeTag("2.0.0"), "v2.0.0");
});
