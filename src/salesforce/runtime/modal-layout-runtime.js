const MODAL_BODY_SELECTOR =
	".modal-body.scrollable.slds-modal__content.slds-p-around_medium";
const SORTABLE_TABLE_SELECTOR = "#sortable-table";
const FIRST_ROW_SELECTOR = "tr:nth-child(1)";

/**
 * Creates a modal-layout helper with injected constants.
 *
 * @param {Object} options Runtime dependencies.
 * @param {string} options.hiddenClass CSS class used to hide overflow.
 * @return {{
 *   updateModalBodyOverflow: (article?: {
 *     childNodes: Array<{ clientHeight: number }>;
 *     closest: (selector: string) => {
 *       clientHeight: number;
 *       style: { overflowY?: string };
 *     };
 *     querySelector: (selector: string) => {
 *       clientHeight: number;
 *       parentNode: unknown;
 *       querySelector: (selector: string) => { clientHeight: number };
 *     };
 *     scrollIntoView: (options: { behavior: string; block: string }) => void;
 *   } | null) => void;
 * }} Modal-layout API.
 */
export function createModalLayoutModule({
	hiddenClass,
}) {
	const hiddenClassRuntime = hiddenClass;

	/**
	 * Enables or disables scrolling for the modal body based on how much room is left.
	 *
	 * @param {Object | null} [article=null] The article inside the modal body.
	 * @throws {Error} Throws when `article` is not provided.
	 */
	function updateModalBodyOverflow(article = null) {
		if (article == null) {
			throw new Error("error_required_params");
		}
		const modalBody = article.closest(MODAL_BODY_SELECTOR);
		const table = article.querySelector(SORTABLE_TABLE_SELECTOR);
		modalBody.style.overflowY = hiddenClassRuntime;
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
		modalBody.style.overflowY = hasOverflow ? "auto" : hiddenClassRuntime;
		if (!hasOverflow) {
			article.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}

	return {
		updateModalBodyOverflow,
	};
}
