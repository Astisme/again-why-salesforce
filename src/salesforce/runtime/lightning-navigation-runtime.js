import {
	createLightningNavigationModule as createLightningNavigationPureModule,
} from "../module/lightning-navigation-module.js";

/**
 * Creates Salesforce Lightning navigation handlers with page-context defaults.
 *
 * @param {Parameters<typeof createLightningNavigationPureModule>[0]} [overrides={}] Page-context dependency overrides.
 * @return {ReturnType<typeof createLightningNavigationPureModule>} Lightning navigation API.
 */
export function createLightningNavigationModule(overrides = {}) {
	return createLightningNavigationPureModule({
		aura: globalThis.$A,
		consoleRef: globalThis.console,
		openRef: globalThis.open,
		windowRef: globalThis,
		...overrides,
	});
}

/**
 * Registers the Salesforce Lightning navigation page-message listener.
 *
 * @param {Parameters<typeof createLightningNavigationPureModule>[0] & { addEventListener?: (type: string, listener: (event: { data: { fallbackURL?: string; navigationType: string; recordId?: string; url?: string; what?: string; }; source: object; }) => void) => void; }} [overrides={}] Page-context dependency overrides.
 * @return {ReturnType<typeof createLightningNavigationPureModule>} Registered Lightning navigation API.
 */
export function registerLightningNavigation({
	addEventListener = globalThis.addEventListener.bind(globalThis),
	...overrides
} = {}) {
	const lightningNavigationModule = createLightningNavigationModule(overrides);
	addEventListener("message", lightningNavigationModule.handleMessage);
	return lightningNavigationModule;
}
