"use strict";

import { bootstrapIfNeeded } from "./runtime/content-runtime.js";

/**
 * Starts Salesforce content behavior for supported Setup pages.
 *
 * @return {boolean} Whether bootstrapping started.
 */
export function startContent() {
	return bootstrapIfNeeded();
}
