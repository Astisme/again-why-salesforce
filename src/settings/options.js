export { createOptionsModule } from "./options-module.js";
export { createOptionsRuntime, runOptionsRuntime } from "./options-runtime.js";

import { runOptionsRuntime } from "./options-runtime.js";

/**
 * Bootstraps the options page when auto-bootstrap is enabled.
 *
 * @param {Object} [options={}] Bootstrap options.
 * @param {boolean} [options.skipAutoBootstrap=globalThis.__AWSF_SKIP_OPTIONS_AUTO_BOOTSTRAP__] Auto-bootstrap toggle.
 * @param {() => unknown} [options.runOptionsRuntimeFn=runOptionsRuntime] Runtime bootstrap callback.
 * @return {unknown | null} Runtime instance when started, otherwise `null`.
 */
export function bootstrapOptions({
	skipAutoBootstrap = globalThis.__AWSF_SKIP_OPTIONS_AUTO_BOOTSTRAP__,
	runOptionsRuntimeFn = runOptionsRuntime,
} = {}) {
	if (skipAutoBootstrap === true) {
		return null;
	}
	return runOptionsRuntimeFn();
}

bootstrapOptions();
