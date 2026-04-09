let extensionNameRuntime;
let tabContainerRuntime;
let ensureAllTabsAvailabilityRuntime;
let documentRuntime;
let setTimeoutRuntime;
let tableRuntime;
let ulRuntime;
let containerRuntime;
let closestTagRuntime;
let dragSrcIndexRuntime = null;
let dragElementsRuntime = null;

/**
 * Handles dragstart on draggable elements.
 *
 * @param {DragEvent} event Dragstart event.
 */
function handleDragStart(event) {
	if (
		event.target.draggable === "true" ||
		event.target.dataset.draggable === "true"
	) {
		event.target.style.cursor = "grabbing";
		dragSrcIndexRuntime = event.target.closest(closestTagRuntime).dataset
			.rowIndex;
		event.dataTransfer.effectAllowed = "move";
	} else {
		event.preventDefault();
	}
}

/**
 * Handles dragover events.
 *
 * @param {DragEvent} event Dragover event.
 * @return {boolean} Always `false`.
 */
function handleDragOver(event) {
	event.preventDefault();
	event.dataTransfer.dropEffect = "move";
	return false;
}

/**
 * Handles row dropping and reorders container elements.
 *
 * @param {Event} event Drop event.
 * @return {Promise<boolean | void>} Returns `false` for invalid drops.
 */
async function handleDrop(event) {
	event.stopPropagation();
	event.preventDefault();
	let targetRow = event.target.closest(closestTagRuntime);
	if (
		dragSrcIndexRuntime < 0 ||
		targetRow == null ||
		targetRow.tagName.toLowerCase() != closestTagRuntime ||
		targetRow.dataset.rowIndex < 0 ||
		!targetRow.draggable
	) {
		return false;
	}
	let targetIndex = targetRow.dataset.rowIndex;
	const dragSrcEl = containerRuntime.querySelector(
		`${closestTagRuntime}[data-row-index="${dragSrcIndexRuntime}"]`,
	);
	const pinnedNumber = (await ensureAllTabsAvailabilityRuntime())[
		tabContainerRuntime.keyPinnedTabsNo
	];
	const isMovingRight = targetIndex > dragSrcIndexRuntime;
	if (
		(
			dragSrcIndexRuntime < pinnedNumber &&
			pinnedNumber <= targetIndex
		) ||
		(
			targetIndex < pinnedNumber &&
			pinnedNumber <= dragSrcIndexRuntime
		)
	) {
		targetRow = containerRuntime.querySelector(
			`${closestTagRuntime}:nth-child(${
				pinnedNumber + Number(!isMovingRight)
			})`,
		);
		targetIndex = Array.from(this.children).indexOf(targetRow);
	} else {
		targetRow = containerRuntime.querySelector(
			`${closestTagRuntime}[data-row-index="${targetIndex}"]`,
		);
	}
	if (isMovingRight) {
		targetRow.after(dragSrcEl);
	} else {
		targetRow.before(dragSrcEl);
	}
	event.target.style.cursor = "grab";
	dragElementsRuntime({
		fromIndex: dragSrcIndexRuntime,
		toIndex: targetIndex,
	});
}

/**
 * Attaches drag listeners to the active container.
 */
function createListeners() {
	containerRuntime.addEventListener("dragstart", handleDragStart, false);
	containerRuntime.addEventListener("dragover", handleDragOver, false);
	containerRuntime.addEventListener("drop", handleDrop, false);
}

/**
 * Sets up drag mode for the current target container.
 *
 * @param {(payload: { fromIndex: string | null; toIndex: number | string }) => void} callback Callback triggered after drop.
 */
function setupDrag(callback) {
	containerRuntime = tableRuntime ?? ulRuntime;
	closestTagRuntime = tableRuntime == null ? "li" : "tr";
	dragElementsRuntime = callback;
	if (containerRuntime == null) {
		setTimeoutRuntime(() => setupDrag(callback), 500);
		return;
	}
	createListeners();
}

/**
 * Sets up drag handlers for UL mode.
 *
 * @param {(payload: { fromIndex: string | null; toIndex: number | string }) => void} callback Callback triggered after drop.
 */
function setupDragForUl(callback) {
	ulRuntime = documentRuntime.getElementById(extensionNameRuntime);
	tableRuntime = null;
	setupDrag(callback);
}

/**
 * Sets up drag handlers for table mode.
 *
 * @param {(payload: { fromIndex: string | null; toIndex: number | string }) => void} callback Callback triggered after drop.
 */
function setupDragForTable(callback) {
	tableRuntime = documentRuntime.querySelector("#sortable-table > tbody");
	ulRuntime = null;
	setupDrag(callback);
}

/**
 * Creates drag-and-drop handlers with injected dependencies.
 *
 * @param {Object} options Runtime dependencies.
 * @param {string} options.extensionName Root UL id used by drag mode.
 * @param {{ keyPinnedTabsNo: string }} options.tabContainerRef TabContainer constants.
 * @param {() => Promise<Record<string, number>>} options.ensureAllTabsAvailabilityFn Tabs resolver.
 * @param {{ getElementById: (id: string) => unknown; querySelector: (selector: string) => unknown; }} options.documentRef Document wrapper.
 * @param {(callback: () => void, delay: number) => number} options.setTimeoutFn Timeout scheduler.
 * @return {{
 *   setupDrag: (callback: (payload: { fromIndex: string | null; toIndex: number | string }) => void) => void;
 *   setupDragForTable: (callback: (payload: { fromIndex: string | null; toIndex: number | string }) => void) => void;
 *   setupDragForUl: (callback: (payload: { fromIndex: string | null; toIndex: number | string }) => void) => void;
 * }} Drag handler API.
 */
export function createDragHandlerModule({
	extensionName,
	tabContainerRef,
	ensureAllTabsAvailabilityFn,
	documentRef,
	setTimeoutFn,
}) {
	extensionNameRuntime = extensionName;
	tabContainerRuntime = tabContainerRef;
	ensureAllTabsAvailabilityRuntime = ensureAllTabsAvailabilityFn;
	documentRuntime = documentRef;
	setTimeoutRuntime = setTimeoutFn;
	tableRuntime = null;
	ulRuntime = null;
	containerRuntime = null;
	closestTagRuntime = null;
	dragSrcIndexRuntime = null;
	dragElementsRuntime = null;

	return {
		setupDrag,
		setupDragForTable,
		setupDragForUl,
	};
}
