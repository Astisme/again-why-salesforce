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

/**
 * Where toasts should be inserted in Salesforce Setup
 */
let toastHanger = null;

/**
 * Retrieves the toast hanger element, caching it for future use.
 * - If the `toastHanger` is already set, it returns the cached value.
 * - Otherwise, it finds it in the page.
 * @return {HTMLElement|null} The toast hanger element if found, otherwise null.
 */
function getToastHanger() {
	if (toastHanger != null) {
		return toastHanger;
	}
	toastHanger = document.getElementsByClassName(
		"oneConsoleTabset navexConsoleTabset",
	)?.[0];
	return toastHanger;
}

/**
 * The message is logged to the console with an appropriate log level based on success, warning, or error.
 * @param {string} message - the message to send to the console
 * @param {string} status - the level of the message
 */
function consoleToastedMessage(message, status) {
	let logFn = null;
	switch (status) {
		case TOAST_SUCCESS:
			logFn = console.log;
			break;
		case TOAST_INFO:
			logFn = console.info;
			break;
		case TOAST_ERROR:
			console.trace();
			logFn = console.error;
			break;
		case TOAST_WARNING:
			console.trace();
			logFn = console.warn;
			break;
		default:
			break;
	}
	logFn?.(message);
}

/**
 * Displays a toast message on the UI with the provided message and styling options.
 * The toast message is appended to the DOM and automatically removed after an estimated reading time.
 *
 * @param {string|string[]} message - The message to display in the toast.
 * @param {string} [status="success"]  - The toast type.
 */
export async function showToast(message, status = TOAST_SUCCESS) {
	if (
		!ALL_TOAST_TYPES.has(status)
	) {
		throw new Error("error_unknown_toast_type");
	}
	const hanger = getToastHanger();
	const toastElement = await generateSldsToastMessage(
		Array.isArray(message) ? message : [message],
		status,
	);
	hanger.appendChild(toastElement);
	setTimeout(() => {
		toastElement.remove();
	}, calculateReadingTime(toastElement.textContent));
	consoleToastedMessage(message, status);
}
