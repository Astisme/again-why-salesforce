/**
 * Minimal JSON value shape used for parsing and validation.
 */
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

/**
 * Normalized roadmap item used internally.
 */
interface RoadmapItem {
	id: string;
	status: string;
	targetDate: string;
	targetDateEpochDays: number;
	scopeSize: number;
}

/**
 * Normalized roadmap snapshot.
 */
interface RoadmapSnapshot {
	items: RoadmapItem[];
}

/**
 * CLI options accepted by the detector.
 */
interface CliOptions {
	baselinePath: string;
	currentPath: string;
	today: string;
	scopeIncreaseThresholdPct: number;
	maxCreepFindings: number;
	maxDriftFindings: number;
	maxEntropyScore: number;
}

/**
 * Scope creep finding payload.
 */
interface ScopeCreepFinding {
	type: "scope_creep";
	id: string;
	increasePoints: number;
	increasePct: number;
	baselineScope: number;
	currentScope: number;
	reason: "scope_increase" | "new_item";
}

/**
 * Drift finding payload.
 */
interface DriftFinding {
	type: "schedule_drift";
	id: string;
	slipDays: number;
	overdue: boolean;
	baselineTargetDate: string | null;
	currentTargetDate: string;
	status: string;
}

/**
 * Aggregated detector metrics.
 */
interface RoadmapMetrics {
	baselineItemCount: number;
	currentItemCount: number;
	addedItemCount: number;
	removedItemCount: number;
	creepCount: number;
	driftCount: number;
	totalScopeIncrease: number;
	totalSlipDays: number;
	overdueCount: number;
	entropyScore: number;
}

/**
 * Threshold evaluation state.
 */
interface ThresholdEvaluation {
	creep: boolean;
	drift: boolean;
	entropy: boolean;
}

/**
 * Detector result payload.
 */
interface DetectorResult {
	status: "healthy" | "alert";
	metadata: {
		today: string;
	};
	thresholds: {
		scopeIncreaseThresholdPct: number;
		maxCreepFindings: number;
		maxDriftFindings: number;
		maxEntropyScore: number;
	};
	exceeded: ThresholdEvaluation;
	metrics: RoadmapMetrics;
	findings: {
		creep: ScopeCreepFinding[];
		drift: DriftFinding[];
	};
}

/**
 * CLI run result payload used by the main entrypoint.
 */
interface CliRunResult {
	exitCode: number;
	output?: string;
	error?: string;
}

/**
 * Runtime dependencies injected for deterministic testing.
 */
interface CliDependencies {
	readTextFile: (path: string) => Promise<string>;
	writeStdout: (message: string) => void;
	writeStderr: (message: string) => void;
	exit: (code: number) => void;
}

const DEFAULT_TODAY = "2026-01-01";
const DEFAULT_SCOPE_INCREASE_THRESHOLD_PCT = 0;
const DEFAULT_MAX_CREEP_FINDINGS = 0;
const DEFAULT_MAX_DRIFT_FINDINGS = 0;
const DEFAULT_MAX_ENTROPY_SCORE = 0;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DONE_STATUSES = new Set(["done", "completed", "closed"]);

/**
 * Returns CLI usage instructions.
 */
function getUsageText(): string {
	return [
		"Usage: deno task roadmap-entropy -- --baseline <path> --current <path> [options]",
		"",
		"Options:",
		"  --today <YYYY-MM-DD>                 Override the date used for overdue detection.",
		"  --scope-increase-threshold-pct <n>   Minimum percent increase to flag scope creep.",
		"  --max-creep-findings <n>             Maximum allowed creep findings before non-zero exit.",
		"  --max-drift-findings <n>             Maximum allowed drift findings before non-zero exit.",
		"  --max-entropy-score <n>              Maximum allowed entropy score before non-zero exit.",
		"  --help                               Show this message.",
	].join("\n");
}

/**
 * Throws a prefixed option error.
 */
function throwOptionError(message: string): never {
	throw new Error(`Invalid arguments: ${message}`);
}

/**
 * Parses a non-negative number option value.
 */
function parseNonNegativeNumber(rawValue: string, optionName: string): number {
	const value = Number(rawValue);
	if (!Number.isFinite(value) || value < 0) {
		throwOptionError(`${optionName} must be a non-negative number.`);
	}

	return value;
}

/**
 * Reads the next argument as an option value.
 */
function getOptionValue(
	args: string[],
	index: number,
	optionName: string,
): string {
	const value = args[index + 1];
	if (!value || value.startsWith("--")) {
		throwOptionError(`${optionName} requires a value.`);
	}

	return value;
}

/**
 * Parses CLI arguments into detector options.
 */
function parseCliArgs(args: string[]): CliOptions | { help: true } {
	let baselinePath = "";
	let currentPath = "";
	let today = DEFAULT_TODAY;
	let scopeIncreaseThresholdPct = DEFAULT_SCOPE_INCREASE_THRESHOLD_PCT;
	let maxCreepFindings = DEFAULT_MAX_CREEP_FINDINGS;
	let maxDriftFindings = DEFAULT_MAX_DRIFT_FINDINGS;
	let maxEntropyScore = DEFAULT_MAX_ENTROPY_SCORE;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		switch (arg) {
			case "--": {
				break;
			}
			case "--help": {
				return { help: true };
			}
			case "--baseline": {
				baselinePath = getOptionValue(args, index, arg);
				index += 1;
				break;
			}
			case "--current": {
				currentPath = getOptionValue(args, index, arg);
				index += 1;
				break;
			}
			case "--today": {
				today = getOptionValue(args, index, arg);
				index += 1;
				break;
			}
			case "--scope-increase-threshold-pct": {
				scopeIncreaseThresholdPct = parseNonNegativeNumber(
					getOptionValue(args, index, arg),
					arg,
				);
				index += 1;
				break;
			}
			case "--max-creep-findings": {
				maxCreepFindings = parseNonNegativeNumber(
					getOptionValue(args, index, arg),
					arg,
				);
				index += 1;
				break;
			}
			case "--max-drift-findings": {
				maxDriftFindings = parseNonNegativeNumber(
					getOptionValue(args, index, arg),
					arg,
				);
				index += 1;
				break;
			}
			case "--max-entropy-score": {
				maxEntropyScore = parseNonNegativeNumber(
					getOptionValue(args, index, arg),
					arg,
				);
				index += 1;
				break;
			}
			default: {
				throwOptionError(`unsupported option '${arg}'.`);
			}
		}
	}

	if (!baselinePath) {
		throwOptionError("--baseline is required.");
	}
	if (!currentPath) {
		throwOptionError("--current is required.");
	}
	if (!isValidDateString(today)) {
		throwOptionError("--today must use YYYY-MM-DD format.");
	}

	return {
		baselinePath,
		currentPath,
		today,
		scopeIncreaseThresholdPct,
		maxCreepFindings,
		maxDriftFindings,
		maxEntropyScore,
	};
}

/**
 * Validates date format and calendar correctness.
 */
function isValidDateString(value: string): boolean {
	if (!DATE_PATTERN.test(value)) {
		return false;
	}

	const parsed = Date.parse(`${value}T00:00:00Z`);
	if (Number.isNaN(parsed)) {
		return false;
	}

	const normalized = new Date(parsed).toISOString().slice(0, 10);
	return normalized === value;
}

/**
 * Converts YYYY-MM-DD to UTC epoch days.
 */
function toEpochDays(value: string, fieldName: string): number {
	if (!isValidDateString(value)) {
		throw new Error(`${fieldName} must use YYYY-MM-DD format.`);
	}

	const milliseconds = Date.parse(`${value}T00:00:00Z`);
	return Math.floor(milliseconds / 86_400_000);
}

/**
 * Casts a JSON value to a string-keyed object.
 */
function asObject(
	value: JsonValue,
	fieldName: string,
): { [key: string]: JsonValue } {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${fieldName} must be an object.`);
	}

	return value;
}

/**
 * Reads and parses JSON content from disk.
 */
async function readJsonFile(
	path: string,
	readTextFile: (path: string) => Promise<string>,
): Promise<JsonValue> {
	const rawText = await readTextFile(path);
	try {
		return JSON.parse(rawText) as JsonValue;
	} catch {
		throw new Error(`Could not parse JSON from '${path}'.`);
	}
}

/**
 * Validates that the provided value is a valid roadmap snapshot.
 */
function validateSnapshot(
	value: JsonValue,
	label: "baseline" | "current",
): RoadmapSnapshot {
	const snapshotObject = asObject(value, `${label} snapshot`);
	const itemsValue = snapshotObject.items;

	if (!Array.isArray(itemsValue)) {
		throw new Error(`${label} snapshot items must be an array.`);
	}

	const items = itemsValue.map((itemValue, index) => {
		return validateItem(itemValue, label, index);
	});

	const uniqueIds = new Set<string>();
	for (const item of items) {
		if (uniqueIds.has(item.id)) {
			throw new Error(
				`${label} snapshot has duplicate item id '${item.id}'.`,
			);
		}
		uniqueIds.add(item.id);
	}

	return { items };
}

/**
 * Validates and normalizes a snapshot item.
 */
function validateItem(
	value: JsonValue,
	label: "baseline" | "current",
	index: number,
): RoadmapItem {
	const itemObject = asObject(
		value,
		`${label} snapshot item at index ${index}`,
	);

	const id = itemObject.id;
	if (typeof id !== "string" || id.trim() === "") {
		throw new Error(
			`${label} snapshot item at index ${index} must have a non-empty id.`,
		);
	}

	const status = itemObject.status;
	if (typeof status !== "string" || status.trim() === "") {
		throw new Error(
			`${label} snapshot item '${id}' must have a non-empty status.`,
		);
	}

	const targetDate = itemObject.targetDate;
	if (typeof targetDate !== "string") {
		throw new Error(
			`${label} snapshot item '${id}' must have a targetDate string.`,
		);
	}

	const targetDateEpochDays = toEpochDays(
		targetDate,
		`${label} snapshot item '${id}' targetDate`,
	);
	const scopeSize = getScopeSize(itemObject, label, id);

	return {
		id,
		status,
		targetDate,
		targetDateEpochDays,
		scopeSize,
	};
}

/**
 * Resolves scope size from scopePoints or tasks.length.
 */
function getScopeSize(
	itemObject: { [key: string]: JsonValue },
	label: "baseline" | "current",
	id: string,
): number {
	const scopePoints = itemObject.scopePoints;
	if (typeof scopePoints === "number") {
		if (!Number.isFinite(scopePoints) || scopePoints < 0) {
			throw new Error(
				`${label} snapshot item '${id}' scopePoints must be a non-negative number.`,
			);
		}
		return scopePoints;
	}

	const tasks = itemObject.tasks;
	if (Array.isArray(tasks)) {
		for (const task of tasks) {
			if (typeof task !== "string") {
				throw new Error(
					`${label} snapshot item '${id}' tasks must contain only strings.`,
				);
			}
		}
		return tasks.length;
	}

	throw new Error(
		`${label} snapshot item '${id}' must include scopePoints or tasks.`,
	);
}

/**
 * Returns positive day difference when end date is later than start date.
 */
function getSlipDays(startEpochDays: number, endEpochDays: number): number {
	if (endEpochDays <= startEpochDays) {
		return 0;
	}

	return endEpochDays - startEpochDays;
}

/**
 * Indicates whether a status should be treated as incomplete.
 */
function isIncompleteStatus(status: string): boolean {
	return !DONE_STATUSES.has(status.trim().toLowerCase());
}

/**
 * Calculates scope increase percentage from baseline to current scope.
 */
function getIncreasePct(baselineScope: number, currentScope: number): number {
	if (baselineScope === 0) {
		return currentScope > 0 ? 100 : 0;
	}

	return Number(
		(((currentScope - baselineScope) / baselineScope) * 100).toFixed(2),
	);
}

/**
 * Builds a map from item id to item for quick comparisons.
 */
function toItemMap(items: RoadmapItem[]): Map<string, RoadmapItem> {
	const itemMap = new Map<string, RoadmapItem>();
	for (const item of items) {
		itemMap.set(item.id, item);
	}
	return itemMap;
}

/**
 * Evaluates roadmap entropy findings and aggregate metrics.
 */
function detectRoadmapEntropy(
	baseline: RoadmapSnapshot,
	current: RoadmapSnapshot,
	options: CliOptions,
): DetectorResult {
	const baselineMap = toItemMap(baseline.items);
	const currentMap = toItemMap(current.items);
	const creepFindings: ScopeCreepFinding[] = [];
	const driftFindings: DriftFinding[] = [];
	let addedItemCount = 0;
	let removedItemCount = 0;
	let totalScopeIncrease = 0;
	let totalSlipDays = 0;
	let overdueCount = 0;
	const todayEpochDays = toEpochDays(options.today, "today");

	for (const currentItem of current.items) {
		const baselineItem = baselineMap.get(currentItem.id);

		if (!baselineItem) {
			addedItemCount += 1;
			const newItemIncreasePct = getIncreasePct(0, currentItem.scopeSize);
			if (newItemIncreasePct > options.scopeIncreaseThresholdPct) {
				creepFindings.push({
					type: "scope_creep",
					id: currentItem.id,
					increasePoints: currentItem.scopeSize,
					increasePct: newItemIncreasePct,
					baselineScope: 0,
					currentScope: currentItem.scopeSize,
					reason: "new_item",
				});
				totalScopeIncrease += currentItem.scopeSize;
			}
		} else {
			const increasePoints = currentItem.scopeSize -
				baselineItem.scopeSize;
			const increasePct = getIncreasePct(
				baselineItem.scopeSize,
				currentItem.scopeSize,
			);
			if (
				increasePoints > 0 &&
				increasePct > options.scopeIncreaseThresholdPct
			) {
				creepFindings.push({
					type: "scope_creep",
					id: currentItem.id,
					increasePoints,
					increasePct,
					baselineScope: baselineItem.scopeSize,
					currentScope: currentItem.scopeSize,
					reason: "scope_increase",
				});
				totalScopeIncrease += increasePoints;
			}
		}

		const baselineTargetEpochDays = baselineItem?.targetDateEpochDays ??
			currentItem.targetDateEpochDays;
		const baselineTargetDate = baselineItem?.targetDate ?? null;
		const slipDays = getSlipDays(
			baselineTargetEpochDays,
			currentItem.targetDateEpochDays,
		);
		const overdue = isIncompleteStatus(currentItem.status) &&
			todayEpochDays > currentItem.targetDateEpochDays;

		if (slipDays > 0 || overdue) {
			driftFindings.push({
				type: "schedule_drift",
				id: currentItem.id,
				slipDays,
				overdue,
				baselineTargetDate,
				currentTargetDate: currentItem.targetDate,
				status: currentItem.status,
			});
			totalSlipDays += slipDays;
			if (overdue) {
				overdueCount += 1;
			}
		}
	}

	for (const baselineItem of baseline.items) {
		if (!currentMap.has(baselineItem.id)) {
			removedItemCount += 1;
		}
	}

	const entropyScore = Number(
		(creepFindings.length * 5 + driftFindings.length * 5 + totalSlipDays +
			totalScopeIncrease).toFixed(2),
	);

	const exceeded: ThresholdEvaluation = {
		creep: creepFindings.length > options.maxCreepFindings,
		drift: driftFindings.length > options.maxDriftFindings,
		entropy: entropyScore > options.maxEntropyScore,
	};

	const status: DetectorResult["status"] =
		exceeded.creep || exceeded.drift || exceeded.entropy
			? "alert"
			: "healthy";

	const metrics: RoadmapMetrics = {
		baselineItemCount: baseline.items.length,
		currentItemCount: current.items.length,
		addedItemCount,
		removedItemCount,
		creepCount: creepFindings.length,
		driftCount: driftFindings.length,
		totalScopeIncrease,
		totalSlipDays,
		overdueCount,
		entropyScore,
	};

	return {
		status,
		metadata: {
			today: options.today,
		},
		thresholds: {
			scopeIncreaseThresholdPct: options.scopeIncreaseThresholdPct,
			maxCreepFindings: options.maxCreepFindings,
			maxDriftFindings: options.maxDriftFindings,
			maxEntropyScore: options.maxEntropyScore,
		},
		exceeded,
		metrics,
		findings: {
			creep: creepFindings,
			drift: driftFindings,
		},
	};
}

/**
 * Returns CLI exit code for the detector result.
 */
function getExitCode(result: DetectorResult): number {
	return result.exceeded.creep || result.exceeded.drift ||
			result.exceeded.entropy
		? 2
		: 0;
}

/**
 * Parses, validates, and evaluates entropy from roadmap snapshots.
 */
export async function runRoadmapEntropyDetectorCli(
	args: string[],
	readTextFile: (path: string) => Promise<string>,
): Promise<CliRunResult> {
	try {
		const parsedArgs = parseCliArgs(args);
		if ("help" in parsedArgs) {
			return {
				exitCode: 0,
				output: getUsageText(),
			};
		}

		const baselineValue = await readJsonFile(
			parsedArgs.baselinePath,
			readTextFile,
		);
		const currentValue = await readJsonFile(
			parsedArgs.currentPath,
			readTextFile,
		);
		const baselineSnapshot = validateSnapshot(baselineValue, "baseline");
		const currentSnapshot = validateSnapshot(currentValue, "current");
		const result = detectRoadmapEntropy(
			baselineSnapshot,
			currentSnapshot,
			parsedArgs,
		);

		return {
			exitCode: getExitCode(result),
			output: JSON.stringify(result, null, 2),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			exitCode: 1,
			error: `Roadmap Entropy Detector error: ${message}`,
		};
	}
}

/**
 * Executes CLI behavior when module runs as an entrypoint.
 */
export async function maybeRunMain(
	isMain: boolean,
	args: string[],
	dependencies: CliDependencies,
): Promise<void> {
	if (!isMain) {
		return;
	}

	const runResult = await runRoadmapEntropyDetectorCli(
		args,
		dependencies.readTextFile,
	);
	if (runResult.output) {
		dependencies.writeStdout(runResult.output);
	}
	if (runResult.error) {
		dependencies.writeStderr(runResult.error);
	}
	if (runResult.exitCode !== 0) {
		dependencies.exit(runResult.exitCode);
	}
}

await maybeRunMain(import.meta.main, Deno.args, {
	readTextFile: Deno.readTextFile,
	writeStdout: console.log,
	writeStderr: console.error,
	exit: Deno.exit,
});
