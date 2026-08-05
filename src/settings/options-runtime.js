import { createOptionsModule as createOptionsModuleDefault } from "./options-module.js";

/**
 * Creates a runtime wrapper for options bootstrapping.
 *
 * @param {Object} [options={}] Runtime options.
 * @param {(overrides?: Record<string, unknown>, options?: { runRestoreOnLoad?: boolean }) => unknown} [options.createOptionsModule=createOptionsModuleDefault] Module factory override.
 * @return {{ runOptionsRuntime: (options?: { overrides?: Record<string, unknown>; runRestoreOnLoad?: boolean; }) => unknown }} Options runtime API.
 */
export function createOptionsRuntime({
	createOptionsModule = createOptionsModuleDefault,
} = {}) {
	/**
	 * Runs the options-page runtime bootstrap.
	 *
	 * @param {Object} [options={}] Runtime bootstrap options.
	 * @param {Object} [options.overrides={}] Dependency overrides for `createOptionsModule`.
	 * @param {boolean} [options.runRestoreOnLoad=true] Whether to run restore-on-load behavior.
	 * @return {unknown} Created options module instance.
	 */
	function runOptionsRuntime({
		overrides = {},
		runRestoreOnLoad = true,
	} = {}) {
		return createOptionsModule(overrides, { runRestoreOnLoad });
	}

	return {
		runOptionsRuntime,
	};
}

/**
 * Runs the options-page runtime bootstrap.
 *
 * @param {Object} [options={}] Runtime bootstrap options.
 * @param {Object} [options.overrides={}] Dependency overrides for `createOptionsModule`.
 * @param {boolean} [options.runRestoreOnLoad=true] Whether to run restore-on-load behavior.
 * @param {(overrides?: Record<string, unknown>, options?: { runRestoreOnLoad?: boolean }) => unknown} [options.createOptionsModule=createOptionsModuleDefault] Module factory override.
 * @return {unknown} Created options module instance.
 */
export function runOptionsRuntime({
	overrides = {},
	runRestoreOnLoad = true,
	createOptionsModule = createOptionsModuleDefault,
} = {}) {
	const optionsRuntime = createOptionsRuntime({
		createOptionsModule,
	});
	return optionsRuntime.runOptionsRuntime({
		overrides,
		runRestoreOnLoad,
	});
}
