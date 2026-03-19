/// <reference lib="dom" />

/**
 * Creates a no-op custom element registry for tests that only need the global shape.
 *
 * @return {CustomElementRegistry} Minimal custom element registry.
 */
function createCustomElementsRegistry() {
	const fallback = {
		define() {
			// no-op for tests that only need the registry to exist.
		},
		get() {
			return undefined;
		},
		whenDefined() {
			return Promise.resolve();
		},
		upgrade() {
			// no-op for tests that only need the registry to exist.
		},
	};
	return (globalThis.customElements ?? fallback) as CustomElementRegistry;
}

/**
 * Returns a basic document for environments where `document` is not already defined.
 *
 * @return {Document} Existing document or a parsed fallback document.
 */
function getDocument() {
	if (globalThis.document) {
		return globalThis.document;
	}
	const fallbackDocument = {
		body: {},
		createElement() {
			return {};
		},
		head: {},
	};
	return fallbackDocument as unknown as Document;
}

/**
 * Creates a fallback `CustomEvent` constructor when unavailable.
 *
 * @return {typeof CustomEvent} Existing `CustomEvent` constructor or a fallback implementation.
 */
function getCustomEventConstructor() {
	if (globalThis.CustomEvent) {
		return globalThis.CustomEvent;
	}
	class FallbackCustomEvent<T = unknown> extends Event {
		detail: T;

		/**
		 * Creates a new fallback custom event.
		 *
		 * @param {string} type Event type.
		 * @param {CustomEventInit<T>} [eventInitDict] Optional event configuration.
		 */
		constructor(type: string, eventInitDict?: CustomEventInit<T>) {
			super(type, eventInitDict);
			this.detail = (eventInitDict?.detail as T) ?? (undefined as T);
		}
	}
	return FallbackCustomEvent as unknown as typeof CustomEvent;
}

/**
 * Returns a fallback HTMLElement constructor when unavailable.
 *
 * @return {typeof HTMLElement} Existing HTMLElement constructor or fallback.
 */
function getHTMLElementConstructor() {
	if (globalThis.HTMLElement) {
		return globalThis.HTMLElement;
	}
	class FallbackHTMLElement extends EventTarget {}
	return FallbackHTMLElement as unknown as typeof HTMLElement;
}

/**
 * Installs browser-like globals for tests that need DOM primitives.
 *
 * @return {void}
 */
function installHappyDomGlobals() {
	const window = globalThis.window ?? (globalThis as unknown as Window);
	Object.defineProperties(globalThis, {
		window: {
			configurable: true,
			value: window,
			writable: true,
		},
		document: {
			configurable: true,
			value: getDocument(),
			writable: true,
		},
		HTMLElement: {
			configurable: true,
			value: getHTMLElementConstructor(),
			writable: true,
		},
		CustomEvent: {
			configurable: true,
			value: getCustomEventConstructor(),
			writable: true,
		},
		customElements: {
			configurable: true,
			value: createCustomElementsRegistry(),
			writable: true,
		},
	});
}

installHappyDomGlobals();
