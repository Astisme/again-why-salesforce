import { EXTENSION_NAME } from "../core/constants.js";
import {
	ensureAllTabsAvailability,
	TabContainer,
} from "../core/tabContainer.js";
import { createDragHandlerModule } from "./dragHandler-runtime.js";

const { setupDragForTable, setupDragForUl } = createDragHandlerModule({
	extensionName: EXTENSION_NAME,
	tabContainerRef: TabContainer,
	ensureAllTabsAvailabilityFn: ensureAllTabsAvailability,
	documentRef: document,
	setTimeoutFn: setTimeout,
});

export { setupDragForTable, setupDragForUl };
