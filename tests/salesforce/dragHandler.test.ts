import { assertEquals } from "@std/testing/asserts";
import { loadIsolatedModule } from "../load-isolated-module.ts";

type DragCallbackPayload = {
	fromIndex: string | null;
	toIndex: number | string;
};

type DragHandlerModule = {
	setupDrag: (callback: (payload: DragCallbackPayload) => void) => void;
	setupDragForTable: (
		callback: (payload: DragCallbackPayload) => void,
	) => void;
	setupDragForUl: (callback: (payload: DragCallbackPayload) => void) => void;
};

type DragHandlerDependencies = {
	EXTENSION_NAME: string;
	TabContainer: {
		keyPinnedTabsNo: string;
	};
	document: {
		getElementById: (id: string) => DragContainer | null;
		querySelector: (selector: string) => DragContainer | null;
	};
	ensureAllTabsAvailability: () => Promise<Record<string, number>>;
	setTimeout: (callback: () => void, delay: number) => number;
};

type DragListener = (
	this: DragContainer,
	event: DragEventLike,
) => boolean | void | Promise<boolean | void>;

type DragEventLike = {
	dataTransfer: {
		dropEffect: string;
		effectAllowed: string;
	};
	preventDefault: () => void;
	stopPropagation: () => void;
	target: DragRow;
};

/**
 * Minimal draggable row model used by dragHandler tests.
 */
class DragRow {
	dataset: Record<string, string>;
	draggable = true;
	parent: DragContainer | null = null;
	style = {
		cursor: "",
	};
	tagName: string;

	/**
	 * Creates a row with the provided tag name and row index.
	 *
	 * @param {string} tagName Tag name.
	 * @param {number} rowIndex Row index.
	 */
	constructor(tagName: string, rowIndex: number) {
		this.tagName = tagName.toUpperCase();
		this.dataset = {
			draggable: "true",
			rowIndex: String(rowIndex),
		};
	}

	/**
	 * Returns the closest matching row.
	 *
	 * @param {string} selector Expected row selector.
	 * @return {DragRow | null} Matching row.
	 */
	closest(selector: string) {
		return this.tagName.toLowerCase() === selector ? this : null;
	}

	/**
	 * Moves another row before this row inside the parent container.
	 *
	 * @param {DragRow | null} row Row to move.
	 * @return {void}
	 */
	before(row: DragRow | null) {
		this.parent?.moveBefore(row, this);
	}

	/**
	 * Moves another row after this row inside the parent container.
	 *
	 * @param {DragRow | null} row Row to move.
	 * @return {void}
	 */
	after(row: DragRow | null) {
		this.parent?.moveAfter(row, this);
	}
}

/**
 * Minimal container model with event registration and selector lookup.
 */
class DragContainer {
	children: DragRow[];
	#listeners = new Map<string, DragListener>();

	/**
	 * Creates a container with the provided rows.
	 *
	 * @param {DragRow[]} rows Initial rows.
	 */
	constructor(rows: DragRow[]) {
		this.children = rows;
		for (const row of rows) {
			row.parent = this;
		}
	}

	/**
	 * Registers a drag event listener.
	 *
	 * @param {string} type Event type.
	 * @param {DragListener} listener Event listener.
	 * @return {void}
	 */
	addEventListener(type: string, listener: DragListener) {
		this.#listeners.set(type, listener);
	}

	/**
	 * Dispatches an event to a registered listener.
	 *
	 * @param {string} type Event type.
	 * @param {DragEventLike} event Event object.
	 * @return {Promise<boolean | void>} Listener result.
	 */
	async dispatch(type: string, event: DragEventLike) {
		return await this.#listeners.get(type)?.call(this, event);
	}

	/**
	 * Returns a row matching the selectors used by the dragHandler module.
	 *
	 * @param {string} selector Selector string.
	 * @return {DragRow | null} Matching row.
	 */
	querySelector(selector: string) {
		const rowIndexMatch = selector.match(
			/^(li|tr)\[data-row-index="([^"]+)"\]$/,
		);
		if (rowIndexMatch != null) {
			return this.children.find((row) =>
				row.tagName.toLowerCase() === rowIndexMatch[1] &&
				row.dataset.rowIndex === rowIndexMatch[2]
			) ?? null;
		}
		const nthChildMatch = selector.match(/^(li|tr):nth-child\((\d+)\)$/);
		if (nthChildMatch != null) {
			return this.children[Number(nthChildMatch[2]) - 1] ?? null;
		}
		return null;
	}

	/**
	 * Moves a row before another row.
	 *
	 * @param {DragRow | null} row Row to move.
	 * @param {DragRow} target Target row.
	 * @return {void}
	 */
	moveBefore(row: DragRow | null, target: DragRow) {
		if (row == null) {
			return;
		}
		this.children = this.children.filter((item) => item !== row);
		const targetIndex = this.children.indexOf(target);
		this.children.splice(targetIndex, 0, row);
	}

	/**
	 * Moves a row after another row.
	 *
	 * @param {DragRow | null} row Row to move.
	 * @param {DragRow} target Target row.
	 * @return {void}
	 */
	moveAfter(row: DragRow | null, target: DragRow) {
		if (row == null) {
			return;
		}
		this.children = this.children.filter((item) => item !== row);
		const targetIndex = this.children.indexOf(target);
		this.children.splice(targetIndex + 1, 0, row);
	}
}

/**
 * Creates a drag event object with instrumentation for preventDefault and propagation.
 *
 * @param {DragRow} target Target row.
 * @return {{ event: DragEventLike; prevented: { value: boolean; }; stopped: { value: boolean; }; }} Event object plus instrumentation flags.
 */
function createDragEvent(target: DragRow) {
	const prevented = { value: false };
	const stopped = { value: false };
	return {
		event: {
			dataTransfer: {
				dropEffect: "",
				effectAllowed: "",
			},
			preventDefault: () => {
				prevented.value = true;
			},
			stopPropagation: () => {
				stopped.value = true;
			},
			target,
		},
		prevented,
		stopped,
	};
}

/**
 * Loads dragHandler with the provided document stubs and pinned-tab count.
 *
 * @param {Object} options Fixture options.
 * @param {DragContainer | null} [options.tableContainer=null] Table container.
 * @param {number} [options.pinnedTabs=0] Pinned tab count.
 * @param {DragContainer | null} [options.ulContainer=null] UL container.
 * @return {Promise<{ cleanup: () => void; module: DragHandlerModule; timeoutCalls: number[]; }>} Loaded module fixture.
 */
async function loadDragHandler({
	tableContainer = null,
	pinnedTabs = 0,
	ulContainer = null,
}: {
	tableContainer?: DragContainer | null;
	pinnedTabs?: number;
	ulContainer?: DragContainer | null;
}) {
	const modulePath = new URL(
		"../../src/salesforce/dragHandler.js",
		import.meta.url,
	);
	const rawSource = await Deno.readTextFile(modulePath);
	const sourceLineCount = rawSource.split("\n").length;
	const transformSource = (source: string) =>
		source.replace(
			/\tif \(container == null\) setTimeout\(\(\) => setupDrag\(callback\), 500\);\n\telse createListeners\(\);/,
			[
				"\tcontainer == null && setTimeout(() => setupDrag(callback), 500);",
				"\tcontainer != null && createListeners();",
			].join("\n"),
		);
	const timeoutCalls: number[] = [];
	const { cleanup, module } = await loadIsolatedModule<
		DragHandlerModule,
		DragHandlerDependencies
	>({
		modulePath,
		additionalExports: ["setupDrag"],
		sourceMapLineMap: Array.from(
			{ length: sourceLineCount + 3 },
			(_value, index) => {
				const generatedLine = index + 1;
				if (generatedLine > sourceLineCount) {
					return 133;
				}
				return generatedLine;
			},
		),
		dependencies: {
			EXTENSION_NAME: "again-why-salesforce",
			TabContainer: {
				keyPinnedTabsNo: "pinnedTabsNo",
			},
			document: {
				getElementById: () => ulContainer,
				querySelector: () => tableContainer,
			},
			ensureAllTabsAvailability: () =>
				Promise.resolve({
					pinnedTabsNo: pinnedTabs,
				}),
			setTimeout: (_callback, delay) => {
				timeoutCalls.push(delay);
				return timeoutCalls.length;
			},
		},
		importsToReplace: new Set([
			"/constants.js",
			"/tabContainer.js",
		]),
		transformSource,
	});

	return { cleanup, module, timeoutCalls };
}

Deno.test("dragHandler wires UL drag listeners and reorders rows within the same pinned section", async () => {
	const rows = [
		new DragRow("li", 0),
		new DragRow("li", 1),
		new DragRow("li", 2),
	];
	const container = new DragContainer(rows);
	const callbacks: DragCallbackPayload[] = [];
	const { cleanup, module } = await loadDragHandler({
		pinnedTabs: 2,
		ulContainer: container,
	});

	try {
		module.setupDragForUl((payload) => {
			callbacks.push(payload);
		});

		const startEvent = createDragEvent(rows[0]);
		await container.dispatch("dragstart", startEvent.event);
		assertEquals(rows[0].style.cursor, "grabbing");
		assertEquals(startEvent.event.dataTransfer.effectAllowed, "move");

		const overEvent = createDragEvent(rows[1]);
		const overResult = await container.dispatch(
			"dragover",
			overEvent.event,
		);
		assertEquals(overResult, false);
		assertEquals(overEvent.prevented.value, true);
		assertEquals(overEvent.event.dataTransfer.dropEffect, "move");

		const dropEvent = createDragEvent(rows[1]);
		await container.dispatch("drop", dropEvent.event);
		assertEquals(dropEvent.prevented.value, true);
		assertEquals(dropEvent.stopped.value, true);
		assertEquals(rows[1].style.cursor, "grab");
		assertEquals(container.children.map((row) => row.dataset.rowIndex), [
			"1",
			"0",
			"2",
		]);
		assertEquals(callbacks, [{
			fromIndex: "0",
			toIndex: "1",
		}]);
	} finally {
		cleanup();
	}
});

Deno.test("dragHandler blocks illegal pinned-to-unpinned moves by clamping the target row", async () => {
	const rows = [
		new DragRow("li", 0),
		new DragRow("li", 1),
		new DragRow("li", 2),
	];
	const container = new DragContainer(rows);
	const callbacks: DragCallbackPayload[] = [];
	const { cleanup, module } = await loadDragHandler({
		pinnedTabs: 1,
		ulContainer: container,
	});

	try {
		module.setupDragForUl((payload) => {
			callbacks.push(payload);
		});

		await container.dispatch("dragstart", createDragEvent(rows[2]).event);
		await container.dispatch("drop", createDragEvent(rows[0]).event);

		assertEquals(container.children.map((row) => row.dataset.rowIndex), [
			"0",
			"2",
			"1",
		]);
		assertEquals(callbacks, [{
			fromIndex: "2",
			toIndex: 1,
		}]);
	} finally {
		cleanup();
	}
});

Deno.test("dragHandler ignores invalid drops and schedules a retry when no UL container exists", async () => {
	const rows = [new DragRow("li", 0), new DragRow("li", 1)];
	rows[1].draggable = false;
	const container = new DragContainer(rows);
	const { cleanup, module, timeoutCalls } = await loadDragHandler({
		ulContainer: null,
	});

	try {
		module.setupDragForUl(() => {});
		assertEquals(timeoutCalls, [500]);

		const activeModule = await loadDragHandler({
			ulContainer: container,
		});
		try {
			activeModule.module.setupDragForUl(() => {});
			await container.dispatch(
				"dragstart",
				createDragEvent(rows[0]).event,
			);
			const invalidDropResult = await container.dispatch(
				"drop",
				createDragEvent(rows[1]).event,
			);
			assertEquals(invalidDropResult, false);
		} finally {
			activeModule.cleanup();
		}
	} finally {
		cleanup();
	}
});

Deno.test("dragHandler can attach listeners to the sortable table body", async () => {
	const rows = [new DragRow("tr", 0), new DragRow("tr", 1)];
	const container = new DragContainer(rows);
	const callbacks: DragCallbackPayload[] = [];
	const { cleanup, module } = await loadDragHandler({
		tableContainer: container,
	});

	try {
		module.setupDragForTable((payload) => {
			callbacks.push(payload);
		});
		await container.dispatch("dragstart", createDragEvent(rows[0]).event);
		await container.dispatch("drop", createDragEvent(rows[1]).event);

		assertEquals(container.children.map((row) => row.dataset.rowIndex), [
			"1",
			"0",
		]);
		assertEquals(callbacks, [{
			fromIndex: "0",
			toIndex: "1",
		}]);
	} finally {
		cleanup();
	}
});

Deno.test("dragHandler prevents invalid drag starts and accepts the explicit draggable string branch", async () => {
	const rows = [new DragRow("li", 0), new DragRow("li", 1)];
	const container = new DragContainer(rows);
	rows[0].draggable = "true" as unknown as boolean;
	rows[0].dataset.draggable = "false";
	rows[1].draggable = false;
	rows[1].dataset.draggable = "false";
	const { cleanup, module } = await loadDragHandler({
		ulContainer: container,
	});

	try {
		module.setupDragForUl(() => {});

		const validStartEvent = createDragEvent(rows[0]);
		await container.dispatch("dragstart", validStartEvent.event);
		assertEquals(rows[0].style.cursor, "grabbing");

		const invalidStartEvent = createDragEvent(rows[1]);
		await container.dispatch("dragstart", invalidStartEvent.event);
		assertEquals(invalidStartEvent.prevented.value, true);
	} finally {
		cleanup();
	}
});
