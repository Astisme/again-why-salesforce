import { EXTENSION_NAME } from "/constants.js";

let table;
let ul;
let container;
let closestTag;
let dragSrcEl = null;

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
	if (e.target.dataset.draggable === "true") {
		e.target.style.cursor = "grabbing";
		dragSrcEl = e.target.closest(closestTag); // Find the dragged row
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/html", dragSrcEl);
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
 * @returns {boolean} Returns false to indicate default behavior is prevented.
 */
function handleDragOver(e) {
	e.preventDefault();
	// Highlight the target td where the dragged td will be inserted
	/*const targetTd = e.target;
    targetTd.classList.add('highlight');
    // Remove highlight from all other tds
    const tds = Array.from(targetTd.parentNode.children);
    tds.forEach(td => {
        if (td !== targetTd) {
            td.classList.remove('highlight');
        }
    });*/
	e.dataTransfer.dropEffect = "move";
	return false;
}

/**
 * Handles the "drop" event for drag-and-drop functionality.
 * It swaps the positions of the dragged row and the target row within the parent element (typically a table body).
 *
 * @param {Event} e - The drop event that is triggered when the user drops an item.
 * @returns {boolean} - Returns `false` if the drop operation is not valid, preventing further action.
 */
function handleDrop(e) {
	e.stopPropagation();
	e.preventDefault();
	const targetRow = e.target.closest(closestTag); // Get the target row
	if (dragSrcEl == this || targetRow.tagName.toLowerCase() != closestTag) {
		return false;
	}
	// Swap the positions of the dragged row and the target row
	const parent = targetRow.parentNode; // Get the parent node (tbody)
	const targetIndex = [...parent.children].indexOf(targetRow); // Get the index of the target row
	const dragSrcIndex = [...parent.children].indexOf(dragSrcEl); // Get the index of the dragged row
	if (targetIndex > dragSrcIndex) {
		// If the target row is after the dragged row, insert the dragged row before the target row
		targetRow.insertAdjacentElement("afterend", dragSrcEl);
	} else {
		// If the target row is before the dragged row, insert the dragged row after the target row
		targetRow.insertAdjacentElement("beforebegin", dragSrcEl);
	}
	e.target.style.cursor = "grab";
	postMessage({ what: "order" }, "*");
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
 */
export function setupDrag() {
	table = document.getElementById("sortable-table");
	ul = document.getElementById(EXTENSION_NAME);
	container = table ?? ul;
	closestTag = table != null ? "tr" : "li";
	if (container != null) createListeners();
	else setTimeout(() => setupDrag(), 500);
}
