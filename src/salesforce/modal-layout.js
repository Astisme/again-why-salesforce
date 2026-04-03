"use strict";
import { HIDDEN_CLASS } from "../core/constants.js";

const MODAL_BODY_SELECTOR =
	".modal-body.scrollable.slds-modal__content.slds-p-around_medium";
const SORTABLE_TABLE_SELECTOR = "#sortable-table";
const FIRST_ROW_SELECTOR = "tr:nth-child(1)";

/**
 * Enables or disables scrolling for the modal body based on how much room is left in the modal.
 *
 * @param {ArticleHTMLElement} [article=null] - the article inside the modal body.
 * @throws Error when article == null
 */
export function updateModalBodyOverflow(article = null) {
	if (article == null) {
		throw new Error("error_required_params");
	}
	const modalBody = article.closest(MODAL_BODY_SELECTOR);
	// takes into consideration the empty tr at the bottom
	const table = article.querySelector(SORTABLE_TABLE_SELECTOR);
	modalBody.style.overflowY = HIDDEN_CLASS;
	let otherElementsInArticleHeight = 0;
	for (const el of article.childNodes) {
		if (el !== table.parentNode) {
			otherElementsInArticleHeight += el.clientHeight;
		}
	}
	const tr = table.querySelector(FIRST_ROW_SELECTOR);
	const hasOverflow = modalBody.clientHeight -
			table.clientHeight -
			otherElementsInArticleHeight <=
		tr.clientHeight / 2;
	modalBody.style.overflowY = hasOverflow ? "auto" : HIDDEN_CLASS;
	if (!hasOverflow) {
		// automatically scrool to top of modal
		article.scrollIntoView({
			behavior: "smooth",
			block: "center",
		});
	}
}
