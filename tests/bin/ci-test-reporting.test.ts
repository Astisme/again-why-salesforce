import { readFile } from "node:fs/promises";
import { assertEquals, assertExists, test } from "#test";

test("PR test reporting ignores passing Bun summaries and matches failures", async () => {
	const workflow = await readFile(
		new URL("../../.github/workflows/pr-tests.yml", import.meta.url),
		"utf8",
	);
	const pattern = workflow.match(
		/title:\s+"Tests Failed",\s+matchPattern:\s+\/(.+)\//,
	);
	assertExists(pattern);
	const matcher = new RegExp(pattern[1]);
	assertEquals(matcher.test(" 381 pass\n 0 fail\n"), false);
	assertEquals(matcher.test(" 380 pass\n 1 fail\n"), true);
	assertEquals(matcher.test(" 371 pass\n 10 fail\n"), true);
	assertEquals(matcher.test(" 1 tests failed:\n 1 fail\n 1 error\n"), true);
});

test("aggregate checks retain formatting and expose a non-mutating format check", async () => {
	const packageJson = JSON.parse(
		await readFile(new URL("../../package.json", import.meta.url), "utf8"),
	);
	assertEquals(packageJson.scripts.checks.startsWith("bun run fmt &&"), true);
	assertEquals(packageJson.scripts["fmt-check"], "prettier --check .");
});

test("locale reporting ignores Bun command banners but keeps diagnostics", async () => {
	const workflow = await readFile(
		new URL("../../.github/workflows/pr-tests.yml", import.meta.url),
		"utf8",
	);
	const pattern = workflow.match(
		/title:\s+"These Locale Translation are missing \(not blocking\)",\s+stripPatterns:\s+\[\s+\/(.+)\/gm,/,
	);
	assertExists(pattern);
	const banner =
		"$ bun run bin/find-invalid-variables.ts && bun run bin/missing-locales.ts";
	for (const newline of ["\n", "\r\n"]) {
		const matcher = new RegExp(pattern[1], "gm");
		assertEquals(`${banner}${newline}`.replaceAll(matcher, "").trim(), "");
		assertEquals(
			`${banner}${newline}Error: invalid locale${newline}`
				.replaceAll(matcher, "")
				.trim(),
			"Error: invalid locale",
		);
		assertEquals(
			`{"0":{"locales":["fr"],"missingKeys":["example"]}}${newline}`
				.replaceAll(matcher, "")
				.trim(),
			'{"0":{"locales":["fr"],"missingKeys":["example"]}}',
		);
	}
});
