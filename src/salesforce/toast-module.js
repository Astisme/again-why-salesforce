"use strict";

/**
 * Creates the pure toast module with injectable dependencies.
 *
 * @param {Object} [options={}] Module dependencies.
 * @param {Set<string>} [options.allToastTypes=new Set()] Allowed toast statuses.
 * @param {(message: string) => number} [options.calculateReadingTimeFn] Reading time calculator.
 * @param {(message: string[], status: string) => Promise<{
 *   remove: () => void;
 *   textContent?: string | null;
 * }> | {
 *   remove: () => void;
 *   textContent?: string | null;
 * }} [options.generateSldsToastMessageFn] Toast element generator.
 * @param {{
 *   getElementsByClassName: (name: string) => ArrayLike<{
 *     appendChild: (element: {
 *       remove: () => void;
 *       textContent?: string | null;
 *     }) => unknown;
 *   }> | null;
 * }} [options.documentRef=document] Document-like object.
 * @param {{ error: (message: string | string[]) => void; info: (message: string | string[]) => void; log: (message: string | string[]) => void; trace: () => void; warn: (message: string | string[]) => void; }} [options.consoleRef=console] Console-like object.
 * @param {(callback: () => void, delay?: number) => number} [options.setTimeoutFn=globalThis.setTimeout] Timeout scheduler.
 * @param {string} [options.toastError="error"] Error toast status.
 * @param {string} [options.toastInfo="info"] Info toast status.
 * @param {string} [options.toastSuccess="success"] Success toast status.
 * @param {string} [options.toastWarning="warning"] Warning toast status.
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
 * }} Toast module API.
 */
export function createToastModule({
	allToastTypes = new Set(),
	calculateReadingTimeFn,
	generateSldsToastMessageFn,
	documentRef = globalThis.document,
	consoleRef = globalThis.console,
	setTimeoutFn = globalThis.setTimeout,
	toastError = "error",
	toastInfo = "info",
	toastSuccess = "success",
	toastWarning = "warning",
} = {}) {
	/** @type {{
	 *   appendChild: (element: {
	 *     remove: () => void;
	 *     textContent?: string | null;
	 *   }) => unknown;
	 * } | null} */
	let toastHanger = null;

	/**
	 * Retrieves the toast hanger element, caching it for future use.
	 *
	 * @return {{
	 *   appendChild: (element: {
	 *     remove: () => void;
	 *     textContent?: string | null;
	 *   }) => unknown;
	 * } | null} Toast container element.
	 */
	function getToastHanger() {
		if (toastHanger != null) {
			return toastHanger;
		}
		toastHanger = documentRef.getElementsByClassName(
			"oneConsoleTabset navexConsoleTabset",
		)?.[0] ?? null;
		return toastHanger;
	}

	/**
	 * Logs toast messages using a status-aware console function.
	 *
	 * @param {string | string[]} message Toast message.
	 * @param {string} status Toast status.
	 * @return {void}
	 */
	function consoleToastedMessage(message, status) {
		let logFn = null;
		switch (status) {
			case toastSuccess:
				logFn = consoleRef.log;
				break;
			case toastInfo:
				logFn = consoleRef.info;
				break;
			case toastError:
				consoleRef.trace();
				logFn = consoleRef.error;
				break;
			case toastWarning:
				consoleRef.trace();
				logFn = consoleRef.warn;
				break;
			default:
				break;
		}
		logFn?.(message);
	}

	/**
	 * Displays a toast element and auto-removes it after the estimated reading time.
	 *
	 * @param {string | string[]} message Toast message key(s).
	 * @param {string} [status=toastSuccess] Toast status.
	 * @return {Promise<void>} Promise resolved when the toast has been appended.
	 */
	async function showToast(message, status = toastSuccess) {
		if (!allToastTypes.has(status)) {
			throw new Error("error_unknown_toast_type");
		}
		if (typeof generateSldsToastMessageFn !== "function") {
			throw new Error("error_required_params");
		}
		const hanger = getToastHanger();
		const toastElement = await generateSldsToastMessageFn(
			Array.isArray(message) ? message : [message],
			status,
		);
		hanger?.appendChild(toastElement);
		(setTimeoutFn ?? globalThis.setTimeout)?.(() => {
			toastElement.remove();
		}, calculateReadingTimeFn?.(toastElement.textContent ?? "") ?? 0);
		consoleToastedMessage(message, status);
	}

	return {
		__testHooks: {
			consoleToastedMessage,
			getToastHanger,
		},
		showToast,
	};
}
