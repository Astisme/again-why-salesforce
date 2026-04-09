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
	let table;
	let ul;
	let container;
	let closestTag;
	let dragSrcIndex = null;
	let dragElements = null;

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
			dragSrcIndex = event.target.closest(closestTag).dataset.rowIndex;
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
		let targetRow = event.target.closest(closestTag);
		if (
			dragSrcIndex < 0 ||
			targetRow == null ||
			targetRow.tagName.toLowerCase() != closestTag ||
			targetRow.dataset.rowIndex < 0 ||
			!targetRow.draggable
		) {
			return false;
		}
		let targetIndex = targetRow.dataset.rowIndex;
		const dragSrcEl = container.querySelector(
			`${closestTag}[data-row-index="${dragSrcIndex}"]`,
		);
		const pinnedNumber = (await ensureAllTabsAvailabilityFn())[
			tabContainerRef.keyPinnedTabsNo
		];
		const isMovingRight = targetIndex > dragSrcIndex;
		if (
			(
				dragSrcIndex < pinnedNumber &&
				pinnedNumber <= targetIndex
			) ||
			(
				targetIndex < pinnedNumber &&
				pinnedNumber <= dragSrcIndex
			)
		) {
			targetRow = container.querySelector(
				`${closestTag}:nth-child(${
					pinnedNumber + Number(!isMovingRight)
				})`,
			);
			targetIndex = Array.from(this.children).indexOf(targetRow);
		} else {
			targetRow = container.querySelector(
				`${closestTag}[data-row-index="${targetIndex}"]`,
			);
		}
		if (isMovingRight) {
			targetRow.after(dragSrcEl);
		} else {
			targetRow.before(dragSrcEl);
		}
		event.target.style.cursor = "grab";
		dragElements({
			fromIndex: dragSrcIndex,
			toIndex: targetIndex,
		});
	}

	/**
	 * Attaches drag listeners to the active container.
	 */
	function createListeners() {
		container.addEventListener("dragstart", handleDragStart, false);
		container.addEventListener("dragover", handleDragOver, false);
		container.addEventListener("drop", handleDrop, false);
	}

	/**
	 * Sets up drag mode for the current target container.
	 *
	 * @param {(payload: { fromIndex: string | null; toIndex: number | string }) => void} callback Callback triggered after drop.
	 */
	function setupDrag(callback) {
		container = table ?? ul;
		closestTag = table == null ? "li" : "tr";
		dragElements = callback;
		if (container == null) {
			setTimeoutFn(() => setupDrag(callback), 500);
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
		ul = documentRef.getElementById(extensionName);
		table = null;
		setupDrag(callback);
	}

	/**
	 * Sets up drag handlers for table mode.
	 *
	 * @param {(payload: { fromIndex: string | null; toIndex: number | string }) => void} callback Callback triggered after drop.
	 */
	function setupDragForTable(callback) {
		table = documentRef.querySelector("#sortable-table > tbody");
		ul = null;
		setupDrag(callback);
	}

	return {
		setupDrag,
		setupDragForTable,
		setupDragForUl,
	};
}
