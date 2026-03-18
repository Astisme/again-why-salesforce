import { assertEquals } from "@std/testing/asserts";
import { installMockDom } from "../happydom.ts";
import {
	analyzeKnowledgeSiloNames,
	createKnowledgeSiloWarningKey,
	detectKnowledgeSilo,
	resetKnowledgeSiloWarnings,
} from "/salesforce/knowledge-silo.js";

/**
 * Appends a simple table to the current document body.
 *
 * @param {string[]} headers Header labels.
 * @param {Array<Array<string | { text: string; hidden?: boolean }>>} rows Row cell values.
 * @return {HTMLTableElement} Rendered table element.
 */
function appendKnowledgeSiloTable(headers, rows) {
	const table = document.createElement("table");
	const thead = document.createElement("thead");
	const headerRow = document.createElement("tr");
	for (const header of headers) {
		const cell = document.createElement("th");
		cell.textContent = header;
		headerRow.appendChild(cell);
	}
	thead.appendChild(headerRow);
	const tbody = document.createElement("tbody");
	for (const rowData of rows) {
		const row = document.createElement("tr");
		for (const cellData of rowData) {
			const cell = document.createElement("td");
			if (typeof cellData === "string") {
				cell.textContent = cellData;
			} else {
				cell.textContent = cellData.text;
				if (cellData.hidden) {
					cell.style.display = "none";
					row.style.display = "none";
				}
			}
			row.appendChild(cell);
		}
		tbody.appendChild(row);
	}
	table.append(thead, tbody);
	document.body.appendChild(table);
	return table;
}

Deno.test("detectKnowledgeSilo reports unsupported pages when no tables are visible", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		resetKnowledgeSiloWarnings();
		assertEquals(
			detectKnowledgeSilo(),
			{
				columnIndex: null,
				columnLabel: null,
				dominantCount: 0,
				dominantName: null,
				dominanceRatio: 0,
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
				reason: "unsupported-page",
				sampleSize: 0,
				shouldWarn: false,
			},
		);
	} finally {
		dom.cleanup();
		resetKnowledgeSiloWarnings();
	}
});

Deno.test("detectKnowledgeSilo ignores tables without ownership columns", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		appendKnowledgeSiloTable(
			["Label", "Type"],
			[
				["A", "Flow"],
				["B", "Profile"],
			],
		);
		resetKnowledgeSiloWarnings();
		assertEquals(detectKnowledgeSilo().reason, "missing-column");
	} finally {
		dom.cleanup();
		resetKnowledgeSiloWarnings();
	}
});

Deno.test("detectKnowledgeSilo requires a minimum visible sample size", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		appendKnowledgeSiloTable(
			["Name", "Owner"],
			[
				["Alpha", "Ada"],
				["Beta", "Ada"],
				["Gamma", "Ada"],
				["Delta", "Ada"],
			],
		);
		resetKnowledgeSiloWarnings();
		assertEquals(
			detectKnowledgeSilo(),
			{
				columnIndex: 1,
				columnLabel: "Owner",
				dominantCount: 0,
				dominantName: null,
				dominanceRatio: 0,
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
				reason: "insufficient-sample",
				sampleSize: 4,
				shouldWarn: false,
			},
		);
	} finally {
		dom.cleanup();
		resetKnowledgeSiloWarnings();
	}
});

Deno.test("detectKnowledgeSilo ignores balanced ownership", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		appendKnowledgeSiloTable(
			["Name", "Last Modified By"],
			[
				["Alpha", "Ada"],
				["Beta", "Grace"],
				["Gamma", "Ada"],
				["Delta", "Grace"],
				["Epsilon", "Ada"],
				["Zeta", "Grace"],
			],
		);
		resetKnowledgeSiloWarnings();
		assertEquals(detectKnowledgeSilo().reason, "balanced-ownership");
	} finally {
		dom.cleanup();
		resetKnowledgeSiloWarnings();
	}
});

Deno.test("detectKnowledgeSilo warns when one visible owner dominates", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		appendKnowledgeSiloTable(
			["Name", "Created By"],
			[
				["Alpha", "Ada"],
				["Beta", "Ada"],
				["Gamma", "Ada"],
				["Delta", "Grace"],
				["Epsilon", "Ada"],
				["Hidden", { text: "Grace", hidden: true }],
			],
		);
		resetKnowledgeSiloWarnings();
		assertEquals(
			detectKnowledgeSilo(),
			{
				columnIndex: 1,
				columnLabel: "Created By",
				dominantCount: 4,
				dominantName: "Ada",
				dominanceRatio: 0.8,
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
				reason: "knowledge-silo",
				sampleSize: 5,
				shouldWarn: true,
			},
		);
	} finally {
		dom.cleanup();
		resetKnowledgeSiloWarnings();
	}
});

Deno.test("detectKnowledgeSilo suppresses duplicate warnings in the same session", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		appendKnowledgeSiloTable(
			["Name", "Owner"],
			[
				["Alpha", "Ada"],
				["Beta", "Ada"],
				["Gamma", "Ada"],
				["Delta", "Grace"],
				["Epsilon", "Ada"],
			],
		);
		resetKnowledgeSiloWarnings();
		assertEquals(detectKnowledgeSilo().reason, "knowledge-silo");
		assertEquals(detectKnowledgeSilo().reason, "duplicate-warning");
	} finally {
		dom.cleanup();
		resetKnowledgeSiloWarnings();
	}
});

Deno.test("knowledge silo helpers cover empty samples and default fallbacks", () => {
	const originalLocation = globalThis.location;
	try {
		assertEquals(
			analyzeKnowledgeSiloNames([], { minSampleSize: 0 }),
			{
				reason: "balanced-ownership",
				dominantCount: 0,
				dominantName: null,
				dominanceRatio: 0,
				sampleSize: 0,
				shouldWarn: false,
			},
		);
		assertEquals(
			createKnowledgeSiloWarningKey({
				columnLabel: "Owner",
				dominantCount: 4,
				sampleSize: 5,
			}),
			"|Owner||4|5",
		);
		delete (globalThis as Record<string, unknown>).location;
		assertEquals(
			detectKnowledgeSilo({
				root: {
					querySelectorAll: () => [],
				} as ParentNode,
			}).href,
			"",
		);
	} finally {
		Object.defineProperty(globalThis, "location", {
			value: originalLocation,
			configurable: true,
			writable: true,
		});
		resetKnowledgeSiloWarnings();
	}
});
