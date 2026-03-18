"use strict";

export const KNOWLEDGE_SILO_MIN_SAMPLE_SIZE = 5;
export const KNOWLEDGE_SILO_DOMINANCE_THRESHOLD = 0.6;
export const KNOWLEDGE_SILO_USER_LINK_THRESHOLD = 0.6;

const ELIGIBLE_COLUMN_LABELS = new Set([
	"owner",
	"created by",
	"last modified by",
]);
const KNOWLEDGE_SILO_USER_LINK_PATTERN =
	/(?:^|[^a-z0-9])005[a-z0-9]{12,15}(?:[^a-z0-9]|$)/i;
const WARNING_CACHE = new Set();

/**
 * Normalizes whitespace and casing for labels extracted from the page.
 *
 * @param {string|null|undefined} value Raw value from the DOM.
 * @return {string} Normalized text.
 */
export function normalizeKnowledgeSiloText(value) {
	return `${value ?? ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Returns whether the supplied element is currently visible.
 *
 * @param {HTMLElement|null} element Element to inspect.
 * @return {boolean} `true` when the element is visible.
 */
export function isVisibleKnowledgeSiloElement(element) {
	let currentElement = element;
	while (currentElement != null) {
		if (
			currentElement.hidden ||
			currentElement.ariaHidden === "true" ||
			currentElement.getAttribute("hidden") != null ||
			currentElement.style?.display === "none" ||
			currentElement.style?.visibility === "hidden"
		) {
			return false;
		}
		currentElement = currentElement.parentElement;
	}
	return element != null;
}

/**
 * Returns the visible header labels for a table.
 *
 * @param {HTMLTableElement} table Table to inspect.
 * @return {string[]} Visible header labels.
 */
export function getKnowledgeSiloHeaderLabels(table) {
	const headerCells = [...table.querySelectorAll("thead th")];
	const cells = headerCells.length > 0
		? headerCells
		: [...table.querySelectorAll("tr th")];
	return cells
		.filter((cell) => isVisibleKnowledgeSiloElement(cell))
		.map((cell) => normalizeKnowledgeSiloText(cell.textContent));
}

/**
 * Finds the first eligible table and column that can be used for silo analysis.
 *
 * @param {ParentNode} [root=document] Root node to inspect.
 * @return {{
 * 	reason: string;
 * 	table?: HTMLTableElement;
 * 	columnIndex?: number;
 * 	columnLabel?: string;
 * }} Matching table metadata or a failure reason.
 */
export function findKnowledgeSiloTable(root = document) {
	const tables = [...root.querySelectorAll("table")];
	if (tables.length === 0) {
		return { reason: "unsupported-page" };
	}
	let bestMatch = null;
	for (const table of tables) {
		const headerLabels = getKnowledgeSiloHeaderLabels(table);
		for (const [columnIndex, columnLabel] of headerLabels.entries()) {
			const score = getKnowledgeSiloColumnMatchScore({
				columnLabel,
				columnCells: getKnowledgeSiloColumnCells(table, columnIndex),
			});
			if (score == null) {
				continue;
			}
			if (bestMatch == null || score > bestMatch.score) {
				bestMatch = {
					reason: "eligible-table",
					table,
					columnIndex,
					columnLabel,
					score,
				};
			}
		}
	}
	if (bestMatch != null) {
		delete bestMatch.score;
		return bestMatch;
	}
	return { reason: "missing-column" };
}

/**
 * Returns the visible data rows for a table.
 *
 * @param {HTMLTableElement} table Table to inspect.
 * @return {HTMLTableRowElement[]} Visible data rows.
 */
export function getVisibleKnowledgeSiloRows(table) {
	const rows = [...table.querySelectorAll("tr")].slice(1);
	return rows.filter((row) => isVisibleKnowledgeSiloElement(row));
}

/**
 * Returns the visible cells for one table column.
 *
 * @param {HTMLTableElement} table Table to inspect.
 * @param {number} columnIndex Zero-based column index.
 * @return {HTMLElement[]} Visible column cells.
 */
export function getKnowledgeSiloColumnCells(table, columnIndex) {
	return getVisibleKnowledgeSiloRows(table)
		.map((row) =>
			[...row.children].filter((cell) => isVisibleKnowledgeSiloElement(cell))
		)
		.map((cells) => cells[columnIndex])
		.filter(Boolean);
}

/**
 * Returns whether a hyperlink appears to point to a Salesforce user page.
 *
 * @param {string|null|undefined} href Hyperlink URL to inspect.
 * @return {boolean} `true` when the link targets a Salesforce user record.
 */
export function isKnowledgeSiloUserHref(href) {
	const normalizedHref = normalizeKnowledgeSiloText(href);
	const decodedHref = (() => {
		try {
			return decodeURIComponent(normalizedHref);
		} catch {
			return normalizedHref;
		}
	})();
	return KNOWLEDGE_SILO_USER_LINK_PATTERN.test(normalizedHref) ||
		KNOWLEDGE_SILO_USER_LINK_PATTERN.test(decodedHref);
}

/**
 * Returns whether a visible table cell links to a Salesforce user record.
 *
 * @param {HTMLElement|null|undefined} cell Table cell to inspect.
 * @return {boolean} `true` when the cell includes a Salesforce user link.
 */
export function isKnowledgeSiloUserCell(cell) {
	return [...(cell?.querySelectorAll("a[href]") ?? [])].some((link) =>
		isKnowledgeSiloUserHref(link.getAttribute("href"))
	);
}

/**
 * Scores how likely a column is to represent authorship or ownership.
 *
 * @param {Object} options Column metadata.
 * @param {string} [options.columnLabel=""] Visible column label.
 * @param {HTMLElement[]} [options.columnCells=[]] Visible column cells.
 * @return {number|null} Numeric score or `null` when the column is not eligible.
 */
export function getKnowledgeSiloColumnMatchScore({
	columnLabel = "",
	columnCells = [],
} = {}) {
	const normalizedLabel = normalizeKnowledgeSiloText(columnLabel).toLowerCase();
	if (normalizedLabel === "") {
		return null;
	}
	if (ELIGIBLE_COLUMN_LABELS.has(normalizedLabel)) {
		return 10;
	}
	const nonEmptyCells = columnCells.filter((cell) =>
		normalizeKnowledgeSiloText(cell.textContent) !== ""
	);
	if (nonEmptyCells.length === 0) {
		return null;
	}
	const linkedCellCount = nonEmptyCells.filter((cell) =>
		isKnowledgeSiloUserCell(cell)
	).length;
	const linkedCellRatio = linkedCellCount / nonEmptyCells.length;
	if (linkedCellRatio < KNOWLEDGE_SILO_USER_LINK_THRESHOLD) {
		return null;
	}
	return linkedCellRatio;
}

/**
 * Extracts normalized names from the selected ownership column.
 *
 * @param {HTMLTableElement} table Table holding the records.
 * @param {number} columnIndex Zero-based ownership column index.
 * @return {string[]} Visible normalized names.
 */
export function extractKnowledgeSiloNames(table, columnIndex) {
	return getKnowledgeSiloColumnCells(table, columnIndex)
		.map((cell) => normalizeKnowledgeSiloText(cell.textContent))
		.filter(Boolean);
}

/**
 * Calculates whether a single visible owner dominates the sampled rows.
 *
 * @param {string[]} names Visible owner or author names.
 * @param {Object} [options={}] Heuristic overrides.
 * @param {number} [options.minSampleSize=KNOWLEDGE_SILO_MIN_SAMPLE_SIZE] Minimum sample size.
 * @param {number} [options.dominanceThreshold=KNOWLEDGE_SILO_DOMINANCE_THRESHOLD] Minimum ratio for a warning.
 * @return {{
 * 	reason: string;
 * 	dominantCount: number;
 * 	dominantName: string|null;
 * 	dominanceRatio: number;
 * 	sampleSize: number;
 * 	shouldWarn: boolean;
 * }} Heuristic result.
 */
export function analyzeKnowledgeSiloNames(names, {
	minSampleSize = KNOWLEDGE_SILO_MIN_SAMPLE_SIZE,
	dominanceThreshold = KNOWLEDGE_SILO_DOMINANCE_THRESHOLD,
} = {}) {
	const sampleSize = names.length;
	if (sampleSize < minSampleSize) {
		return {
			reason: "insufficient-sample",
			dominantCount: 0,
			dominantName: null,
			dominanceRatio: 0,
			sampleSize,
			shouldWarn: false,
		};
	}
	const counts = names.reduce((map, name) => {
		map.set(name, (map.get(name) ?? 0) + 1);
		return map;
	}, new Map());
	let dominantName = null;
	let dominantCount = 0;
	for (const [name, count] of counts.entries()) {
		if (count > dominantCount) {
			dominantName = name;
			dominantCount = count;
		}
	}
	const dominanceRatio = sampleSize === 0 ? 0 : dominantCount / sampleSize;
	if (dominanceRatio < dominanceThreshold || dominantName == null) {
		return {
			reason: "balanced-ownership",
			dominantCount,
			dominantName,
			dominanceRatio,
			sampleSize,
			shouldWarn: false,
		};
	}
	return {
		reason: "knowledge-silo",
		dominantCount,
		dominantName,
		dominanceRatio,
		sampleSize,
		shouldWarn: true,
	};
}

/**
 * Builds a session-level warning key for the current silo result.
 *
 * @param {Object} options Warning metadata.
 * @param {string} [options.href=""] Current page href.
 * @param {string} [options.columnLabel=""] Matching ownership column label.
 * @param {string|null} [options.dominantName=null] Dominant person name.
 * @param {number} [options.dominantCount=0] Dominant record count.
 * @param {number} [options.sampleSize=0] Sample size used by the heuristic.
 * @return {string} Unique warning cache key.
 */
export function createKnowledgeSiloWarningKey({
	href = "",
	columnLabel = "",
	dominantName = null,
	dominantCount = 0,
	sampleSize = 0,
} = {}) {
	return [
		href,
		columnLabel,
		dominantName ?? "",
		dominantCount,
		sampleSize,
	].join("|");
}

/**
 * Resets the in-memory warning cache used for duplicate suppression.
 *
 * @return {void}
 */
export function resetKnowledgeSiloWarnings() {
	WARNING_CACHE.clear();
}

/**
 * Tracks a warning and returns whether it was already shown in this session.
 *
 * @param {string} warningKey Cache key representing a warning.
 * @return {boolean} `true` when the warning was already shown.
 */
export function rememberKnowledgeSiloWarning(warningKey) {
	if (WARNING_CACHE.has(warningKey)) {
		return true;
	}
	WARNING_CACHE.add(warningKey);
	return false;
}

/**
 * Detects a likely knowledge silo from the currently visible setup table.
 *
 * @param {Object} [options={}] Detection options.
 * @param {string} [options.href=globalThis.location?.href ?? ""] Current page href.
 * @param {number} [options.minSampleSize=KNOWLEDGE_SILO_MIN_SAMPLE_SIZE] Minimum visible row count.
 * @param {number} [options.dominanceThreshold=KNOWLEDGE_SILO_DOMINANCE_THRESHOLD] Dominance ratio threshold.
 * @param {ParentNode} [options.root=document] Root node to inspect.
 * @return {{
 * 	columnIndex: number|null;
 * 	columnLabel: string|null;
 * 	dominantCount: number;
 * 	dominantName: string|null;
 * 	dominanceRatio: number;
 * 	href: string;
 * 	reason: string;
 * 	sampleSize: number;
 * 	shouldWarn: boolean;
 * }} Structured detection result.
 */
export function detectKnowledgeSilo({
	href = globalThis.location?.href ?? "",
	minSampleSize = KNOWLEDGE_SILO_MIN_SAMPLE_SIZE,
	dominanceThreshold = KNOWLEDGE_SILO_DOMINANCE_THRESHOLD,
	root = document,
} = {}) {
	const tableMatch = findKnowledgeSiloTable(root);
	if (tableMatch.table == null) {
		return {
			columnIndex: null,
			columnLabel: null,
			dominantCount: 0,
			dominantName: null,
			dominanceRatio: 0,
			href,
			reason: tableMatch.reason,
			sampleSize: 0,
			shouldWarn: false,
		};
	}
	const names = extractKnowledgeSiloNames(
		tableMatch.table,
		tableMatch.columnIndex,
	);
	const analysis = analyzeKnowledgeSiloNames(names, {
		minSampleSize,
		dominanceThreshold,
	});
	const result = {
		columnIndex: tableMatch.columnIndex,
		columnLabel: tableMatch.columnLabel,
		dominantCount: analysis.dominantCount,
		dominantName: analysis.dominantName,
		dominanceRatio: analysis.dominanceRatio,
		href,
		reason: analysis.reason,
		sampleSize: analysis.sampleSize,
		shouldWarn: analysis.shouldWarn,
	};
	if (!analysis.shouldWarn) {
		return result;
	}
	const warningKey = createKnowledgeSiloWarningKey(result);
	if (rememberKnowledgeSiloWarning(warningKey)) {
		return {
			...result,
			reason: "duplicate-warning",
			shouldWarn: false,
		};
	}
	return result;
}
