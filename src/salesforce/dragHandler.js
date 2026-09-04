import { EXTENSION_NAME } from "../core/constants.js";
import {
	ensureAllTabsAvailability,
	TabContainer,
} from "../core/tabContainer.js";
import { createDragHandlerModule } from "./runtime/dragHandler-runtime.js";

let dragHandlerModule;

/**
 * Returns the lazily-created drag handler module singleton.
 *
 * @return {{ setupDragForTable: (callback: Function) => void; setupDragForUl: (callback: Function) => void }} Drag handler API.
 */
export function getModule() {
	dragHandlerModule ??= createDragHandlerModule({
		extensionName: EXTENSION_NAME,
		tabContainerRef: TabContainer,
		ensureAllTabsAvailability,
		documentRef: document,
		setTimeout,
	});
	return dragHandlerModule;
}

/**
 * Test-only controls for the drag handler module lifecycle.
 */
export const __testHooks = {
	getModule,
	resetModule() {
		dragHandlerModule = undefined;
	},
	setModule(module) {
		dragHandlerModule = module;
	},
};

/**
 * Sets up drag handlers for sortable table rows.
 *
 * @param {Function} callback Reorder callback.
 * @return {void}
 */
export function setupDragForTable(callback) {
	return getModule().setupDragForTable(callback);
}

/**
 * Sets up drag handlers for the setup tab list.
 *
 * @param {Function} callback Reorder callback.
 * @return {void}
 */
export function setupDragForUl(callback) {
	return getModule().setupDragForUl(callback);
}
