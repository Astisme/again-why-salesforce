#!/usr/bin/env -S deno run --allow-read

const DEFAULT_SCOPE_THRESHOLD = 0.1;
const DEFAULT_DRIFT_DAYS_THRESHOLD = 0;
const DEFAULT_MAX_CREEP = 0;
const DEFAULT_MAX_DRIFT = 0;
const DEFAULT_MAX_ENTROPY = 0;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const COMPLETE_STATUSES = new Set(["done", "completed", "closed", "shipped"]);

const ERROR_PREFIX = "error";
const ALERT_STATUS = "alert";
const OK_STATUS = "ok";

type JsonRecord = Record<string, unknown>;

type SnapshotItem = {
	id: string;
	status: string;
	targetDate: string;
	targetEpochDay: number;
	scopeSize: number;
};

type RoadmapSnapshot = {
	items: SnapshotItem[];
};

type ScopeCreepFinding = {
	type: "new_item" | "scope_increase";
	id: string;
	baselineScope: number;
	currentScope: number;
	scopeDelta: number;
	scopeGrowthRatio: number;
};

type DriftFinding = {
	type: "target_slip" | "overdue_incomplete";
	id: string;
	status: string;
	baselineTargetDate: string;
	currentTargetDate: string;
	slipDays: number;
	overdueDays: number;
};

type DetectorThresholds = {
	scopeThreshold: number;
	driftDaysThreshold: number;
	maxCreep: number;
	maxDrift: number;
	maxEntropy: number;
};

type DetectorResult = {
	status: "ok" | "alert";
	meta: {
		today: string;
	};
	thresholds: DetectorThresholds;
	summary: {
		baselineItemCount: number;
		currentItemCount: number;
		creepCount: number;
		driftCount: number;
		entropyScore: number;
	};
	findings: {
		scopeCreep: ScopeCreepFinding[];
		scheduleDrift: DriftFinding[];
	};
	gates: {
		creepExceeded: boolean;
		driftExceeded: boolean;
		entropyExceeded: boolean;
	};
};

type CliConfig = {
	baselinePath: string;
	currentPath: string;
	today: string;
	thresholds: DetectorThresholds;
};

type CliIo = {
	args: string[];
	readTextFile: (path: string) => Promise<string>;
	writeStdout: (text: string) => void;
	writeStderr: (text: string) => void;
	now: () => Date;
};

/**
 * Returns true when the value is a plain object.
 *
 * @param {unknown} value Value to inspect.
 * @returns {boolean} True when value is a JSON-like object.
 */
function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses a YYYY-MM-DD date and returns its UTC epoch-day value.
 *
 * @param {string} dateString Date string to parse.
 * @param {string} label Label used in error messages.
 * @returns {number} UTC epoch-day.
 */
export function toEpochDay(dateString: string, label: string): number {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		throw new Error(`${label} must be in YYYY-MM-DD format.`);
	}
	const [yearText, monthText, dayText] = dateString.split("-");
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const timestamp = Date.UTC(year, month - 1, day);
	const parsed = new Date(timestamp);
	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month - 1 ||
		parsed.getUTCDate() !== day
	) {
		throw new Error(`${label} is not a valid calendar date.`);
	}
	return Math.floor(timestamp / MS_PER_DAY);
}

/**
 * Formats an epoch-day back to YYYY-MM-DD.
 *
 * @param {number} epochDay UTC epoch-day.
 * @returns {string} Date string.
 */
function fromEpochDay(epochDay: number): string {
	return new Date(epochDay * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Parses a non-negative number argument.
 *
 * @param {string} raw Raw value from CLI arguments.
 * @param {string} label Option label for errors.
 * @returns {number} Parsed non-negative number.
 */
function parseNonNegativeNumber(raw: string, label: string): number {
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${label} must be a non-negative number.`);
	}
	return parsed;
}

/**
 * Parses a non-negative integer argument.
 *
 * @param {string} raw Raw value from CLI arguments.
 * @param {string} label Option label for errors.
 * @returns {number} Parsed non-negative integer.
 */
function parseNonNegativeInteger(raw: string, label: string): number {
	const parsed = parseNonNegativeNumber(raw, label);
	if (!Number.isInteger(parsed)) {
		throw new Error(`${label} must be a non-negative integer.`);
	}
	return parsed;
}

/**
 * Reads the next argument value from an argument vector.
 *
 * @param {string[]} args Full argument array.
 * @param {number} index Index of the current option.
 * @param {string} option Option name for errors.
 * @returns {{ value: string; nextIndex: number }} Parsed value and new index.
 */
function readOptionValue(args: string[], index: number, option: string) {
	const value = args[index + 1];
	if (value == null || value.startsWith("--")) {
		throw new Error(`${option} requires a value.`);
	}
	return { value, nextIndex: index + 1 };
}

/**
 * Builds the CLI usage output.
 *
 * @returns {string} Help text.
 */
export function getUsage(): string {
	return [
		"Roadmap Entropy Detector",
		"",
		"Usage:",
		"  deno run --allow-read bin/roadmap-entropy-detector.ts --baseline <path> --current <path> [options]",
		"",
		"Options:",
		"  --baseline <path>            Baseline roadmap JSON file (required)",
		"  --current <path>             Current roadmap JSON file (required)",
		"  --scope-threshold <number>   Scope growth ratio threshold (default: 0.1)",
		"  --drift-days-threshold <n>   Allowed target-date slip in days (default: 0)",
		"  --max-creep <n>              Maximum allowed creep findings (default: 0)",
		"  --max-drift <n>              Maximum allowed drift findings (default: 0)",
		"  --max-entropy <number>       Maximum allowed entropy score (default: 0)",
		"  --today <YYYY-MM-DD>         Override the reference date for overdue checks",
		"  --help                       Show this help",
	].join("\n");
}

/**
 * Parses CLI arguments into a detector configuration.
 *
 * @param {string[]} args Raw CLI arguments.
 * @param {Date} nowDate Reference date used when --today is omitted.
 * @returns {CliConfig} Parsed configuration.
 */
export function parseArgs(args: string[], nowDate: Date): CliConfig {
	let baselinePath = "";
	let currentPath = "";
	let scopeThreshold = DEFAULT_SCOPE_THRESHOLD;
	let driftDaysThreshold = DEFAULT_DRIFT_DAYS_THRESHOLD;
	let maxCreep = DEFAULT_MAX_CREEP;
	let maxDrift = DEFAULT_MAX_DRIFT;
	let maxEntropy = DEFAULT_MAX_ENTROPY;
	let today = nowDate.toISOString().slice(0, 10);

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		switch (arg) {
			case "--help":
				throw getUsage();
			case "--baseline": {
				const option = readOptionValue(args, index, "--baseline");
				baselinePath = option.value;
				index = option.nextIndex;
				break;
			}
			case "--current": {
				const option = readOptionValue(args, index, "--current");
				currentPath = option.value;
				index = option.nextIndex;
				break;
			}
			case "--scope-threshold": {
				const option = readOptionValue(args, index, "--scope-threshold");
				scopeThreshold = parseNonNegativeNumber(
					option.value,
					"--scope-threshold",
				);
				index = option.nextIndex;
				break;
			}
			case "--drift-days-threshold": {
				const option = readOptionValue(
					args,
					index,
					"--drift-days-threshold",
				);
				driftDaysThreshold = parseNonNegativeInteger(
					option.value,
					"--drift-days-threshold",
				);
				index = option.nextIndex;
				break;
			}
			case "--max-creep": {
				const option = readOptionValue(args, index, "--max-creep");
				maxCreep = parseNonNegativeInteger(option.value, "--max-creep");
				index = option.nextIndex;
				break;
			}
			case "--max-drift": {
				const option = readOptionValue(args, index, "--max-drift");
				maxDrift = parseNonNegativeInteger(option.value, "--max-drift");
				index = option.nextIndex;
				break;
			}
			case "--max-entropy": {
				const option = readOptionValue(args, index, "--max-entropy");
				maxEntropy = parseNonNegativeNumber(option.value, "--max-entropy");
				index = option.nextIndex;
				break;
			}
			case "--today": {
				const option = readOptionValue(args, index, "--today");
				toEpochDay(option.value, "--today");
				today = option.value;
				index = option.nextIndex;
				break;
			}
			default:
				throw new Error(`Unknown option: ${arg}`);
		}
	}

	if (!baselinePath) {
		throw new Error("--baseline is required.");
	}
	if (!currentPath) {
		throw new Error("--current is required.");
	}

	return {
		baselinePath,
		currentPath,
		today,
		thresholds: {
			scopeThreshold,
			driftDaysThreshold,
			maxCreep,
			maxDrift,
			maxEntropy,
		},
	};
}

/**
 * Converts a parsed item into a canonical snapshot item.
 *
 * @param {unknown} rawItem Parsed item value.
 * @param {string} snapshotLabel Label for error reporting.
 * @param {number} index Item index.
 * @returns {SnapshotItem} Canonical snapshot item.
 */
function parseSnapshotItem(
	rawItem: unknown,
	snapshotLabel: string,
	index: number,
): SnapshotItem {
	if (!isRecord(rawItem)) {
		throw new Error(`${snapshotLabel}.items[${index}] must be an object.`);
	}

	const id = rawItem.id;
	if (typeof id !== "string" || id.trim() === "") {
		throw new Error(`${snapshotLabel}.items[${index}].id must be a non-empty string.`);
	}

	const status = rawItem.status;
	if (typeof status !== "string" || status.trim() === "") {
		throw new Error(`${snapshotLabel}.items[${index}].status must be a non-empty string.`);
	}

	const targetDate = rawItem.targetDate;
	if (typeof targetDate !== "string") {
		throw new Error(`${snapshotLabel}.items[${index}].targetDate must be a string in YYYY-MM-DD format.`);
	}
	const targetEpochDay = toEpochDay(targetDate, `${snapshotLabel}.items[${index}].targetDate`);

	const scopePoints = rawItem.scopePoints;
	const tasks = rawItem.tasks;
	let scopeSize = 0;
	if (typeof scopePoints === "number") {
		if (!Number.isFinite(scopePoints) || scopePoints < 0) {
			throw new Error(`${snapshotLabel}.items[${index}].scopePoints must be a non-negative number when provided.`);
		}
		scopeSize = scopePoints;
	} else if (Array.isArray(tasks)) {
		scopeSize = tasks.length;
	} else {
		throw new Error(`${snapshotLabel}.items[${index}] must include scopePoints or tasks.`);
	}

	return {
		id,
		status,
		targetDate,
		targetEpochDay,
		scopeSize,
	};
}

/**
 * Validates a parsed roadmap snapshot value.
 *
 * @param {unknown} parsed Parsed JSON value.
 * @param {string} snapshotLabel Label for error reporting.
 * @returns {RoadmapSnapshot} Validated snapshot.
 */
export function validateSnapshot(
	parsed: unknown,
	snapshotLabel: string,
): RoadmapSnapshot {
	if (!isRecord(parsed)) {
		throw new Error(`${snapshotLabel} must be a JSON object.`);
	}
	if (!Array.isArray(parsed.items)) {
		throw new Error(`${snapshotLabel}.items must be an array.`);
	}

	const uniqueIds = new Set<string>();
	const items = parsed.items.map((item, index) => {
		const parsedItem = parseSnapshotItem(item, snapshotLabel, index);
		if (uniqueIds.has(parsedItem.id)) {
			throw new Error(`${snapshotLabel}.items contains a duplicate id: ${parsedItem.id}`);
		}
		uniqueIds.add(parsedItem.id);
		return parsedItem;
	});

	return { items };
}

/**
 * Computes a normalized growth ratio from baseline and current scope values.
 *
 * @param {number} baselineScope Baseline scope size.
 * @param {number} currentScope Current scope size.
 * @returns {number} Scope growth ratio.
 */
export function computeScopeGrowthRatio(
	baselineScope: number,
	currentScope: number,
): number {
	if (baselineScope === 0) {
		return currentScope > 0 ? Number.POSITIVE_INFINITY : 0;
	}
	return (currentScope - baselineScope) / baselineScope;
}

/**
 * Returns true when the status is considered complete.
 *
 * @param {string} status Status value from a roadmap item.
 * @returns {boolean} True when the status means complete.
 */
function isCompletedStatus(status: string): boolean {
	return COMPLETE_STATUSES.has(status.toLowerCase());
}

/**
 * Analyzes baseline vs current snapshots and produces entropy findings.
 *
 * @param {RoadmapSnapshot} baseline Baseline snapshot.
 * @param {RoadmapSnapshot} current Current snapshot.
 * @param {DetectorThresholds} thresholds Detector thresholds.
 * @param {string} todayDate Reference date for overdue checks.
 * @returns {DetectorResult} Detector output payload.
 */
export function analyzeSnapshots(
	baseline: RoadmapSnapshot,
	current: RoadmapSnapshot,
	thresholds: DetectorThresholds,
	todayDate: string,
): DetectorResult {
	const todayEpochDay = toEpochDay(todayDate, "today");
	const baselineById = new Map(baseline.items.map((item) => [item.id, item]));
	const creepFindings: ScopeCreepFinding[] = [];
	const driftFindings: DriftFinding[] = [];
	let severityAccumulator = 0;

	for (const currentItem of current.items) {
		const baselineItem = baselineById.get(currentItem.id);
		if (baselineItem == null) {
			creepFindings.push({
				type: "new_item",
				id: currentItem.id,
				baselineScope: 0,
				currentScope: currentItem.scopeSize,
				scopeDelta: currentItem.scopeSize,
				scopeGrowthRatio: Number.POSITIVE_INFINITY,
			});
			severityAccumulator += currentItem.scopeSize;
		} else {
			const scopeDelta = currentItem.scopeSize - baselineItem.scopeSize;
			const growthRatio = computeScopeGrowthRatio(
				baselineItem.scopeSize,
				currentItem.scopeSize,
			);
			if (scopeDelta > 0 && growthRatio > thresholds.scopeThreshold) {
				creepFindings.push({
					type: "scope_increase",
					id: currentItem.id,
					baselineScope: baselineItem.scopeSize,
					currentScope: currentItem.scopeSize,
					scopeDelta,
					scopeGrowthRatio: Number(growthRatio.toFixed(4)),
				});
				severityAccumulator += growthRatio;
			}

			const slipDays = currentItem.targetEpochDay - baselineItem.targetEpochDay;
			if (slipDays > thresholds.driftDaysThreshold) {
				driftFindings.push({
					type: "target_slip",
					id: currentItem.id,
					status: currentItem.status,
					baselineTargetDate: baselineItem.targetDate,
					currentTargetDate: currentItem.targetDate,
					slipDays,
					overdueDays: 0,
				});
				severityAccumulator += slipDays / 7;
			}
		}

		const overdueDays = todayEpochDay - currentItem.targetEpochDay;
		if (overdueDays > 0 && !isCompletedStatus(currentItem.status)) {
			driftFindings.push({
				type: "overdue_incomplete",
				id: currentItem.id,
				status: currentItem.status,
				baselineTargetDate: baselineItem?.targetDate ?? currentItem.targetDate,
				currentTargetDate: currentItem.targetDate,
				slipDays: 0,
				overdueDays,
			});
			severityAccumulator += overdueDays / 7;
		}
	}

	const normalizedEntropy = Number(
		(severityAccumulator / Math.max(current.items.length, 1)).toFixed(4),
	);
	const creepExceeded = creepFindings.length > thresholds.maxCreep;
	const driftExceeded = driftFindings.length > thresholds.maxDrift;
	const entropyExceeded = normalizedEntropy > thresholds.maxEntropy;

	return {
		status: creepExceeded || driftExceeded || entropyExceeded
			? ALERT_STATUS
			: OK_STATUS,
		meta: {
			today: fromEpochDay(todayEpochDay),
		},
		thresholds,
		summary: {
			baselineItemCount: baseline.items.length,
			currentItemCount: current.items.length,
			creepCount: creepFindings.length,
			driftCount: driftFindings.length,
			entropyScore: normalizedEntropy,
		},
		findings: {
			scopeCreep: creepFindings,
			scheduleDrift: driftFindings,
		},
		gates: {
			creepExceeded,
			driftExceeded,
			entropyExceeded,
		},
	};
}

/**
 * Parses and validates a snapshot JSON file.
 *
 * @param {string} filePath JSON file path.
 * @param {string} snapshotLabel Label used in validation errors.
 * @param {(path: string) => Promise<string>} readTextFile Dependency-injected file reader.
 * @returns {Promise<RoadmapSnapshot>} Parsed snapshot.
 */
export async function loadSnapshot(
	filePath: string,
	snapshotLabel: string,
	readTextFile: (path: string) => Promise<string>,
): Promise<RoadmapSnapshot> {
	let rawFile = "";
	try {
		rawFile = await readTextFile(filePath);
	} catch (error) {
		const message = String(error);
		throw new Error(`Cannot read ${snapshotLabel} file at ${filePath}: ${message}`);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawFile);
	} catch (error) {
		const message = String(error);
		throw new Error(`${snapshotLabel} is not valid JSON: ${message}`);
	}
	return validateSnapshot(parsed, snapshotLabel);
}

/**
 * Writes a structured JSON payload to stdout.
 *
 * @param {(text: string) => void} writeStdout Output function.
 * @param {unknown} payload Payload to serialize.
 */
function writeJson(writeStdout: (text: string) => void, payload: unknown): void {
	writeStdout(`${JSON.stringify(payload, null, 2)}\n`);
}

/**
 * Writes a structured error payload to stderr.
 *
 * @param {(text: string) => void} writeStderr Error output function.
 * @param {string} message Human-readable error message.
 */
function writeError(writeStderr: (text: string) => void, message: string): void {
	writeStderr(
		`${JSON.stringify({ status: ERROR_PREFIX, message }, null, 2)}\n`,
	);
}

/**
 * Runs the detector with dependency-injected IO.
 *
 * @param {CliIo} io IO dependencies.
 * @returns {Promise<number>} Process exit code.
 */
export async function runCli(io: CliIo): Promise<number> {
	let config: CliConfig;
	try {
		config = parseArgs(io.args, io.now());
	} catch (error) {
		const message = String(error);
		if (message === getUsage()) {
			io.writeStdout(`${message}\n`);
			return 0;
		}
		writeError(io.writeStderr, message);
		return 2;
	}

	try {
		const [baselineSnapshot, currentSnapshot] = await Promise.all([
			loadSnapshot(config.baselinePath, "baseline", io.readTextFile),
			loadSnapshot(config.currentPath, "current", io.readTextFile),
		]);
		const result = analyzeSnapshots(
			baselineSnapshot,
			currentSnapshot,
			config.thresholds,
			config.today,
		);
		writeJson(io.writeStdout, result);
		return result.status === ALERT_STATUS ? 1 : 0;
	} catch (error) {
		const message = String(error);
		writeError(io.writeStderr, message);
		return 2;
	}
}

if (import.meta.main) {
	const exitCode = await runCli({
		args: Deno.args,
		readTextFile: Deno.readTextFile,
		writeStdout: (text) => Deno.stdout.writeSync(new TextEncoder().encode(text)),
		writeStderr: (text) => Deno.stderr.writeSync(new TextEncoder().encode(text)),
		now: () => new Date(),
	});
	Deno.exit(exitCode);
}
