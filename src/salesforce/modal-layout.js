"use strict";
import { HIDDEN_CLASS } from "../core/constants.js";
import { createModalLayoutModule } from "./runtime/modal-layout-runtime.js";

let modalLayoutModule;

/**
 * Returns the lazily-created modal layout module singleton.
 *
 * @return {{ updateModalBodyOverflow: (article?: HTMLElement | null) => void }} Modal layout API.
 */
export function getModule() {
	modalLayoutModule ??= createModalLayoutModule({
		hiddenClass: HIDDEN_CLASS,
	});
	return modalLayoutModule;
}

/**
 * Test-only controls for the modal layout module lifecycle.
 */
export const __testHooks = {
	getModule,
	resetModule() {
		modalLayoutModule = undefined;
	},
	setModule(module) {
		modalLayoutModule = module;
	},
};

/**
 * Updates modal body overflow for current content height.
 *
 * @param {HTMLElement | null} [article=null] Article inside modal body.
 * @return {void}
 */
export function updateModalBodyOverflow(article = null) {
	return getModule().updateModalBodyOverflow(article);
}
