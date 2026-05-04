export const SECTION_ORDER = [
	"Added",
	"Changed",
	"Fixed",
	"Removed",
	"Tests",
] as const;

export type ChangelogSection = (typeof SECTION_ORDER)[number];

export type SectionEntries = Record<ChangelogSection, string[]>;

const SECTION_HEADINGS: Record<ChangelogSection, string> = {
	Added: "## 🚀 Added",
	Changed: "## 🛠 Changed",
	Fixed: "## 🐛 Fixed",
	Removed: "## 💥 Removed",
	Tests: "## 🧪 Tests",
};

const REMOVED_KEYWORDS =
	/\b(remove|removed|removing|drop|dropped|dropping|deprecat(?:e|ed|es|ing|ion))\b/i;

/**
 * Parses git log output into non-empty commit subjects.
 */
export function parseGitLogSubjects(logOutput: string): string[] {
	return logOutput.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/**
 * Removes conventional-commit prefixes and normalizes spacing.
 */
export function normalizeCommitSubject(subject: string): string {
	let normalized = subject.trim().replaceAll(/\s+/g, " ");
	if (normalized.length === 0) {
		return "";
	}
	normalized = normalized.replace(/^[*-]\s+/, "");
	normalized = normalized.replace(/^([a-z]+)(?:\([^)]+\))?(?:!)?:\s*/i, "");
	if (normalized.length === 0) {
		return "";
	}
	return normalized.at(0)?.toUpperCase() + normalized.slice(1);
}

/**
 * Classifies a commit subject into a Keep a Changelog section.
 */
export function classifyCommitSubject(subject: string): ChangelogSection {
	const trimmed = subject.trim();
	const lowered = trimmed.toLowerCase();

	if (REMOVED_KEYWORDS.test(lowered)) {
		return "Removed";
	}

	const typeMatch = trimmed.match(/^([a-z]+)(?:\([^)]+\))?(?:!)?:/i);
	const type = typeMatch?.at(1)?.toLowerCase();
	if (type != null) {
		if (type === "feat") {
			return "Added";
		}
		if (type === "fix" || type === "hotfix" || type === "bugfix") {
			return "Fixed";
		}
		if (type === "test" || type === "tests") {
			return "Tests";
		}
		return "Changed";
	}

	if (/\btest(?:s|ing)?\b/i.test(lowered)) {
		return "Tests";
	}
	if (/\bfix(?:es|ed|ing)?\b/i.test(lowered)) {
		return "Fixed";
	}
	if (/\badd(?:s|ed|ing)?\b/i.test(lowered)) {
		return "Added";
	}
	return "Changed";
}

/**
 * Creates a deterministic section map with deduplicated entries.
 */
export function synthesizeSections(subjects: string[]): SectionEntries {
	const sections = createEmptySections();
	const seen = new Set<string>();

	for (const subject of subjects) {
		if (isIgnoredSubject(subject)) {
			continue;
		}
		const normalized = normalizeCommitSubject(subject);
		if (normalized.length === 0) {
			continue;
		}
		const section = classifyCommitSubject(subject);
		const fingerprint = `${section}|${normalized.toLowerCase()}`;
		if (seen.has(fingerprint)) {
			continue;
		}
		seen.add(fingerprint);
		sections[section].push(normalized);
	}

	return sections;
}

/**
 * Renders one markdown release block in Keep a Changelog style.
 */
export function renderReleaseBlock(
	version: string,
	sections: SectionEntries,
): string {
	const heading = normalizeVersionHeading(version);
	const lines: string[] = [`# ${heading}`, ""];
	let hasEntries = false;

	for (const section of SECTION_ORDER) {
		const entries = sections[section];
		if (entries.length === 0) {
			continue;
		}
		hasEntries = true;
		lines.push(SECTION_HEADINGS[section], "");
		for (const [index, entry] of entries.entries()) {
			lines.push(`${index + 1}. ${entry}`);
		}
		lines.push("");
	}

	if (!hasEntries) {
		lines.push("No notable changes.", "");
	}

	return `${lines.join("\n").trimEnd()}\n\n`;
}

/**
 * Inserts a release block before the first historical release heading.
 */
export function prependReleaseBlock(
	changelogContent: string,
	releaseBlock: string,
): string {
	const normalizedChangelog = changelogContent.replaceAll("\r\n", "\n");
	const normalizedBlock = `${
		releaseBlock.replaceAll("\r\n", "\n").trimEnd()
	}\n\n`;
	const releaseHeadingIndex = normalizedChangelog.search(/^# v/m);

	if (releaseHeadingIndex === -1) {
		return `${normalizedChangelog.trimEnd()}\n\n${normalizedBlock}`;
	}

	const before = normalizedChangelog.slice(0, releaseHeadingIndex).trimEnd();
	const after = normalizedChangelog.slice(releaseHeadingIndex).trimStart();
	return `${before}\n\n${normalizedBlock}${after}`;
}

/**
 * Formats release versions to match existing changelog headings.
 */
export function normalizeVersionHeading(version: string): string {
	const trimmed = version.trim();
	if (trimmed.length === 0) {
		return "Next release";
	}
	if (
		trimmed.toLowerCase() === "next" ||
		trimmed.toLowerCase() === "next release"
	) {
		return "Next release";
	}
	if (trimmed.startsWith("v")) {
		return `v${trimmed.slice(1)}`;
	}
	return `v${trimmed}`;
}

function createEmptySections(): SectionEntries {
	return {
		Added: [],
		Changed: [],
		Fixed: [],
		Removed: [],
		Tests: [],
	};
}

function isIgnoredSubject(subject: string): boolean {
	return /^merge\b/i.test(subject.trim());
}
