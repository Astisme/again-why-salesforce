import { assertEquals } from "@std/testing/asserts";
import { loadIsolatedModule } from "../../load-isolated-module.test.ts";

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
	style: Record<string, string> = { overflowX: "" };
	attributes = new Map<string, string>();
	#children: SfElement[] = [];
	#wheelListeners: WheelListener[] = [];

	/**
	 * Appends a child element.
	 *
	 * @param {SfElement} child Child element.
	 * @return {void}
	 */
	appendChild(child: SfElement) {
		child.parentElement = this;
		this.#children.push(child);
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

/**
 * Loads sf-elements.js with a custom document.
 *
 * @param {Object} [options={}] Fixture options.
 * @param {SfElement | null} [options.modalHanger=null] Modal hanger.
 * @param {SfElement | null} [options.parent=null] Parent of the setup list.
 * @return {Promise<{ module: SfElementsModule; created: SfElement[]; parent: SfElement | null; setModal: (element: SfElement | null) => void; setParent: (element: SfElement | null) => void; }>} Loaded fixture.
 */
async function loadSfElementsFixture(
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

	const { module } = await loadIsolatedModule<
		SfElementsModule,
		Record<string, unknown>
	>({
		modulePath: new URL(
			"../../../src/salesforce/sf-elements.js",
			import.meta.url,
		),
		dependencies: {
			EXTENSION_NAME: "again-why-salesforce",
		},
		globals: {
			document: {
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
			location: {
				href:
					"https://acme.lightning.force.com/lightning/setup/Users/home",
			},
		},
	});

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
