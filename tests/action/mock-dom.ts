/**
 * Event listener signature used by the lightweight action-page mock DOM.
 */
type Listener = (event: Event) => void | Promise<void>;

/**
 * Stores CSS classes for a mock element.
 */
class MockClassList {
	#classes = new Set<string>();

	/**
	 * Adds one or more classes.
	 *
	 * @param {...string} classes Class names to add.
	 * @return {void}
	 */
	add(...classes: string[]) {
		for (const className of classes) {
			if (className !== "") {
				this.#classes.add(className);
			}
		}
	}

	/**
	 * Removes one or more classes.
	 *
	 * @param {...string} classes Class names to remove.
	 * @return {void}
	 */
	remove(...classes: string[]) {
		for (const className of classes) {
			this.#classes.delete(className);
		}
	}

	/**
	 * Checks whether the class list contains a class.
	 *
	 * @param {string} className Class name to check.
	 * @return {boolean} `true` when present.
	 */
	contains(className: string) {
		return this.#classes.has(className);
	}

	/**
	 * Adds or removes a class based on an optional force flag.
	 *
	 * @param {string} className Class name to toggle.
	 * @param {boolean} [force] Explicit desired state.
	 * @return {void}
	 */
	toggle(className: string, force?: boolean) {
		if (force == null) {
			if (this.contains(className)) {
				this.remove(className);
			} else {
				this.add(className);
			}
			return;
		}
		if (force) {
			this.add(className);
			return;
		}
		this.remove(className);
	}
}

/**
 * Minimal element implementation for action entrypoint tests.
 */
export class MockElement {
	attributes = new Map<string, string>();
	checked = false;
	children: MockElement[] = [];
	classList = new MockClassList();
	dataset: Record<string, string>;
	href = "";
	id = "";
	shadowRoot: MockElement | null = null;
	style: Record<string, string> = {};
	tagName: string;
	title = "";
	#listeners = new Map<string, Set<Listener>>();

	/**
	 * Creates a mock element with the provided tag name.
	 *
	 * @param {string} tagName Element tag name.
	 */
	constructor(tagName: string) {
		this.tagName = tagName.toUpperCase();
		this.dataset = new Proxy({} as Record<string, string>, {
			set: (target, key, value) => {
				target[String(key)] = String(value);
				return true;
			},
		});
	}

	/**
	 * Appends a child element.
	 *
	 * @param {MockElement} child Child element.
	 * @return {MockElement} Appended child.
	 */
	appendChild(child: MockElement) {
		this.children.push(child);
		return child;
	}

	/**
	 * Appends one or more child elements.
	 *
	 * @param {...MockElement} children Child elements.
	 * @return {void}
	 */
	append(...children: MockElement[]) {
		for (const child of children) {
			this.appendChild(child);
		}
	}

	/**
	 * Attaches and returns a shadow root.
	 *
	 * @return {MockElement} Shadow root element.
	 */
	attachShadow(_options?: { mode: string }) {
		this.shadowRoot = new MockElement("shadow-root");
		return this.shadowRoot;
	}

	/**
	 * Registers an event listener.
	 *
	 * @param {string} type Event type.
	 * @param {Listener} listener Event listener.
	 * @return {void}
	 */
	addEventListener(type: string, listener: Listener) {
		if (!this.#listeners.has(type)) {
			this.#listeners.set(type, new Set());
		}
		this.#listeners.get(type)?.add(listener);
	}

	/**
	 * Removes an event listener.
	 *
	 * @param {string} type Event type.
	 * @param {Listener} listener Event listener.
	 * @return {void}
	 */
	removeEventListener(type: string, listener: Listener) {
		this.#listeners.get(type)?.delete(listener);
	}

	/**
	 * Dispatches a click event.
	 *
	 * @return {Promise<void> | void} Listener completion when async handlers are present.
	 */
	click() {
		return this.dispatchEvent(new Event("click", { cancelable: true }));
	}

	/**
	 * Dispatches an event to registered listeners.
	 *
	 * @param {Event} event Event instance.
	 * @return {Promise<void> | void} Listener completion when async handlers are present.
	 */
	dispatchEvent(event: Event) {
		const asyncListeners: Promise<void>[] = [];
		for (const listener of this.#listeners.get(event.type) ?? []) {
			const result = listener(event);
			if (result instanceof Promise) {
				asyncListeners.push(result);
			}
		}
		if (asyncListeners.length > 0) {
			return Promise.all(asyncListeners).then(() => {});
		}
	}

	/**
	 * Sets an attribute value and synchronizes derived properties.
	 *
	 * @param {string} name Attribute name.
	 * @param {string} value Attribute value.
	 * @return {void}
	 */
	setAttribute(name: string, value: string) {
		this.attributes.set(name, value);
		if (name === "id") {
			this.id = value;
		}
		if (name === "href") {
			this.href = value;
		}
		if (name.startsWith("data-")) {
			const datasetKey = name.slice(5).replace(
				/-([a-z])/g,
				(_, character: string) => character.toUpperCase(),
			);
			this.dataset[datasetKey] = value;
		}
	}

	/**
	 * Returns an attribute value when present.
	 *
	 * @param {string} name Attribute name.
	 * @return {string | null} Attribute value.
	 */
	getAttribute(name: string) {
		return this.attributes.get(name) ?? null;
	}

	/**
	 * Removes an attribute value.
	 *
	 * @param {string} name Attribute name.
	 * @return {void}
	 */
	removeAttribute(name: string) {
		this.attributes.delete(name);
		if (name.startsWith("data-")) {
			const datasetKey = name.slice(5).replace(
				/-([a-z])/g,
				(_, character: string) => character.toUpperCase(),
			);
			delete this.dataset[datasetKey];
		}
	}

	/**
	 * Finds a descendant by element id.
	 *
	 * @param {string} id Element id to find.
	 * @return {MockElement | null} Matching element when found.
	 */
	findById(id: string): MockElement | null {
		for (const child of this.children) {
			if (child.id === id) {
				return child;
			}
			const nested = child.findById(id);
			if (nested != null) {
				return nested;
			}
		}
		return null;
	}
}

/**
 * Minimal document implementation for action entrypoint tests.
 */
export class MockDocument {
	body = new MockElement("body");

	/**
	 * Creates a mock element.
	 *
	 * @param {string} tagName Element tag name.
	 * @return {MockElement} Created element.
	 */
	createElement(tagName: string) {
		return new MockElement(tagName);
	}

	/**
	 * Finds an element by id.
	 *
	 * @param {string} id Element id.
	 * @return {MockElement} Matching element.
	 */
	getElementById(id: string) {
		const found = this.body.findById(id);
		if (found == null) {
			throw new Error(`Missing mock element: ${id}`);
		}
		return found;
	}
}

/**
 * Creates a small window-like object with a document and mutable location.
 *
 * @param {string} url Initial URL.
 * @return {{ document: MockDocument; location: URL | string; }} Window-like object.
 */
export function createMockWindow(url: string) {
	return {
		document: new MockDocument(),
		location: new URL(url),
	};
}
