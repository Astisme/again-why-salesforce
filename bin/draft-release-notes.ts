import { join } from "@std/path";
import {
	extractChangelogNotes,
	parseCommitLog,
	readCommitLog,
	renderReleaseNotes,
	resolveDefaultFromRef,
	type RunGitCommand,
	runGitCommand,
} from "./release-notes-lib.ts";

interface CliOptions {
	fromRef: string | null;
	toRef: string;
	tag: string | null;
	outputFile: string;
	fallbackFile: string;
}

interface CliDependencies {
	cwd: () => string;
	readTextFile: (path: string) => Promise<string>;
	writeTextFile: (path: string, content: string) => Promise<void>;
	runGit: RunGitCommand;
}

const DEFAULT_OUTPUT = "release-notes.txt";
const DEFAULT_FALLBACK = join("docs", "CHANGELOG.md");

/**
 * Drafts markdown release notes from git history and changelog fallback.
 */
export async function main(
	args: string[],
	dependencies: Partial<CliDependencies> = {},
): Promise<number> {
	const deps: CliDependencies = {
		cwd: dependencies.cwd ?? (() => Deno.cwd()),
		readTextFile: dependencies.readTextFile ?? Deno.readTextFile,
		writeTextFile: dependencies.writeTextFile ?? Deno.writeTextFile,
		runGit: dependencies.runGit ?? runGitCommand,
	};

	const options = parseArgs(args, deps.cwd());
	const fromRef = options.fromRef ??
		await resolveDefaultFromRef(options.toRef, options.tag, deps.runGit);
	const commitLog = await readCommitLog(options.toRef, fromRef, deps.runGit);
	const notesFromGit = renderReleaseNotes(parseCommitLog(commitLog));

	let finalNotes = notesFromGit.trim();
	if (finalNotes.length === 0) {
		const fallbackContent = await deps.readTextFile(options.fallbackFile);
		finalNotes = extractChangelogNotes(fallbackContent, options.tag);
	}
	if (finalNotes.length === 0) {
		finalNotes = "No release notes available.";
	}

	await deps.writeTextFile(options.outputFile, `${finalNotes}\n`);
	return 0;
}

/**
 * Parses command-line arguments.
 */
export function parseArgs(args: string[], projectRoot: string): CliOptions {
	const parsed: CliOptions = {
		fromRef: null,
		toRef: "HEAD",
		tag: null,
		outputFile: join(projectRoot, DEFAULT_OUTPUT),
		fallbackFile: join(projectRoot, DEFAULT_FALLBACK),
	};

	for (const arg of args) {
		if (arg.startsWith("--from=")) {
			parsed.fromRef = arg.slice("--from=".length).trim();
			continue;
		}
		if (arg.startsWith("--to=")) {
			parsed.toRef = arg.slice("--to=".length).trim();
			continue;
		}
		if (arg.startsWith("--tag=")) {
			parsed.tag = arg.slice("--tag=".length).trim();
			continue;
		}
		if (arg.startsWith("--output=")) {
			parsed.outputFile = resolvePath(
				projectRoot,
				arg.slice("--output=".length).trim(),
			);
			continue;
		}
		if (arg.startsWith("--fallback-file=")) {
			parsed.fallbackFile = resolvePath(
				projectRoot,
				arg.slice("--fallback-file=".length).trim(),
			);
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	if (parsed.toRef.length === 0) {
		throw new Error("--to cannot be empty");
	}
	if (parsed.fromRef != null && parsed.fromRef.length === 0) {
		parsed.fromRef = null;
	}
	if (parsed.tag != null && parsed.tag.length === 0) {
		parsed.tag = null;
	}
	return parsed;
}

function resolvePath(projectRoot: string, value: string): string {
	if (value.startsWith("/")) {
		return value;
	}
	return join(projectRoot, value);
}

if (import.meta.main) {
	const exitCode = await main(Deno.args);
	Deno.exit(exitCode);
}
