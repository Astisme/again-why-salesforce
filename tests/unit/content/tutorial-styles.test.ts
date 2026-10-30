import { readFile } from "node:fs/promises";
import { assert, test } from "#test";

test("tutorial disables entrance animation for reduced-motion preference", async () => {
	const css = await readFile(
		new URL("../../../src/salesforce/css/tutorial.css", import.meta.url),
		"utf8",
	);
	assert(/\.tut-v7\s*\{[^}]*animation:\s*tut-v7-in\b/s.test(css));
	assert(
		/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.tut-v7\s*\{\s*animation:\s*none;\s*\}\s*\}/.test(
			css,
		),
	);
});
