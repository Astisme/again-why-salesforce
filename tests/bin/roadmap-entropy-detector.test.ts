import { assertEquals, assertMatch } from "@std/testing/asserts";
import {
	analyzeSnapshots,
	computeScopeGrowthRatio,
	getUsage,
	parseArgs,
	runCli,
	toEpochDay,
	validateSnapshot,
} from "../../bin/roadmap-entropy-detector.ts";

type CliRunResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

type ItemInput = {
	id: string;
	status: string;
	targetDate: string;
	scopePoints?: number;
	tasks?: string[];
};

type SnapshotInput = {
	items: ItemInput[];
};

const DEFAULT_TODAY = new Date("2026-03-31T00:00:00.000Z");

/**
 * Creates a JSON string from a snapshot input object.
 *
 * @param {SnapshotInput} snapshot Snapshot object to serialize.
 * @returns {string} Serialized snapshot JSON.
 */
function serializeSnapshot(snapshot: SnapshotInput): string {
	return JSON.stringify(snapshot);
}

/**
 * Executes the CLI with injected files and captures outputs.
 *
 * @param {{
 *   args: string[];
 *   files: Record<string, string>;
 *   nowDate?: Date;
 * }} input CLI fixture input.
 * @returns {Promise<CliRunResult>} Exit code and output streams.
 */
async function runCliWithFiles({
	args,
	files,
	nowDate = DEFAULT_TODAY,
}: {
	args: string[];
	files: Record<string, string>;
	nowDate?: Date;
}): Promise<CliRunResult> {
	let stdout = "";
	let stderr = "";
	const exitCode = await runCli({
		args,
		readTextFile: (path: string) => {
			if (Object.hasOwn(files, path)) {
				return Promise.resolve(files[path]);
			}
			throw new Error("file not found");
		},
		writeStdout: (text: string) => {
			stdout += text;
		},
		writeStderr: (text: string) => {
			stderr += text;
		},
		now: () => nowDate,
	});
	return {
		exitCode,
		stdout,
		stderr,
	};
}

/**
 * Parses newline-terminated JSON output into an object.
 *
 * @param {string} output JSON output payload.
 * @returns {Record<string, unknown>} Parsed object.
 */
function parseOutput(output: string): Record<string, unknown> {
	return JSON.parse(output) as Record<string, unknown>;
}

Deno.test("parseArgs returns defaults and required paths", () => {
	const config = parseArgs(
		["--baseline", "base.json", "--current", "curr.json"],
		new Date("2026-03-10T00:00:00.000Z"),
	);
	assertEquals(config.baselinePath, "base.json");
	assertEquals(config.currentPath, "curr.json");
	assertEquals(config.today, "2026-03-10");
	assertEquals(config.thresholds, {
		scopeThreshold: 0.1,
		driftDaysThreshold: 0,
		maxCreep: 0,
		maxDrift: 0,
		maxEntropy: 0,
	});

	const configWithOverrides = parseArgs(
		[
			"--baseline",
			"base.json",
			"--current",
			"curr.json",
			"--scope-threshold",
			"0.25",
		],
		DEFAULT_TODAY,
	);
	assertEquals(configWithOverrides.thresholds.scopeThreshold, 0.25);
});

Deno.test("parseArgs throws on unknown options and bad numeric values", () => {
	assertEquals(getUsage().includes("Roadmap Entropy Detector"), true);
	try {
		parseArgs(["--baseline", "a", "--current", "b", "--x"], DEFAULT_TODAY);
		throw new Error("Expected parseArgs to throw on unknown option.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "Unknown option: --x");
	}
	try {
		parseArgs(
			[
				"--baseline",
				"a",
				"--current",
				"b",
				"--drift-days-threshold",
				"0.5",
			],
			DEFAULT_TODAY,
		);
		throw new Error("Expected parseArgs to reject non-integer drift threshold.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(
			error.message,
			"--drift-days-threshold must be a non-negative integer.",
		);
	}
	try {
		parseArgs(
			[
				"--baseline",
				"a",
				"--current",
				"b",
				"--scope-threshold",
				"-1",
			],
			DEFAULT_TODAY,
		);
		throw new Error("Expected parseArgs to reject negative scope threshold.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(
			error.message,
			"--scope-threshold must be a non-negative number.",
		);
	}
	try {
		parseArgs(["--baseline"], DEFAULT_TODAY);
		throw new Error("Expected parseArgs to reject missing option value.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "--baseline requires a value.");
	}
	try {
		parseArgs([], DEFAULT_TODAY);
		throw new Error("Expected parseArgs to reject missing required arguments.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "--baseline is required.");
	}
	try {
		parseArgs(["--baseline", "a"], DEFAULT_TODAY);
		throw new Error("Expected parseArgs to require --current.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "--current is required.");
	}
});

Deno.test("toEpochDay validates date format and calendar dates", () => {
	assertEquals(toEpochDay("2026-03-31", "today") > 0, true);
	try {
		toEpochDay("2026/03/31", "today");
		throw new Error("Expected invalid format to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "today must be in YYYY-MM-DD format.");
	}
	try {
		toEpochDay("2026-02-30", "today");
		throw new Error("Expected invalid date to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "today is not a valid calendar date.");
	}
});

Deno.test("validateSnapshot accepts tasks-based scope and rejects duplicates", () => {
	const validSnapshot = validateSnapshot(
		{
			items: [
				{
					id: "item-1",
					status: "planned",
					targetDate: "2026-04-10",
					tasks: ["a", "b"],
				},
			],
		},
		"baseline",
	);
	assertEquals(validSnapshot.items[0].scopeSize, 2);

	try {
		validateSnapshot([], "baseline");
		throw new Error("Expected non-object snapshot to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "baseline must be a JSON object.");
	}

	try {
		validateSnapshot(
			{
				items: [5],
			},
			"baseline",
		);
		throw new Error("Expected non-object item to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "baseline.items[0] must be an object.");
	}

	try {
		validateSnapshot(
			{
				items: [
					{
						id: "bad-status",
						status: "",
						targetDate: "2026-04-10",
						scopePoints: 1,
					},
				],
			},
			"baseline",
		);
		throw new Error("Expected empty status to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(
			error.message,
			"baseline.items[0].status must be a non-empty string.",
		);
	}

	try {
		validateSnapshot(
			{
				items: [
					{
						id: "bad-date",
						status: "planned",
						targetDate: 123,
						scopePoints: 1,
					},
				],
			},
			"baseline",
		);
		throw new Error("Expected non-string date to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(
			error.message,
			"baseline.items[0].targetDate must be a string in YYYY-MM-DD format.",
		);
	}

	try {
		validateSnapshot(
			{
				items: [
					{
						id: "bad-scope",
						status: "planned",
						targetDate: "2026-04-10",
						scopePoints: -1,
					},
				],
			},
			"baseline",
		);
		throw new Error("Expected invalid scopePoints to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(
			error.message,
			"baseline.items[0].scopePoints must be a non-negative number when provided.",
		);
	}

	try {
		validateSnapshot(
			{
				items: [
					{
						id: "bad-scope-source",
						status: "planned",
						targetDate: "2026-04-10",
					},
				],
			},
			"baseline",
		);
		throw new Error("Expected missing scope source to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(
			error.message,
			"baseline.items[0] must include scopePoints or tasks.",
		);
	}

	try {
		validateSnapshot(
			{
				items: [
					{
						id: "dup",
						status: "planned",
						targetDate: "2026-04-10",
						scopePoints: 1,
					},
					{
						id: "dup",
						status: "planned",
						targetDate: "2026-04-12",
						scopePoints: 2,
					},
				],
			},
			"current",
		);
		throw new Error("Expected duplicate IDs to throw.");
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}
		assertEquals(error.message, "current.items contains a duplicate id: dup");
	}
});

Deno.test("computeScopeGrowthRatio covers zero-baseline cases", () => {
	assertEquals(computeScopeGrowthRatio(10, 12), 0.2);
	assertEquals(computeScopeGrowthRatio(0, 0), 0);
	assertEquals(computeScopeGrowthRatio(0, 3), Number.POSITIVE_INFINITY);
});

Deno.test("analyzeSnapshots detects creep, slip drift, overdue drift, and entropy gates", () => {
	const baseline = validateSnapshot(
		{
			items: [
				{
					id: "a",
					status: "planned",
					targetDate: "2026-04-01",
					scopePoints: 5,
				},
				{
					id: "b",
					status: "planned",
					targetDate: "2026-03-20",
					scopePoints: 3,
				},
			],
		},
		"baseline",
	);
	const current = validateSnapshot(
		{
			items: [
				{
					id: "a",
					status: "in_progress",
					targetDate: "2026-04-05",
					scopePoints: 8,
				},
				{
					id: "b",
					status: "in_progress",
					targetDate: "2026-03-20",
					scopePoints: 3,
				},
				{
					id: "c",
					status: "planned",
					targetDate: "2026-04-10",
					scopePoints: 2,
				},
			],
		},
		"current",
	);
	const result = analyzeSnapshots(
		baseline,
		current,
		{
			scopeThreshold: 0.1,
			driftDaysThreshold: 0,
			maxCreep: 1,
			maxDrift: 1,
			maxEntropy: 1,
		},
		"2026-03-31",
	);

	assertEquals(result.status, "alert");
	assertEquals(result.summary.creepCount, 2);
	assertEquals(result.summary.driftCount, 2);
	assertEquals(result.findings.scopeCreep[0].type, "scope_increase");
	assertEquals(result.findings.scopeCreep[1].type, "new_item");
	assertEquals(result.findings.scheduleDrift[0].type, "target_slip");
	assertEquals(result.findings.scheduleDrift[1].type, "overdue_incomplete");
	assertEquals(result.gates.creepExceeded, true);
	assertEquals(result.gates.driftExceeded, true);
	assertEquals(result.gates.entropyExceeded, true);
});

Deno.test("analyzeSnapshots marks complete overdue items as non-drift and clean when unchanged", () => {
	const baseline = validateSnapshot(
		{
			items: [
				{
					id: "done-item",
					status: "planned",
					targetDate: "2026-03-20",
					scopePoints: 2,
				},
			],
		},
		"baseline",
	);
	const current = validateSnapshot(
		{
			items: [
				{
					id: "done-item",
					status: "done",
					targetDate: "2026-03-20",
					scopePoints: 2,
				},
			],
		},
		"current",
	);
	const result = analyzeSnapshots(
		baseline,
		current,
		{
			scopeThreshold: 0.2,
			driftDaysThreshold: 1,
			maxCreep: 0,
			maxDrift: 0,
			maxEntropy: 0,
		},
		"2026-03-31",
	);

	assertEquals(result.status, "ok");
	assertEquals(result.summary.creepCount, 0);
	assertEquals(result.summary.driftCount, 0);
	assertEquals(result.summary.entropyScore, 0);
	assertEquals(result.gates.entropyExceeded, false);
});

Deno.test("analyzeSnapshots uses current target date as baseline for overdue new items", () => {
	const baseline = validateSnapshot(
		{
			items: [],
		},
		"baseline",
	);
	const current = validateSnapshot(
		{
			items: [
				{
					id: "new-overdue",
					status: "in_progress",
					targetDate: "2026-03-10",
					scopePoints: 2,
				},
			],
		},
		"current",
	);
	const result = analyzeSnapshots(
		baseline,
		current,
		{
			scopeThreshold: 0.1,
			driftDaysThreshold: 0,
			maxCreep: 10,
			maxDrift: 10,
			maxEntropy: 100,
		},
		"2026-03-31",
	);
	assertEquals(result.summary.driftCount, 1);
	assertEquals(result.findings.scheduleDrift[0].baselineTargetDate, "2026-03-10");
});

Deno.test("runCli returns healthy status and zero exit code for unchanged roadmap", async () => {
	const baseSnapshot = serializeSnapshot({
		items: [
			{
				id: "alpha",
				status: "planned",
				targetDate: "2026-04-20",
				scopePoints: 3,
			},
		],
	});
	const result = await runCliWithFiles({
		args: ["--baseline", "base.json", "--current", "current.json"],
		files: {
			"base.json": baseSnapshot,
			"current.json": baseSnapshot,
		},
	});
	assertEquals(result.exitCode, 0);
	assertEquals(result.stderr, "");
	const payload = parseOutput(result.stdout);
	assertEquals(payload.status, "ok");
	assertEquals(
		(payload.summary as Record<string, unknown>).entropyScore,
		0,
	);
});

Deno.test("runCli detects creep-only scenarios", async () => {
	const result = await runCliWithFiles({
		args: [
			"--baseline",
			"baseline.json",
			"--current",
			"current.json",
			"--today",
			"2026-03-01",
		],
		files: {
			"baseline.json": serializeSnapshot({
				items: [
					{
						id: "creep",
						status: "planned",
						targetDate: "2026-04-20",
						scopePoints: 5,
					},
				],
			}),
			"current.json": serializeSnapshot({
				items: [
					{
						id: "creep",
						status: "planned",
						targetDate: "2026-04-20",
						scopePoints: 7,
					},
				],
			}),
		},
	});

	assertEquals(result.exitCode, 1);
	const payload = parseOutput(result.stdout);
	assertEquals(payload.status, "alert");
	assertEquals((payload.summary as Record<string, unknown>).creepCount, 1);
	assertEquals((payload.summary as Record<string, unknown>).driftCount, 0);
});

Deno.test("runCli detects drift-only scenarios", async () => {
	const result = await runCliWithFiles({
		args: [
			"--baseline",
			"baseline.json",
			"--current",
			"current.json",
			"--today",
			"2026-03-31",
		],
		files: {
			"baseline.json": serializeSnapshot({
				items: [
					{
						id: "drift",
						status: "planned",
						targetDate: "2026-03-15",
						scopePoints: 2,
					},
				],
			}),
			"current.json": serializeSnapshot({
				items: [
					{
						id: "drift",
						status: "in_progress",
						targetDate: "2026-03-30",
						scopePoints: 2,
					},
				],
			}),
		},
	});

	assertEquals(result.exitCode, 1);
	const payload = parseOutput(result.stdout);
	assertEquals((payload.summary as Record<string, unknown>).creepCount, 0);
	assertEquals((payload.summary as Record<string, unknown>).driftCount, 2);
});

Deno.test("runCli supports threshold overrides to allow findings", async () => {
	const result = await runCliWithFiles({
		args: [
			"--baseline",
			"baseline.json",
			"--current",
			"current.json",
			"--today",
			"2026-03-31",
			"--max-creep",
			"5",
			"--max-drift",
			"5",
			"--max-entropy",
			"10",
		],
		files: {
			"baseline.json": serializeSnapshot({
				items: [
					{
						id: "x",
						status: "planned",
						targetDate: "2026-03-15",
						scopePoints: 1,
					},
				],
			}),
			"current.json": serializeSnapshot({
				items: [
					{
						id: "x",
						status: "in_progress",
						targetDate: "2026-03-20",
						scopePoints: 3,
					},
				],
			}),
		},
	});

	assertEquals(result.exitCode, 0);
	const payload = parseOutput(result.stdout);
	assertEquals(payload.status, "ok");
});

Deno.test("runCli reports malformed schema and missing IDs", async () => {
	const malformed = await runCliWithFiles({
		args: ["--baseline", "bad.json", "--current", "ok.json"],
		files: {
			"bad.json": JSON.stringify({ noItems: [] }),
			"ok.json": serializeSnapshot({
				items: [
					{
						id: "ok",
						status: "planned",
						targetDate: "2026-05-01",
						scopePoints: 1,
					},
				],
			}),
		},
	});
	assertEquals(malformed.exitCode, 2);
	assertEquals(malformed.stdout, "");
	assertMatch(malformed.stderr, /baseline\.items must be an array/);

	const missingId = await runCliWithFiles({
		args: ["--baseline", "bad-id.json", "--current", "ok.json"],
		files: {
			"bad-id.json": JSON.stringify({
				items: [
					{
						status: "planned",
						targetDate: "2026-05-01",
						scopePoints: 1,
					},
				],
			}),
			"ok.json": serializeSnapshot({
				items: [
					{
						id: "ok",
						status: "planned",
						targetDate: "2026-05-01",
						scopePoints: 1,
					},
				],
			}),
		},
	});
	assertEquals(missingId.exitCode, 2);
	assertMatch(missingId.stderr, /baseline\.items\[0\]\.id must be a non-empty string/);
});

Deno.test("runCli handles help output, invalid json, and missing files", async () => {
	const helpResult = await runCliWithFiles({
		args: ["--help"],
		files: {},
	});
	assertEquals(helpResult.exitCode, 0);
	assertEquals(helpResult.stderr, "");
	assertMatch(helpResult.stdout, /Roadmap Entropy Detector/);

	const invalidJson = await runCliWithFiles({
		args: ["--baseline", "base.json", "--current", "current.json"],
		files: {
			"base.json": "{",
			"current.json": serializeSnapshot({
				items: [
					{
						id: "ok",
						status: "planned",
						targetDate: "2026-05-01",
						scopePoints: 1,
					},
				],
			}),
		},
	});
	assertEquals(invalidJson.exitCode, 2);
	assertMatch(invalidJson.stderr, /baseline is not valid JSON/);

	const missingFile = await runCliWithFiles({
		args: ["--baseline", "base.json", "--current", "missing.json"],
		files: {
			"base.json": serializeSnapshot({
				items: [
					{
						id: "ok",
						status: "planned",
						targetDate: "2026-05-01",
						scopePoints: 1,
					},
				],
			}),
		},
	});
	assertEquals(missingFile.exitCode, 2);
	assertMatch(missingFile.stderr, /Cannot read current file/);
});

Deno.test("runCli returns parse errors through stderr payload", async () => {
	const parseError = await runCliWithFiles({
		args: ["--baseline", "base.json", "--current", "current.json", "--unknown"],
		files: {},
	});
	assertEquals(parseError.exitCode, 2);
	assertEquals(parseError.stdout, "");
	assertMatch(parseError.stderr, /Unknown option: --unknown/);
});

Deno.test("CLI subprocess executes import.meta.main path", async () => {
	const tempDir = await Deno.makeTempDir();
	try {
		const baselinePath = `${tempDir}/baseline.json`;
		const currentPath = `${tempDir}/current.json`;
		await Deno.writeTextFile(
			baselinePath,
			serializeSnapshot({
				items: [
					{
						id: "subprocess",
						status: "planned",
						targetDate: "2026-05-01",
						scopePoints: 1,
					},
				],
			}),
		);
		await Deno.writeTextFile(
			currentPath,
			serializeSnapshot({
				items: [
					{
						id: "subprocess",
						status: "planned",
						targetDate: "2026-05-01",
						scopePoints: 1,
					},
				],
			}),
		);
		const cliFile = new URL(
			"../../bin/roadmap-entropy-detector.ts",
			import.meta.url,
		).pathname;
		const output = await new Deno.Command(Deno.execPath(), {
			args: [
				"run",
				"--allow-read",
				cliFile,
				"--baseline",
				baselinePath,
				"--current",
				currentPath,
			],
			stdout: "piped",
			stderr: "piped",
		}).output();

		const stdoutText = new TextDecoder().decode(output.stdout);
		const stderrText = new TextDecoder().decode(output.stderr);
		assertEquals(output.code, 0);
		assertEquals(stderrText, "");
		const payload = parseOutput(stdoutText);
		assertEquals(payload.status, "ok");
	} finally {
		await Deno.remove(tempDir, { recursive: true });
	}
});

Deno.test("CLI subprocess writes stderr for invalid arguments", async () => {
	const cliFile = new URL(
		"../../bin/roadmap-entropy-detector.ts",
		import.meta.url,
	).pathname;
	const output = await new Deno.Command(Deno.execPath(), {
		args: [
			"run",
			"--allow-read",
			cliFile,
			"--baseline",
			"only-baseline.json",
		],
		stdout: "piped",
		stderr: "piped",
	}).output();

	const stdoutText = new TextDecoder().decode(output.stdout);
	const stderrText = new TextDecoder().decode(output.stderr);
	assertEquals(output.code, 2);
	assertEquals(stdoutText, "");
	assertMatch(stderrText, /--current is required/);
});
