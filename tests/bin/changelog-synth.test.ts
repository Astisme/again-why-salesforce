import {
	assert,
	assertEquals,
	assertStringIncludes,
} from "@std/testing/asserts";
import {
	classifyCommitSubject,
	normalizeCommitSubject,
	parseGitLogSubjects,
	prependReleaseBlock,
	renderReleaseBlock,
	SECTION_ORDER,
	synthesizeSections,
} from "../../bin/changelog-synth-lib.ts";
import { parseArgs } from "../../bin/changelog-synth.ts";

Deno.test("parseGitLogSubjects ignores empty lines", () => {
	const parsed = parseGitLogSubjects("feat: a\n\nfix: b\n  \nchore: c\n");
	assertEquals(parsed, ["feat: a", "fix: b", "chore: c"]);
});

Deno.test("normalizeCommitSubject strips prefixes and normalizes sentence casing", () => {
	assertEquals(
		normalizeCommitSubject("feat(ui): add keyboard shortcuts"),
		"Add keyboard shortcuts",
	);
	assertEquals(
		normalizeCommitSubject("  * fix: resolve crash "),
		"Resolve crash",
	);
	assertEquals(normalizeCommitSubject(""), "");
});

Deno.test("classifyCommitSubject maps commit types and removal keywords", () => {
	assertEquals(classifyCommitSubject("feat: add feature"), "Added");
	assertEquals(classifyCommitSubject("fix: patch issue"), "Fixed");
	assertEquals(classifyCommitSubject("test: add coverage"), "Tests");
	assertEquals(
		classifyCommitSubject("refactor: improve structure"),
		"Changed",
	);
	assertEquals(
		classifyCommitSubject("refactor: drop deprecated API"),
		"Removed",
	);
});

Deno.test("synthesizeSections is deterministic and deduplicates repeated entries", () => {
	const sections = synthesizeSections([
		"feat(ui): add keyboard shortcuts",
		"feat: add keyboard shortcuts",
		"Merge branch 'main' into stag",
		"fix: resolve startup crash",
		"chore: tune sync scheduling",
		"test: add changelog synth coverage",
		"refactor: deprecate old import pipeline",
	]);

	assertEquals(sections.Added, ["Add keyboard shortcuts"]);
	assertEquals(sections.Fixed, ["Resolve startup crash"]);
	assertEquals(sections.Changed, ["Tune sync scheduling"]);
	assertEquals(sections.Tests, ["Add changelog synth coverage"]);
	assertEquals(sections.Removed, ["Deprecate old import pipeline"]);
});

Deno.test("renderReleaseBlock preserves section order", () => {
	const block = renderReleaseBlock("2.3.0", {
		Added: ["Add first"],
		Changed: ["Change second"],
		Fixed: ["Fix third"],
		Removed: ["Remove fourth"],
		Tests: ["Test fifth"],
	});

	assertStringIncludes(block, "# v2.3.0");

	let previousIndex = -1;
	for (const section of SECTION_ORDER) {
		const heading = {
			Added: "## 🚀 Added",
			Changed: "## 🛠 Changed",
			Fixed: "## 🐛 Fixed",
			Removed: "## 💥 Removed",
			Tests: "## 🧪 Tests",
		}[section];
		const index = block.indexOf(heading);
		assert(index > previousIndex);
		previousIndex = index;
	}
});

Deno.test("renderReleaseBlock handles empty ranges", () => {
	const block = renderReleaseBlock("next", {
		Added: [],
		Changed: [],
		Fixed: [],
		Removed: [],
		Tests: [],
	});

	assertStringIncludes(block, "# Next release");
	assertStringIncludes(block, "No notable changes.");
});

Deno.test("prependReleaseBlock inserts after static header and before first release", () => {
	const existing = [
		"# CHANGELOG for Again, Why Salesforce",
		"",
		"Intro paragraph.",
		"",
		"# v2.2.5",
		"",
		"## 🛠 Changed",
		"",
		"1. Existing item",
	].join("\n");
	const block = renderReleaseBlock("2.2.6", {
		Added: ["Add one"],
		Changed: [],
		Fixed: [],
		Removed: [],
		Tests: [],
	});

	const prepended = prependReleaseBlock(existing, block);
	const firstRelease = prepended.indexOf("# v2.2.5");
	const inserted = prepended.indexOf("# v2.2.6");

	assert(inserted > -1);
	assert(inserted < firstRelease);
	assertStringIncludes(prepended, "# CHANGELOG for Again, Why Salesforce");
});

Deno.test("parseArgs accepts known options and rejects unknown arguments", () => {
	const parsed = parseArgs([
		"--",
		"--from=v2.2.4",
		"--to=HEAD",
		"--version=2.2.5",
		"--output=docs/new-changelog.md",
		"--prepend",
		"--dry-run",
	], "/repo");

	assertEquals(parsed.from, "v2.2.4");
	assertEquals(parsed.to, "HEAD");
	assertEquals(parsed.version, "2.2.5");
	assertEquals(parsed.output, "/repo/docs/new-changelog.md");
	assertEquals(parsed.prepend, true);
	assertEquals(parsed.dryRun, true);

	assertThrowsParse(
		() => parseArgs(["--unknown=value"], "/repo"),
		"Unknown argument",
	);
	assertThrowsParse(
		() => parseArgs(["--version="], "/repo"),
		"cannot be empty",
	);
});

function assertThrowsParse(callback: () => unknown, messagePart: string): void {
	try {
		callback();
		throw new Error("Expected parse error");
	} catch (error) {
		assert(error instanceof Error);
		assertStringIncludes(error.message, messagePart);
	}
}
