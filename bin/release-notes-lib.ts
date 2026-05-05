export const RELEASE_SECTIONS = [
	"Added",
	"Changed",
	"Fixed",
	"Removed",
	"Security",
	"Other",
] as const;

export type ReleaseSection = typeof RELEASE_SECTIONS[number];

export interface CommitRecord {
	hash: string;
	subject: string;
	body: string;
}

export interface SectionedNotes {
	Added: string[];
	Changed: string[];
	Fixed: string[];
	Removed: string[];
	Security: string[];
	Other: string[];
}

const PREFIX_TO_SECTION: Record<string, ReleaseSection> = {
	add: "Added",
	chore: "Changed",
	change: "Changed",
	ci: "Changed",
	docs: "Changed",
	feat: "Added",
	fix: "Fixed",
	hotfix: "Fixed",
	perf: "Changed",
	refactor: "Changed",
	remove: "Removed",
	revert: "Changed",
	sec: "Security",
	security: "Security",
	test: "Other",
};

const SECURITY_KEYWORDS =
	/\b(security|cve-\d{4}-\d+|vulnerab|xss|csrf|injection|auth(?:entication|orization)?)\b/i;
const REMOVED_KEYWORDS =
	/\b(remove|removed|delete|deleted|drop|dropped|deprecat(?:e|ed|ion)|sunset)\b/i;
const FIXED_KEYWORDS =
	/\b(fix|fixed|bug|hotfix|patch|resolve|resolved|resolves)\b/i;
const ADDED_KEYWORDS =
	/\b(add|added|introduce|introduced|create|created|implement|implemented|new)\b/i;
const CHANGED_KEYWORDS =
	/\b(change|changed|update|updated|refactor|refactored|improve|improved|optimi[sz]e|optimized|optimised|performance|cleanup)\b/i;

/**
 * Parses raw `git log` output produced with unit/record separators.
 */
export function parseGitLogOutput(rawOutput: string): CommitRecord[] {
	if (!rawOutput.trim()) {
		return [];
	}

	const records: CommitRecord[] = [];
	for (const chunk of rawOutput.split("\x1e")) {
		const trimmed = chunk.trim();
		if (!trimmed) {
			continue;
		}
		const [hash = "", subject = "", body = ""] = trimmed.split("\x1f");
		records.push({
			hash: hash.trim(),
			subject: subject.trim(),
			body: body.trim(),
		});
	}
	return records;
}

/**
 * Classifies commit messages into release-note sections.
 */
export function classifyCommitMessage(message: string): ReleaseSection {
	const normalized = message.trim();
	const conventionalPrefix = normalized.match(
		/^([a-z]+)(?:\([^)]+\))?(?:!)?:\s*/i,
	);
	if (conventionalPrefix != null) {
		const prefix = conventionalPrefix[1].toLowerCase();
		const mapped = PREFIX_TO_SECTION[prefix];
		if (mapped != null) {
			return mapped;
		}
	}

	if (SECURITY_KEYWORDS.test(normalized)) {
		return "Security";
	}
	if (REMOVED_KEYWORDS.test(normalized)) {
		return "Removed";
	}
	if (FIXED_KEYWORDS.test(normalized)) {
		return "Fixed";
	}
	if (ADDED_KEYWORDS.test(normalized)) {
		return "Added";
	}
	if (CHANGED_KEYWORDS.test(normalized)) {
		return "Changed";
	}
	return "Other";
}

/**
 * Normalizes a commit title into a readable release-note bullet.
 */
export function normalizeCommitSubject(subject: string): string {
	const trimmed = subject.trim();
	if (!trimmed) {
		return "(no subject)";
	}
	const stripped = trimmed.replace(
		/^[a-z]+(?:\([^)]+\))?(?:!)?:\s*/i,
		"",
	);
	return stripped || trimmed;
}

/**
 * Groups commits by section while preserving input order.
 */
export function groupCommitsBySection(commits: CommitRecord[]): SectionedNotes {
	const grouped = emptySectionedNotes();
	for (const commit of commits) {
		const message = `${commit.subject}\n${commit.body}`;
		const section = classifyCommitMessage(message);
		grouped[section].push(normalizeCommitSubject(commit.subject));
	}
	return grouped;
}

/**
 * Renders markdown release notes in a deterministic section order.
 */
export function renderReleaseNotes(notes: SectionedNotes): string {
	const lines: string[] = [];
	for (const section of RELEASE_SECTIONS) {
		const entries = notes[section];
		if (entries.length === 0) {
			continue;
		}
		lines.push(`## ${section}`);
		lines.push("");
		for (const entry of entries) {
			lines.push(`- ${entry}`);
		}
		lines.push("");
	}
	return lines.join("\n").trim();
}

/**
 * Extracts release notes for a specific tag from changelog markdown.
 */
export function extractNotesForTag(
	changelogMarkdown: string,
	tag: string,
): string {
	const targetTag = normalizeTag(tag);
	const lines = changelogMarkdown.split("\n");
	let collecting = false;
	const collected: string[] = [];
	for (const line of lines) {
		if (!collecting && line.trim() === `# ${targetTag}`) {
			collecting = true;
			continue;
		}
		if (collecting && /^# v\d+\.\d+\.\d+/.test(line.trim())) {
			break;
		}
		if (collecting) {
			collected.push(line);
		}
	}
	return collected.join("\n").trim();
}

/**
 * Extracts notes from the latest changelog release section.
 */
export function extractLatestNotes(changelogMarkdown: string): string {
	const lines = changelogMarkdown.split("\n");
	let collecting = false;
	const collected: string[] = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (/^# v\d+\.\d+\.\d+/.test(trimmed)) {
			if (!collecting) {
				collecting = true;
				continue;
			}
			break;
		}
		if (collecting) {
			collected.push(line);
		}
	}
	return collected.join("\n").trim();
}

/**
 * Creates an empty section map with stable keys.
 */
export function emptySectionedNotes(): SectionedNotes {
	return {
		Added: [],
		Changed: [],
		Fixed: [],
		Removed: [],
		Security: [],
		Other: [],
	};
}

/**
 * Normalizes version strings (`2.3.1-alpha`, `v2.3.1`) to `v2.3.1`.
 */
export function normalizeTag(tag: string): string {
	const noRefPrefix = tag.replace(/^refs\/tags\//, "").trim();
	const [baseVersion] = noRefPrefix.split("-");
	if (!baseVersion.startsWith("v")) {
		return `v${baseVersion}`;
	}
	return baseVersion;
}
