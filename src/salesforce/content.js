"use strict";

import { bootstrapIfNeeded } from "./runtime/content-runtime.js";

// Queries the currently active tab of the current active window.
// This prevents showing tabs when not in a setup page (like Sales or Service Console).
if (globalThis.__AWSF_SKIP_CONTENT_AUTO_BOOTSTRAP__ !== true) {
	bootstrapIfNeeded();
}
