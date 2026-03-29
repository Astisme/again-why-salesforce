/**
 * Privacy-policy consistency checker.
 *
 * This checker validates a small, code-verifiable subset of privacy-policy claims
 * against selected source and config files.
 */

/**
 * File paths used by the checker.
 */
export interface CheckerFilePaths {
	policy: string;
	manifest: string;
	analytics: string;
	oncePerDay: string;
	constants: string;
	functions: string;
	themeHandler: string;
	themeSelector: string;
	permissionsPage: string;
	settingsOptions: string;
}

/**
 * Text contents loaded from checker file paths.
 */
export interface CheckerInputTexts {
	policy: string;
	manifest: string;
	analytics: string;
	oncePerDay: string;
	constants: string;
	functions: string;
	themeHandler: string;
	themeSelector: string;
	permissionsPage: string;
	settingsOptions: string;
}

/**
 * Status for checker report and claim entries.
 */
export type CheckStatus = "pass" | "fail";

/**
 * A single claim evaluation result.
 */
export interface ClaimResult {
	id: string;
	description: string;
	status: CheckStatus;
	policy_evidence: string[];
	code_evidence: string[];
	failures: string[];
}

/**
 * Final checker output.
 */
export interface CheckerReport {
	checker: string;
	status: CheckStatus;
	claims: ClaimResult[];
	load_errors: string[];
}

/**
 * Optional dependencies for programmatic checker execution.
 */
export interface CheckerRunOptions {
	filePaths?: Partial<CheckerFilePaths>;
	readTextFile?: (path: string) => Promise<string>;
}

/**
 * Optional dependencies for CLI runner.
 */
export interface CheckerCliOptions extends CheckerRunOptions {
	writeLine?: (line: string) => void;
	exit?: (code: number) => void;
}

interface PolicySignals {
	hasAnalyticsOptOutClaim: boolean;
	hasAnalyticsDailyPingClaim: boolean;
	hasAnalyticsInstallPingClaim: boolean;
	hasSimpleAnalyticsClaim: boolean;
	hasStorageClaim: boolean;
	hasLeastPrivilegeClaim: boolean;
	hasInteractionPermissionClaim: boolean;
	storagePolicyKeyMap: Map<string, string>;
	localStoragePolicyKeys: Set<string>;
}

interface CodeSignals {
	hasAnalyticsPreventSetting: boolean;
	hasAnalyticsPreventGuard: boolean;
	hasAnalyticsDailyGuard: boolean;
	hasAnalyticsInstallPath: boolean;
	hasAnalyticsSimpleHost: boolean;
	hasAnalyticsQueuePath: boolean;
	hasAnalyticsHostname: boolean;
	hasAnalyticsSettingsToggle: boolean;
	hasOncePerDayGuard: boolean;
	hasStoragePermission: boolean;
	hasCookiesInOptionalPermissions: boolean;
	hasCookiesInRequiredPermissions: boolean;
	hasOptionalSalesforceHostPermission: boolean;
	hasCookiePermissionRequestBoundary: boolean;
	constantKeyMap: Map<string, string>;
	localStorageKeysInCode: Set<string>;
}

interface RuleCheck {
	ok: boolean;
	evidence: string;
}

const CHECKER_NAME = "privacy-policy-consistency";

/**
 * Default checker file paths.
 */
export const DEFAULT_CHECKER_FILE_PATHS: CheckerFilePaths = Object.freeze({
	policy: "docs/PRIVACY_POLICY.md",
	manifest: "src/manifest.json",
	analytics: "src/salesforce/analytics.js",
	oncePerDay: "src/salesforce/once-a-day.js",
	constants: "src/core/constants.js",
	functions: "src/core/functions.js",
	themeHandler: "src/action/themeHandler.js",
	themeSelector: "src/components/theme-selector/theme-selector.js",
	permissionsPage: "src/action/req_permissions/req_permissions.js",
	settingsOptions: "src/settings/options.js",
});

const CHECKER_FILE_KEYS = [
	"policy",
	"manifest",
	"analytics",
	"oncePerDay",
	"constants",
	"functions",
	"themeHandler",
	"themeSelector",
	"permissionsPage",
	"settingsOptions",
] as const;

const STORAGE_VARIABLE_NAMES = [
	"WHY_KEY",
	"SETTINGS_KEY",
	"GENERIC_TAB_STYLE_KEY",
	"ORG_TAB_STYLE_KEY",
	"LOCALE_KEY",
] as const;

const LOCAL_STORAGE_CONSTANTS = ["DO_NOT_REQUEST_FRAME_PERMISSION"] as const;
const STORAGE_DERIVATION_VARIABLE_NAMES = [
	"TAB_GENERIC_STYLE",
	"TAB_ORG_STYLE",
] as const;

/**
 * Merges user-provided paths over checker defaults.
 *
 * @param {Partial<CheckerFilePaths>} [overrides={}] - Optional file path overrides.
 * @return {CheckerFilePaths} Resolved file paths.
 */
export function resolveCheckerFilePaths(
	overrides: Partial<CheckerFilePaths> = {},
): CheckerFilePaths {
	return {
		...DEFAULT_CHECKER_FILE_PATHS,
		...overrides,
	};
}

/**
 * Normalizes a text to lowercase for phrase checks.
 *
 * @param {string} value - Raw text.
 * @return {string} Lowercased text.
 */
function normalizeText(value: string): string {
	return value.toLowerCase();
}

/**
 * Safely turns unknown errors into readable messages.
 *
 * @param {unknown} err - Thrown error value.
 * @return {string} Human-readable error message.
 */
function getErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	return String(err);
}

/**
 * Loads checker files and collects non-fatal load errors.
 *
 * @param {CheckerFilePaths} filePaths - File paths to read.
 * @param {(path: string) => Promise<string>} readTextFile - File reader.
 * @return {Promise<{ inputs: CheckerInputTexts; loadErrors: string[] }>} Loaded texts and load errors.
 */
export async function loadCheckerInputs(
	filePaths: CheckerFilePaths,
	readTextFile: (path: string) => Promise<string>,
): Promise<{ inputs: CheckerInputTexts; loadErrors: string[] }> {
	const loadErrors: string[] = [];
	const values = await Promise.all(
		CHECKER_FILE_KEYS.map(async (key) => {
			const path = filePaths[key];
			try {
				return await readTextFile(path);
			} catch (err) {
				loadErrors.push(
					`unable_to_read:${key}:${path}:${getErrorMessage(err)}`,
				);
				return "";
			}
		}),
	);
	const [
		policy,
		manifest,
		analytics,
		oncePerDay,
		constants,
		functions,
		themeHandler,
		themeSelector,
		permissionsPage,
		settingsOptions,
	] = values;
	return {
		inputs: {
			policy,
			manifest,
			analytics,
			oncePerDay,
			constants,
			functions,
			themeHandler,
			themeSelector,
			permissionsPage,
			settingsOptions,
		},
		loadErrors,
	};
}

/**
 * Extracts the markdown section body for a numbered heading.
 *
 * @param {string} markdown - Full markdown document.
 * @param {number} sectionNumber - Section number to extract.
 * @return {string} Section text (or empty string).
 */
export function extractPolicySection(markdown: string, sectionNumber: number): string {
	const pattern = new RegExp(
		`##\\s+${sectionNumber}\\.\\s+[\\s\\S]*?(?=\\n##\\s+\\d+\\.|$)`,
		"i",
	);
	return markdown.match(pattern)?.[0] ?? "";
}

/**
 * Extracts backtick-enclosed values from markdown text.
 *
 * @param {string} text - Markdown snippet.
 * @return {string[]} Extracted values.
 */
export function extractBacktickValues(text: string): string[] {
	const values: string[] = [];
	const pattern = /`([^`]+)`/g;
	let match = pattern.exec(text);
	while (match != null) {
		values.push(match[1]);
		match = pattern.exec(text);
	}
	return values;
}

/**
 * Extracts storage key mappings from privacy policy text.
 *
 * Expected shape: `key` + `VARIABLE_NAME` from markdown table rows and
 * the in-memory section sentence for WHY_KEY.
 *
 * @param {string} policyText - Full privacy policy text.
 * @return {Map<string, string>} Map from variable names to key values.
 */
export function extractPolicyStorageKeyMap(policyText: string): Map<string, string> {
	const keyMap = new Map<string, string>();
	const tablePattern = /\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/g;
	let match = tablePattern.exec(policyText);
	while (match != null) {
		const keyValue = match[1].trim();
		const variableName = match[2].trim();
		keyMap.set(variableName, keyValue);
		match = tablePattern.exec(policyText);
	}
	const inMemoryPattern = /key:\s*`([^`]+)`\s*,\s*variable:\s*`([^`]+)`/i;
	const inMemoryMatch = policyText.match(inMemoryPattern);
	if (inMemoryMatch != null) {
		keyMap.set(inMemoryMatch[2].trim(), inMemoryMatch[1].trim());
	}
	return keyMap;
}

/**
 * Extracts policy-level checks and key declarations.
 *
 * @param {string} policyText - Full privacy policy markdown.
 * @return {PolicySignals} Parsed policy signals.
 */
export function extractPolicySignals(policyText: string): PolicySignals {
	const normalized = normalizeText(policyText);
	const localStorageSection = extractPolicySection(policyText, 2);
	const localStoragePolicyKeys = new Set(
		extractBacktickValues(localStorageSection).filter((value) =>
			value !== "localStorage"
		),
	);
	return {
		hasAnalyticsOptOutClaim: /opt-?out/.test(normalized) &&
			/settings/.test(normalized) && /analytics/.test(normalized),
		hasAnalyticsDailyPingClaim:
			/1 ping per day/.test(normalized) || /one ping per day/.test(normalized),
		hasAnalyticsInstallPingClaim:
			/special ping/.test(normalized) && /install/.test(normalized),
		hasSimpleAnalyticsClaim: /simple analytics/.test(normalized),
		hasStorageClaim: /localstorage/.test(normalized) && /theme/.test(normalized),
		hasLeastPrivilegeClaim: /least-privilege/.test(normalized),
		hasInteractionPermissionClaim: /requested at the moment you interact/.test(normalized),
		storagePolicyKeyMap: extractPolicyStorageKeyMap(policyText),
		localStoragePolicyKeys,
	};
}

/**
 * Extracts selected exported string constants from source text.
 *
 * @param {string} sourceText - Source file text.
 * @param {readonly string[]} constantNames - Constant names to extract.
 * @return {Map<string, string>} Constant-value mapping.
 */
export function extractExportedStringConstants(
	sourceText: string,
	constantNames: readonly string[],
): Map<string, string> {
	const values = new Map<string, string>();
	for (const constantName of constantNames) {
		const pattern = new RegExp(
			`export\\s+const\\s+${constantName}\\s*=\\s*["']([^"']+)["'];`,
		);
		const match = sourceText.match(pattern);
		if (match != null) {
			values.set(constantName, match[1]);
		}
	}
	return values;
}

/**
 * Resolves one localStorage argument expression into a concrete key.
 *
 * @param {string} argument - The first argument expression.
 * @param {Map<string, string>} constantMap - Constants usable in storage calls.
 * @return {string | null} Concrete key name or null.
 */
export function resolveLocalStorageArgument(
	argument: string,
	constantMap: Map<string, string>,
): string | null {
	const trimmed = argument.trim();
	const stringMatch = trimmed.match(/^(["'])([^"']+)\1$/);
	if (stringMatch != null) {
		return stringMatch[2];
	}
	if (constantMap.has(trimmed)) {
		return constantMap.get(trimmed) ?? null;
	}
	return null;
}

/**
 * Extracts localStorage key usage from a source file.
 *
 * @param {string} sourceText - Source file text.
 * @param {Map<string, string>} constantMap - Constants usable in storage calls.
 * @return {Set<string>} Detected key names.
 */
export function extractLocalStorageKeysFromSource(
	sourceText: string,
	constantMap: Map<string, string>,
): Set<string> {
	const keys = new Set<string>();
	const pattern = /localStorage\.(?:getItem|setItem)\(\s*([^,\)\n]+)[^\)]*\)/g;
	let match = pattern.exec(sourceText);
	while (match != null) {
		const resolvedKey = resolveLocalStorageArgument(match[1], constantMap);
		if (resolvedKey != null) {
			keys.add(resolvedKey);
		}
		match = pattern.exec(sourceText);
	}
	return keys;
}

/**
 * Parses the extension manifest from JSON text.
 *
 * @param {string} manifestText - Raw manifest JSON.
 * @return {{ permissions: string[]; optional_permissions: string[]; optional_host_permissions: string[] }}
 * Parsed manifest arrays (empty when invalid).
 */
export function parseManifestPermissions(manifestText: string): {
	permissions: string[];
	optional_permissions: string[];
	optional_host_permissions: string[];
} {
	try {
		const manifest = JSON.parse(manifestText);
		return {
			permissions: Array.isArray(manifest.permissions)
				? manifest.permissions
				: [],
			optional_permissions: Array.isArray(manifest.optional_permissions)
				? manifest.optional_permissions
				: [],
			optional_host_permissions: Array.isArray(manifest.optional_host_permissions)
				? manifest.optional_host_permissions
				: [],
		};
	} catch {
		return {
			permissions: [],
			optional_permissions: [],
			optional_host_permissions: [],
		};
	}
}

/**
 * Extracts code-level checks from loaded files.
 *
 * @param {CheckerInputTexts} inputs - Loaded checker inputs.
 * @return {CodeSignals} Parsed code signals.
 */
export function extractCodeSignals(inputs: CheckerInputTexts): CodeSignals {
	const constantKeyMap = extractExportedStringConstants(
		inputs.constants,
		[
			...STORAGE_VARIABLE_NAMES,
			...LOCAL_STORAGE_CONSTANTS,
			...STORAGE_DERIVATION_VARIABLE_NAMES,
		],
	);
	const settingsKey = constantKeyMap.get("SETTINGS_KEY");
	const genericSuffix = constantKeyMap.get("TAB_GENERIC_STYLE");
	const orgSuffix = constantKeyMap.get("TAB_ORG_STYLE");
	if (
		settingsKey != null &&
		genericSuffix != null &&
		/export\s+const\s+GENERIC_TAB_STYLE_KEY\s*=/.test(inputs.constants)
	) {
		constantKeyMap.set(
			"GENERIC_TAB_STYLE_KEY",
			`${settingsKey}-${genericSuffix}`,
		);
	}
	if (
		settingsKey != null &&
		orgSuffix != null &&
		/export\s+const\s+ORG_TAB_STYLE_KEY\s*=/.test(inputs.constants)
	) {
		constantKeyMap.set(
			"ORG_TAB_STYLE_KEY",
			`${settingsKey}-${orgSuffix}`,
		);
	}
	const localStorageKeysInCode = new Set<string>();
	for (
		const sourceText of [
			inputs.themeHandler,
			inputs.themeSelector,
			inputs.permissionsPage,
			inputs.functions,
		]
	) {
		for (
			const localStorageKey of extractLocalStorageKeysFromSource(
				sourceText,
				constantKeyMap,
			)
		) {
			localStorageKeysInCode.add(localStorageKey);
		}
	}
	const manifest = parseManifestPermissions(inputs.manifest);
	const analytics = inputs.analytics;
	const oncePerDay = inputs.oncePerDay;
	const functions = inputs.functions;
	const settingsOptions = inputs.settingsOptions;
	return {
		hasAnalyticsPreventSetting: /getSettings\(PREVENT_ANALYTICS\)/.test(
			analytics,
		),
		hasAnalyticsPreventGuard:
			/shouldPreventAnalytics/.test(analytics) &&
			/if\s*\([\s\S]*shouldPreventAnalytics[\s\S]*\)\s*\{\s*return;/.test(
				analytics,
			),
		hasAnalyticsDailyGuard:
			/hasSentAnalyticsToday/.test(analytics) &&
			/Math\.floor\(/.test(analytics),
		hasAnalyticsInstallPath: /isNewUser\s*\?\s*"\/new-user"\s*:\s*"\/"/.test(
			analytics,
		),
		hasAnalyticsSimpleHost: /simpleanalyticscdn\.com/.test(analytics),
		hasAnalyticsQueuePath: /noscript\.gif/.test(analytics),
		hasAnalyticsHostname: /extension\.again\.whysalesforce/.test(analytics),
		hasAnalyticsSettingsToggle: /\[PREVENT_ANALYTICS\]/.test(settingsOptions),
		hasOncePerDayGuard:
			/wasCalledToday\(today\)/.test(oncePerDay) &&
			/checkInsertAnalytics\(\)/.test(oncePerDay),
		hasStoragePermission: manifest.permissions.includes("storage"),
		hasCookiesInOptionalPermissions:
			manifest.optional_permissions.includes("cookies"),
		hasCookiesInRequiredPermissions: manifest.permissions.includes("cookies"),
		hasOptionalSalesforceHostPermission:
			manifest.optional_host_permissions.includes("*://*.my.salesforce.com/*"),
		hasCookiePermissionRequestBoundary:
			/function\s+requestCookiesPermission\(\)/.test(functions) &&
			/permissions:\s*\["cookies"\]/.test(functions) &&
			/origins:\s*EXTENSION_OPTIONAL_HOST_PERM/.test(functions),
		constantKeyMap,
		localStorageKeysInCode,
	};
}

/**
 * Builds a pass/fail check object.
 *
 * @param {boolean} ok - Whether check passed.
 * @param {string} evidence - Evidence description.
 * @return {RuleCheck} Rule check object.
 */
export function createRuleCheck(ok: boolean, evidence: string): RuleCheck {
	return { ok, evidence };
}

/**
 * Formats a check entry for report evidence lists.
 *
 * @param {RuleCheck} check - Rule check.
 * @return {string} Formatted evidence entry.
 */
export function formatRuleCheck(check: RuleCheck): string {
	return `${check.ok ? "ok" : "missing"}:${check.evidence}`;
}

/**
 * Converts raw checks into a claim result.
 *
 * @param {string} id - Claim ID.
 * @param {string} description - Human-readable claim description.
 * @param {RuleCheck[]} policyChecks - Policy-side checks.
 * @param {RuleCheck[]} codeChecks - Code-side checks.
 * @return {ClaimResult} Evaluated claim result.
 */
export function createClaimResult(
	id: string,
	description: string,
	policyChecks: RuleCheck[],
	codeChecks: RuleCheck[],
): ClaimResult {
	const failures = [
		...policyChecks.filter((check) => !check.ok).map((check) => check.evidence),
		...codeChecks.filter((check) => !check.ok).map((check) => check.evidence),
	];
	return {
		id,
		description,
		status: failures.length === 0 ? "pass" : "fail",
		policy_evidence: policyChecks.map(formatRuleCheck),
		code_evidence: codeChecks.map(formatRuleCheck),
		failures,
	};
}

/**
 * Evaluates analytics opt-out behavior claim.
 *
 * @param {PolicySignals} policy - Policy signals.
 * @param {CodeSignals} code - Code signals.
 * @return {ClaimResult} Claim result.
 */
export function evaluateAnalyticsOptOutClaim(
	policy: PolicySignals,
	code: CodeSignals,
): ClaimResult {
	return createClaimResult(
		"analytics_opt_out_behavior",
		"Analytics can be disabled via settings opt-out behavior.",
		[
			createRuleCheck(
				policy.hasAnalyticsOptOutClaim,
				"policy mentions analytics opt-out in settings",
			),
		],
		[
			createRuleCheck(
				code.hasAnalyticsSettingsToggle,
				"settings expose PREVENT_ANALYTICS toggle",
			),
			createRuleCheck(
				code.hasAnalyticsPreventSetting,
				"analytics reads PREVENT_ANALYTICS setting",
			),
			createRuleCheck(
				code.hasAnalyticsPreventGuard,
				"analytics returns early when prevent flag is active",
			),
		],
	);
}

/**
 * Evaluates analytics cadence/install-path claim.
 *
 * @param {PolicySignals} policy - Policy signals.
 * @param {CodeSignals} code - Code signals.
 * @return {ClaimResult} Claim result.
 */
export function evaluateAnalyticsCadenceClaim(
	policy: PolicySignals,
	code: CodeSignals,
): ClaimResult {
	return createClaimResult(
		"analytics_ping_cadence_and_path",
		"Analytics sends one daily ping and a dedicated install path.",
		[
			createRuleCheck(
				policy.hasAnalyticsDailyPingClaim,
				"policy states one ping per day",
			),
			createRuleCheck(
				policy.hasAnalyticsInstallPingClaim,
				"policy states special ping for install",
			),
		],
		[
			createRuleCheck(
				code.hasAnalyticsDailyGuard,
				"analytics code contains daily guard",
			),
			createRuleCheck(
				code.hasAnalyticsInstallPath,
				"analytics code uses /new-user install path",
			),
			createRuleCheck(
				code.hasOncePerDayGuard,
				"once-a-day wrapper invokes analytics at most once per day",
			),
		],
	);
}

/**
 * Evaluates analytics endpoint/domain claim.
 *
 * @param {PolicySignals} policy - Policy signals.
 * @param {CodeSignals} code - Code signals.
 * @return {ClaimResult} Claim result.
 */
export function evaluateAnalyticsEndpointClaim(
	policy: PolicySignals,
	code: CodeSignals,
): ClaimResult {
	return createClaimResult(
		"analytics_endpoint_and_domain",
		"Analytics uses documented Simple Analytics endpoint/domain.",
		[
			createRuleCheck(
				policy.hasSimpleAnalyticsClaim,
				"policy references Simple Analytics",
			),
		],
		[
			createRuleCheck(
				code.hasAnalyticsSimpleHost,
				"analytics uses simpleanalyticscdn.com",
			),
			createRuleCheck(
				code.hasAnalyticsQueuePath,
				"analytics uses queue noscript.gif path",
			),
			createRuleCheck(
				code.hasAnalyticsHostname,
				"analytics sends extension.again.whysalesforce hostname",
			),
		],
	);
}

/**
 * Evaluates storage claims, including key mappings and localStorage scope.
 *
 * @param {PolicySignals} policy - Policy signals.
 * @param {CodeSignals} code - Code signals.
 * @return {ClaimResult} Claim result.
 */
export function evaluateStorageClaim(
	policy: PolicySignals,
	code: CodeSignals,
): ClaimResult {
	const keyChecks: RuleCheck[] = STORAGE_VARIABLE_NAMES.map((variableName) => {
		const policyValue = policy.storagePolicyKeyMap.get(variableName);
		const codeValue = code.constantKeyMap.get(variableName);
		const isMatch = policyValue != null && codeValue != null &&
			policyValue === codeValue;
		return createRuleCheck(
			isMatch,
			`policy/code key match for ${variableName}`,
		);
	});
	const localStorageCoverageChecks = [
		...code.localStorageKeysInCode,
	].map((keyName) =>
		createRuleCheck(
			policy.localStoragePolicyKeys.has(keyName),
			`policy section 2 documents localStorage key ${keyName}`,
		)
	);
	return createClaimResult(
		"storage_locations_and_keys",
		"Storage locations and key claims match constants and documented keys.",
		[
			createRuleCheck(
				policy.hasStorageClaim,
				"policy documents localStorage usage for theme-related preferences",
			),
			...keyChecks,
			...localStorageCoverageChecks,
		],
		[
			createRuleCheck(
				code.hasStoragePermission,
				"manifest declares storage permission",
			),
		],
	);
}

/**
 * Evaluates cookie-permission boundary claim.
 *
 * @param {PolicySignals} policy - Policy signals.
 * @param {CodeSignals} code - Code signals.
 * @return {ClaimResult} Claim result.
 */
export function evaluateCookiePermissionBoundaryClaim(
	policy: PolicySignals,
	code: CodeSignals,
): ClaimResult {
	return createClaimResult(
		"cookie_permission_usage_boundaries",
		"Cookie access remains optional and requested only on interaction.",
		[
			createRuleCheck(
				policy.hasLeastPrivilegeClaim,
				"policy includes least-privilege statement",
			),
			createRuleCheck(
				policy.hasInteractionPermissionClaim,
				"policy states optional permissions are requested on interaction",
			),
		],
		[
			createRuleCheck(
				code.hasCookiesInOptionalPermissions,
				"manifest includes cookies in optional_permissions",
			),
			createRuleCheck(
				!code.hasCookiesInRequiredPermissions,
				"manifest does not include cookies in required permissions",
			),
			createRuleCheck(
				code.hasOptionalSalesforceHostPermission,
				"manifest includes optional Salesforce host permission",
			),
			createRuleCheck(
				code.hasCookiePermissionRequestBoundary,
				"requestCookiesPermission asks for cookies with optional host origins",
			),
		],
	);
}

/**
 * Evaluates all configured claims in deterministic order.
 *
 * @param {PolicySignals} policy - Policy signals.
 * @param {CodeSignals} code - Code signals.
 * @return {ClaimResult[]} Ordered claim results.
 */
export function evaluateClaims(
	policy: PolicySignals,
	code: CodeSignals,
): ClaimResult[] {
	return [
		evaluateAnalyticsOptOutClaim(policy, code),
		evaluateAnalyticsCadenceClaim(policy, code),
		evaluateAnalyticsEndpointClaim(policy, code),
		evaluateStorageClaim(policy, code),
		evaluateCookiePermissionBoundaryClaim(policy, code),
	];
}

/**
 * Creates the final checker report.
 *
 * @param {ClaimResult[]} claims - Evaluated claims.
 * @param {string[]} [loadErrors=[]] - File-load errors.
 * @return {CheckerReport} Final report.
 */
export function createCheckerReport(
	claims: ClaimResult[],
	loadErrors: string[] = [],
): CheckerReport {
	const isPass = loadErrors.length === 0 &&
		claims.every((claim) => claim.status === "pass");
	return {
		checker: CHECKER_NAME,
		status: isPass ? "pass" : "fail",
		claims,
		load_errors: loadErrors,
	};
}

/**
 * Renders report JSON with deterministic pretty formatting.
 *
 * @param {CheckerReport} report - Checker report.
 * @return {string} JSON report text.
 */
export function renderReport(report: CheckerReport): string {
	return JSON.stringify(report, null, 2);
}

/**
 * Maps report status to process exit code.
 *
 * @param {CheckerReport} report - Checker report.
 * @return {number} Exit code (0 pass, 1 fail).
 */
export function getReportExitCode(report: CheckerReport): number {
	return report.status === "pass" ? 0 : 1;
}

/**
 * Runs the checker with optional dependency injection.
 *
 * @param {CheckerRunOptions} [options={}] - Optional runtime dependencies.
 * @return {Promise<CheckerReport>} Checker report.
 */
export async function runPrivacyPolicyConsistencyChecker(
	options: CheckerRunOptions = {},
): Promise<CheckerReport> {
	const resolvedOptions: CheckerRunOptions & {
		readTextFile: (path: string) => Promise<string>;
	} = {
		readTextFile: Deno.readTextFile,
		...options,
	};
	const filePaths = resolveCheckerFilePaths(options.filePaths ?? {});
	const { inputs, loadErrors } = await loadCheckerInputs(
		filePaths,
		resolvedOptions.readTextFile,
	);
	const policySignals = extractPolicySignals(inputs.policy);
	const codeSignals = extractCodeSignals(inputs);
	const claims = evaluateClaims(policySignals, codeSignals);
	return createCheckerReport(claims, loadErrors);
}

/**
 * Runs checker as a CLI command: prints JSON and exits.
 *
 * @param {CheckerCliOptions} [options={}] - Optional runtime dependencies.
 * @return {Promise<CheckerReport>} Checker report.
 */
export async function runPrivacyPolicyConsistencyCli(
	options: CheckerCliOptions = {},
): Promise<CheckerReport> {
	const resolvedOptions: CheckerCliOptions & {
		writeLine: (line: string) => void;
		exit: (code: number) => void;
	} = {
		writeLine: console.log,
		exit: Deno.exit,
		...options,
	};
	const report = await runPrivacyPolicyConsistencyChecker(resolvedOptions);
	resolvedOptions.writeLine(renderReport(report));
	resolvedOptions.exit(getReportExitCode(report));
	return report;
}
