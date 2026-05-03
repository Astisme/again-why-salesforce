"use strict";
import {
	CXM_PIN_TAB as _CXM_PIN_TAB,
	CXM_REMOVE_TAB as _CXM_REMOVE_TAB,
	CXM_UNPIN_TAB as _CXM_UNPIN_TAB,
	HIDDEN_CLASS as _HIDDEN_CLASS,
	MODAL_ID as _MODAL_ID,
	PIN_TAB_CLASS as _PIN_TAB_CLASS,
	TOAST_ERROR as _TOAST_ERROR,
	TOAST_WARNING as _TOAST_WARNING,
	TUTORIAL_EVENT_CLOSE_MANAGE_TABS as _TUTORIAL_EVENT_CLOSE_MANAGE_TABS,
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL
		as _TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL,
	TUTORIAL_EVENT_REORDERED_TABS_TABLE as _TUTORIAL_EVENT_REORDERED_TABS_TABLE,
} from "../../core/constants.js";
import {
	applyGlobalOverride as _applyGlobalOverride,
	getInnerElementFieldBySelector as _getInnerElementFieldBySelector,
	injectStyle as _injectStyle,
} from "../../core/functions.js";
import _Tab from "../../core/tab.js";
import {
	ensureAllTabsAvailability as _ensureAllTabsAvailability,
	TabContainer as _TabContainer,
} from "../../core/tabContainer.js";
import { getTranslations as _getTranslations } from "../../core/translator.js";

import {
	setupDragForTable as _setupDragForTable,
	setupDragForUl as _setupDragForUl,
} from "../dragHandler.js";
import {
	createManageTabRow as _createManageTabRow,
	generateManageTabsModal as _generateManageTabsModal,
	handleLightningLinkClick as _handleLightningLinkClick,
	sldsConfirm as _sldsConfirm,
} from "../generator.js";
import {
	makeDuplicatesBold as _makeDuplicatesBold,
	reorderTabsUl as _reorderTabsUl,
	sf_afterSet as _sf_afterSet,
} from "../runtime/content-runtime.js";
import { showToast as _showToast } from "../toast.js";
import {
	getCurrentHref as _getCurrentHref,
	getModalHanger as _getModalHanger,
} from "../sf-elements.js";
import { updateModalBodyOverflow as _updateModalBodyOverflow } from "../modal-layout.js";

let CXM_PIN_TAB = _CXM_PIN_TAB;
let CXM_REMOVE_TAB = _CXM_REMOVE_TAB;
let CXM_UNPIN_TAB = _CXM_UNPIN_TAB;
let HIDDEN_CLASS = _HIDDEN_CLASS;
let PIN_TAB_CLASS = _PIN_TAB_CLASS;
let TOAST_ERROR = _TOAST_ERROR;
let TOAST_WARNING = _TOAST_WARNING;
let TUTORIAL_EVENT_CLOSE_MANAGE_TABS = _TUTORIAL_EVENT_CLOSE_MANAGE_TABS;
let TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL =
	_TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL;
let TUTORIAL_EVENT_REORDERED_TABS_TABLE = _TUTORIAL_EVENT_REORDERED_TABS_TABLE;
const applyGlobalOverride = _applyGlobalOverride;
let getInnerElementFieldBySelector = _getInnerElementFieldBySelector;
let injectStyle = _injectStyle;
let Tab = _Tab;
let ensureAllTabsAvailability = _ensureAllTabsAvailability;
let TabContainer = _TabContainer;
let getTranslations = _getTranslations;
let setupDragForTable = _setupDragForTable;
let setupDragForUl = _setupDragForUl;
let createManageTabRow = _createManageTabRow;
let generateManageTabsModal = _generateManageTabsModal;
let handleLightningLinkClick = _handleLightningLinkClick;
let sldsConfirm = _sldsConfirm;
let MODAL_ID = _MODAL_ID;
let makeDuplicatesBold = _makeDuplicatesBold;
let reorderTabsUl = _reorderTabsUl;
let sf_afterSet = _sf_afterSet;
let showToast = _showToast;
let getCurrentHref = _getCurrentHref;
let getModalHanger = _getModalHanger;
let updateModalBodyOverflow = _updateModalBodyOverflow;

let focusedIndex = 0;
const managedLoggers = [];
const manageTabsButtons = {};
let deleteAllButton = null;
const trsAndButtons = [];
const dropdownMenus = [];
const actionButtons = [];
let closeButton = null;
let manage_InvalidateSort = false;
let wasSomethingUpdated = false;

/**
 * Updates all the indexes on every tr after index fromIndex
 * @param {number} [fromIndex=0] the first index from where to start updating
 */
function updateIndexesOnTrsAfterIndex(fromIndex = 0) {
	// update indexes of loggers and elements
	for (let i = fromIndex; i < managedLoggers.length; i++) {
		const logger = managedLoggers[i];
		const tr = logger.label
			.closest("tr");
		const buttons = tr
			.querySelectorAll(
				"a.awsf-td-button",
			);
		for (
			const el of [
				{ element: logger.label, where: "element_index" },
				{ element: logger.url, where: "element_index" },
				{ element: logger.org, where: "element_index" },
				{ element: tr, where: "rowIndex" },
				...Array.from(buttons).map((btn) => ({
					element: btn,
					where: "tabIndex",
				})),
			]
		) {
			el.element.dataset[el.where] = i;
		}
	}
}

/**
 * Takes care of keeping the managedLoggers synced with the Tabs in the TabContainer instance
 * @param {number} fromIndex - the index where the logger is currently located
 * @param {number} toIndex - the index where the logger has to be moved to
 * @throws Error when either fromIndex or toIndex are missing
 */
function updateLoggerIndex(fromIndex, toIndex) {
	if (fromIndex == null || toIndex == null) {
		throw new Error("error_required_params");
	}
	if (fromIndex === toIndex) {
		return;
	}
	const movingLogger = managedLoggers.splice(fromIndex, 1);
	managedLoggers.splice(toIndex, 0, ...movingLogger);
}

/**
 * Moves a given Tr the currentlyPinnedNo index
 * @param {Object} [param0={}] an object with the following keys
 * @param {TbodyHTMLElement} [param0.tabAppendElement=null] - the tbody where the trs are appended to
 * @param {TrHTMLElement} [param0.trToMove=null] - the tr that needs to be moved to the currentlyPinnedNo index
 * @param {number} [param0.currentIndex=null] - the index where the tr is currently located
 * @param {number} [param0.currentlyPinnedNo=null] - the index where the tr has to be moved to
 * @param {boolean} [param0.isPinning=true] - whether the user is pinning or unpinning
 * @throws Error when currentIndex or currentlyPinnedNo are null
 * @throws Error (after preliminary check) when tabAppendElement or trToMove are null
 */
function moveTrToGivenIndex({
	tabAppendElement = null,
	trToMove = null,
	currentIndex = null,
	currentlyPinnedNo = null,
	isPinning = true,
} = {}) {
	if (
		currentIndex == null ||
		currentlyPinnedNo == null
	) {
		throw new Error("error_required_params");
	}
	if (
		(currentIndex <= currentlyPinnedNo && isPinning) ||
		(currentIndex >= currentlyPinnedNo - 1 && !isPinning)
	) {
		return; // the tr does not need to be moved.
	}
	if (
		tabAppendElement == null ||
		trToMove == null
	) {
		throw new Error("error_required_params");
	}
	const targetTr = tabAppendElement.querySelector(
		`tr:nth-child(${currentlyPinnedNo + 1})`,
	); // nth-child starts from 1
	targetTr.before(trToMove);
	const minIndex = Math.max(
		isPinning ? currentlyPinnedNo : currentlyPinnedNo - 1,
		0,
	);
	updateLoggerIndex(currentIndex, minIndex);
	updateIndexesOnTrsAfterIndex(Math.min(
		currentlyPinnedNo,
		currentIndex,
	));
}

/**
 * Check if the user has performed some updates and if true, ask for confirmation to open the link while losing the changes
 * @param {event} e - the event which had this function called
 */
async function checkOpenAskConfirm(e) {
	const [body, confirmLabel, cancelLabel, closeLabel] = await getTranslations(
		[
			"unsaved_changes_confirm",
			"confirm",
			"cancel",
			"cancel_close",
		],
	);
	if (
		!wasSomethingUpdated ||
		await sldsConfirm({
			body,
			confirmLabel,
			cancelLabel,
			closeLabel,
		})
	) {
		handleLightningLinkClick(e);
		closeButton.click();
	}
}

/**
 * Retrieves the last tr of the given tbody
 * @param {TbodyHTMLElement} [tbody=null] - the tbody from which to find the last tr
 * @return {TrHTMLElement|undefined} - the last tr of the given tbody or undefined if the tbody is null or the last child is not found
 */
function getLastTr(tbody = null) {
	return tbody?.querySelector("tr:last-child");
}

/**
 * Handles action button clicks (actions are the ones on the right of each row)
 * @param {event} e - the event which had this function called
 * @param {Object} [param1={}] an object with the following keys
 * @param {TabContainer} param1.allTabs - the TabContainer instance
 * @return {Promise} fulfilled when checkOpenAskConfirm is completed
 * @async
 */
export function handleActionButtonClick(e, {
	allTabs,
} = {}) {
	e.preventDefault();
	e.stopPropagation();
	const btn = e.currentTarget;
	const action = btn.dataset.action;
	if (action === "open") {
		return checkOpenAskConfirm(e);
	}
	const tabIndex = Number.parseInt(btn.dataset.tabIndex);
	const row = btn.closest("tr");
	const tbody = row.closest("tbody");
	// Close the dropdown menu
	const dropdownMenu = row.querySelector(".actions-dropdown-menu");
	if (dropdownMenu) {
		dropdownMenu.classList.add(HIDDEN_CLASS);
	}
	// Handle toggle buttons (pin/unpin)
	const pinBtn = row.querySelector(".pin-btn");
	const unpinBtn = row.querySelector(".unpin-btn");
	const dragCell = row.querySelector("td.slds-cell-wrap");
	switch (action) {
		case CXM_PIN_TAB: {
			moveTrToGivenIndex({
				tabAppendElement: tbody,
				trToMove: row,
				currentIndex: tabIndex,
				currentlyPinnedNo: allTabs[TabContainer.keyPinnedTabsNo],
				isPinning: true,
			});
			allTabs[TabContainer.keyPinnedTabsNo]++;
			// show other button
			pinBtn.style.display = "none";
			unpinBtn.style.display = "inline-block";
			// add pin class
			dragCell.classList.add(PIN_TAB_CLASS);
			break;
		}
		case CXM_UNPIN_TAB: {
			moveTrToGivenIndex({
				tabAppendElement: tbody,
				trToMove: row,
				currentIndex: tabIndex,
				currentlyPinnedNo: allTabs[TabContainer.keyPinnedTabsNo],
				isPinning: false,
			});
			allTabs[TabContainer.keyPinnedTabsNo]--;
			// show other button
			pinBtn.style.display = "inline-block";
			unpinBtn.style.display = "none";
			// remove pin class
			dragCell.classList.remove(PIN_TAB_CLASS);
			break;
		}
		case CXM_REMOVE_TAB: {
			// Remove the row from the table if it is NOT the last one
			if (
				getLastTr(tbody)?.dataset.rowIndex !==
					tabIndex
			) {
				row.remove();
			}
			// if there is only the empty tr, disable deleteAllButton
			if (tbody?.querySelectorAll("tr").length <= 1) {
				deleteAllButton.setAttribute("disabled", true);
			} else {
				deleteAllButton.removeAttribute("disabled");
			}
			break;
		}
		default:
			break;
	}
}

/**
 * Enables or disables the elements of the last td available in the popup.
 *
 * @param {Object} [param0={}] an object with the following keys
 * @param {TbodyHTMLElement} [param0.tabAppendElement=null] - the tbody from where to find the last tr
 * @param {boolean} [param0.enable=true] - if enabling or disabling the elements in the last td
 * @param {TrHTMLElement} [param0.tr=null] - the tr to which the function has to work. default to the last element on the tabAppendElement
 * @throws Error when tabAppendElement == null && tr == null because we cannot find any tr to work on
 */
function updateTabAttributes({
	tabAppendElement = null,
	enable = true,
	tr = null,
} = {}) {
	if (tabAppendElement == null && tr == null) {
		throw new Error("error_required_params");
	}
	tr = tr ?? getLastTr(tabAppendElement);
	const dropdownButton = tr.querySelector(
		"td button[data-name=dropdownButton]",
	);
	const actionsButtons = dropdownButton?.parentNode?.querySelectorAll("a");
	const buttons = [dropdownButton, ...actionsButtons];
	if (enable) {
		for (const btn of buttons) {
			btn.removeAttribute("disabled");
		}
		tr.setAttribute("draggable", "true");
	} else {
		for (const btn of buttons) {
			btn.setAttribute("disabled", "true");
		}
		tr.removeAttribute("draggable");
	}
	tr.dataset.draggable = enable;
	tr.querySelector("td:has(> svg)").dataset.draggable = enable;
}

/**
 * Checks if both the label and URL fields are empty, and if so, calls the `removeTr` function.
 * @param {Event} e - the event which is connected to this function
 * @return {Promise<void>} undefined
 * @async
 */
function checkRemoveTr(e) {
	const parentTr = e.target.closest("tr");
	const label = parentTr.querySelector(".label").value;
	const url = parentTr.querySelector(".url").value;
	const tabAppendElement = parentTr.closest("tbody");
	if (label === "" && url === "") {
		return removeTr(tabAppendElement, parentTr, focusedIndex);
	}
}
/**
 * Sets up event listeners for the provided element to handle drag and focus events.
 * - Listens for input events to trigger the specified listener.
 * - Tracks focusin to set the `focusedIndex` based on the element's data attribute.
 * - Sets a custom data attribute (`data-element_index`) to the current length of the `loggers` array.
 * - Adds a focusout event listener to call `checkRemoveTr` when the element loses focus.
 *
 * @param {HTMLElement} element - The DOM input element to attach event listeners to.
 * @param {Function} listener - The function to be called on "input" events for the element.
 * @param {number} index - the index where the element is currently placed at
 */
function setInfoForDrag(element, listener, index) {
	element.dataset.element_index = index;
	element.addEventListener("input", listener);
	element.addEventListener(
		"focusin",
		(e) =>
			focusedIndex = Number.parseInt(
				e.currentTarget.dataset.element_index,
			),
	);
	element.addEventListener("focusout", checkRemoveTr);
}

/**
 * Only for TDs; hides all non-hidden dropdowns except the one that's being clicked
 * @param {event} e - the click event
 * @param {HTMLButtonElement} button - the button which is the one being clicked
 * @return {void} - nothing
 */
function closeDropdownOnTrClick(e, button) {
	if (
		e.target === button ||
		!["TD", "INPUT"].includes(e.target.tagName)
	) {
		return;
	}
	for (
		const menu of dropdownMenus.filter((m) =>
			!m.className.includes(HIDDEN_CLASS)
		)
	) {
		menu.classList.add(HIDDEN_CLASS);
	}
}

/**
 * Only for BUTTONs; hides all non-hidden dropdowns except the one that's being clicked
 * @param {event} e - the click event
 * @param {HTMLButtonElement} button - the button which is the one being clicked
 * @return {void} - nothing
 */
function closeDropdownOnBtnClick(e, button) {
	e.preventDefault();
	if (e.target.tagName !== "BUTTON") {
		return;
	}
	for (
		const menu of dropdownMenus.filter((m) =>
			!m.className.includes(HIDDEN_CLASS)
		)
	) {
		const dropBtn = menu.parentNode?.querySelector(
			"[data-name=dropdownButton]",
		);
		if (button !== dropBtn) {
			menu.classList.add(HIDDEN_CLASS);
		}
	}
}

/**
 * Adds a new empty tab at the bottom of the popup and enables the previously last child's delete button.
 * @param {TbodyHTMLElement} [tabAppendElement=null] - the tbody where to add the new tr
 * @throws Error when tabAppendElement == null
 */
async function addTr(tabAppendElement = null) {
	if (tabAppendElement == null) {
		throw new Error("error_required_params");
	}
	// if list is empty, there's nothing to enable
	if (tabAppendElement.childElementCount >= 1) {
		updateTabAttributes({ tabAppendElement });
	}
	deleteAllButton.removeAttribute("disabled");
	// add a new empty element
	const {
		tr,
		dropdownMenu,
		dropdownButton,
		logger,
	} = await createManageTabRow({}, {
		index: tabAppendElement.childElementCount,
	});
	tabAppendElement.append(tr);
	updateModalBodyOverflow(tabAppendElement.closest("article"));
	// update loggers
	const index = managedLoggers.length;
	managedLoggers.push(logger);
	for (
		const el of [
			{ element: logger.label, type: "label", index },
			{ element: logger.url, type: "url", index },
			{ element: logger.org, type: "org", index },
		]
	) {
		setInfoForDrag(el.element, () =>
			trInputListener({
				tabAppendElement,
				type: el.type,
			}), el.index);
	}
	// update trsAndButtons + dropdownMenus + actionButtons
	const previousTr = trsAndButtons.at(-1);
	const actLen = actionButtons.length;
	const newActionButtons = tr.querySelectorAll("[data-action]");
	const previousActionBtns = actionButtons.slice(
		actLen - newActionButtons.length,
		actLen,
	);
	trsAndButtons.push({ tr, button: dropdownButton });
	dropdownMenus.push(dropdownMenu);
	actionButtons.push(
		...newActionButtons,
	);
	// add event listeners on previous tr
	previousTr.tr.addEventListener(
		"click",
		(e) => closeDropdownOnTrClick(e, previousTr.button),
	);
	previousTr.button.addEventListener(
		"click",
		(e) => closeDropdownOnBtnClick(e, previousTr.button),
	);
	for (const btn of previousActionBtns) {
		btn.addEventListener(
			"click",
			async (e) => {
				e.preventDefault();
				await handleActionButtonClick(e, {
					allTabs: await ensureAllTabsAvailability(),
				});
			},
		);
	}
}

/**
 * Removes the last empty tab at the bottom of the popup and disables the newly last child's delete button.
 * @param {TbodyHTMLElement} [tabAppendElement=null] - the tbody from which to remove the tr
 * @param {TrHTMLElement} [trToRemove=tabAppendElement?.lastChild] - the tr to be removed
 * @param {number} [removeIndex=managedLoggers.length - 1] - the index of the tr to be removed
 * @throws Error when tabAppendElement == null
 */
async function removeTr(
	tabAppendElement = null,
	trToRemove = getLastTr(tabAppendElement),
	removeIndex = managedLoggers.length - 1,
) {
	if (tabAppendElement == null) {
		throw new Error("error_required_params");
	}
	// if list is empty, there's nothing to disable
	if (tabAppendElement.childElementCount < 2) {
		return;
	}
	const indexWasProvided = removeIndex !== managedLoggers.length - 1;
	trToRemove.remove();
	managedLoggers.splice(removeIndex, 1);
	updateTabAttributes({
		tabAppendElement,
		enable: false,
	});
	updateModalBodyOverflow(tabAppendElement.closest("article"));
	if (!indexWasProvided) {
		return;
	}
	// we removed a row in the middle of the table
	// check if the row to remove is a pinned one
	// if true, decrease by one the number of pinned Tabs
	const allTabs = await ensureAllTabsAvailability();
	if (removeIndex < allTabs[TabContainer.keyPinnedTabsNo]) {
		allTabs[TabContainer.keyPinnedTabsNo]--;
	}
	updateIndexesOnTrsAfterIndex(removeIndex);
}

/**
 * Adds a style element with a selector for duplicate class (if it does not yet exist)
 * @param {TbodyHTMLElement} tabAppendElement - the tbody element where to append the style
 */
function checkAddDuplicateStyle(tabAppendElement) {
	const styleEl = injectStyle(
		"awsf-warning",
		{ css: ".duplicate { background-color: #dd7a01 !important; }" },
	);
	tabAppendElement.appendChild(styleEl);
}

/**
 * Checks if there are duplicates for a given Tab. If a duplicate exists, adds `duplicate` to the classList
 * @param {Object} [param0={}] an object with the following keys
 * @param {string} param0.url - the URL of the Tab
 * @param {string} param0.org - the Org of the Tab
 * @param {Object} [param1={}] an object with the following keys
 * @param {TbodyHTMLElement} param1.tabAppendElement - the tbody to which the trs are appended to
 */
async function checkDuplicates({
	url = null,
	org = null,
} = {}, {
	tabAppendElement,
} = {}) {
	const allTabs = await ensureAllTabsAvailability();
	if (!allTabs.exists({ url, org }, true)) {
		return;
	}
	// show warning in salesforce
	showToast("error_tab_url_saved", TOAST_WARNING);
	makeDuplicatesBold(url);
	// highlight all duplicated rows and scroll to the first one
	checkAddDuplicateStyle(tabAppendElement);
	const trs = Array.from(
		tabAppendElement.querySelectorAll("tr input.url"),
	)
		.filter((input) => input.value === url)
		.map((input) => {
			const tr = input.closest("tr");
			tr.classList.add("duplicate");
			return tr;
		});
	trs[0].scrollIntoView({
		behavior: "smooth",
		block: "center",
	});
	setTimeout(
		() => {
			for (const tr of trs) {
				tr.classList.remove("duplicate");
			}
		},
		4000,
	);
}

/**
 * Adds a new tr if the user has no more empty trs and removes the last empty tr if the user has an empty tr before it
 * @param {Object} [param0={}] an object with the following keys
 * @param {Object} [param0.inputObj=managedLoggers[focusedIndex].last_input] - the last_input object of the currently focused logger
 * @param {TbodyHTMLElement} [param0.tabAppendElement=null] - the tbody where to append or remove the tr
 * @throws Error when tabAppendElement == null
 * @return {Promise<void>} fulfilled when addTr or removeTr are completed
 * @async
 */
function checkAddRemoveLastTr({
	inputObj = managedLoggers[focusedIndex].last_input,
	tabAppendElement,
} = {}) {
	if (tabAppendElement == null) {
		throw new Error("error_required_params");
	}
	// if the user is on the last td, add a new tab if both fields are non-empty.
	if (
		focusedIndex === (managedLoggers.length - 1) &&
		(inputObj.label && inputObj.url)
	) {
		return addTr(tabAppendElement);
	} // if the user is on the previous-to-last td, remove the last tab if either one of the fields are empty
	else if (
		focusedIndex === (managedLoggers.length - 2) &&
		(!inputObj.label || !inputObj.url)
	) {
		return removeTr(tabAppendElement);
	}
}

/**
 * Checks if the Tab passed already exists and is a duplicate + updates the href button on the tr
 * @param {Object} [param0={}] an object with the following keys
 * @param {string} [param0.url=null] - the URL of the Tab
 * @param {string} [param0.org=null] - the Org of the Tab
 * @param {Object} [param1={}] an object with the following keys
 * @param {TbodyHTMLElement} [param1.tabAppendElement=null] - the tbody where to find the trs
 * @param {TrHTMLElement} [param1.tr=null] - the tr where the Tab is shown
 * @throws Error when tabAppendElement == null or tr == null
 */
function performAfterChecks({
	url = null,
	org = null,
} = {}, {
	tabAppendElement = null,
	tr = null,
} = {}) {
	if (tabAppendElement == null || tr == null) {
		throw new Error("error_required_params");
	}
	// check eventual duplicates
	checkDuplicates({
		url: url === "" ? undefined : url,
		org: org === "" ? undefined : org,
	}, {
		tabAppendElement,
	});
	// update the "open" button href
	tr.querySelector("[data-action=open]").href = url == null || url === ""
		? "#"
		: Tab.expandURL(
			url,
			getCurrentHref(),
			org,
		);
}

/**
 * Listens for input changes on the label and URL fields and updates the corresponding values.
 *
 * @param {Object} [param0={}] an object with the following keys
 * @param {TbodyHTMLElement} [param0.tabAppendElement=null] - the tbody where to append the tr
 * @param {string} [param0.type="label"]  - The type of input field ("label", "url" or "org").
 * @throws Error when tabAppendElement == null
 * @return {Promise<void>} fulfilled when the checkAddRemoveLastTr is completed
 * @async
 */
function trInputListener({
	tabAppendElement = null,
	type = "label",
} = {}) {
	if (tabAppendElement == null) {
		throw new Error("error_required_params");
	}
	const currentObj = managedLoggers[focusedIndex];
	const element = currentObj[type];
	const value = element.value;
	const inputObj = currentObj.last_input;
	const last_input = inputObj[type] ?? "";
	const delta = value.length - last_input.length;
	wasSomethingUpdated = wasSomethingUpdated || delta !== 0;
	const tr = element.closest("tr");
	let url = value;
	let org = value;
	let typeMatched = false;
	switch (type) {
		case "url": {
			org = inputObj.org;
			typeMatched = true;
			// minify the URL if it was pasted in
			if (delta > 2) {
				url = Tab.minifyURL(value);
				element.value = url;
			}
			break;
		}
		case "org": {
			url = inputObj.url;
			typeMatched = true;
			if (value !== "") {
				org = Tab.extractOrgName(value);
				element.value = org;
			}
			const thisUrlOrg = Tab.extractOrgName(getCurrentHref());
			const isThisOrgTab = org === "" ||
				org === thisUrlOrg;
			const wasThisOrgTab = tr.dataset.isThisOrgTab === "true";
			tr.dataset.isThisOrgTab = isThisOrgTab;
			if (wasThisOrgTab && !isThisOrgTab) {
				// became a not-this-org Tab
				manageTabsButtons.hide.removeAttribute("disabled");
			}
			break;
		}
		default:
			break;
	}
	if (typeMatched) {
		performAfterChecks({ url, org }, {
			tabAppendElement,
			tr,
		});
	}
	inputObj[type] = element.value;
	return checkAddRemoveLastTr({
		inputObj,
		tabAppendElement,
	});
}

/**
 * Reduces an array of loggers to an array of element objects
 * @return {Array} Array of objects with element and type properties
 */
function reduceLoggersToElements() {
	return managedLoggers.reduce((acc, logger) => {
		const index = acc.length / 3;
		acc.push(
			{ element: logger.label, type: "label", index },
			{ element: logger.url, type: "url", index },
			{ element: logger.org, type: "org", index },
		);
		return acc;
	}, []);
}

/**
 * Callback on reorder events
 * @param {Object} [param0={}] message the object created from the drag handler
 * @param {number} [param0.fromIndex=0] - the original index of the tr
 * @param {number} [param0.toIndex=0] - the new index of the tr
 */
function reorderTabsTable({
	fromIndex = 0,
	toIndex = 0,
} = {}) {
	updateLoggerIndex(fromIndex, toIndex);
	updateIndexesOnTrsAfterIndex(
		Math.min(fromIndex, toIndex),
	);
	manage_InvalidateSort = true;
	wasSomethingUpdated = true;
	document.dispatchEvent(
		new CustomEvent(TUTORIAL_EVENT_REORDERED_TABS_TABLE),
	);
}

/**
 * Finds all the trs and their inputs to update the currently saved Tabs
 * @param {Object} [param0={}] an object with the following keys
 * @param {TbodyHTMLElement} [param0.tbody=document.querySelector("#sortable-table tbody")] - the tbody inside the modal where the trs can be found
 * @param {TabContainer} [param0.allTabs=await ensureAllTabsAvailability()] - the TabContainer instance
 */
async function readManagedTabsAndSave({
	tbody = document.querySelector("#sortable-table tbody"),
	allTabs = null,
} = {}) {
	// read all Tabs in the tbody
	const tableTabs = [];
	const lastTr = getLastTr(tbody);
	for (const tr of tbody.querySelectorAll("tr")) {
		if (tr !== lastTr) { // lastChild is always empty
			tableTabs.push(Tab.create({
				label: getInnerElementFieldBySelector({
					parentElement: tr,
					field: "value",
					selector: "input.label",
				}),
				url: getInnerElementFieldBySelector({
					parentElement: tr,
					field: "value",
					selector: "input.url",
				}),
				org: getInnerElementFieldBySelector({
					parentElement: tr,
					field: "value",
					selector: "input.org",
				}),
			}));
		}
	}
	allTabs = allTabs ?? await ensureAllTabsAvailability();
	// send message to save the Tabs as they were read
	if (
		await allTabs.replaceTabs(tableTabs, {
			resetTabs: true,
			removeOrgTabs: true,
			updatePinnedTabs: false,
			invalidateSort: manage_InvalidateSort,
		})
	) {
		sf_afterSet({
			tabs: allTabs,
		});
	} else {
		showToast("error_processing_tabs", TOAST_ERROR);
	}
}

/**
 * Shows a modal for managing saved tabs with actions (open, update, remove, pin/unpin).
 * Displays all saved tabs in a table and handles user interactions via button clicks.
 *
 * @return {Promise<void>}
 */
export async function createManageTabsModal() {
	if (document.getElementById(MODAL_ID) != null) {
		return showToast("error_close_other_modal", TOAST_ERROR);
	}
	const allTabs = await ensureAllTabsAvailability({ reset: true });
	const {
		modalParent,
		closeButton: modalCloseBtn,
		tbody,
		saveButton,
		loggers,
		deleteAllTabsButton,
		trsAndButtons: allTrsAndButtons,
		dropdownMenus: allDropMenus,
	} = await generateManageTabsModal(allTabs);
	managedLoggers.splice(0, managedLoggers.length, ...loggers);
	deleteAllButton = deleteAllTabsButton;
	trsAndButtons.splice(0, trsAndButtons.length, ...allTrsAndButtons);
	dropdownMenus.splice(0, dropdownMenus.length, ...allDropMenus);
	closeButton = modalCloseBtn;
	manage_InvalidateSort = false;
	wasSomethingUpdated = false;
	const buttonContainer = saveButton.closest("div");
	manageTabsButtons.show = buttonContainer.querySelector(".show_all_tabs");
	manageTabsButtons.hide = buttonContainer.querySelector(
		".hide_other_org_tabs",
	);
	getModalHanger().appendChild(modalParent);
	updateModalBodyOverflow(modalParent.querySelector("article"));
	// Setup drag functionality for the manage tabs table
	setupDragForTable(reorderTabsTable);
	closeButton.addEventListener("click", (_) => {
		setupDragForUl(reorderTabsUl);
		document.dispatchEvent(
			new CustomEvent(TUTORIAL_EVENT_CLOSE_MANAGE_TABS),
		);
	});
	saveButton.addEventListener("click", async (e) => {
		e.preventDefault();
		await readManagedTabsAndSave({ tbody, allTabs });
		closeButton.click();
		managedLoggers.length = 0;
	});
	// Attach listeners to all existing buttons
	actionButtons.splice(
		0,
		actionButtons.length,
		...modalParent.querySelectorAll("[data-action]"),
	);
	for (const btn of actionButtons) {
		btn.addEventListener(
			"click",
			async (e) => {
				e.preventDefault();
				await handleActionButtonClick(e, {
					allTabs,
				});
			},
		);
	}
	// Listen when the last row is filled in to add a new empty row
	for (const el of reduceLoggersToElements()) {
		setInfoForDrag(el.element, () =>
			trInputListener({
				tabAppendElement: tbody,
				type: el.type,
			}), el.index);
	}
	// Close dropdown when clicking outside
	for (const { tr, button } of trsAndButtons) {
		tr.addEventListener("click", (e) => closeDropdownOnTrClick(e, button));
	}
	const allDropButtons = trsAndButtons.reduce((acc, trAndBtn) => {
		acc.push(trAndBtn.button);
		return acc;
	}, []);
	for (const button of allDropButtons) {
		// Prevent dropdown from closing when clicking inside
		// and close all other Btns
		button.addEventListener(
			"click",
			(e) => closeDropdownOnBtnClick(e, button),
		);
	}
	// enable the deleteAllButton to be clicked
	deleteAllButton.addEventListener("click", (e) => {
		e.preventDefault();
		const lastTr = getLastTr(tbody);
		for (const tr of Array.from(tbody.querySelectorAll("tr"))) {
			if (tr !== lastTr) {
				tr.remove();
			}
		}
		deleteAllButton.setAttribute("disabled", true);
	});
	document.dispatchEvent(
		new CustomEvent(TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL),
	);
}

/**
 * Creates manage-tabs helpers with optional dependency overrides.
 *
 * @param {Object} [overrides={}] Runtime overrides used by tests.
 * @return {{
 *   __getState: () => {
 *     actionButtons: unknown[];
 *     dropdownMenus: unknown[];
 *     focusedIndex: number;
 *     managedLoggers: unknown[];
 *     manageInvalidateSort: boolean;
 *     manageTabsButtons: Record<string, unknown>;
 *     trsAndButtons: unknown[];
 *     wasSomethingUpdated: boolean;
 *   };
 *   __setState: (state?: Record<string, unknown>) => void;
 *   addTr: (tabAppendElement?: HTMLElement | null) => Promise<void>;
 *   checkAddDuplicateStyle: (tabAppendElement: HTMLElement) => void;
 *   checkAddRemoveLastTr: (options?: Record<string, unknown>) => Promise<void>;
 *   checkDuplicates: (tab?: Record<string, unknown>, options?: Record<string, unknown>) => Promise<void>;
 *   checkOpenAskConfirm: (e: Event) => Promise<void>;
 *   checkRemoveTr: (e: Event) => Promise<void>;
 *   closeDropdownOnBtnClick: (e: Event, button: HTMLButtonElement) => void;
 *   closeDropdownOnTrClick: (e: Event, button: HTMLButtonElement) => void;
 *   createManageTabsModal: () => Promise<void>;
 *   getLastTr: (tbody?: HTMLElement | null) => HTMLElement | undefined;
 *   handleActionButtonClick: (e: Event, options?: Record<string, unknown>) => Promise<void>;
 *   moveTrToGivenIndex: (options?: Record<string, unknown>) => void;
 *   performAfterChecks: (tab?: Record<string, unknown>, options?: Record<string, unknown>) => void;
 *   readManagedTabsAndSave: (options?: Record<string, unknown>) => Promise<void>;
 *   reduceLoggersToElements: () => Array<{ element: HTMLElement; index: number; type: string }>;
 *   removeTr: (tabAppendElement?: HTMLElement | null, trToRemove?: HTMLElement | null, removeIndex?: number) => Promise<void>;
 *   reorderTabsTable: (options?: { fromIndex?: number; toIndex?: number }) => void;
 *   setInfoForDrag: (element: HTMLElement, listener: () => void, index: number) => void;
 *   trInputListener: (options?: Record<string, unknown>) => Promise<void>;
 *   updateLoggerIndex: (fromIndex?: number | null, toIndex?: number | null) => void;
 *   updateTabAttributes: (options?: Record<string, unknown>) => void;
 * }} Manage-tabs module API.
 */
export function createManageTabsModule(overrides = {}) {
	CXM_PIN_TAB = overrides.CXM_PIN_TAB ?? CXM_PIN_TAB;
	CXM_REMOVE_TAB = overrides.CXM_REMOVE_TAB ?? CXM_REMOVE_TAB;
	CXM_UNPIN_TAB = overrides.CXM_UNPIN_TAB ?? CXM_UNPIN_TAB;
	HIDDEN_CLASS = overrides.HIDDEN_CLASS ?? HIDDEN_CLASS;
	PIN_TAB_CLASS = overrides.PIN_TAB_CLASS ?? PIN_TAB_CLASS;
	TOAST_ERROR = overrides.TOAST_ERROR ?? TOAST_ERROR;
	TOAST_WARNING = overrides.TOAST_WARNING ?? TOAST_WARNING;
	TUTORIAL_EVENT_CLOSE_MANAGE_TABS =
		overrides.TUTORIAL_EVENT_CLOSE_MANAGE_TABS ??
			TUTORIAL_EVENT_CLOSE_MANAGE_TABS;
	TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL =
		overrides.TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL ??
			TUTORIAL_EVENT_CREATE_MANAGE_TABS_MODAL;
	TUTORIAL_EVENT_REORDERED_TABS_TABLE =
		overrides.TUTORIAL_EVENT_REORDERED_TABS_TABLE ??
			TUTORIAL_EVENT_REORDERED_TABS_TABLE;
	MODAL_ID = overrides.MODAL_ID ?? MODAL_ID;
	Tab = overrides.Tab ?? Tab;
	TabContainer = overrides.TabContainer ?? TabContainer;
	createManageTabRow = overrides.createManageTabRow ?? createManageTabRow;
	ensureAllTabsAvailability = overrides.ensureAllTabsAvailability ??
		ensureAllTabsAvailability;
	generateManageTabsModal = overrides.generateManageTabsModal ??
		generateManageTabsModal;
	getCurrentHref = overrides.getCurrentHref ?? getCurrentHref;
	getInnerElementFieldBySelector = overrides.getInnerElementFieldBySelector ??
		getInnerElementFieldBySelector;
	getModalHanger = overrides.getModalHanger ?? getModalHanger;
		getTranslations = overrides.getTranslations ?? getTranslations;
		handleLightningLinkClick = overrides.handleLightningLinkClick ??
			handleLightningLinkClick;
		sldsConfirm = overrides.sldsConfirm ?? sldsConfirm;
		injectStyle = overrides.injectStyle ?? injectStyle;
	makeDuplicatesBold = overrides.makeDuplicatesBold ?? makeDuplicatesBold;
	reorderTabsUl = overrides.reorderTabsUl ?? reorderTabsUl;
	setupDragForTable = overrides.setupDragForTable ?? setupDragForTable;
	setupDragForUl = overrides.setupDragForUl ?? setupDragForUl;
	sf_afterSet = overrides.sf_afterSet ?? sf_afterSet;
	showToast = overrides.showToast ?? showToast;
	updateModalBodyOverflow = overrides.updateModalBodyOverflow ??
		updateModalBodyOverflow;
		applyGlobalOverride("CustomEvent", overrides.CustomEvent);
		if (
			typeof overrides.confirm === "function" &&
			overrides.sldsConfirm == null
		) {
			sldsConfirm = ({ body } = {}) => {
				const promptText = Array.isArray(body) ? body.join("\n") : body;
				return overrides.confirm(promptText);
			};
		}
		applyGlobalOverride("document", overrides.document);
		applyGlobalOverride("setTimeout", overrides.setTimeout);

	focusedIndex = 0;
	managedLoggers.length = 0;
	for (const key of Object.keys(manageTabsButtons)) {
		delete manageTabsButtons[key];
	}
	deleteAllButton = null;
	trsAndButtons.length = 0;
	dropdownMenus.length = 0;
	actionButtons.length = 0;
	closeButton = null;
	manage_InvalidateSort = false;
	wasSomethingUpdated = false;

	return {
		__getState: () => ({
			actionButtons,
			dropdownMenus,
			focusedIndex,
			managedLoggers,
			manageInvalidateSort: manage_InvalidateSort,
			manageTabsButtons,
			trsAndButtons,
			wasSomethingUpdated,
		}),
		__setState: (state = {}) => {
			if (state.focusedIndex !== undefined) {
				focusedIndex = state.focusedIndex;
			}
			if (state.deleteAllButton !== undefined) {
				deleteAllButton = state.deleteAllButton;
			}
			if (state.closeButton !== undefined) {
				closeButton = state.closeButton;
			}
			if (state.manageInvalidateSort !== undefined) {
				manage_InvalidateSort = state.manageInvalidateSort;
			}
			if (state.wasSomethingUpdated !== undefined) {
				wasSomethingUpdated = state.wasSomethingUpdated;
			}
			if (state.managedLoggers !== undefined) {
				managedLoggers.length = 0;
				managedLoggers.push(...state.managedLoggers);
			}
			if (state.actionButtons !== undefined) {
				actionButtons.length = 0;
				actionButtons.push(...state.actionButtons);
			}
			if (state.dropdownMenus !== undefined) {
				dropdownMenus.length = 0;
				dropdownMenus.push(...state.dropdownMenus);
			}
			if (state.trsAndButtons !== undefined) {
				trsAndButtons.length = 0;
				trsAndButtons.push(...state.trsAndButtons);
			}
			if (state.manageTabsButtons !== undefined) {
				for (const key of Object.keys(manageTabsButtons)) {
					delete manageTabsButtons[key];
				}
				Object.assign(manageTabsButtons, state.manageTabsButtons);
			}
		},
		addTr,
		checkAddDuplicateStyle,
		checkAddRemoveLastTr,
		checkDuplicates,
		checkOpenAskConfirm,
		checkRemoveTr,
		closeDropdownOnBtnClick,
		closeDropdownOnTrClick,
		createManageTabsModal,
		getLastTr,
		handleActionButtonClick,
		moveTrToGivenIndex,
		performAfterChecks,
		readManagedTabsAndSave,
		reduceLoggersToElements,
		removeTr,
		reorderTabsTable,
		setInfoForDrag,
		trInputListener,
		updateLoggerIndex,
		updateTabAttributes,
	};
}
