"use strict";

import {
	ALL_TOAST_TYPES,
	TOAST_ERROR,
	TOAST_INFO,
	TOAST_SUCCESS,
	TOAST_WARNING,
} from "../core/constants.js";
import { calculateReadingTime } from "../core/functions.js";

import { generateSldsToastMessage } from "./generator.js";
import { createToastModule as createToastPureModule } from "./toast-module.js";

/**
 * Creates the toast runtime module with dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides.
 * @param {Set<string>} [overrides.allToastTypes=ALL_TOAST_TYPES] Allowed toast statuses.
 * @param {(message: string) => number} [overrides.calculateReadingTimeFn=calculateReadingTime] Reading time calculator.
 * @param {(message: string[], status: string) => Promise<{
 *   remove: () => void;
 *   textContent?: string | null;
 * }> | {
 *   remove: () => void;
 *   textContent?: string | null;
 * }} [overrides.generateSldsToastMessageFn=generateSldsToastMessage] Toast element generator.
 * @param {{
 *   getElementsByClassName: (name: string) => ArrayLike<{
 *     appendChild: (element: {
 *       remove: () => void;
 *       textContent?: string | null;
 *     }) => unknown;
 *   }> | null;
 * }} [overrides.documentRef=globalThis.document] Document-like object.
 * @param {{ error: (message: string | string[]) => void; info: (message: string | string[]) => void; log: (message: string | string[]) => void; trace: () => void; warn: (message: string | string[]) => void; }} [overrides.consoleRef=console] Console-like object.
 * @param {(callback: () => void, delay?: number) => number} [overrides.setTimeoutFn=globalThis.setTimeout] Timeout scheduler.
 * @param {string} [overrides.toastError=TOAST_ERROR] Error toast status.
 * @param {string} [overrides.toastInfo=TOAST_INFO] Info toast status.
 * @param {string} [overrides.toastSuccess=TOAST_SUCCESS] Success toast status.
 * @param {string} [overrides.toastWarning=TOAST_WARNING] Warning toast status.
 * @return {{
 *   __testHooks: {
 *     consoleToastedMessage: (message: string | string[], status: string) => void;
 *     getToastHanger: () => {
 *       appendChild: (element: {
 *         remove: () => void;
 *         textContent?: string | null;
 *       }) => unknown;
 *     } | null;
 *   };
 *   showToast: (message: string | string[], status?: string) => Promise<void>;
 * }} Toast runtime API.
 */
export function createToastModule({
	allToastTypes = ALL_TOAST_TYPES,
	calculateReadingTimeFn = calculateReadingTime,
	generateSldsToastMessageFn = generateSldsToastMessage,
	documentRef = globalThis.document,
	consoleRef = console,
	setTimeoutFn = globalThis.setTimeout,
	toastError = TOAST_ERROR,
	toastInfo = TOAST_INFO,
	toastSuccess = TOAST_SUCCESS,
	toastWarning = TOAST_WARNING,
} = {}) {
	return createToastPureModule({
		allToastTypes,
		calculateReadingTimeFn,
		generateSldsToastMessageFn,
		documentRef,
		consoleRef,
		setTimeoutFn,
		toastError,
		toastInfo,
		toastSuccess,
		toastWarning,
	});
}

const toastModule = createToastModule();

/**
 * Shows a toast notification using runtime defaults.
 *
 * @param {string | string[]} message Toast message key(s).
 * @param {string} [status=TOAST_SUCCESS] Toast status.
 * @return {Promise<void>} Promise resolved when toast is appended.
 */
export function showToast(message, status = TOAST_SUCCESS) {
	return toastModule.showToast(message, status);
}

/**
 * Test hooks exposed by the singleton toast runtime module.
 */
export const __testHooks = toastModule.__testHooks;
