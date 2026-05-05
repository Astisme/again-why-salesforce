export type ReleaseSection =
	| "Added"
	| "Changed"
	| "Fixed"
	| "Removed"
	| "Security"
	| "Other";

export interface CommitEntry {
	hash: string;
	subject: string;
	body: string;
}

export interface GitCommandResult {
	success: boolean;
	stdout: string;
	stderr: string;
}

export type RunGitCommand = (
	args: string[],
) => Promise<GitCommandResult>;

export const COMMIT_RECORD_SEPARATOR = "\x1e";
export const COMMIT_FIELD_SEPARATOR = "\x1f";
export const GIT_LOG_FORMAT =
	`%H${COMMIT_FIELD_SEPARATOR}%s${COMMIT_FIELD_SEPARATOR}%b${COMMIT_RECORD_SEPARATOR}`;

const VERSION_HEADING_PATTERN = /^# v\d+\.\d+\.\d+(?:[-.][0-9A-Za-z.-]+)?$/;
const CONVENTIONAL_TYPE_PATTERN = /^([a-z]+)(?:\([^)]*\))?!?:\s*/i;
const SECURITY_PATTERN =
	/\b(security|cve|xss|csrf|vulnerability|vulnerab|injection|auth(?:entication|orization)?)\b/i;
const FIX_PATTERN = /\b(fix|bug|patch|resolve|regression|hotfix)\b/i;
const REMOVE_PATTERN = /\b(remove|deleted?|drop|deprecat|cleanup)\b/i;
const ADD_PATTERN = /\b(add|introduce|create|implement|new)\b/i;
const CHANGE_PATTERN =
	/\b(change|update|improve|refactor|rename|bump|adjust)\b/i;

const SECTION_ORDER: ReleaseSection[] = [
	"Added",
	"Changed",
	"Fixed",
	"Removed",
	"Security",
	"Other",
];

/**
 * Executes a git command and returns decoded output.
 */
export async function runGitCommand(args: string[]): Promise<GitCommandResult> {
	const command = new Deno.Command("git", {
		args,
		stdout: "piped",
		stderr: "piped",
	});
	const output = await command.output();
	const decoder = new TextDecoder();
	return {
		success: output.code === 0,
		stdout: decoder.decode(output.stdout).trim(),
		stderr: decoder.decode(output.stderr).trim(),
	};
}

/**
 * Resolves the previous tag reachable from `toRef`.
 */
export async function resolveDefaultFromRef(
	toRef: string,
	tag: string | null,
	runGit: RunGitCommand = runGitCommand,
): Promise<string | null> {
	const tagsAtRef = await runGit(["tag", "--points-at", toRef]);
	const excludedTags = new Set<string>();
	if (tag != null && tag.length > 0) {
		excludedTags.add(tag);
	}
	if (tagsAtRef.success && tagsAtRef.stdout.length > 0) {
		for (const row of tagsAtRef.stdout.split("\n")) {
			const value = row.trim();
			if (value.length > 0) {
				excludedTags.add(value);
			}
		}
	}

	const mergedTags = await runGit([
		"for-each-ref",
		"--merged",
		toRef,
		"--sort=-creatordate",
		"--format=%(refname:short)",
		"refs/tags",
	]);
	if (!mergedTags.success || mergedTags.stdout.length === 0) {
		return null;
	}

	for (const row of mergedTags.stdout.split("\n")) {
		const candidate = row.trim();
		if (candidate.length === 0 || excludedTags.has(candidate)) {
			continue;
		}
		return candidate;
	}
	return null;
}

/**
 * Reads git commit history for a range.
 */
export async function readCommitLog(
	toRef: string,
	fromRef: string | null,
	runGit: RunGitCommand = runGitCommand,
): Promise<string> {
	const range = fromRef == null ? toRef : `${fromRef}..${toRef}`;
	const result = await runGit([
		"log",
		"--format",
		GIT_LOG_FORMAT,
		range,
	]);
	if (!result.success) {
		return "";
	}
	return result.stdout;
}

/**
 * Parses serialized git log output into commit entries.
 */
export function parseCommitLog(rawLog: string): CommitEntry[] {
	if (rawLog.trim().length === 0) {
		return [];
	}
	const entries: CommitEntry[] = [];
	for (const record of rawLog.split(COMMIT_RECORD_SEPARATOR)) {
		if (record.trim().length === 0) {
			continue;
		}
		const fields = record.split(COMMIT_FIELD_SEPARATOR);
		entries.push({
			hash: fields[0]?.trim() ?? "",
			subject: fields[1]?.trim() ?? "",
			body: fields.slice(2).join(COMMIT_FIELD_SEPARATOR).trim(),
		});
	}
	return entries.filter((entry) => entry.subject.length > 0);
}

/**
 * Classifies a commit into a release-note section.
 */
export function classifyCommit(entry: CommitEntry): ReleaseSection {
	const combined = `${entry.subject}\n${entry.body}`.toLowerCase();
	const conventionalType = extractConventionalType(entry.subject);

	if (
		conventionalType === "security" || SECURITY_PATTERN.test(combined)
	) {
		return "Security";
	}
	if (
		conventionalType === "fix" || conventionalType === "bugfix" ||
		conventionalType === "hotfix" || FIX_PATTERN.test(combined)
	) {
		return "Fixed";
	}
	if (
		conventionalType === "remove" || conventionalType === "delete" ||
		conventionalType === "deprecate" || REMOVE_PATTERN.test(combined)
	) {
		return "Removed";
	}
	if (
		conventionalType === "feat" || conventionalType === "add" ||
		ADD_PATTERN.test(combined)
	) {
		return "Added";
	}
	if (
		conventionalType === "change" || conventionalType === "chore" ||
		conventionalType === "refactor" || conventionalType === "perf" ||
		conventionalType === "build" || conventionalType === "ci" ||
		conventionalType === "docs" || conventionalType === "style" ||
		conventionalType === "test" || CHANGE_PATTERN.test(combined)
	) {
		return "Changed";
	}
	return "Other";
}

/**
 * Renders markdown release notes from commit entries.
 */
export function renderReleaseNotes(commits: CommitEntry[]): string {
	const grouped = new Map<ReleaseSection, string[]>();
	for (const section of SECTION_ORDER) {
		grouped.set(section, []);
	}

	for (const commit of commits) {
		const section = classifyCommit(commit);
		grouped.get(section)?.push(formatCommitLine(commit));
	}

	const chunks: string[] = [];
	for (const section of SECTION_ORDER) {
		const lines = grouped.get(section) ?? [];
		if (lines.length === 0) {
			continue;
		}
		chunks.push(`## ${section}\n\n${lines.join("\n")}`);
	}

	return chunks.join("\n\n").trim();
}

/**
 * Extracts changelog notes for a tag section, with fallback to latest section.
 */
export function extractChangelogNotes(
	changelogContent: string,
	tag: string | null,
): string {
	const lines = changelogContent.split("\n");
	if (tag != null && tag.length > 0) {
		const normalizedVersion = normalizeVersion(tag);
		const targetedHeading = `# v${normalizedVersion}`;
		const targeted = collectSection(
			lines,
			(line) => line.trim() === targetedHeading,
		);
		if (targeted.length > 0) {
			return targeted.join("\n").trim();
		}
	}

	const latest = collectSection(
		lines,
		(line) => VERSION_HEADING_PATTERN.test(line.trim()),
	);
	return latest.join("\n").trim();
}

/**
 * Removes common conventional-commit prefixes from a title.
 */
export function sanitizeSubject(subject: string): string {
	const trimmed = subject.trim();
	if (trimmed.length === 0) {
		return "Untitled commit";
	}
	return trimmed.replace(CONVENTIONAL_TYPE_PATTERN, "");
}

function extractConventionalType(subject: string): string | null {
	const match = subject.trim().match(/^([a-z]+)(?:\([^)]*\))?!?:/i);
	if (match == null) {
		return null;
	}
	return match[1].toLowerCase();
}

function formatCommitLine(commit: CommitEntry): string {
	const safeHash = commit.hash.slice(0, 7);
	return `- ${sanitizeSubject(commit.subject)} (${safeHash})`;
}

function normalizeVersion(tag: string): string {
	let value = tag.trim();
	if (value.startsWith("refs/tags/")) {
		value = value.slice("refs/tags/".length);
	}
	if (value.startsWith("v")) {
		value = value.slice(1);
	}
	const separatorIndex = value.indexOf("-");
	if (separatorIndex >= 0) {
		return value.slice(0, separatorIndex);
	}
	return value;
}

function collectSection(
	lines: string[],
	startMatcher: (line: string) => boolean,
): string[] {
	const startIndex = lines.findIndex(startMatcher);
	if (startIndex < 0) {
		return [];
	}
	const content: string[] = [];
	for (let index = startIndex + 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (VERSION_HEADING_PATTERN.test(line.trim())) {
			break;
		}
		content.push(line);
	}
	return trimSurroundingEmptyLines(content);
}

function trimSurroundingEmptyLines(lines: string[]): string[] {
	let start = 0;
	while (start < lines.length && lines[start].trim().length === 0) {
		start += 1;
	}
	let end = lines.length;
	while (end > start && lines[end - 1].trim().length === 0) {
		end -= 1;
	}
	return lines.slice(start, end);
}
