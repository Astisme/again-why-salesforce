export type ClaimStatus = "pass" | "fail";

export type RuleCheck = {
	description: string;
	passed: boolean;
};

export type ClaimResult = {
	id: string;
	title: string;
	status: ClaimStatus;
	summary: string;
	evidence: string[];
};

export type CheckerSummary = {
	totalClaims: number;
	passedClaims: number;
	failedClaims: number;
};

export type CheckerReport = {
	status: ClaimStatus;
	summary: CheckerSummary;
	claims: ClaimResult[];
};

export type CheckerFilePaths = {
	policy: string;
	analytics: string;
	oncePerDay: string;
	content: string;
	constants: string;
	storage: string;
	manifest: string;
	optionsJs: string;
	optionsHtml: string;
	functions: string;
	background: string;
	themeHandler: string;
	themeSelector: string;
	reqPermissions: string;
};

export type CheckerFiles = {
	[K in keyof CheckerFilePaths]: string;
};

export type ReadTextFile = (path: string) => Promise<string>;

export type WriteStdout = (text: string) => void;

export const DEFAULT_CHECKER_FILE_PATHS: CheckerFilePaths = {
	policy: "docs/PRIVACY_POLICY.md",
	analytics: "src/salesforce/analytics.js",
	oncePerDay: "src/salesforce/once-a-day.js",
	content: "src/salesforce/content.js",
	constants: "src/core/constants.js",
	storage: "src/background/storage.js",
	manifest: "src/manifest/template-manifest.json",
	optionsJs: "src/settings/options.js",
	optionsHtml: "src/settings/options.html",
	functions: "src/core/functions.js",
	background: "src/background/background.js",
	themeHandler: "src/action/themeHandler.js",
	themeSelector: "src/components/theme-selector/theme-selector.js",
	reqPermissions: "src/action/req_permissions/req_permissions.js",
};

const POLICY_SYNC_KEYS = [
	"settings",
	"settings-tab_generic_style",
	"settings-tab_org_style",
	"_locale",
] as const;

const EXPECTED_LOCAL_STORAGE_KEYS = ["usingTheme", "userTheme", "noPerm"];

/**
 * Builds a single rule check result.
 *
 * @param {string} description Human-readable check description.
 * @param {boolean} passed Whether the check passed.
 * @return {RuleCheck} Rule check payload.
 */
function createRuleCheck(description: string, passed: boolean): RuleCheck {
	return { description, passed };
}

/**
 * Converts rule checks into a claim result object.
 *
 * @param {string} id Stable claim identifier.
 * @param {string} title Human-readable claim title.
 * @param {RuleCheck[]} checks Check outcomes for the claim.
 * @return {ClaimResult} Aggregated claim result.
 */
function createClaimResult(
	id: string,
	title: string,
	checks: RuleCheck[],
): ClaimResult {
	const failedChecks = checks.filter((check) => !check.passed);
	const status: ClaimStatus = failedChecks.length === 0 ? "pass" : "fail";
	const summary = status === "pass"
		? "All checks passed"
		: `${failedChecks.length} check(s) failed`;
	const evidence = checks.map((check) =>
		`${check.passed ? "pass" : "fail"}: ${check.description}`
	);
	return {
		id,
		title,
		status,
		summary,
		evidence,
	};
}

/**
 * Finds all markdown backtick tokens in the provided text.
 *
 * @param {string} text Source markdown text.
 * @return {Set<string>} Set of discovered token values.
 */
function extractBacktickTokens(text: string): Set<string> {
	const tokenPattern = /`([^`]+)`/g;
	const tokens = new Set<string>();
	for (const match of text.matchAll(tokenPattern)) {
		tokens.add(match[1]);
	}
	return tokens;
}

/**
 * Extracts exported string constants from a JavaScript source file.
 *
 * @param {string} source JavaScript source code.
 * @return {Map<string, string>} Exported constant name -> value map.
 */
function extractExportedStringConstants(source: string): Map<string, string> {
	const constantPattern = /export const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)";/g;
	const constants = new Map<string, string>();
	for (const match of source.matchAll(constantPattern)) {
		constants.set(match[1], match[2]);
	}
	return constants;
}

/**
 * Extracts string literal keys used in localStorage getItem/setItem calls.
 *
 * @param {string} source JavaScript source code.
 * @return {Set<string>} Set of localStorage keys found in the source.
 */
function extractLocalStorageKeys(source: string): Set<string> {
	const localStoragePattern =
		/localStorage\.(?:getItem|setItem)\(\s*['"]([^'"]+)['"]/g;
	const keys = new Set<string>();
	for (const match of source.matchAll(localStoragePattern)) {
		keys.add(match[1]);
	}
	return keys;
}

/**
 * Collects localStorage keys from all relevant sources, including constant-based key access.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {Set<string>} Set of all resolved localStorage keys.
 */
function collectLocalStorageKeys(files: CheckerFiles): Set<string> {
	const constants = extractExportedStringConstants(files.constants);
	const keys = new Set<string>([
		...extractLocalStorageKeys(files.themeHandler),
		...extractLocalStorageKeys(files.themeSelector),
		...extractLocalStorageKeys(files.functions),
		...extractLocalStorageKeys(files.reqPermissions),
	]);
	if (
		files.functions.includes("DO_NOT_REQUEST_FRAME_PERMISSION") ||
			files.reqPermissions.includes("DO_NOT_REQUEST_FRAME_PERMISSION")
	) {
		const doNotRequestFramePermission = constants.get(
			"DO_NOT_REQUEST_FRAME_PERMISSION",
		);
		if (doNotRequestFramePermission != null) {
			keys.add(doNotRequestFramePermission);
		}
	}
	return keys;
}

/**
 * Returns true when every expected value is present in the provided set.
 *
 * @param {Set<string>} values Existing set of values.
 * @param {readonly string[]} expected Expected values.
 * @return {boolean} Whether all expected values are present.
 */
function hasAllValues(values: Set<string>, expected: readonly string[]): boolean {
	return expected.every((singleExpectedValue) =>
		values.has(singleExpectedValue)
	);
}

/**
 * Compares two sets for exact equality.
 *
 * @param {Set<string>} left Left-hand set.
 * @param {Set<string>} right Right-hand set.
 * @return {boolean} True when both sets contain exactly the same values.
 */
function areSetsEqual(left: Set<string>, right: Set<string>): boolean {
	if (left.size !== right.size) {
		return false;
	}
	for (const value of left) {
		if (!right.has(value)) {
			return false;
		}
	}
	return true;
}

/**
 * Builds the analytics opt-out claim result.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {ClaimResult} Claim evaluation.
 */
function evaluateAnalyticsOptOutClaim(files: CheckerFiles): ClaimResult {
	const policyLower = files.policy.toLowerCase();
	const settingsAndAnalyticsMention =
		policyLower.includes("settings") && policyLower.includes("analytics");
	const checks = [
		createRuleCheck(
			"Privacy policy documents analytics opt-out in settings",
			settingsAndAnalyticsMention &&
				(policyLower.includes("opt-out") || policyLower.includes("disable analytics")),
		),
		createRuleCheck(
			"Settings UI exposes the prevent_analytics toggle",
			files.optionsHtml.includes('id="prevent_analytics"'),
		),
		createRuleCheck(
			"Analytics code reads PREVENT_ANALYTICS from stored settings",
			files.analytics.includes("getSettings(PREVENT_ANALYTICS)"),
		),
		createRuleCheck(
			"Analytics ping is blocked when shouldPreventAnalytics is true",
			/shouldPreventAnalytics[\s\S]+return;/.test(files.analytics),
		),
	];
	return createClaimResult(
		"analytics-opt-out",
		"Analytics Opt-Out Behavior",
		checks,
	);
}

/**
 * Builds the analytics cadence and path claim result.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {ClaimResult} Claim evaluation.
 */
function evaluateAnalyticsCadenceClaim(files: CheckerFiles): ClaimResult {
	const policyLower = files.policy.toLowerCase();
	const checks = [
		createRuleCheck(
			"Privacy policy states one analytics ping per day",
			policyLower.includes("1 ping per day"),
		),
		createRuleCheck(
			"Analytics module has same-day suppression logic",
			files.analytics.includes("hasSentAnalyticsToday"),
		),
		createRuleCheck(
			"Analytics module sends /new-user for first-time ping and / for regular ping",
			files.analytics.includes('isNewUser ? "/new-user" : "/"'),
		),
		createRuleCheck(
			"Daily orchestrator uses sessionStorage and invokes checkInsertAnalytics",
			files.oncePerDay.includes("sessionStorage") &&
				files.oncePerDay.includes("checkInsertAnalytics();"),
		),
	];
	return createClaimResult(
		"analytics-cadence-path",
		"Analytics Ping Cadence And Path",
		checks,
	);
}

/**
 * Builds the analytics endpoint/domain claim result.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {ClaimResult} Claim evaluation.
 */
function evaluateAnalyticsEndpointClaim(files: CheckerFiles): ClaimResult {
	const policyLower = files.policy.toLowerCase();
	const checks = [
		createRuleCheck(
			"Privacy policy references Simple Analytics",
			policyLower.includes("simple analytics"),
		),
		createRuleCheck(
			"Analytics code targets simpleanalyticscdn.com",
			files.analytics.includes("simpleanalyticscdn.com"),
		),
		createRuleCheck(
			"Analytics ping path uses /noscript.gif",
			files.analytics.includes("/noscript.gif"),
		),
		createRuleCheck(
			"Analytics payload uses extension.again.whysalesforce hostname",
			files.analytics.includes("extension.again.whysalesforce"),
		),
	];
	return createClaimResult(
		"analytics-endpoint",
		"Analytics Endpoint And Domain Usage",
		checks,
	);
}

/**
 * Builds the browser sync storage key claim result.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {ClaimResult} Claim evaluation.
 */
function evaluateSyncStorageKeysClaim(files: CheckerFiles): ClaimResult {
	const policyTokens = extractBacktickTokens(files.policy);
	const constants = extractExportedStringConstants(files.constants);
	const hasStyleTemplateDefinitions =
		/export const GENERIC_TAB_STYLE_KEY\s*=\s*`\$\{SETTINGS_KEY\}-\$\{TAB_GENERIC_STYLE\}`;/
			.test(files.constants) &&
		/export const ORG_TAB_STYLE_KEY\s*=\s*`\$\{SETTINGS_KEY\}-\$\{TAB_ORG_STYLE\}`;/
			.test(files.constants);
	const checks = [
		createRuleCheck(
			"Privacy policy lists all documented sync settings keys",
			hasAllValues(policyTokens, POLICY_SYNC_KEYS),
		),
		createRuleCheck(
			"Constants define SETTINGS_KEY as settings",
			constants.get("SETTINGS_KEY") === "settings",
		),
		createRuleCheck(
			"Constants define GENERIC_TAB_STYLE_KEY and ORG_TAB_STYLE_KEY from settings namespace",
			hasStyleTemplateDefinitions,
		),
		createRuleCheck(
			"Constants define LOCALE_KEY as _locale",
			constants.get("LOCALE_KEY") === "_locale",
		),
		createRuleCheck(
			"Storage module uses browser sync storage get and set APIs",
			files.storage.includes("BROWSER.storage.sync.get") &&
				files.storage.includes("BROWSER.storage.sync.set"),
		),
	];
	return createClaimResult(
		"storage-sync-keys",
		"Browser Sync Storage Location And Key Claims",
		checks,
	);
}

/**
 * Builds the tab data storage claim result.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {ClaimResult} Claim evaluation.
 */
function evaluateTabDataStorageClaim(files: CheckerFiles): ClaimResult {
	const policyLower = files.policy.toLowerCase();
	const constants = extractExportedStringConstants(files.constants);
	const checks = [
		createRuleCheck(
			"Privacy policy describes tab data in browser sync storage",
			policyLower.includes("againwhysalesforce") &&
				policyLower.includes("sync storage") &&
				!policyLower.includes("nothing is persisted here beyond your current session"),
		),
		createRuleCheck(
			"Constants define WHY_KEY as againWhySalesforce",
			constants.get("WHY_KEY") === "againWhySalesforce",
		),
		createRuleCheck(
			"Storage module defaults tab read/write operations to WHY_KEY",
			files.storage.includes("key = WHY_KEY") &&
				files.storage.includes("bg_setStorage"),
		),
	];
	return createClaimResult(
		"tab-data-storage",
		"Tab Data Storage Consistency",
		checks,
	);
}

/**
 * Builds the localStorage key disclosure claim result.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {ClaimResult} Claim evaluation.
 */
function evaluateLocalStorageDisclosureClaim(files: CheckerFiles): ClaimResult {
	const combinedLocalStorageKeys = collectLocalStorageKeys(files);
	const expectedKeys = new Set<string>(EXPECTED_LOCAL_STORAGE_KEYS);
	const policyTokens = extractBacktickTokens(files.policy);
	const checks = [
		createRuleCheck(
			"Privacy policy documents localStorage usage",
			files.policy.includes("`localStorage`") &&
				files.policy.toLowerCase().includes("theme"),
		),
		createRuleCheck(
			"Privacy policy explicitly lists all localStorage keys",
			hasAllValues(policyTokens, EXPECTED_LOCAL_STORAGE_KEYS),
		),
		createRuleCheck(
			"Code localStorage keys exactly match documented keys",
			areSetsEqual(combinedLocalStorageKeys, expectedKeys),
		),
	];
	return createClaimResult(
		"localstorage-keys",
		"LocalStorage Location And Key Claims",
		checks,
	);
}

/**
 * Parses the template manifest JSON.
 *
 * @param {string} manifestSource Raw JSON text.
 * @return {{ permissions: string[]; optional_permissions: string[]; }} Manifest permission fields.
 */
function parseManifestPermissions(manifestSource: string): {
	permissions: string[];
	optional_permissions: string[];
} {
	const manifest = JSON.parse(manifestSource) as {
		permissions?: string[];
		optional_permissions?: string[];
	};
	return {
		permissions: manifest.permissions ?? [],
		optional_permissions: manifest.optional_permissions ?? [],
	};
}

/**
 * Builds the cookies permission boundary claim result.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {ClaimResult} Claim evaluation.
 */
function evaluateCookiePermissionBoundaryClaim(files: CheckerFiles): ClaimResult {
	const policyLower = files.policy.toLowerCase();
	const manifestPermissions = parseManifestPermissions(files.manifest);
	const checks = [
		createRuleCheck(
			"Privacy policy includes a least-privilege permission statement",
			policyLower.includes("least-privilege") &&
				policyLower.includes("requested at the moment"),
		),
		createRuleCheck(
			"Manifest keeps cookies as optional permission only",
			!manifestPermissions.permissions.includes("cookies") &&
				manifestPermissions.optional_permissions.includes("cookies"),
		),
		createRuleCheck(
			"requestCookiesPermission requests cookies with optional host origins",
			files.functions.includes("requestCookiesPermission") &&
				files.functions.includes('permissions: ["cookies"]') &&
				files.functions.includes("EXTENSION_OPTIONAL_HOST_PERM"),
		),
		createRuleCheck(
			"Settings flow requests cookies only for FOLLOW_SF_LANG",
			files.optionsJs.includes("FOLLOW_SF_LANG") &&
				files.optionsJs.includes("requestCookiesPermission()"),
		),
		createRuleCheck(
			"Cookie reads happen in the background script",
			files.background.includes("BROWSER.cookies?.getAll"),
		),
	];
	return createClaimResult(
		"cookie-permission-boundaries",
		"Cookie-Permission Usage Boundaries",
		checks,
	);
}

/**
 * Evaluates all privacy policy consistency claims against loaded file contents.
 *
 * @param {CheckerFiles} files Loaded file contents.
 * @return {CheckerReport} Deterministic checker report.
 */
export function evaluatePrivacyPolicyConsistency(files: CheckerFiles): CheckerReport {
	const claims = [
		evaluateAnalyticsOptOutClaim(files),
		evaluateAnalyticsCadenceClaim(files),
		evaluateAnalyticsEndpointClaim(files),
		evaluateSyncStorageKeysClaim(files),
		evaluateTabDataStorageClaim(files),
		evaluateLocalStorageDisclosureClaim(files),
		evaluateCookiePermissionBoundaryClaim(files),
	];
	const summary = claims.reduce<CheckerSummary>(
		(accumulator, claim) => {
			if (claim.status === "pass") {
				accumulator.passedClaims += 1;
			} else {
				accumulator.failedClaims += 1;
			}
			return accumulator;
		},
		{
			totalClaims: claims.length,
			passedClaims: 0,
			failedClaims: 0,
		},
	);
	return {
		status: summary.failedClaims === 0 ? "pass" : "fail",
		summary,
		claims,
	};
}

/**
 * Renders a checker report as deterministic JSON with trailing newline.
 *
 * @param {CheckerReport} report Checker report payload.
 * @return {string} JSON report representation.
 */
export function renderCheckerReport(report: CheckerReport): string {
	return `${JSON.stringify(report, null, 2)}\n`;
}

/**
 * Resolves process exit code from checker report status.
 *
 * @param {CheckerReport} report Checker report payload.
 * @return {number} 0 for pass, 1 for fail.
 */
export function getCheckerExitCode(report: CheckerReport): number {
	return report.status === "pass" ? 0 : 1;
}

/**
 * Loads all checker files from disk.
 *
 * @param {CheckerFilePaths} [filePaths=DEFAULT_CHECKER_FILE_PATHS] File path map.
 * @param {ReadTextFile} [readTextFile=Deno.readTextFile] Read function dependency.
 * @return {Promise<CheckerFiles>} Loaded file contents.
 */
export async function loadCheckerFiles(
	filePaths: CheckerFilePaths = DEFAULT_CHECKER_FILE_PATHS,
	readTextFile: ReadTextFile = Deno.readTextFile,
): Promise<CheckerFiles> {
	return {
		policy: await readTextFile(filePaths.policy),
		analytics: await readTextFile(filePaths.analytics),
		oncePerDay: await readTextFile(filePaths.oncePerDay),
		content: await readTextFile(filePaths.content),
		constants: await readTextFile(filePaths.constants),
		storage: await readTextFile(filePaths.storage),
		manifest: await readTextFile(filePaths.manifest),
		optionsJs: await readTextFile(filePaths.optionsJs),
		optionsHtml: await readTextFile(filePaths.optionsHtml),
		functions: await readTextFile(filePaths.functions),
		background: await readTextFile(filePaths.background),
		themeHandler: await readTextFile(filePaths.themeHandler),
		themeSelector: await readTextFile(filePaths.themeSelector),
		reqPermissions: await readTextFile(filePaths.reqPermissions),
	};
}

const TEXT_ENCODER = new TextEncoder();

/**
 * Writes text to process stdout.
 *
 * @param {string} text Text to write.
 */
function writeToStdout(text: string): void {
	Deno.stdout.writeSync(TEXT_ENCODER.encode(text));
}

/**
 * Executes the checker end-to-end and writes its JSON report to stdout.
 *
 * @param {{ filePaths?: CheckerFilePaths; readTextFile?: ReadTextFile; writeStdout?: WriteStdout; }} [dependencies={}] Optional injected dependencies.
 * @return {Promise<number>} Exit code based on report status.
 */
export async function runPrivacyPolicyConsistencyChecker(
	dependencies: {
		filePaths?: CheckerFilePaths;
		readTextFile?: ReadTextFile;
		writeStdout?: WriteStdout;
	} = {},
): Promise<number> {
	const files = await loadCheckerFiles(
		dependencies.filePaths ?? DEFAULT_CHECKER_FILE_PATHS,
		dependencies.readTextFile ?? Deno.readTextFile,
	);
	const report = evaluatePrivacyPolicyConsistency(files);
	(dependencies.writeStdout ?? writeToStdout)(renderCheckerReport(report));
	return getCheckerExitCode(report);
}
