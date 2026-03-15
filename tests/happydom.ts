/**
 * Event listener callback type used by the local mock DOM.
 */
type Listener = (event: Event) => void;

/**
 * Returns a plain object used to emulate CSS style declarations.
 *
 * @return {Record<string, string>} Mutable style declaration object.
 */
function createStyleDeclaration() {
	return {
		cssText: "",
	} as Record<string, string>;
}

/**
 * Stores and mutates CSS classes for a mock element.
 */
class MockClassList {
	#classes = new Set<string>();

	/**
	 * Adds one or more classes.
	 *
	 * @param classes CSS class names.
	 * @return {void}
	 */
	add(...classes: string[]) {
		for (const cls of classes) {
			if (cls) {
				this.#classes.add(cls);
			}
		}
	}

	/**
	 * Removes one or more classes.
	 *
	 * @param classes CSS class names.
	 * @return {void}
	 */
	remove(...classes: string[]) {
		for (const cls of classes) {
			this.#classes.delete(cls);
		}
	}

	/**
	 * Checks whether a class exists.
	 *
	 * @param cls CSS class name.
	 * @return {boolean} `true` when the class exists.
	 */
	contains(cls: string) {
		return this.#classes.has(cls);
	}

	/**
	 * Returns the current classes as a space-separated string.
	 *
	 * @return {string} Serialized class list.
	 */
	toString() {
		return [...this.#classes].join(" ");
	}

	/**
	 * Replaces the class set from a serialized value.
	 *
	 * @param value Space-separated class list.
	 * @return {void}
	 */
	setFromString(value: string) {
		this.#classes = new Set(
			value.split(/\s+/).filter(Boolean),
		);
	}
}

/**
 * Splits a selector into descendant segments while respecting brackets and parentheses.
 *
 * @param selector Selector string.
 * @return {string[]} Descendant selector segments.
 */
function splitSelectorSegments(selector: string) {
	const segments = [];
	let current = "";
	let bracketDepth = 0;
	let parenDepth = 0;
	for (const char of selector.trim()) {
		if (char === "[") bracketDepth++;
		if (char === "]") bracketDepth--;
		if (char === "(") parenDepth++;
		if (char === ")") parenDepth--;
		if (char === " " && bracketDepth === 0 && parenDepth === 0) {
			if (current !== "") {
				segments.push(current);
				current = "";
			}
			continue;
		}
		current += char;
	}
	if (current !== "") {
		segments.push(current);
	}
	return segments;
}

/**
 * Minimal DOM element implementation tailored to the tutorial tests.
 */
class MockElement extends EventTarget {
	tagName: string;
	parentElement: MockElement | null = null;
	children: MockElement[] = [];
	attributes = new Map<string, string>();
	classList = new MockClassList();
	dataset = {} as Record<string, string>;
	style = createStyleDeclaration();
	ownerDocument: MockDocument | null = null;
	#textContent = "";
	#id = "";

	/**
	 * Creates a mock element with the provided tag name.
	 *
	 * @param {string} tagName Tag name for the element.
	 */
	constructor(tagName: string) {
		super();
		this.tagName = tagName.toUpperCase();
	}

	/**
	 * Returns the element id.
	 *
	 * @return {string} Element id.
	 */
	get id() {
		return this.#id;
	}

	/**
	 * Updates the element id.
	 *
	 * @param {string} value New element id.
	 */
	set id(value: string) {
		this.#id = value ?? "";
		if (this.#id === "") {
			this.attributes.delete("id");
			return;
		}
		this.attributes.set("id", this.#id);
	}

	/**
	 * Returns the serialized class name.
	 *
	 * @return {string} Space-separated class list.
	 */
	get className() {
		return this.classList.toString();
	}

	/**
	 * Replaces the class list from a serialized value.
	 *
	 * @param {string} value Space-separated class list.
	 */
	set className(value: string) {
		this.classList.setFromString(value ?? "");
	}

	/**
	 * Returns the text content.
	 *
	 * @return {string} Serialized text content.
	 */
	get textContent() {
		if (this.children.length > 0) {
			return this.children.map((child) => child.textContent).join("") ||
				this.#textContent;
		}
		return this.#textContent;
	}

	/**
	 * Updates the text content and clears children.
	 *
	 * @param {string | null} value New text content.
	 */
	set textContent(value: string | null) {
		this.children = [];
		this.#textContent = value ?? "";
	}

	/**
	 * Returns the inner text.
	 *
	 * @return {string} Inner text value.
	 */
	get innerText() {
		return this.textContent ?? "";
	}

	/**
	 * Updates the inner text.
	 *
	 * @param {string} value New inner text.
	 */
	set innerText(value: string) {
		this.textContent = value;
	}

	/**
	 * Returns the number of child elements.
	 *
	 * @return {number} Child element count.
	 */
	get childElementCount() {
		return this.children.length;
	}

	/**
	 * Returns the parent node alias expected by tests.
	 *
	 * @return {MockElement|null} Parent element.
	 */
	get parentNode() {
		return this.parentElement;
	}

	/**
	 * Returns the first child element.
	 *
	 * @return {MockElement|null} First child element.
	 */
	get firstElementChild() {
		return this.children[0] ?? null;
	}

	/**
	 * Clears or serializes the direct child markup.
	 *
	 * @return {string} Simplified innerHTML representation.
	 */
	get innerHTML() {
		if (this.children.length === 0) {
			return this.#textContent;
		}
		return this.children.map((child) => child.textContent).join("");
	}

	/**
	 * Clears children when assigned.
	 *
	 * @param {string | null} value New innerHTML value.
	 */
	set innerHTML(value: string | null) {
		this.children = [];
		this.#textContent = value ?? "";
	}

	/**
	 * Appends a child node.
	 *
	 * @param {MockElement} child Child element to append.
	 * @return {MockElement} The appended child.
	 */
	appendChild(child: MockElement) {
		child.remove();
		child.parentElement = this;
		child.ownerDocument = this.ownerDocument;
		this.children.push(child);
		return child;
	}

	/**
	 * Appends one or more nodes or strings.
	 *
	 * @param {...(MockElement|string)} nodes Nodes or strings to append.
	 * @return {void}
	 */
	append(...nodes: Array<MockElement | string>) {
		for (const node of nodes) {
			if (typeof node === "string") {
				const textNode = this.ownerDocument?.createElement("span") ??
					new MockElement("span");
				textNode.textContent = node;
				this.appendChild(textNode);
				continue;
			}
			this.appendChild(node);
		}
	}

	/**
	 * Removes the element from its parent.
	 *
	 * @return {void}
	 */
	remove() {
		if (this.parentElement == null) {
			return;
		}
		this.parentElement.children = this.parentElement.children.filter((
			child,
		) => child !== this);
		this.parentElement = null;
	}

	/**
	 * Updates an attribute value.
	 *
	 * @param {string} name Attribute name.
	 * @param {string|number|boolean} value Attribute value.
	 * @return {void}
	 */
	setAttribute(name: string, value: string | number | boolean) {
		const stringValue = String(value);
		this.attributes.set(name, stringValue);
		if (name === "id") {
			this.#id = stringValue;
		}
		if (name === "class") {
			this.classList.setFromString(stringValue);
		}
		if (name.startsWith("data-")) {
			const key = name.slice(5).replace(
				/-([a-z])/g,
				(_, letter) => letter.toUpperCase(),
			);
			this.dataset[key] = stringValue;
		}
	}

	/**
	 * Returns an attribute value.
	 *
	 * @param {string} name Attribute name.
	 * @return {string|null} Attribute value when present.
	 */
	getAttribute(name: string) {
		if (name === "class") {
			return this.classList.toString();
		}
		return this.attributes.get(name) ?? null;
	}

	/**
	 * Matches a limited selector subset used by the tutorial tests.
	 *
	 * @param {string} selector Selector to evaluate.
	 * @return {boolean} `true` when the selector matches.
	 */
	matches(selector: string): boolean {
		if (selector === "") {
			return false;
		}
		let remaining = selector.trim();
		const tagMatch = remaining.match(/^[a-zA-Z0-9_-]+/);
		if (tagMatch != null) {
			if (this.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) {
				return false;
			}
			remaining = remaining.slice(tagMatch[0].length);
		}
		while (remaining.length > 0) {
			if (remaining.startsWith("#")) {
				const match = remaining.match(/^#([a-zA-Z0-9_-]+)/);
				if (match == null || this.id !== match[1]) {
					return false;
				}
				remaining = remaining.slice(match[0].length);
				continue;
			}
			if (remaining.startsWith(".")) {
				const match = remaining.match(/^\.([a-zA-Z0-9_-]+)/);
				if (match == null || !this.classList.contains(match[1])) {
					return false;
				}
				remaining = remaining.slice(match[0].length);
				continue;
			}
			if (remaining.startsWith("[")) {
				const endIndex = remaining.indexOf("]");
				const content = remaining.slice(1, endIndex);
				const startsWithIndex = content.indexOf("^=");
				const equalsIndex = content.indexOf("=");
				if (startsWithIndex > -1) {
					const attr = content.slice(0, startsWithIndex);
					const value = content.slice(startsWithIndex + 2).replaceAll(
						`"`,
						"",
					);
					if (!(this.getAttribute(attr) ?? "").startsWith(value)) {
						return false;
					}
				} else if (equalsIndex > -1) {
					const attr = content.slice(0, equalsIndex);
					const value = content.slice(equalsIndex + 1).replaceAll(
						`"`,
						"",
					);
					if ((this.getAttribute(attr) ?? "") !== value) {
						return false;
					}
				} else if (this.getAttribute(content) == null) {
					return false;
				}
				remaining = remaining.slice(endIndex + 1);
				continue;
			}
			if (remaining.startsWith(":nth-child(")) {
				const match = remaining.match(/^:nth-child\((\d+)\)/);
				const childIndex = this.parentElement?.children.indexOf(this) ??
					-1;
				if (match == null || childIndex !== Number(match[1]) - 1) {
					return false;
				}
				remaining = remaining.slice(match[0].length);
				continue;
			}
			if (remaining.startsWith(":not(")) {
				let depth = 0;
				let endIndex = 0;
				for (let index = 0; index < remaining.length; index++) {
					const char = remaining[index];
					if (char === "(") {
						depth++;
					} else if (char === ")") {
						depth--;
						if (depth === 0) {
							endIndex = index;
							break;
						}
					}
				}
				const innerSelector = remaining.slice(5, endIndex);
				if (this.matches(innerSelector)) {
					return false;
				}
				remaining = remaining.slice(endIndex + 1);
				continue;
			}
			break;
		}
		return remaining === "";
	}

	/**
	 * Finds the closest ancestor matching a selector.
	 *
	 * @param {string} selector Selector to match.
	 * @return {MockElement|null} Matching ancestor when found.
	 */
	closest(selector: string) {
		if (this.matches(selector)) {
			return this;
		}
		for (
			let ancestor = this.parentElement;
			ancestor != null;
			ancestor = ancestor.parentElement
		) {
			if (ancestor.matches(selector)) {
				return ancestor;
			}
		}
		return null;
	}

	/**
	 * Returns all descendants that match a selector.
	 *
	 * @param {string} selector Selector to evaluate.
	 * @return {MockElement[]} Matching descendants.
	 */
	querySelectorAll(selector: string) {
		const segments = splitSelectorSegments(selector);
		const allDescendants = this.#getDescendants();
		return allDescendants.filter((element) => {
			let current: MockElement | null = element;
			for (let index = segments.length - 1; index >= 0; index--) {
				const segment = segments[index];
				while (current != null && !current.matches(segment)) {
					current = current.parentElement;
				}
				if (current == null) {
					return false;
				}
				current = current.parentElement;
			}
			return true;
		});
	}

	/**
	 * Returns the first descendant matching a selector.
	 *
	 * @param {string} selector Selector to evaluate.
	 * @return {MockElement|null} First matching descendant.
	 */
	querySelector(selector: string) {
		return this.querySelectorAll(selector)[0] ?? null;
	}

	/**
	 * Focuses the current element.
	 *
	 * @return {void}
	 */
	focus() {}

	/**
	 * Dispatches a click event on the current element.
	 *
	 * @return {void}
	 */
	click() {
		this.dispatchEvent(new Event("click"));
	}

	/**
	 * Returns a default zero-sized bounding box.
	 *
	 * @return {DOMRect} Mock DOMRect.
	 */
	getBoundingClientRect() {
		return {
			width: 0,
			height: 0,
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		} as DOMRect;
	}

	/**
	 * Returns all descendants in depth-first order.
	 *
	 * @return {MockElement[]} Descendant list.
	 */
	#getDescendants() {
		const descendants: MockElement[] = [];
		for (const child of this.children) {
			descendants.push(child);
			descendants.push(...child.#getDescendants());
		}
		return descendants;
	}
}

/**
 * Minimal mock document implementation used by the tutorial tests.
 */
class MockDocument extends EventTarget {
	documentElement = new MockElement("html");
	head = new MockElement("head");
	body = new MockElement("body");

	/**
	 * Creates the document tree.
	 */
	constructor() {
		super();
		this.documentElement.ownerDocument = this;
		this.head.ownerDocument = this;
		this.body.ownerDocument = this;
		this.documentElement.appendChild(this.head);
		this.documentElement.appendChild(this.body);
	}

	/**
	 * Creates an element for the given tag.
	 *
	 * @param {string} tagName Tag name.
	 * @return {MockElement} New element.
	 */
	createElement(tagName: string) {
		const element = new MockElement(tagName);
		element.ownerDocument = this;
		if (tagName.toLowerCase() === "canvas") {
			Object.assign(element, {
				getContext() {
					return {
						clearRect() {},
						save() {},
						restore() {},
						translate() {},
						rotate() {},
						fillRect() {},
						beginPath() {},
						arc() {},
						fill() {},
						set globalAlpha(_value: number) {
							void _value;
						},
						set fillStyle(_value: string) {
							void _value;
						},
					};
				},
			});
		}
		return element;
	}

	/**
	 * Creates an element in a namespace.
	 *
	 * @param {string} _namespace Ignored namespace.
	 * @param {string} tagName Tag name.
	 * @return {MockElement} New element.
	 */
	createElementNS(_namespace: string, tagName: string) {
		return this.createElement(tagName);
	}

	/**
	 * Returns the first element matching an id.
	 *
	 * @param {string} id Element id.
	 * @return {MockElement|null} Matching element.
	 */
	getElementById(id: string) {
		return this.querySelector(`#${id}`);
	}

	/**
	 * Returns the first element matching a selector.
	 *
	 * @param {string} selector Selector string.
	 * @return {MockElement|null} Matching element.
	 */
	querySelector(selector: string) {
		return this.documentElement.querySelector(selector);
	}

	/**
	 * Returns every element matching a selector.
	 *
	 * @param {string} selector Selector string.
	 * @return {MockElement[]} Matching elements.
	 */
	querySelectorAll(selector: string) {
		return this.documentElement.querySelectorAll(selector);
	}
}

/**
 * Creates a lightweight mock element with classList and event bookkeeping.
 *
 * @return Mock element used by smaller unit tests.
 */
export function createMockElement() {
	return {
		classList: {
			list: [] as string[],
			add(cls: string) {
				if (!this.list.includes(cls)) {
					this.list.push(cls);
				}
			},
			remove(cls: string) {
				const index = this.list.indexOf(cls);
				if (index !== -1) {
					this.list.splice(index, 1);
				}
			},
			toggle(cls: string, force: boolean) {
				if (force != null) {
					if (force) {
						this.add(cls);
					} else {
						this.remove(cls);
					}
					return;
				}
				if (this.list.includes(cls)) {
					this.remove(cls);
				} else {
					this.add(cls);
				}
			},
		},
		// deno-lint-ignore ban-types
		events: {} as Record<string, Function>,
		/**
		 * Records attached listeners by event name.
		 *
		 * @param event Event name.
		 * @param cb Listener callback.
		 * @return {void}
		 */
		// deno-lint-ignore ban-types
		addEventListener(event: string, cb: Function) {
			this.events[event] = cb;
		},
		attributes: {} as Map<string, string>,
		setAttribute(key: string, value: string) {
			this.attributes[key] = value;
		},
	};
}

/**
 * Installs a small DOM harness suitable for browserless tests.
 *
 * @param {string} [url="https://example.test/"] Initial page URL.
 * @return {{window: object, cleanup: () => void}} Window handle plus a cleanup callback.
 */
export function installMockDom(url = "https://example.test/") {
	const document = new MockDocument();
	const currentUrl = new URL(url);
	let animationFrameNow = 0;
	let animationFrameHandle = 0;
	const cancelledAnimationFrames = new Set<number>();
	const windowListeners = new Map<string, Set<Listener>>();
	const history = {
		/**
		 * Updates the current URL.
		 *
		 * @param _state Ignored history state.
		 * @param _title Ignored history title.
		 * @param nextUrl URL to navigate to.
		 * @return {void}
		 */
		pushState(_state: unknown, _title: string, nextUrl: string) {
			const resolvedUrl = new URL(nextUrl, currentUrl);
			currentUrl.href = resolvedUrl.href;
		},
		/**
		 * Replaces the current URL.
		 *
		 * @param _state Ignored history state.
		 * @param _title Ignored history title.
		 * @param nextUrl URL to navigate to.
		 * @return {void}
		 */
		replaceState(_state: unknown, _title: string, nextUrl: string) {
			const resolvedUrl = new URL(nextUrl, currentUrl);
			currentUrl.href = resolvedUrl.href;
		},
	};
	class MockMutationObserver {
		callback;
		/**
		 * Stores the callback without observing real DOM changes.
		 *
		 * @param callback Mutation observer callback.
		 */
		constructor(callback: MutationCallback) {
			this.callback = callback;
		}
		/**
		 * No-op observe implementation for browserless tests.
		 *
		 * @return {void}
		 */
		observe() {}
		/**
		 * No-op disconnect implementation for browserless tests.
		 *
		 * @return {void}
		 */
		disconnect() {}
	}
	const performanceMock = {
		/**
		 * Returns the synthetic animation clock.
		 *
		 * @return {number} Synthetic timestamp in milliseconds.
		 */
		now() {
			return animationFrameNow;
		},
	};
	const requestAnimationFrame = (callback: FrameRequestCallback) => {
		const handle = ++animationFrameHandle;
		queueMicrotask(() => {
			if (cancelledAnimationFrames.has(handle)) {
				cancelledAnimationFrames.delete(handle);
				return;
			}
			animationFrameNow += 16;
			callback(animationFrameNow);
		});
		return handle;
	};
	const cancelAnimationFrame = (handle: number) => {
		cancelledAnimationFrames.add(handle);
	};
	const window = {
		document,
		location: currentUrl,
		history,
		navigator: { userAgent: "mock-dom" },
		HTMLElement: MockElement,
		Element: MockElement,
		Node: MockElement,
		Event,
		CustomEvent,
		MutationObserver: MockMutationObserver,
		HTMLCanvasElement: MockElement,
		HTMLInputElement: MockElement,
		/**
		 * Returns a trivial computed-style object for tests.
		 *
		 * @return {{getPropertyValue: (key: string) => string}} Mock computed style object.
		 */
		getComputedStyle() {
			return {
				/**
				 * Returns an empty CSS property value.
				 *
				 * @param _key CSS property key.
				 * @return {string} Always an empty string.
				 */
				getPropertyValue(_key: string) {
					return "";
				},
			};
		},
		requestAnimationFrame,
		cancelAnimationFrame,
		performance: performanceMock,
		/**
		 * Adds a global window listener.
		 *
		 * @param {string} type Event type.
		 * @param {Listener} listener Event handler.
		 * @return {void}
		 */
		addEventListener(type: string, listener: Listener) {
			if (!windowListeners.has(type)) {
				windowListeners.set(type, new Set());
			}
			windowListeners.get(type)?.add(listener);
		},
		/**
		 * Removes a global window listener.
		 *
		 * @param {string} type Event type.
		 * @param {Listener} listener Event handler.
		 * @return {void}
		 */
		removeEventListener(type: string, listener: Listener) {
			windowListeners.get(type)?.delete(listener);
		},
		/**
		 * Dispatches a window event.
		 *
		 * @param {Event} event Event object.
		 * @return {boolean} Always `true`.
		 */
		dispatchEvent(event: Event) {
			for (const listener of windowListeners.get(event.type) ?? []) {
				listener(event);
			}
			return true;
		},
	};
	const previousGlobals = new Map<string, unknown>();
	for (
		const [name, value] of Object.entries({
			window,
			document,
			location: currentUrl,
			history,
			navigator: window.navigator,
			HTMLElement: MockElement,
			Element: MockElement,
			Node: MockElement,
			Event,
			CustomEvent,
			MutationObserver: MockMutationObserver,
			HTMLCanvasElement: MockElement,
			HTMLInputElement: MockElement,
			getComputedStyle: window.getComputedStyle,
			requestAnimationFrame,
			cancelAnimationFrame,
			performance: performanceMock,
			addEventListener: window.addEventListener.bind(window),
			removeEventListener: window.removeEventListener.bind(window),
			dispatchEvent: window.dispatchEvent.bind(window),
		})
	) {
		previousGlobals.set(
			name,
			(globalThis as Record<string, unknown>)[name],
		);
		Object.defineProperty(globalThis, name, {
			value,
			configurable: true,
			writable: true,
		});
	}
	document.body.innerHTML = "";
	return {
		window,
		/**
		 * Restores global state to what it was before the helper was installed.
		 *
		 * @return {void}
		 */
		cleanup() {
			for (const [name, value] of previousGlobals.entries()) {
				Object.defineProperty(globalThis, name, {
					value,
					configurable: true,
					writable: true,
				});
			}
		},
	};
}
