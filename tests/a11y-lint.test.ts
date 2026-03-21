import { assertEquals } from "@std/testing/asserts";
import { stub } from "@std/testing/mock";

import {
	analyzeDirectory,
	analyzeSource,
	formatViolation,
} from "../bin/a11y-lint.ts";

type FakeDirEntry = Pick<
	Deno.DirEntry,
	"name" | "isFile" | "isDirectory" | "isSymlink"
>;

/**
 * Builds an async iterable for directory entries.
 * @param {FakeDirEntry[]} entries - Entries to expose.
 * @returns {AsyncIterable<Deno.DirEntry>} Async iterable for readDir stubs.
 */
function createReadDirResult(entries: FakeDirEntry[]): AsyncIterable<Deno.DirEntry> {
	return {
		async *[Symbol.asyncIterator](): AsyncIterableIterator<Deno.DirEntry> {
			for (const entry of entries) {
				yield {
					name: entry.name,
					isFile: entry.isFile,
					isDirectory: entry.isDirectory,
					isSymlink: entry.isSymlink,
				};
			}
		},
	};
}

Deno.test("analyzeSource reports non-checkbox accessibility issues", () => {
	const source = [
		"<button></button>",
		"<a href='#'></a>",
		"<input>",
		"<img src='x.png'>",
		"<img src='x.png' alt='image'>",
		"<div aria-madeup='true'></div>",
		"<div aria-hidden='maybe'></div>",
	].join("\n");

	const violations = analyzeSource("src/view.html", source);
	assertEquals(
		violations.map((violation) => violation.ruleId),
		[
			"a11y/interactive-name",
			"a11y/interactive-name",
			"a11y/interactive-name",
			"a11y/img-alt-missing",
			"a11y/img-alt-invalid",
			"a11y/aria-attribute-invalid",
			"a11y/aria-value-invalid",
		],
	);
	assertEquals(violations[0].line, 1);
	assertEquals(violations[6].line, 7);
});

Deno.test("analyzeSource ignores checkbox-specific findings", () => {
	const source = [
		"<input type='checkbox'>",
		"<div role='checkbox' aria-madeup='true'></div>",
		"<input type='checkbox' aria-hidden='not-valid'>",
		"<input type='text'>",
	].join("\n");

	const violations = analyzeSource("src/form.html", source);
	assertEquals(violations.length, 1);
	assertEquals(violations[0].ruleId, "a11y/interactive-name");
	assertEquals(violations[0].line, 4);
});

Deno.test("analyzeSource accepts elements with valid naming", () => {
	const source = [
		"<label for='search-box'>Search</label>",
		"<input id='search-box' type='search'>",
		"<label>Upload resume <input type='file'></label>",
		"<label>SMS contact <input type='radio'></label>",
		"<label>Given name <input type='text'></label>",
		"<label for='resume'>Resume</label>",
		"<input id='resume' type='file'>",
		"<label for='contact-choice'>Contact by email</label>",
		"<input id='contact-choice' type='radio'>",
		"<button aria-label='Open menu'></button>",
		"<button aria-labelledby='menu-label'></button>",
		"<button title='More'></button>",
		"<a href='/home'>Home</a>",
		"<img src='x.png' alt='Organization logo'>",
		"<img src='x.png' alt=''>",
		"<div aria-hidden='false'></div>",
		"<div aria-hidden='true'></div>",
	].join("\n");

	const violations = analyzeSource("src/good.html", source);
	assertEquals(violations, []);
});

Deno.test("analyzeSource flags non-checkbox input types without names", () => {
	const source = [
		"<input type='file'>",
		"<input type='radio'>",
		"<input type='text' value='prefilled'>",
	].join("\n");

	const violations = analyzeSource("src/non-checkbox-inputs.html", source);
	assertEquals(
		violations.map((violation) => violation.ruleId),
		[
			"a11y/interactive-name",
			"a11y/interactive-name",
			"a11y/interactive-name",
		],
	);
	assertEquals(violations[0].line, 1);
	assertEquals(violations[1].line, 2);
	assertEquals(violations[2].line, 3);
});

Deno.test("analyzeDirectory scans lintable files and sorts violations", async () => {
	const rootDir = "virtual-root";
	const readDirByPath: Record<string, FakeDirEntry[]> = {
		[rootDir]: [
			{ name: "nested", isDirectory: true, isFile: false, isSymlink: false },
			{ name: "b.html", isDirectory: false, isFile: true, isSymlink: false },
			{ name: "ignore.txt", isDirectory: false, isFile: true, isSymlink: false },
		],
		[`${rootDir}/nested`]: [
			{ name: "a.js", isDirectory: false, isFile: true, isSymlink: false },
		],
	};
	const readTextByPath: Record<string, string> = {
		[`${rootDir}/b.html`]: "<button></button>\n<input type=text>\n",
		[`${rootDir}/nested/a.js`]:
			"const tpl = `<img src='x.png' alt aria-hidden>\n<img src='x.png' aria-madeup='1'>`;\n",
	};

	const readDirStub = stub(Deno, "readDir", (path: string | URL) => {
		const normalizedPath = typeof path === "string" ? path : path.pathname;
		return createReadDirResult(readDirByPath[normalizedPath] ?? []);
	});
	const readTextStub = stub(Deno, "readTextFile", (path: string | URL) => {
		const normalizedPath = typeof path === "string" ? path : path.pathname;
		return readTextByPath[normalizedPath] ?? "";
	});

	try {
		const violations = await analyzeDirectory({ rootDir });
		assertEquals(violations.length, 5);
		assertEquals(
			violations.map((violation) => formatViolation(violation)),
			[
				`${rootDir}/b.html:1: a11y/interactive-name <button> is missing an accessible name`,
				`${rootDir}/b.html:2: a11y/interactive-name <input> is missing an accessible name`,
				`${rootDir}/nested/a.js:1: a11y/aria-value-invalid aria-hidden must be \"true\" or \"false\"`,
				`${rootDir}/nested/a.js:2: a11y/aria-attribute-invalid Unknown ARIA attribute aria-madeup`,
				`${rootDir}/nested/a.js:2: a11y/img-alt-missing <img> is missing an alt attribute`,
			],
		);
	} finally {
		readDirStub.restore();
		readTextStub.restore();
	}
});
