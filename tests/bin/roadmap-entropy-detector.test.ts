import {
	assert,
	assertEquals,
	assertStringIncludes,
} from "@std/testing/asserts";
import {
	maybeRunMain,
	runRoadmapEntropyDetectorCli,
} from "../../bin/roadmap-entropy-detector.ts";

/**
 * Creates an async file reader backed by in-memory content.
 */
function createReadTextFile(
	fileMap: Record<string, string>,
): (path: string) => Promise<string> {
	return (path: string): Promise<string> => {
		const file = fileMap[path];
		if (!file) {
			return Promise.reject(new Error(`ENOENT: '${path}'`));
		}
		return Promise.resolve(file);
	};
}

/**
 * Parses detector JSON output and returns the parsed object.
 */
function parseDetectorOutput(
	output: string | undefined,
): Record<string, number | string | object> {
	assert(output, "expected detector output");
	return JSON.parse(output);
}

/**
 * Builds a JSON file map for baseline/current snapshots.
 */
function createSnapshotFiles(
	baseline: object,
	current: object,
): Record<string, string> {
	return {
		"./baseline.json": JSON.stringify(baseline),
		"./current.json": JSON.stringify(current),
	};
}

Deno.test("returns help text", async () => {
	const result = await runRoadmapEntropyDetectorCli(
		["--help"],
		createReadTextFile({}),
	);

	assertEquals(result.exitCode, 0);
	assert(result.output);
	assertStringIncludes(result.output, "Usage: deno task roadmap-entropy");
});

Deno.test("supports deno task delimiter before options", async () => {
	const result = await runRoadmapEntropyDetectorCli(
		["--", "--help"],
		createReadTextFile({}),
	);

	assertEquals(result.exitCode, 0);
	assert(result.output);
	assertStringIncludes(result.output, "Usage: deno task roadmap-entropy");
});

Deno.test("detects unchanged roadmap as healthy", async () => {
	const files = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "in_progress",
				targetDate: "2026-04-10",
				scopePoints: 3,
			}],
		},
		{
			items: [{
				id: "A",
				status: "in_progress",
				targetDate: "2026-04-10",
				scopePoints: 3,
			}],
		},
	);

	const result = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--today",
			"2026-04-01",
		],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 0);
	const output = parseDetectorOutput(result.output);
	assertEquals(output.status, "healthy");
	assertEquals((output.metrics as Record<string, number>).creepCount, 0);
	assertEquals((output.metrics as Record<string, number>).driftCount, 0);
});

Deno.test("flags scope creep and exits non-zero with strict thresholds", async () => {
	const files = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "in_progress",
				targetDate: "2026-05-01",
				scopePoints: 2,
			}],
		},
		{
			items: [{
				id: "A",
				status: "in_progress",
				targetDate: "2026-05-01",
				scopePoints: 4,
			}],
		},
	);

	const result = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--today",
			"2026-04-01",
		],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 2);
	const output = parseDetectorOutput(result.output);
	assertEquals((output.metrics as Record<string, number>).creepCount, 1);
	assertEquals((output.metrics as Record<string, number>).driftCount, 0);
	const creepFindings = (output.findings as Record<string, object>)
		.creep as Array<Record<string, string | number>>;
	assertEquals(creepFindings[0].reason, "scope_increase");
});

Deno.test("flags drift-only via target-date slip", async () => {
	const files = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-04-01",
				tasks: ["T1", "T2"],
			}],
		},
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-04-05",
				tasks: ["T1", "T2"],
			}],
		},
	);

	const result = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--today",
			"2026-04-01",
			"--max-creep-findings",
			"10",
		],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 2);
	const output = parseDetectorOutput(result.output);
	assertEquals((output.metrics as Record<string, number>).creepCount, 0);
	assertEquals((output.metrics as Record<string, number>).driftCount, 1);
	const driftFindings = (output.findings as Record<string, object>)
		.drift as Array<Record<string, string | number | boolean>>;
	assertEquals(driftFindings[0].slipDays, 4);
	assertEquals(driftFindings[0].overdue, false);
});

Deno.test("handles mixed findings and entropy threshold gate", async () => {
	const files = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "in_progress",
				targetDate: "2026-03-01",
				scopePoints: 1,
			}],
		},
		{
			items: [
				{
					id: "A",
					status: "in_progress",
					targetDate: "2026-03-10",
					scopePoints: 3,
				},
				{
					id: "B",
					status: "blocked",
					targetDate: "2026-02-01",
					scopePoints: 2,
				},
			],
		},
	);

	const result = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--today",
			"2026-03-31",
			"--max-creep-findings",
			"5",
			"--max-drift-findings",
			"5",
			"--max-entropy-score",
			"5",
		],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 2);
	const output = parseDetectorOutput(result.output);
	assertEquals(output.status, "alert");
	assertEquals((output.metrics as Record<string, number>).creepCount, 2);
	assertEquals((output.metrics as Record<string, number>).driftCount, 2);
	assertEquals((output.exceeded as Record<string, boolean>).entropy, true);
	assertEquals((output.exceeded as Record<string, boolean>).creep, false);
	assertEquals((output.exceeded as Record<string, boolean>).drift, false);
});

Deno.test("supports threshold equality as healthy and stricter threshold as alert", async () => {
	const files = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "in_progress",
				targetDate: "2026-06-01",
				scopePoints: 1,
			}],
		},
		{
			items: [{
				id: "A",
				status: "in_progress",
				targetDate: "2026-06-01",
				scopePoints: 2,
			}],
		},
	);

	const healthyResult = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--today",
			"2026-05-01",
			"--max-creep-findings",
			"1",
			"--max-entropy-score",
			"999",
		],
		createReadTextFile(files),
	);
	assertEquals(healthyResult.exitCode, 0);

	const alertResult = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--today",
			"2026-05-01",
			"--max-creep-findings",
			"0",
			"--max-entropy-score",
			"999",
		],
		createReadTextFile(files),
	);
	assertEquals(alertResult.exitCode, 2);
});

Deno.test("tracks removed items and respects scope threshold option", async () => {
	const files = createSnapshotFiles(
		{
			items: [
				{
					id: "A",
					status: "done",
					targetDate: "2026-01-01",
					scopePoints: 2,
				},
				{
					id: "B",
					status: "done",
					targetDate: "2026-01-01",
					scopePoints: 1,
				},
			],
		},
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 3,
			}],
		},
	);

	const result = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--scope-increase-threshold-pct",
			"60",
			"--max-creep-findings",
			"10",
			"--max-drift-findings",
			"10",
			"--max-entropy-score",
			"999",
		],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 0);
	const output = parseDetectorOutput(result.output);
	assertEquals(
		(output.metrics as Record<string, number>).removedItemCount,
		1,
	);
	assertEquals((output.metrics as Record<string, number>).creepCount, 0);
});

Deno.test("handles zero baseline and zero current scope without creep", async () => {
	const files = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 0,
			}],
		},
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 0,
			}],
		},
	);

	const result = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--max-entropy-score",
			"999",
		],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 0);
	const output = parseDetectorOutput(result.output);
	assertEquals((output.metrics as Record<string, number>).creepCount, 0);
});

Deno.test("returns error for malformed schema", async () => {
	const files = {
		"./baseline.json": JSON.stringify({ items: { id: "A" } }),
		"./current.json": JSON.stringify({ items: [] }),
	};

	const result = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 1);
	assert(result.error);
	assertStringIncludes(
		result.error,
		"baseline snapshot items must be an array",
	);
});

Deno.test("returns error when snapshot root is not an object", async () => {
	const result = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile({
			"./baseline.json": "[]",
			"./current.json": '{"items":[]}',
		}),
	);

	assertEquals(result.exitCode, 1);
	assert(result.error);
	assertStringIncludes(result.error, "baseline snapshot must be an object");
});

Deno.test("returns error for duplicate ids", async () => {
	const files = createSnapshotFiles(
		{
			items: [
				{
					id: "A",
					status: "done",
					targetDate: "2026-01-01",
					scopePoints: 1,
				},
				{
					id: "A",
					status: "done",
					targetDate: "2026-01-01",
					scopePoints: 1,
				},
			],
		},
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 1,
			}],
		},
	);

	const result = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile(files),
	);

	assertEquals(result.exitCode, 1);
	assert(result.error);
	assertStringIncludes(result.error, "duplicate item id");
});

Deno.test("returns error for missing id and invalid option values", async () => {
	const files = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 1,
			}],
		},
		{
			items: [{
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 1,
			}],
		},
	);

	const missingIdResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile(files),
	);
	assertEquals(missingIdResult.exitCode, 1);
	assert(missingIdResult.error);
	assertStringIncludes(missingIdResult.error, "non-empty id");

	const invalidOptionResult = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--max-drift-findings",
			"-1",
		],
		createReadTextFile(files),
	);
	assertEquals(invalidOptionResult.exitCode, 1);
	assert(invalidOptionResult.error);
	assertStringIncludes(invalidOptionResult.error, "non-negative number");
});

Deno.test("returns error for missing baseline option", async () => {
	const result = await runRoadmapEntropyDetectorCli(
		["--current", "./current.json"],
		createReadTextFile({ "./current.json": JSON.stringify({ items: [] }) }),
	);

	assertEquals(result.exitCode, 1);
	assert(result.error);
	assertStringIncludes(result.error, "--baseline is required");
});

Deno.test("returns error for missing scope and invalid tasks payload", async () => {
	const filesMissingScope = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 1,
			}],
		},
		{
			items: [{ id: "A", status: "done", targetDate: "2026-01-01" }],
		},
	);

	const missingScopeResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile(filesMissingScope),
	);
	assertEquals(missingScopeResult.exitCode, 1);
	assert(missingScopeResult.error);
	assertStringIncludes(missingScopeResult.error, "scopePoints or tasks");

	const filesInvalidTasks = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				tasks: ["x"],
			}],
		},
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				tasks: ["x", 1],
			}],
		},
	);

	const invalidTasksResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile(filesInvalidTasks),
	);
	assertEquals(invalidTasksResult.exitCode, 1);
	assert(invalidTasksResult.error);
	assertStringIncludes(
		invalidTasksResult.error,
		"tasks must contain only strings",
	);
});

Deno.test("returns error for empty status, invalid targetDate type, and negative scopePoints", async () => {
	const emptyStatusResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile({
			"./baseline.json": JSON.stringify({
				items: [{
					id: "A",
					status: "",
					targetDate: "2026-01-01",
					scopePoints: 1,
				}],
			}),
			"./current.json": JSON.stringify({ items: [] }),
		}),
	);
	assertEquals(emptyStatusResult.exitCode, 1);
	assert(emptyStatusResult.error);
	assertStringIncludes(emptyStatusResult.error, "non-empty status");

	const invalidTargetDateTypeResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile({
			"./baseline.json": JSON.stringify({
				items: [{
					id: "A",
					status: "done",
					targetDate: 1,
					scopePoints: 1,
				}],
			}),
			"./current.json": JSON.stringify({ items: [] }),
		}),
	);
	assertEquals(invalidTargetDateTypeResult.exitCode, 1);
	assert(invalidTargetDateTypeResult.error);
	assertStringIncludes(
		invalidTargetDateTypeResult.error,
		"targetDate string",
	);

	const negativeScopeResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile({
			"./baseline.json": JSON.stringify({
				items: [{
					id: "A",
					status: "done",
					targetDate: "2026-01-01",
					scopePoints: -1,
				}],
			}),
			"./current.json": JSON.stringify({ items: [] }),
		}),
	);
	assertEquals(negativeScopeResult.exitCode, 1);
	assert(negativeScopeResult.error);
	assertStringIncludes(negativeScopeResult.error, "non-negative number");
});

Deno.test("returns error for invalid date strings and invalid json", async () => {
	const filesInvalidDate = createSnapshotFiles(
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-13-01",
				scopePoints: 1,
			}],
		},
		{
			items: [{
				id: "A",
				status: "done",
				targetDate: "2026-01-01",
				scopePoints: 1,
			}],
		},
	);

	const invalidDateResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile(filesInvalidDate),
	);
	assertEquals(invalidDateResult.exitCode, 1);
	assert(invalidDateResult.error);
	assertStringIncludes(invalidDateResult.error, "YYYY-MM-DD");

	const invalidTodayResult = await runRoadmapEntropyDetectorCli(
		[
			"--baseline",
			"./baseline.json",
			"--current",
			"./current.json",
			"--today",
			"bad-date",
		],
		createReadTextFile(createSnapshotFiles({ items: [] }, { items: [] })),
	);
	assertEquals(invalidTodayResult.exitCode, 1);
	assert(invalidTodayResult.error);
	assertStringIncludes(
		invalidTodayResult.error,
		"--today must use YYYY-MM-DD format",
	);

	const invalidJsonResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		createReadTextFile({ "./baseline.json": "{", "./current.json": "{}" }),
	);
	assertEquals(invalidJsonResult.exitCode, 1);
	assert(invalidJsonResult.error);
	assertStringIncludes(invalidJsonResult.error, "Could not parse JSON");
});

Deno.test("handles non-Error throws in catch path", async () => {
	const result = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json", "--current", "./current.json"],
		(): Promise<string> => Promise.reject("raw-failure"),
	);

	assertEquals(result.exitCode, 1);
	assert(result.error);
	assertStringIncludes(result.error, "raw-failure");
});

Deno.test("returns argument errors for unsupported and incomplete options", async () => {
	const unsupportedResult = await runRoadmapEntropyDetectorCli(
		["--wat"],
		createReadTextFile({}),
	);
	assertEquals(unsupportedResult.exitCode, 1);
	assert(unsupportedResult.error);
	assertStringIncludes(unsupportedResult.error, "unsupported option");

	const missingValueResult = await runRoadmapEntropyDetectorCli([
		"--baseline",
	], createReadTextFile({}));
	assertEquals(missingValueResult.exitCode, 1);
	assert(missingValueResult.error);
	assertStringIncludes(missingValueResult.error, "requires a value");

	const missingCurrentResult = await runRoadmapEntropyDetectorCli(
		["--baseline", "./baseline.json"],
		createReadTextFile({
			"./baseline.json": JSON.stringify({ items: [] }),
		}),
	);
	assertEquals(missingCurrentResult.exitCode, 1);
	assert(missingCurrentResult.error);
	assertStringIncludes(missingCurrentResult.error, "--current is required");
});

Deno.test("maybeRunMain is a no-op when not running as main", async () => {
	let stdout = "";
	let stderr = "";
	let exitCode = -1;

	await maybeRunMain(false, ["--help"], {
		readTextFile: (): Promise<string> => Promise.resolve(""),
		writeStdout: (message: string): void => {
			stdout = message;
		},
		writeStderr: (message: string): void => {
			stderr = message;
		},
		exit: (code: number): void => {
			exitCode = code;
		},
	});

	assertEquals(stdout, "");
	assertEquals(stderr, "");
	assertEquals(exitCode, -1);
});

Deno.test("maybeRunMain writes output for success and does not exit", async () => {
	let stdout = "";
	let stderr = "";
	let exitCode = -1;

	await maybeRunMain(true, ["--help"], {
		readTextFile: (): Promise<string> => Promise.resolve(""),
		writeStdout: (message: string): void => {
			stdout = message;
		},
		writeStderr: (message: string): void => {
			stderr = message;
		},
		exit: (code: number): void => {
			exitCode = code;
		},
	});

	assertStringIncludes(stdout, "Usage: deno task roadmap-entropy");
	assertEquals(stderr, "");
	assertEquals(exitCode, -1);
});

Deno.test("maybeRunMain writes stderr and exits for errors", async () => {
	let stdout = "";
	let stderr = "";
	let exitCode = -1;

	await maybeRunMain(true, ["--baseline"], {
		readTextFile: (): Promise<string> => Promise.resolve(""),
		writeStdout: (message: string): void => {
			stdout = message;
		},
		writeStderr: (message: string): void => {
			stderr = message;
		},
		exit: (code: number): void => {
			exitCode = code;
		},
	});

	assertEquals(stdout, "");
	assertStringIncludes(stderr, "Invalid arguments");
	assertEquals(exitCode, 1);
});
