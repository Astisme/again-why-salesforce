#!/usr/bin/env -S deno run --allow-read

const HTML_LIKE_EXTENSIONS = new Set([".html", ".js", ".ts", ".mjs", ".cjs"]);
const INTERACTIVE_TAGS = new Set([
	"button",
	"a",
	"input",
	"select",
	"textarea",
]);
const TEXT_LIKE_INPUT_TYPES = new Set([
	"",
	"text",
	"search",
	"url",
	"tel",
	"email",
	"password",
	"number",
	"file",
	"radio",
]);
const GENERIC_ALT_VALUES = new Set(["image", "photo", "picture", "img"]);
const KNOWN_ARIA_ATTRIBUTES = new Set([
	"aria-activedescendant",
	"aria-atomic",
	"aria-autocomplete",
	"aria-braillelabel",
	"aria-brailleroledescription",
	"aria-busy",
	"aria-checked",
	"aria-colcount",
	"aria-colindex",
	"aria-colindextext",
	"aria-colspan",
	"aria-controls",
	"aria-current",
	"aria-describedby",
	"aria-description",
	"aria-details",
	"aria-disabled",
	"aria-dropeffect",
	"aria-errormessage",
	"aria-expanded",
	"aria-flowto",
	"aria-grabbed",
	"aria-haspopup",
	"aria-hidden",
	"aria-invalid",
	"aria-keyshortcuts",
	"aria-label",
	"aria-labelledby",
	"aria-level",
	"aria-live",
	"aria-modal",
	"aria-multiline",
	"aria-multiselectable",
	"aria-orientation",
	"aria-owns",
	"aria-placeholder",
	"aria-posinset",
	"aria-pressed",
	"aria-readonly",
	"aria-relevant",
	"aria-required",
	"aria-roledescription",
	"aria-rowcount",
	"aria-rowindex",
	"aria-rowindextext",
	"aria-rowspan",
	"aria-selected",
	"aria-setsize",
	"aria-sort",
	"aria-valuemax",
	"aria-valuemin",
	"aria-valuenow",
	"aria-valuetext",
]);
const ARIA_BOOLEAN_ATTRIBUTES = new Set([
	"aria-atomic",
	"aria-busy",
	"aria-disabled",
	"aria-expanded",
	"aria-hidden",
	"aria-modal",
	"aria-multiline",
	"aria-multiselectable",
	"aria-readonly",
	"aria-required",
	"aria-selected",
]);

interface A11yViolation {
	filePath: string;
	line: number;
	ruleId: string;
	message: string;
}

interface ParsedTag {
	tagName: string;
	attributes: Record<string, string | null>;
	line: number;
	innerText: string;
}

interface ScanOptions {
	rootDir: string;
}

/**
 * Returns true when the file extension should be inspected.
 * @param {string} filePath - Path to evaluate.
 * @returns {boolean} True when the file is lintable.
 */
function isLintableFile(filePath: string): boolean {
	const extension = filePath.slice(filePath.lastIndexOf("."));
	return HTML_LIKE_EXTENSIONS.has(extension);
}

/**
 * Recursively lists lintable files from a directory.
 * @param {string} rootDir - Directory to scan.
 * @returns {Promise<string[]>} Sorted lintable file paths.
 */
async function getLintableFiles(rootDir: string): Promise<string[]> {
	const files: string[] = [];
	for await (const entry of Deno.readDir(rootDir)) {
		const entryPath = `${rootDir}/${entry.name}`;
		if (entry.isDirectory) {
			files.push(...await getLintableFiles(entryPath));
			continue;
		}
		if (entry.isFile && isLintableFile(entryPath)) {
			files.push(entryPath);
		}
	}
	return files.sort();
}

/**
 * Parses an element attribute string.
 * @param {string} rawAttributes - Raw attribute text from the tag.
 * @returns {Record<string, string | null>} Parsed attributes.
 */
function parseAttributes(rawAttributes: string): Record<string, string | null> {
	const attributes: Record<string, string | null> = {};
	const attributePattern =
		/([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
	let match = attributePattern.exec(rawAttributes);
	while (match !== null) {
		const name = match[1].toLowerCase();
		const value = match[2] ?? match[3] ?? match[4] ?? null;
		attributes[name] = value;
		match = attributePattern.exec(rawAttributes);
	}
	return attributes;
}

/**
 * Computes the line number for a character index.
 * @param {string} source - Full source text.
 * @param {number} index - Character index in source.
 * @returns {number} 1-based line number.
 */
function getLineNumber(source: string, index: number): number {
	let line = 1;
	for (let cursor = 0; cursor < index; cursor += 1) {
		if (source[cursor] === "\n") {
			line += 1;
		}
	}
	return line;
}

/**
 * Removes tags and normalizes text content.
 * @param {string} content - Raw HTML content.
 * @returns {string} Normalized visible text.
 */
function extractVisibleText(content: string): string {
	const withoutTags = content.replace(/<[^>]+>/g, " ");
	return withoutTags.replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extracts label associations by label `for` attribute.
 * @param {string} source - Source to scan.
 * @returns {Map<string, string>} Label text by element id.
 */
function getLabelsByForAttribute(source: string): Map<string, string> {
	const labelsById = new Map<string, string>();
	const labelPattern = /<label\b([^>]*)>([\s\S]*?)<\/label>/gi;
	let match = labelPattern.exec(source);
	while (match !== null) {
		const attributes = parseAttributes(match[1]);
		const targetId = attributes["for"];
		const labelText = extractVisibleText(match[2]);
		if (targetId && labelText.length > 0) {
			labelsById.set(targetId, labelText);
		}
		match = labelPattern.exec(source);
	}
	return labelsById;
}

/**
 * Parses HTML-like tags from source.
 * @param {string} source - Source text.
 * @returns {ParsedTag[]} Parsed tag metadata.
 */
function parseTags(source: string): ParsedTag[] {
	const tags: ParsedTag[] = [];
	const tagPattern = /<([a-zA-Z][\w:-]*)([^>]*)>/g;
	let match = tagPattern.exec(source);
	while (match !== null) {
		const [rawTag, rawName, rawAttributes = ""] = match;
		const tagName = rawName.toLowerCase();
		const startIndex = match.index;
		const line = getLineNumber(source, startIndex);
		const attributes = parseAttributes(rawAttributes);
		let innerText = "";
		if (
			tagName === "button" ||
			tagName === "a" ||
			tagName === "select" ||
			tagName === "textarea"
		) {
			const closingTag = `</${tagName}>`;
			const contentStart = startIndex + rawTag.length;
			const contentEnd = source.indexOf(closingTag, contentStart);
			if (contentEnd >= 0) {
				innerText = extractVisibleText(
					source.slice(contentStart, contentEnd),
				);
			}
		}
		tags.push({ tagName, attributes, line, innerText });
		match = tagPattern.exec(source);
	}
	return tags;
}

/**
 * Returns true when the element is a checkbox-related case to ignore.
 * @param {ParsedTag} tag - Parsed element.
 * @returns {boolean} True when findings should be skipped.
 */
function isCheckboxRelated(tag: ParsedTag): boolean {
	const inputType = (tag.attributes["type"] ?? "").toLowerCase();
	const role = (tag.attributes["role"] ?? "").toLowerCase();
	return (tag.tagName === "input" && inputType === "checkbox") ||
		role === "checkbox";
}

/**
 * Returns true when an input element is text-like.
 * @param {ParsedTag} tag - Parsed element.
 * @returns {boolean} True when the input type needs an accessible name.
 */
function isTextLikeInput(tag: ParsedTag): boolean {
	const inputType = (tag.attributes["type"] ?? "").toLowerCase();
	return TEXT_LIKE_INPUT_TYPES.has(inputType);
}

/**
 * Returns true when the element is interactive and should have a name.
 * @param {ParsedTag} tag - Parsed element.
 * @returns {boolean} True when element requires accessible name.
 */
function requiresAccessibleName(tag: ParsedTag): boolean {
	if (!INTERACTIVE_TAGS.has(tag.tagName)) {
		return false;
	}
	if (isCheckboxRelated(tag)) {
		return false;
	}
	if (tag.tagName === "a") {
		return Boolean(tag.attributes["href"] && tag.attributes["href"] !== "");
	}
	if (tag.tagName === "input") {
		return isTextLikeInput(tag);
	}
	return true;
}

/**
 * Returns true when element has at least one accessible name source.
 * @param {ParsedTag} tag - Parsed element.
 * @param {Map<string, string>} labelsById - Label associations.
 * @returns {boolean} True when an accessible name is present.
 */
function hasAccessibleName(
	tag: ParsedTag,
	labelsById: Map<string, string>,
): boolean {
	const ariaLabel = (tag.attributes["aria-label"] ?? "").trim();
	if (ariaLabel.length > 0) {
		return true;
	}
	const ariaLabelledBy = (tag.attributes["aria-labelledby"] ?? "").trim();
	if (ariaLabelledBy.length > 0) {
		return true;
	}
	const title = (tag.attributes["title"] ?? "").trim();
	if (title.length > 0) {
		return true;
	}
	if (tag.innerText.length > 0) {
		return true;
	}
	const elementId = tag.attributes["id"];
	if (elementId && labelsById.has(elementId)) {
		return true;
	}
	return false;
}

/**
 * Finds missing accessible names for interactive elements.
 * @param {string} filePath - Source file path.
 * @param {ParsedTag[]} tags - Parsed tags.
 * @param {Map<string, string>} labelsById - Labels by target id.
 * @returns {A11yViolation[]} Violations.
 */
function findInteractiveNameViolations(
	filePath: string,
	tags: ParsedTag[],
	labelsById: Map<string, string>,
): A11yViolation[] {
	const violations: A11yViolation[] = [];
	for (const tag of tags) {
		if (
			!requiresAccessibleName(tag) || hasAccessibleName(tag, labelsById)
		) {
			continue;
		}
		violations.push({
			filePath,
			line: tag.line,
			ruleId: "a11y/interactive-name",
			message: `<${tag.tagName}> is missing an accessible name`,
		});
	}
	return violations;
}

/**
 * Finds missing or generic alt text issues on images.
 * @param {string} filePath - Source file path.
 * @param {ParsedTag[]} tags - Parsed tags.
 * @returns {A11yViolation[]} Violations.
 */
function findImageAltViolations(
	filePath: string,
	tags: ParsedTag[],
): A11yViolation[] {
	const violations: A11yViolation[] = [];
	for (const tag of tags) {
		if (tag.tagName !== "img") {
			continue;
		}
		if (!("alt" in tag.attributes)) {
			violations.push({
				filePath,
				line: tag.line,
				ruleId: "a11y/img-alt-missing",
				message: "<img> is missing an alt attribute",
			});
			continue;
		}
		const altValue = (tag.attributes["alt"] ?? "").trim().toLowerCase();
		if (altValue.length > 0 && GENERIC_ALT_VALUES.has(altValue)) {
			violations.push({
				filePath,
				line: tag.line,
				ruleId: "a11y/img-alt-invalid",
				message: "<img> has non-descriptive alt text",
			});
		}
	}
	return violations;
}

/**
 * Finds invalid ARIA attributes and values.
 * @param {string} filePath - Source file path.
 * @param {ParsedTag[]} tags - Parsed tags.
 * @returns {A11yViolation[]} Violations.
 */
function findAriaViolations(
	filePath: string,
	tags: ParsedTag[],
): A11yViolation[] {
	const violations: A11yViolation[] = [];
	for (const tag of tags) {
		if (isCheckboxRelated(tag)) {
			continue;
		}
		for (const [name, rawValue] of Object.entries(tag.attributes)) {
			if (!name.startsWith("aria-")) {
				continue;
			}
			if (!KNOWN_ARIA_ATTRIBUTES.has(name)) {
				violations.push({
					filePath,
					line: tag.line,
					ruleId: "a11y/aria-attribute-invalid",
					message: `Unknown ARIA attribute ${name}`,
				});
				continue;
			}
			if (!ARIA_BOOLEAN_ATTRIBUTES.has(name)) {
				continue;
			}
			const value = (rawValue ?? "").toLowerCase();
			if (value !== "true" && value !== "false") {
				violations.push({
					filePath,
					line: tag.line,
					ruleId: "a11y/aria-value-invalid",
					message: `${name} must be \"true\" or \"false\"`,
				});
			}
		}
	}
	return violations;
}

/**
 * Analyzes one file content and returns violations.
 * @param {string} filePath - Source file path.
 * @param {string} source - File content.
 * @returns {A11yViolation[]} Violations.
 */
export function analyzeSource(
	filePath: string,
	source: string,
): A11yViolation[] {
	const tags = parseTags(source);
	const labelsById = getLabelsByForAttribute(source);
	const violations = [
		...findInteractiveNameViolations(filePath, tags, labelsById),
		...findImageAltViolations(filePath, tags),
		...findAriaViolations(filePath, tags),
	];
	return violations.sort((left, right) => {
		if (left.line !== right.line) {
			return left.line - right.line;
		}
		return left.ruleId.localeCompare(right.ruleId);
	});
}

/**
 * Analyzes all lintable files under a root directory.
 * @param {ScanOptions} options - Scan options.
 * @returns {Promise<A11yViolation[]>} Collected violations.
 */
export async function analyzeDirectory(
	options: ScanOptions,
): Promise<A11yViolation[]> {
	const files = await getLintableFiles(options.rootDir);
	const violations: A11yViolation[] = [];
	for (const filePath of files) {
		const source = await Deno.readTextFile(filePath);
		violations.push(...analyzeSource(filePath, source));
	}
	return violations.sort((left, right) => {
		if (left.filePath !== right.filePath) {
			return left.filePath.localeCompare(right.filePath);
		}
		if (left.line !== right.line) {
			return left.line - right.line;
		}
		return left.ruleId.localeCompare(right.ruleId);
	});
}

/**
 * Formats a violation for CLI output.
 * @param {A11yViolation} violation - Violation to format.
 * @returns {string} Deterministic formatted output line.
 */
export function formatViolation(violation: A11yViolation): string {
	return `${violation.filePath}:${violation.line}: ${violation.ruleId} ${violation.message}`;
}

/**
 * Runs the accessibility lint command.
 * @returns {Promise<void>} Completes after reporting.
 */
// deno-coverage-ignore-start
export async function main(): Promise<void> {
	const rootDir = Deno.args[0] ?? "src";
	const violations = await analyzeDirectory({ rootDir });
	for (const violation of violations) {
		console.error(formatViolation(violation));
	}
	if (violations.length > 0) {
		Deno.exit(1);
	}
}

if (import.meta.main) {
	await main();
}
// deno-coverage-ignore-stop
