import { ensureAllTabsAvailability, TabContainer } from "/tabContainer.js";
import { EXTENSION_NAME } from "/constants.js";

let table;
let ul;
let container;
let closestTag;
let containerName;
let dragSrcIndex = null;
let dragElements = null; //callback

/**
 * Handles the dragstart event on draggable elements.
 * Sets the cursor style to grabbing, stores the source element being dragged,
 * and sets the allowed drag effect and drag data.
 * Prevents drag if the dragged target is not marked draggable.
 *
 * @param {DragEvent} e - The dragstart event.
 */
function handleDragStart(e) {
	// Check if the dragged element is an icon (or any other specific element) within the row
	if (e.target.draggable === "true" || e.target.dataset.draggable === "true") {
		e.target.style.cursor = "grabbing";
		dragSrcIndex = e.target.closest(closestTag).dataset.rowIndex; // Find the dragged row
		e.dataTransfer.effectAllowed = "move";
	} else {
		// Prevent dragging if the dragged element is not the specified element
		e.preventDefault();
	}
}

/**
 * Handles the dragover event on potential drop targets.
 * Prevents the default to allow dropping and sets the drop effect to move.
 * (Optionally highlights the target element for UI feedback - currently commented out.)
 *
 * @param {DragEvent} e - The dragover event.
 * @return {boolean} Returns false to indicate default behavior is prevented.
 */
function handleDragOver(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = "move";
	return false;
}

/**
 * Handles the "drop" event for drag-and-drop functionality.
 * It swaps the positions of the dragged row and the target row within the parent element (typically a table body).
 *
 * @param {Event} e - The drop event that is triggered when the user drops an item.
 * @return {boolean} - Returns `false` if the drop operation is not valid, preventing further action.
 */
async function handleDrop(e) {
	e.stopPropagation();
	e.preventDefault();
	let targetRow = e.target.closest(closestTag); // Get the target row
	if (
		// moving in the same spot
		dragSrcIndex < 0 ||
		targetRow == null ||
		// moving somewhere incorrect
		targetRow.tagName.toLowerCase() != closestTag ||
        targetRow.dataset.rowIndex < 0 ||
		// moving over a non draggable element
		!targetRow.draggable
	) {
		return false;
	}
	// Swap the positions of the dragged row and the target row
	let targetIndex = targetRow.dataset.rowIndex; // Get the index of the target row
	const dragSrcEl = container.querySelector(`${closestTag}[data-row-index="${dragSrcIndex}"]`); // Get the of the dragged row
	const pinnedNumber =
		(await ensureAllTabsAvailability())[TabContainer.keyPinnedTabsNo];
	const isMovingRight = targetIndex > dragSrcIndex;
	if (
		(
			// is moving from pinned to unpinned
			dragSrcIndex < pinnedNumber &&
			pinnedNumber <= targetIndex
		) ||
		(
			// is moving from unpinned to pinned
			targetIndex < pinnedNumber &&
			pinnedNumber <= dragSrcIndex
		)
	) {
		// KO illegal movement
		targetRow = container.querySelector(
			`${closestTag}:nth-child(${pinnedNumber + Number(!isMovingRight)})`,
		);
		targetIndex = Array.from(this.children).indexOf(targetRow);
	} else {
      // get targetRow from the parent node
      targetRow = container.querySelector(`${closestTag}[data-row-index="${targetIndex}"]`);
    }
	if (isMovingRight) {
		targetRow.after(dragSrcEl);
	} else {
		targetRow.before(dragSrcEl);
	}
	e.target.style.cursor = "grab";
	dragElements({
		what: "order",
		containerName,
		fromIndex: dragSrcIndex,
		toIndex: targetIndex,
	});
}

/**
 * Creates event listeners for handling drag-and-drop functionality.
 * It attaches listeners to the container element for various drag events.
 */
function createListeners() {
	container.addEventListener("dragstart", handleDragStart, false); // when dragging begins
	container.addEventListener("dragover", handleDragOver, false); // while over a valid target
	container.addEventListener("drop", handleDrop, false); // when element is dropped
}

/**
 * Sets up the drag-and-drop functionality by initializing the container and event listeners.
 * It selects the appropriate container based on the presence of the table element or the tab bar.
 * If the container is not found, it retries after 500ms.
 * @param {function} callback - the function to call when the drag operation has been completed by the user
 */
function setupDrag(callback){
	container = table ?? ul;
	closestTag = table == null ? "li" : "tr";
	containerName = table == null ? "ul" : "table";
    dragElements = callback;
	if (container == null) setTimeout(() => setupDrag(), 500);
	else createListeners();
}

/**
 * Setups the drag functions for the ul
 * @param {function} callback - the function to call when the drag operation has been completed by the user
 */
export function setupDragForUl(callback) {
	ul = document.getElementById(EXTENSION_NAME);
    table = null;
    setupDrag(callback);
}

/**
 * Setups the drag functions for the table
 * @param {function} callback - the function to call when the drag operation has been completed by the user
 */
export function setupDragForTable(callback){
	table = document.getElementById("sortable-table");
    ul = null;
    setupDrag(callback);
}
