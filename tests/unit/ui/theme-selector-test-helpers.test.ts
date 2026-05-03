/// <reference lib="dom" />

export type ThemeSelectorElement = HTMLElement & {
	connectedCallback?: () => void;
	disconnectedCallback?: () => void;
	getCurrentTheme?: () => string;
	handleClick: (event: { target: Element | null }) => void;
	observer?: {
		callback?: MutationCallback;
	};
	ownerDocument: Document | null;
	syncVisibleButton?: () => void;
	tagName: string;
};

/**
 * Creates a small localStorage mock for theme-selector component tests.
 *
 * @return {Storage} Storage-compatible mock.
 */
export function createLocalStorageMock() {
	const values = new Map<string, string>();
	return {
		clear() {
			values.clear();
		},
		getItem(key: string) {
			return values.get(key) ?? null;
		},
		key(index: number) {
			return [...values.keys()][index] ?? null;
		},
		get length() {
			return values.size;
		},
		removeItem(key: string) {
			values.delete(key);
		},
		setItem(key: string, value: string) {
			values.set(key, value);
		},
	} satisfies Storage;
}

/**
 * Installs a minimal custom-elements registry and binds `document.createElement`
 * so custom elements can be instantiated in local tests.
 *
 * @param {Document} document Active mock document.
 * @return {CustomElementRegistry} Registry used by the imported component.
 */
export function installCustomElementsRegistry(document: Document) {
	const constructors = new Map<string, CustomElementConstructor>();
	const registry = {
		define(name: string, constructor: CustomElementConstructor) {
			constructors.set(name, constructor);
		},
		get(name: string) {
			return constructors.get(name);
		},
		getName(constructor: CustomElementConstructor) {
			for (
				const [name, registeredConstructor] of constructors.entries()
			) {
				if (registeredConstructor === constructor) {
					return name;
				}
			}
			return null;
		},
		upgrade(_root: Node) {},
		whenDefined(name: string) {
			const constructor = constructors.get(name);
			return Promise.resolve(
				constructor ?? class extends HTMLElement {},
			);
		},
	} satisfies CustomElementRegistry;
	const originalCreateElement = document.createElement.bind(document);
	document.createElement = (tagName: string) => {
		const constructor = constructors.get(tagName);
		if (constructor == null) {
			return originalCreateElement(tagName);
		}
		const element = new constructor() as ThemeSelectorElement;
		element.tagName = tagName.toUpperCase();
		element.ownerDocument = document;
		return element;
	};
	Object.defineProperty(globalThis, "customElements", {
		value: registry,
		configurable: true,
		writable: true,
	});
	return registry;
}

/**
 * Seeds a theme-selector host with concrete button nodes because the local DOM
 * mock does not parse component `innerHTML`.
 *
 * @param {ThemeSelectorElement} component Theme selector element under test.
 * @return {void}
 */
export function appendThemeButtons(component: ThemeSelectorElement) {
	component.innerHTML = "";
	const lightButton = document.createElement("button");
	lightButton.classList.add("visibility-transition", "hidden", "invisible");
	lightButton.setAttribute("data-theme-target", "light");
	const darkButton = document.createElement("button");
	darkButton.classList.add("visibility-transition");
	darkButton.setAttribute("data-theme-target", "dark");
	component.append(lightButton, darkButton);
}
