import { createOptionsModule } from "./options-module.js";

/**
 * Creates a runtime wrapper for options bootstrapping.
 *
 * @param {Object} [options={}] Runtime options.
 * @param {(overrides?: Record<string, unknown>, options?: { runRestoreOnLoad?: boolean }) => unknown} [options.createOptionsModuleFn=createOptionsModule] Module factory override.
 * @return {{ runOptionsRuntime: (options?: { overrides?: Record<string, unknown>; runRestoreOnLoad?: boolean; }) => unknown }} Options runtime API.
 */
export function createOptionsRuntime({
	createOptionsModuleFn = createOptionsModule,
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
		return createOptionsModuleFn(overrides, { runRestoreOnLoad });
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
 * @param {(overrides?: Record<string, unknown>, options?: { runRestoreOnLoad?: boolean }) => unknown} [options.createOptionsModuleFn=createOptionsModule] Module factory override.
 * @return {unknown} Created options module instance.
 */
export function runOptionsRuntime({
	overrides = {},
	runRestoreOnLoad = true,
	createOptionsModuleFn = createOptionsModule,
} = {}) {
	const optionsRuntime = createOptionsRuntime({
		createOptionsModuleFn,
	});
	return optionsRuntime.runOptionsRuntime({
		overrides,
		runRestoreOnLoad,
	});
}
