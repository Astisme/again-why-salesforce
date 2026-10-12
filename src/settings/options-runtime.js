import { createOptionsModule as createOptionsModuleDefault } from "./options-module.js";

/**
 * Creates a runtime wrapper for options bootstrapping.
 *
 * @param {Object} [options={}] Runtime options.
 * @param {typeof createOptionsModuleDefault} [options.createOptionsModule=createOptionsModuleDefault] Module factory override.
 * @return {{ runOptionsRuntime: (options?: { overrides?: Parameters<typeof createOptionsModuleDefault>[0]; runRestoreOnLoad?: boolean; }) => ReturnType<typeof createOptionsModuleDefault> }} Options runtime API.
 */
export function createOptionsRuntime({
	createOptionsModule = createOptionsModuleDefault,
} = {}) {
	/**
	 * Runs the options-page runtime bootstrap.
	 *
	 * @param {Object} [options={}] Runtime bootstrap options.
	 * @param {Parameters<typeof createOptionsModuleDefault>[0]} [options.overrides={}] Dependency overrides for `createOptionsModule`.
	 * @param {boolean} [options.runRestoreOnLoad=true] Whether to run restore-on-load behavior.
	 * @return {ReturnType<typeof createOptionsModuleDefault>} Created options module instance.
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
 * @param {Parameters<typeof createOptionsModuleDefault>[0]} [options.overrides={}] Dependency overrides for `createOptionsModule`.
 * @param {boolean} [options.runRestoreOnLoad=true] Whether to run restore-on-load behavior.
 * @param {typeof createOptionsModuleDefault} [options.createOptionsModule=createOptionsModuleDefault] Module factory override.
 * @return {ReturnType<typeof createOptionsModuleDefault>} Created options module instance.
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
