import { assertEquals } from "@std/testing/asserts";
import { installMockDom } from "../../happydom.test.ts";
import {
	createSfElementsModule,
} from "../../../src/salesforce/sf-elements-module.js";
import "../../mocks.test.ts";

type WheelListener = (
	event: { deltaY: number; preventDefault: () => void },
) => void;

/**
 * Minimal classList for sf-elements tests.
 */
class ClassList {
	#tokens = new Set<string>();

	/**
	 * Adds class names.
	 *
	 * @param {...string} tokens Class names.
	 * @return {void}
	 */
	add(...tokens: string[]) {
		for (const token of tokens) {
			this.#tokens.add(token);
		}
	}

	/**
	 * Returns whether the class name exists.
	 *
	 * @param {string} token Class name.
	 * @return {boolean} Presence flag.
	 */
	contains(token: string) {
		return this.#tokens.has(token);
	}
}

/**
 * Minimal element for sf-elements tests.
 */
class SfElement {
	classList = new ClassList();
	dataset: Record<string, string> = {};
	id = "";
	parentElement: SfElement | null = null;
	scrollLeft = 0;
	style: { overflowX: string; [key: string]: string } = { overflowX: "" };
	attributes = new Map<string, string>();
	#children: SfElement[] = [];
	#wheelListeners: WheelListener[] = [];

	/**
	 * Appends a child element.
	 *
	 * @param {unknown} child Child element.
	 * @return {void}
	 */
	appendChild(child: unknown) {
		const sfChild = child as SfElement;
		sfChild.parentElement = this;
		this.#children.push(sfChild);
	}

	/**
	 * Returns the first child matching the extension id selector.
	 *
	 * @param {string} selector Query selector.
	 * @return {SfElement | null} Matching child.
	 */
	querySelector(selector: string) {
		if (selector.startsWith("#")) {
			const id = selector.slice(1);
			return this.#children.find((child) => child.id === id) ?? null;
		}
		return null;
	}

	/**
	 * Adds an event listener.
	 *
	 * @param {string} type Event type.
	 * @param {WheelListener} listener Listener.
	 * @return {void}
	 */
	addEventListener(type: string, listener: WheelListener) {
		if (type === "wheel") {
			this.#wheelListeners.push(listener);
		}
	}

	/**
	 * Dispatches wheel events.
	 *
	 * @param {number} deltaY Wheel delta.
	 * @return {number} Number of `preventDefault` calls.
	 */
	dispatchWheel(deltaY: number) {
		let prevented = 0;
		for (const listener of this.#wheelListeners) {
			listener({
				deltaY,
				preventDefault: () => {
					prevented++;
				},
			});
		}
		return prevented;
	}

	/**
	 * Sets an attribute.
	 *
	 * @param {string} name Attribute name.
	 * @param {string} value Attribute value.
	 * @return {void}
	 */
	setAttribute(name: string, value: string) {
		this.attributes.set(name, value);
	}

	/**
	 * Gets an attribute value.
	 *
	 * @param {string} name Attribute name.
	 * @return {string | null} Attribute value.
	 */
	getAttribute(name: string) {
		return this.attributes.get(name) ?? null;
	}
}

type SfElementsModule = {
	findSetupTabUlInSalesforcePage: () => boolean;
	getCurrentHref: () => string;
	getModalHanger: () => SfElement | null;
	getSetupTabUl: () => SfElement | undefined;
	setSetupTabUl: (newSetupTabUl: SfElement) => void;
};
type SfElementsRuntimeModule = {
	findSetupTabUlInSalesforcePage: () => boolean;
	getCurrentHref: () => string;
	getModalHanger: () => HTMLElement | null;
	getSetupTabUl: () => HTMLElement | undefined;
	setSetupTabUl: (newSetupTabUl: HTMLElement) => void;
};

/**
 * Loads sf-elements.js with a custom document.
 *
 * @param {Object} [options={}] Fixture options.
 * @param {SfElement | null} [options.modalHanger=null] Modal hanger.
 * @param {SfElement | null} [options.parent=null] Parent of the setup list.
 * @return {{ module: SfElementsModule; created: SfElement[]; parent: SfElement | null; setModal: (element: SfElement | null) => void; setParent: (element: SfElement | null) => void; }} Loaded fixture.
 */
function loadSfElementsFixture(
	{ modalHanger = null, parent = null }: {
		modalHanger?: SfElement | null;
		parent?: SfElement | null;
	} = {},
) {
	let currentModal = modalHanger;
	let currentParent = parent;
	const created: SfElement[] = [];

	const pinnedUl = new SfElement();
	pinnedUl.classList.add("pinnedItems", "slds-grid");

	const module = createSfElementsModule({
		documentRef: {
			createElement: () => {
				const element = new SfElement();
				created.push(element);
				return element;
			},
			getElementsByClassName: () => [pinnedUl],
			querySelector: (selector: string) => {
				if (selector === "ul.pinnedItems.slds-grid") {
					if (currentParent == null) {
						return null;
					}
					pinnedUl.parentElement = currentParent;
					return pinnedUl;
				}
				if (selector === "div.DESKTOP.uiContainerManager") {
					return currentModal;
				}
				return null;
			},
		},
		extensionName: "again-why-salesforce",
		locationRef: {
			href: "https://acme.lightning.force.com/lightning/setup/Users/home",
		},
	}) as SfElementsModule;

	return {
		created,
		module,
		parent: currentParent,
		setModal: (element: SfElement | null) => {
			currentModal = element;
		},
		setParent: (element: SfElement | null) => {
			currentParent = element;
		},
	};
}

Deno.test("sf-elements can set/read setup ul and returns false when setup page structure is missing", async () => {
	const fixture = await loadSfElementsFixture();
	const standalone = new SfElement();

	fixture.module.setSetupTabUl(standalone);
	assertEquals(fixture.module.getSetupTabUl(), standalone);
	assertEquals(
		fixture.module.getCurrentHref().includes("/lightning/setup/"),
		true,
	);

	fixture.setParent(null);
	assertEquals(fixture.module.findSetupTabUlInSalesforcePage(), false);
});

Deno.test("sf-elements finds existing setup ul, applies listeners, and reuses cached modal hanger", async () => {
	const parent = new SfElement();
	const existing = new SfElement();
	existing.id = "again-why-salesforce";
	parent.appendChild(existing);
	const modalA = new SfElement();
	const modalB = new SfElement();
	const fixture = await loadSfElementsFixture({
		modalHanger: modalA,
		parent,
	});

	assertEquals(fixture.module.findSetupTabUlInSalesforcePage(), true);
	assertEquals(fixture.module.getSetupTabUl(), existing);
	assertEquals(String(existing.dataset.wheelListenerApplied), "true");

	const prevented = existing.dispatchWheel(8);
	assertEquals(prevented, 1);
	assertEquals(existing.scrollLeft, 8);

	assertEquals(fixture.module.getModalHanger(), modalA);
	fixture.setModal(modalB);
	assertEquals(fixture.module.getModalHanger(), modalA);
});

Deno.test("sf-elements creates a setup ul when missing and applies setup classes", async () => {
	const parent = new SfElement();
	const fixture = await loadSfElementsFixture({ parent });

	assertEquals(fixture.module.findSetupTabUlInSalesforcePage(), true);
	assertEquals(fixture.created.length > 0, true);
	assertEquals(fixture.module.getSetupTabUl()?.id, "again-why-salesforce");
	assertEquals(
		fixture.module.getSetupTabUl()?.classList.contains("tabBarItems"),
		true,
	);
	assertEquals(
		fixture.module.getSetupTabUl()?.classList.contains("slds-grid"),
		true,
	);
});

/**
 * Waits one macrotask so async listeners can settle.
 *
 * @return {Promise<void>} A promise resolved on the next macrotask.
 */
function flushAsyncTasks() {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * Adds a `getElementsByClassName` fallback to the mock document.
 *
 * @return {() => void} Cleanup callback restoring previous behavior.
 */
function installGetElementsByClassNamePolyfill() {
	const originalGetElementsByClassName = document.getElementsByClassName;
	Object.defineProperty(document, "getElementsByClassName", {
		configurable: true,
		value: (className: string) => {
			const selector = className
				.split(/\s+/)
				.filter((token) => token !== "")
				.map((token) => `.${token}`)
				.join("");
			return [...document.querySelectorAll(selector)];
		},
		writable: true,
	});
	return () => {
		Object.defineProperty(document, "getElementsByClassName", {
			configurable: true,
			value: originalGetElementsByClassName,
			writable: true,
		});
	};
}

Deno.test("sf-elements canonical import covers setup discovery, wheel behavior, and modal caching", async () => {
	const dom = installMockDom(
		"https://acme.lightning.force.com/lightning/setup/Users/home",
	);
	const restoreGetElementsByClassName =
		installGetElementsByClassNamePolyfill();
	const originalCreateElement = document.createElement.bind(document);
	try {
		document.createElement = ((tagName: string) => {
			const element = originalCreateElement(tagName);
			if (
				"style" in element &&
				element.style.overflowX == null
			) {
				element.style.overflowX = "";
			}
			return element;
		}) as Document["createElement"];
		const sfElements = await import(
			"../../../src/salesforce/sf-elements.js"
		) as SfElementsRuntimeModule;
		const {
			findSetupTabUlInSalesforcePage,
			getCurrentHref,
			getModalHanger,
			getSetupTabUl,
			setSetupTabUl,
		} = sfElements;
		const standalone = document.createElement("ul");
		setSetupTabUl(standalone);
		assertEquals(getSetupTabUl(), standalone);
		assertEquals(getCurrentHref().includes("/lightning/setup/"), true);

		assertEquals(findSetupTabUlInSalesforcePage(), false);

		const tabParent = document.createElement("div");
		const pinnedUl = document.createElement("ul");
		pinnedUl.className = "pinnedItems slds-grid";
		tabParent.appendChild(pinnedUl);
		document.body.appendChild(tabParent);

		assertEquals(findSetupTabUlInSalesforcePage(), true);
		const extensionUl = getSetupTabUl();
		assertEquals(extensionUl?.id, "again-why-salesforce");
		assertEquals(extensionUl?.classList.contains("tabBarItems"), true);
		assertEquals(String(extensionUl?.dataset.wheelListenerApplied), "true");

		if (extensionUl != null) {
			extensionUl.scrollLeft = 0;
			const wheelEvent = new Event("wheel", {
				bubbles: true,
				cancelable: true,
			}) as Event & { deltaY: number };
			Object.defineProperty(wheelEvent, "deltaY", {
				value: 11,
			});
			extensionUl.dispatchEvent(wheelEvent);
			await flushAsyncTasks();
			assertEquals(extensionUl.scrollLeft, 11);
		}

		const modalA = document.createElement("div");
		modalA.className = "DESKTOP uiContainerManager";
		document.body.appendChild(modalA);
		assertEquals(getModalHanger(), modalA);

		modalA.remove();
		const modalB = document.createElement("div");
		modalB.className = "DESKTOP uiContainerManager";
		document.body.appendChild(modalB);
		assertEquals(getModalHanger(), modalA);
	} finally {
		document.createElement = originalCreateElement;
		restoreGetElementsByClassName();
		dom.cleanup();
	}
});
