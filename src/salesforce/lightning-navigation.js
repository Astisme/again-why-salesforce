// This module is injected in Salesforce page context and does not share the context with content scripts.
import {
	createLightningNavigationModule as createRuntimeLightningNavigationModule,
	registerLightningNavigation as registerRuntimeLightningNavigation,
} from "./runtime/lightning-navigation-runtime.js";

/**
 * Creates Salesforce Lightning navigation handlers with page-context dependency overrides.
 *
 * @param {Parameters<typeof createRuntimeLightningNavigationModule>[0]} [overrides={}] Page-context dependency overrides.
 * @return {ReturnType<typeof createRuntimeLightningNavigationModule>} Lightning navigation API.
 */
export function createLightningNavigationModule(overrides = {}) {
	return createRuntimeLightningNavigationModule(overrides);
}

/**
 * Registers the Salesforce Lightning navigation page-message listener.
 *
 * @param {Parameters<typeof registerRuntimeLightningNavigation>[0]} [overrides={}] Page-context dependency overrides.
 * @return {ReturnType<typeof registerRuntimeLightningNavigation>} Registered Lightning navigation API.
 */
export function registerLightningNavigation(overrides = {}) {
	return registerRuntimeLightningNavigation(overrides);
}

registerLightningNavigation();
