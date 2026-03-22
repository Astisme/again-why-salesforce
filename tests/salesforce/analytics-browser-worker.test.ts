// deno-lint-ignore-file no-explicit-any
import { mockStorage } from "../mocks.test.ts";

const SETTINGS_KEY = "settings";
const PERM_CHECK = "check-permission-granted";
const TECHNICAL_AND_INTERACTION = "technicalAndInteraction";

/**
 * Builds a minimal DOM element mock with attribute storage and children support.
 *
 * @param {string} tagName The element tag name to expose in assertions.
 * @return {{
 *   tagName: string,
 *   children: any[],
 *   appendChild: (child: any) => any,
 *   getAttribute: (name: string) => string | null,
 *   setAttribute: (name: string, value: string) => void
 * }} A lightweight element-like object for analytics DOM tests.
 */
function createElement(tagName: string) {
	const attributes = new Map<string, string>();
	return {
		tagName,
		children: [] as any[],
		appendChild(child: any) {
			this.children.push(child);
			return child;
		},
		getAttribute(name: string) {
			return attributes.get(name) ?? null;
		},
		setAttribute(name: string, value: string) {
			attributes.set(name, value);
		},
	};
}

/**
 * Installs a fresh document mock for a test invocation.
 *
 * @param {string} [existingCspContent] Optional CSP content to preload into the mock document.
 * @param {boolean} [useDocumentElementOnly=false] When true, omit `document.head`.
 * @return {{
 *   head: ReturnType<typeof createElement>,
 *   documentElement: ReturnType<typeof createElement>,
 *   createElement: typeof createElement,
 *   querySelector: (selector: string) => any
 * }} The installed document mock bound to `globalThis.document`.
 */
function installDocument(
	existingCspContent?: string,
	useDocumentElementOnly = false,
) {
	const head = useDocumentElementOnly ? null : createElement("head");
	const documentElement = createElement("html");
	const appendTarget = head ?? documentElement;
	if (existingCspContent != null) {
		const meta = createElement("meta");
		meta.setAttribute("http-equiv", "Content-Security-Policy");
		meta.setAttribute("content", existingCspContent);
		appendTarget.appendChild(meta);
	}
	const documentMock = {
		head,
		documentElement,
		createElement,
		querySelector(selector: string) {
			if (selector !== 'meta[http-equiv="Content-Security-Policy"]') {
				return null;
			}
			return appendTarget.children.find((child) =>
				child.getAttribute?.("http-equiv") === "Content-Security-Policy"
			) ?? null;
		},
	};
	globalThis.document = documentMock as any;
	return documentMock;
}

/**
 * Wraps the runtime mock so tests can inspect outbound analytics messages.
 *
 * @param {{ consent?: boolean | null, consentError?: boolean }} [options]
 * The consent response to emulate for Firefox permission checks.
 * @return {{ messages: any[], restore: () => void }} Recorded messages and a cleanup hook.
 */
function installRuntime({
	consent,
	consentError = false,
}: {
	consent?: boolean | null;
	consentError?: boolean;
}) {
	const runtime = globalThis.BROWSER.runtime;
	const originalSendMessage = runtime.sendMessage.bind(runtime);
	const messages: any[] = [];

	runtime.sendMessage = (
		message: any,
		callback?: (response?: any) => void,
	) => {
		messages.push(structuredClone(message));
		if (message.what === PERM_CHECK) {
			delete runtime.lastError;
			if (consentError) {
				runtime.lastError = new Error("permission check failed");
				callback?.(undefined);
				return;
			}
			if (
				message.contains?.data_collection?.[0] !==
					TECHNICAL_AND_INTERACTION
			) {
				runtime.lastError = new Error("Unexpected permission payload");
				callback?.(undefined);
				return;
			}
			callback?.(consent);
			return;
		}
		return originalSendMessage(message, callback);
	};

	return {
		messages,
		restore() {
			runtime.sendMessage = originalSendMessage;
			delete runtime.lastError;
		},
	};
}

/**
 * Replaces the stored settings collection used by the extension mock.
 *
 * @param {any[]} settings The settings array to expose through the mocked runtime.
 */
function setSettings(settings: any[]) {
	mockStorage[SETTINGS_KEY] = settings;
}

/**
 * Finds the analytics beacon image appended during the current test.
 *
 * @param {{ head: { children: any[] } }} documentMock The mock document returned from `installDocument`.
 * @return {any} The appended image mock, if present.
 */
function getBeaconImage(documentMock: any) {
	const appendTarget = documentMock.head ?? documentMock.documentElement;
	return appendTarget.children.find((child: any) => child.tagName === "img");
}

type WorkerStep = {
	existingCspContent?: string;
	settingsBeforeCall?: any[];
	silenceInfo?: boolean;
	useDocumentElementOnly?: boolean;
};

type WorkerRequest = {
	browserName: "firefox" | "chrome";
	consent?: boolean | null;
	consentError?: boolean;
	initialSettings: any[];
	steps: WorkerStep[];
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { browserName, consent, consentError, initialSettings, steps } =
		event.data;

	Object.defineProperty(globalThis, "navigator", {
		value: { userAgent: browserName },
		configurable: true,
		writable: true,
	});

	const runtime = installRuntime({ consent, consentError });
	setSettings(initialSettings);

	try {
		const { checkInsertAnalytics } = await import(
			"/salesforce/analytics.js"
		);
		const results = [];

		for (const step of steps) {
			if (step.settingsBeforeCall != null) {
				setSettings(step.settingsBeforeCall);
			}
			const documentMock = installDocument(
				step.existingCspContent,
				step.useDocumentElementOnly === true,
			);
			const appendTarget = documentMock.head ??
				documentMock.documentElement;
			const originalInfo = console.info;
			if (step.silenceInfo) {
				console.info = () => {};
			}
			try {
				await checkInsertAnalytics();
			} finally {
				console.info = originalInfo;
			}
			const beacon = getBeaconImage(documentMock);
			results.push({
				headChildrenCount: appendTarget.children.length,
				cspContent: documentMock.querySelector(
					'meta[http-equiv="Content-Security-Policy"]',
				)?.getAttribute("content") ?? null,
				beaconPath: beacon
					? new URL(String(beacon.src)).searchParams.get("path")
					: null,
			});
		}

		self.postMessage({
			messages: runtime.messages,
			finalSettings: mockStorage[SETTINGS_KEY],
			results,
		});
	} finally {
		runtime.restore();
	}
};
