import { assertEquals } from "@std/testing/asserts";
import { installMockDom } from "../happydom.ts";
import {
	analyzeKnowledgeSiloNames,
	createKnowledgeSiloWarningKey,
	detectKnowledgeSilo,
	getKnowledgeSiloColumnMatchScore,
	isKnowledgeSiloUserCell,
	isKnowledgeSiloUserHref,
	normalizeKnowledgeSiloText,
	resetKnowledgeSiloWarnings,
} from "/salesforce/knowledge-silo.js";

/**
 * Appends a simple table to the current document body.
 *
 * @param {string[]} headers Header labels.
 * @param {Array<Array<string | { hidden?: boolean; href?: string; text: string }>>} rows Row cell values.
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
				if (cellData.href != null) {
					const link = document.createElement("a");
					link.setAttribute("href", cellData.href);
					link.textContent = cellData.text;
					cell.appendChild(link);
				} else {
					cell.textContent = cellData.text;
				}
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

Deno.test("detectKnowledgeSilo infers localized ownership columns from Salesforce user links", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		appendKnowledgeSiloTable(
			["Name", "Proprietario"],
			[
				["Alpha", {
					href:
						"/lightning/setup/ManageUsers/page?address=%2F005AAA000000001AAA",
					text: "Ada",
				}],
				["Beta", {
					href:
						"/lightning/setup/ManageUsers/page?address=%2F005AAA000000001AAA",
					text: "Ada",
				}],
				["Gamma", {
					href:
						"/lightning/setup/ManageUsers/page?address=%2F005AAA000000001AAA",
					text: "Ada",
				}],
				["Delta", {
					href:
						"/lightning/setup/ManageUsers/page?address=%2F005AAA000000002AAA",
					text: "Grace",
				}],
				["Epsilon", {
					href:
						"/lightning/setup/ManageUsers/page?address=%2F005AAA000000001AAA",
					text: "Ada",
				}],
			],
		);
		resetKnowledgeSiloWarnings();
		assertEquals(
			detectKnowledgeSilo(),
			{
				columnIndex: 1,
				columnLabel: "Proprietario",
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

Deno.test("detectKnowledgeSilo ignores localized linked columns that do not point to Salesforce users", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		appendKnowledgeSiloTable(
			["Name", "Proprietario"],
			[
				["Alpha", {
					href: "/lightning/r/Flow/301AAA000000001AAA/view",
					text: "Release flow",
				}],
				["Beta", {
					href: "/lightning/r/Flow/301AAA000000002AAA/view",
					text: "Release flow",
				}],
			],
		);
		resetKnowledgeSiloWarnings();
		assertEquals(detectKnowledgeSilo().reason, "missing-column");
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

Deno.test("knowledge silo column scoring rejects blank labels and low user-link ratios", () => {
	const dom = installMockDom("https://acme.lightning.force.com/lightning/setup/Users/home");
	try {
		const nonUserCell = document.createElement("td");
		const nonUserLink = document.createElement("a");
		nonUserLink.setAttribute(
			"href",
			"/lightning/r/Flow/301AAA000000001AAA/view",
		);
		nonUserLink.textContent = "Release flow";
		nonUserCell.appendChild(nonUserLink);
		const userCell = document.createElement("td");
		const userLink = document.createElement("a");
		userLink.setAttribute(
			"href",
			"/lightning/setup/ManageUsers/page?address=%2F005AAA000000001AAA",
		);
		userLink.textContent = "Ada";
		userCell.appendChild(userLink);
		assertEquals(
			getKnowledgeSiloColumnMatchScore({
				columnLabel: "",
				columnCells: [userCell],
			}),
			null,
		);
		assertEquals(
			getKnowledgeSiloColumnMatchScore({
				columnLabel: "Proprietario",
				columnCells: [userCell, nonUserCell],
			}),
			null,
		);
	} finally {
		dom.cleanup();
		resetKnowledgeSiloWarnings();
	}
});

Deno.test("knowledge silo helpers cover empty samples and default fallbacks", () => {
	const originalLocation = globalThis.location;
	try {
		assertEquals(normalizeKnowledgeSiloText("  Ada   Lovelace  "), "Ada Lovelace");
		assertEquals(normalizeKnowledgeSiloText(null), "");
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
		assertEquals(
			isKnowledgeSiloUserHref(
				"/lightning/setup/ManageUsers/page?address=%2F005AAA000000001AAA",
			),
			true,
		);
		assertEquals(
			isKnowledgeSiloUserHref("/lightning/r/Flow/301AAA000000001AAA/view"),
			false,
		);
		assertEquals(isKnowledgeSiloUserHref("%E0%A4%A"), false);
		assertEquals(isKnowledgeSiloUserCell(null), false);
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
