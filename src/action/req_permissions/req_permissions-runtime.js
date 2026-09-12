"use strict";

import {
	BROWSER,
	DO_NOT_REQUEST_FRAME_PERMISSION,
	HIDDEN_CLASS,
} from "../../core/constants.js";
import {
	requestExportPermission as requestExportPermissionDefault,
	requestFramePatternsPermission as requestFramePatternsPermissionDefault,
} from "../../core/functions.js";
import { TranslationService } from "../../core/translator.js";
import {
	createReqPermissionsModule as createReqPermissionsPureModule,
} from "./req_permissions-module.js";

let reqPermissionsModule = null;

/**
 * Creates request-permissions behavior with extension runtime defaults.
 *
 * @param {Parameters<typeof createReqPermissionsPureModule>[0]} [overrides={}] Runtime overrides.
 * @return {ReturnType<typeof createReqPermissionsPureModule>} Request-permissions module API.
 */
export function createReqPermissionsModule(overrides = {}) {
	return createReqPermissionsPureModule({
		browser: BROWSER,
		closePopup: globalThis.close ?? (() => {}),
		doNotRequestFramePermissionKey: DO_NOT_REQUEST_FRAME_PERMISSION,
		documentRef: globalThis.document,
		ensureTranslatorAvailability:
			TranslationService.ensureTranslatorAvailability,
		hiddenClass: HIDDEN_CLASS,
		localStorageRef: globalThis.localStorage,
		locationRef: globalThis.location,
		requestExportPermission: requestExportPermissionDefault,
		requestFramePatternsPermission: requestFramePatternsPermissionDefault,
		setTimeout: globalThis.setTimeout,
		...overrides,
	});
}

/**
 * Gets default request-permissions module, creating it on first use.
 *
 * @return {ReturnType<typeof createReqPermissionsPureModule>} Request-permissions module API.
 */
function getModule() {
	reqPermissionsModule ??= createReqPermissionsModule();
	return reqPermissionsModule;
}

/**
 * Runs request-permissions action page behavior.
 *
 * @param {Parameters<typeof createReqPermissionsModule>[0]} [overrides] Runtime overrides.
 * @return {ReturnType<ReturnType<typeof createReqPermissionsPureModule>["runReqPermissions"]>} Setup mode details.
 */
export function runReqPermissions(overrides = undefined) {
	return overrides == null
		? getModule().runReqPermissions()
		: createReqPermissionsModule(overrides).runReqPermissions();
}

/**
 * Exposes request-permissions module lifecycle controls for tests.
 */
export const __testHooks = {
	getModule,
	/**
	 * Clears cached default module.
	 *
	 * @return {void}
	 */
	resetModule() {
		reqPermissionsModule = null;
	},
	/**
	 * Replaces cached default module.
	 *
	 * @param {ReturnType<typeof createReqPermissionsPureModule> | null} module Request-permissions module.
	 * @return {void}
	 */
	setModule(module) {
		reqPermissionsModule = module;
	},
};
