import { assertEquals, assertStringIncludes } from "@std/testing/asserts";

import {
	type CheckerFilePaths,
	type CheckerFiles,
	DEFAULT_CHECKER_FILE_PATHS,
	evaluatePrivacyPolicyConsistency,
	getCheckerExitCode,
	loadCheckerFiles,
	renderCheckerReport,
	runPrivacyPolicyConsistencyChecker,
} from "../../bin/privacy-policy-consistency-check.ts";

/**
 * Builds a fixture where all checker claims pass.
 *
 * @return {CheckerFiles} Fully passing checker fixture.
 */
function createPassingFiles(): CheckerFiles {
	return {
		policy: `# Privacy

Settings analytics opt-out is available and users can disable analytics.
We send only 1 ping per day and use Simple Analytics.
Stored sync keys: \`settings\`, \`settings-tab_generic_style\`, \`settings-tab_org_style\`, \`_locale\`.
Tab data uses browser sync storage under key \`againWhySalesforce\` and variable \`WHY_KEY\`.
Local preferences in \`localStorage\` are \`usingTheme\`, \`userTheme\`, and \`noPerm\`.
Least-Privilege permissions are requested at the moment you use them.
`,
		analytics:
			`getSettings(PREVENT_ANALYTICS); hasSentAnalyticsToday(); isNewUser ? "/new-user" : "/"; simpleanalyticscdn.com; /noscript.gif; extension.again.whysalesforce; if (shouldPreventAnalytics) { return; }`,
		oncePerDay: `sessionStorage.getItem("today"); checkInsertAnalytics();`,
		content: `executeOncePerDay();`,
		constants: `
export const WHY_KEY = "againWhySalesforce";
export const LOCALE_KEY = "_locale";
export const SETTINGS_KEY = "settings";
export const GENERIC_TAB_STYLE_KEY = \`\${SETTINGS_KEY}-\${TAB_GENERIC_STYLE}\`;
export const ORG_TAB_STYLE_KEY = \`\${SETTINGS_KEY}-\${TAB_ORG_STYLE}\`;
export const DO_NOT_REQUEST_FRAME_PERMISSION = "noPerm";
`,
		storage:
			`BROWSER.storage.sync.get([key]); BROWSER.storage.sync.set({ value: 1 }); function bg_setStorage(){} function bg_getStorage(callback, key = WHY_KEY){}`,
		manifest:
			`{"permissions":["storage"],"optional_permissions":["cookies"]}`,
		optionsJs: `if (e.target.value === FOLLOW_SF_LANG) { await requestCookiesPermission(); }`,
		optionsHtml: `<input id="prevent_analytics" />`,
		functions:
			`function requestCookiesPermission(){ return requestPermissions({ permissions: ["cookies"], origins: EXTENSION_OPTIONAL_HOST_PERM }); }
localStorage.getItem(DO_NOT_REQUEST_FRAME_PERMISSION);`,
		background: `BROWSER.cookies?.getAll({ name: "sid" });`,
		themeHandler:
			`localStorage.setItem("usingTheme", "light"); localStorage.setItem("userTheme", "dark"); localStorage.getItem("userTheme");`,
		themeSelector: `localStorage.getItem("usingTheme");`,
		reqPermissions: `localStorage.setItem(DO_NOT_REQUEST_FRAME_PERMISSION, "true");`,
	};
}

/**
 * Returns a fixture with one file overridden.
 *
 * @param {Partial<CheckerFiles>} overrides Overridden file contents.
 * @return {CheckerFiles} Updated fixture.
 */
function withOverrides(overrides: Partial<CheckerFiles>): CheckerFiles {
	return {
		...createPassingFiles(),
		...overrides,
	};
}

/**
 * Finds a claim in a report by id.
 *
 * @param {{ claims: Array<{ id: string; status: string; }>; }} report Checker report.
 * @param {string} id Claim identifier.
 * @return {{ id: string; status: string; }} Claim result.
 */
function getClaimStatus(
	report: { claims: Array<{ id: string; status: string }> },
	id: string,
): { id: string; status: string } {
	const claim = report.claims.find((singleClaim) => singleClaim.id === id);
	if (claim == null) {
		throw new Error(`Missing claim: ${id}`);
	}
	return claim;
}

Deno.test("evaluatePrivacyPolicyConsistency returns pass report for matching files", () => {
	const report = evaluatePrivacyPolicyConsistency(createPassingFiles());

	assertEquals(report.status, "pass");
	assertEquals(report.summary, {
		totalClaims: 7,
		passedClaims: 7,
		failedClaims: 0,
	});
	assertEquals(getCheckerExitCode(report), 0);
});

Deno.test("analytics claim fails when policy opt-out wording is missing", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({ policy: "privacy text without analytics controls" }),
	);

	assertEquals(getClaimStatus(report, "analytics-opt-out").status, "fail");
	assertEquals(report.status, "fail");
	assertEquals(getCheckerExitCode(report), 1);
});

Deno.test("analytics claim accepts disable-analytics wording without explicit opt-out term", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			policy: createPassingFiles().policy.replace(
				"opt-out is available and users can disable analytics.",
				"users can disable analytics.",
			),
		}),
	);

	assertEquals(getClaimStatus(report, "analytics-opt-out").status, "pass");
});

Deno.test("analytics cadence claim fails when one-ping and path signals are absent", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			policy: createPassingFiles().policy.replace("1 ping per day", "daily ping"),
			analytics: "hasSentAnalyticsToday",
			oncePerDay: "checkInsertAnalytics();",
		}),
	);

	assertEquals(getClaimStatus(report, "analytics-cadence-path").status, "fail");
});

Deno.test("analytics endpoint claim fails when domain markers are missing", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			policy: createPassingFiles().policy.replace("Simple Analytics", "Analytics"),
			analytics: "getSettings(PREVENT_ANALYTICS)",
		}),
	);

	assertEquals(getClaimStatus(report, "analytics-endpoint").status, "fail");
});

Deno.test("sync storage key claim fails when constants or policy keys are inconsistent", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			policy: createPassingFiles().policy.replace("`settings-tab_org_style`", "`settings-tab-org-style`"),
			constants: createPassingFiles().constants.replace(
				'export const LOCALE_KEY = "_locale";',
				'export const LOCALE_KEY = "locale";',
			),
		}),
	);

	assertEquals(getClaimStatus(report, "storage-sync-keys").status, "fail");
});

Deno.test("tab data claim fails when policy says session-only in-memory", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			policy:
				"Tab data key `againWhySalesforce` is in-memory and nothing is persisted here beyond your current session.",
		}),
	);

	assertEquals(getClaimStatus(report, "tab-data-storage").status, "fail");
});

Deno.test("localStorage claim fails when noPerm constant usage is absent", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			functions: createPassingFiles().functions.replace(
				"DO_NOT_REQUEST_FRAME_PERMISSION",
				"FRAME_PERMISSION_FLAG",
			),
			reqPermissions: "",
		}),
	);

	assertEquals(getClaimStatus(report, "localstorage-keys").status, "fail");
});

Deno.test("localStorage claim fails when documented and actual key sets diverge with same set size", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			themeHandler: createPassingFiles().themeHandler.replace(
				"usingTheme",
				"usingThemeAlt",
			),
			themeSelector: `localStorage.getItem("usingThemeAlt");`,
		}),
	);

	assertEquals(getClaimStatus(report, "localstorage-keys").status, "fail");
});

Deno.test("cookie boundary claim fails when cookies become required permission", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			manifest: `{"permissions":["storage","cookies"],"optional_permissions":[]}`,
		}),
	);

	assertEquals(
		getClaimStatus(report, "cookie-permission-boundaries").status,
		"fail",
	);
});

Deno.test("cookie boundary claim fails when optional_permissions is missing in manifest", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			manifest: `{"permissions":["storage"]}`,
		}),
	);

	assertEquals(
		getClaimStatus(report, "cookie-permission-boundaries").status,
		"fail",
	);
});

Deno.test("cookie boundary claim passes when permissions is missing but cookies stay optional", () => {
	const report = evaluatePrivacyPolicyConsistency(
		withOverrides({
			manifest: `{"optional_permissions":["cookies"]}`,
		}),
	);

	assertEquals(
		getClaimStatus(report, "cookie-permission-boundaries").status,
		"pass",
	);
});

Deno.test("renderCheckerReport returns deterministic JSON string with newline", () => {
	const report = evaluatePrivacyPolicyConsistency(createPassingFiles());
	const rendered = renderCheckerReport(report);

	assertStringIncludes(rendered, '"status": "pass"');
	assertEquals(rendered.endsWith("\n"), true);
});

Deno.test("loadCheckerFiles reads every configured file path", async () => {
	const filePaths: CheckerFilePaths = {
		policy: "policy",
		analytics: "analytics",
		oncePerDay: "once",
		content: "content",
		constants: "constants",
		storage: "storage",
		manifest: "manifest",
		optionsJs: "optionsJs",
		optionsHtml: "optionsHtml",
		functions: "functions",
		background: "background",
		themeHandler: "themeHandler",
		themeSelector: "themeSelector",
		reqPermissions: "reqPermissions",
	};
	const readCalls: string[] = [];
	const loaded = await loadCheckerFiles(
		filePaths,
		(path) => {
			readCalls.push(path);
			return Promise.resolve(`contents:${path}`);
		},
	);

	assertEquals(loaded, {
		policy: "contents:policy",
		analytics: "contents:analytics",
		oncePerDay: "contents:once",
		content: "contents:content",
		constants: "contents:constants",
		storage: "contents:storage",
		manifest: "contents:manifest",
		optionsJs: "contents:optionsJs",
		optionsHtml: "contents:optionsHtml",
		functions: "contents:functions",
		background: "contents:background",
		themeHandler: "contents:themeHandler",
		themeSelector: "contents:themeSelector",
		reqPermissions: "contents:reqPermissions",
	});
	assertEquals(readCalls, Object.values(filePaths));
});

Deno.test("runPrivacyPolicyConsistencyChecker writes report and returns exit code", async () => {
	const writes: string[] = [];
	const exitCode = await runPrivacyPolicyConsistencyChecker({
		filePaths: DEFAULT_CHECKER_FILE_PATHS,
		readTextFile: (path) => {
			const fixture = createPassingFiles();
			switch (path) {
				case DEFAULT_CHECKER_FILE_PATHS.policy:
					return Promise.resolve(fixture.policy);
				case DEFAULT_CHECKER_FILE_PATHS.analytics:
					return Promise.resolve(fixture.analytics);
				case DEFAULT_CHECKER_FILE_PATHS.oncePerDay:
					return Promise.resolve(fixture.oncePerDay);
				case DEFAULT_CHECKER_FILE_PATHS.content:
					return Promise.resolve(fixture.content);
				case DEFAULT_CHECKER_FILE_PATHS.constants:
					return Promise.resolve(fixture.constants);
				case DEFAULT_CHECKER_FILE_PATHS.storage:
					return Promise.resolve(fixture.storage);
				case DEFAULT_CHECKER_FILE_PATHS.manifest:
					return Promise.resolve(fixture.manifest);
				case DEFAULT_CHECKER_FILE_PATHS.optionsJs:
					return Promise.resolve(fixture.optionsJs);
				case DEFAULT_CHECKER_FILE_PATHS.optionsHtml:
					return Promise.resolve(fixture.optionsHtml);
				case DEFAULT_CHECKER_FILE_PATHS.functions:
					return Promise.resolve(fixture.functions);
				case DEFAULT_CHECKER_FILE_PATHS.background:
					return Promise.resolve(fixture.background);
				case DEFAULT_CHECKER_FILE_PATHS.themeHandler:
					return Promise.resolve(fixture.themeHandler);
				case DEFAULT_CHECKER_FILE_PATHS.themeSelector:
					return Promise.resolve(fixture.themeSelector);
				case DEFAULT_CHECKER_FILE_PATHS.reqPermissions:
					return Promise.resolve(fixture.reqPermissions);
				default:
					throw new Error(`Unexpected path: ${path}`);
			}
		},
		writeStdout: (value) => {
			writes.push(value);
		},
	});

	assertEquals(exitCode, 0);
	assertEquals(writes.length, 1);
	assertStringIncludes(writes[0], '"failedClaims": 0');
});

Deno.test("runPrivacyPolicyConsistencyChecker supports default dependencies", async () => {
	const exitCode = await runPrivacyPolicyConsistencyChecker();
	assertEquals(exitCode, 0);
});
