import { assertEquals, assertThrows } from "@std/testing/asserts";
import { createModalLayoutModule } from "../../../src/salesforce/runtime/modal-layout-runtime.js";

type ModalLayoutModule = {
	updateModalBodyOverflow: (article?: LayoutElement | null) => void;
};

/**
 * Lightweight element mock used by modal-layout unit tests.
 */
class LayoutElement {
	childNodes: LayoutElement[] = [];
	clientHeight = 0;
	parentNode: LayoutElement | null = null;
	scrollCalls: Array<{ behavior: string; block: string }> = [];
	style: { overflowY?: string } = {};
	#closestMap = new Map<string, LayoutElement>();
	#queryResults = new Map<string, LayoutElement>();

	/**
	 * Registers a selector result for closest queries.
	 *
	 * @param {string} selector Selector used by closest.
	 * @param {LayoutElement} element Element to return.
	 * @return {void}
	 */
	setClosest(selector: string, element: LayoutElement) {
		this.#closestMap.set(selector, element);
	}

	/**
	 * Registers a selector result for querySelector queries.
	 *
	 * @param {string} selector Selector used by querySelector.
	 * @param {LayoutElement} element Element to return.
	 * @return {void}
	 */
	setQueryResult(selector: string, element: LayoutElement) {
		this.#queryResults.set(selector, element);
	}

	/**
	 * Returns the previously-registered closest result.
	 *
	 * @param {string} selector Selector used by closest.
	 * @return {LayoutElement | null} Matching element.
	 */
	closest(selector: string) {
		return this.#closestMap.get(selector) ?? null;
	}

	/**
	 * Returns the previously-registered querySelector result.
	 *
	 * @param {string} selector Selector used by querySelector.
	 * @return {LayoutElement | null} Matching element.
	 */
	querySelector(selector: string) {
		return this.#queryResults.get(selector) ?? null;
	}

	/**
	 * Tracks scroll requests.
	 *
	 * @param {{ behavior: string; block: string }} options Scroll options.
	 * @return {void}
	 */
	scrollIntoView(options: { behavior: string; block: string }) {
		this.scrollCalls.push(options);
	}
}

const fixture = {
	module: createModalLayoutModule({
		hiddenClass: "hidden",
	}) as ModalLayoutModule,
};

Deno.test("modal-layout validates required article parameter", () => {
	assertThrows(
		() => fixture.module.updateModalBodyOverflow(),
		Error,
		"error_required_params",
	);
});

Deno.test("modal-layout toggles overflow and scrolls when content fits", () => {
	const article = new LayoutElement();
	const modalBody = new LayoutElement();
	const wrapper = new LayoutElement();
	const table = new LayoutElement();
	const firstRow = new LayoutElement();
	const other0 = new LayoutElement();
	const other1 = new LayoutElement();

	modalBody.clientHeight = 200;
	table.clientHeight = 120;
	table.parentNode = wrapper;
	firstRow.clientHeight = 20;
	other0.clientHeight = 40;
	other1.clientHeight = 30;
	article.childNodes = [other0, wrapper, other1];
	article.setClosest(
		".modal-body.scrollable.slds-modal__content.slds-p-around_medium",
		modalBody,
	);
	article.setQueryResult("#sortable-table", table);
	table.setQueryResult("tr:nth-child(1)", firstRow);

	fixture.module.updateModalBodyOverflow(article);
	assertEquals(modalBody.style.overflowY, "auto");
	assertEquals(article.scrollCalls.length, 0);

	table.clientHeight = 80;
	fixture.module.updateModalBodyOverflow(article);
	assertEquals(modalBody.style.overflowY, "hidden");
	assertEquals(article.scrollCalls.length, 1);
	assertEquals(article.scrollCalls[0], {
		behavior: "smooth",
		block: "center",
	});
});
