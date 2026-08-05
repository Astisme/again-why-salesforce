import {
	PERSIST_SORT,
	TOAST_WARNING,
	WHAT_GET,
	WHAT_SET,
	WHY_KEY,
} from "./constants.js";
import { getSettings, sendExtensionMessage } from "./functions.js";
import Tab from "./tab.js";
import {
	checkSortOrderForKey,
	getFilteredReplaceState,
	getMoveIndex,
	getTabContainerFromObj,
	invalidateSort,
	prepareImportedPinnedTabs,
	sortFunction,
	stripImportedTabMetadata,
} from "./tabContainer-helpers.js";
import { TranslationService } from "./translator.js";

let singletonAllTabs = null;

const _tabContainerSecret = Symbol("tabContainerSecret");

/**
 * The class to manage multiple Tabs (through TabContainer.create()).
 *
 * @extends {Array<Tab>}
 */
export class TabContainer extends Array {
	#isSorted = false;
	/**
	 * Getter for #isSorted
	 * @return {boolean} - whether the TabContainer is sorted
	 */
	get isSorted() {
		return this.#isSorted;
	}
	#isSortedBy = null;
	/**
	 * Getter for #isSortedBy
	 * @return {string|null} - by which Tab field the TabContainer is sorted by
	 */
	get isSortedBy() {
		return this.#isSortedBy;
	}
	#isSortedAsc = false;
	/**
	 * Getter for #isSortedAsc
	 * @return {boolean} - whether the TabContainer is sorted ascending (A-Z)
	 */
	get isSortedAsc() {
		return this.#isSortedAsc;
	}
	#isSortedDesc = false;
	/**
	 * Getter for #isSortedDesc
	 * @return {boolean} - whether the TabContainer is sorted descending (Z-A)
	 */
	get isSortedDesc() {
		return this.#isSortedDesc;
	}

	/**
	 * Number of Tabs which MUST be persisted at the beginning of the Array
	 */
	#pinnedTabs = 0;
	/**
	 * Getter for #pinnedTabs
	 * @return {number} - the positive integer representing how many pinned Tabs are present
	 */
	get pinned() { // function name same as TabContainer.keyPinnedTabsNo
		return this.#pinnedTabs;
	}
	/**
	 * Setter for #pinnedTabs
	 * @param {number} pinnedTabs - the positive integer which will become the currently pinned Tabs
	 * @throws TypeError when passing a value that is not a number
	 */
	set pinned(pinnedTabs = 0) { // function name same as TabContainer.keyPinnedTabsNo
		pinnedTabs = pinnedTabs ?? 0; // takes care of null and undefined
		if (typeof pinnedTabs !== "number") {
			throw new TypeError("error_required_params");
		}
		this.#pinnedTabs = Math.max(0, Math.min(this.length, pinnedTabs));
	}

	/** @type {"pinned"} */
	static keyPinnedTabsNo = "pinned";
	/** @type {"tabs"} */
	static keyTabs = "tabs";
	/**
	 * All the keys which express data about a TabContainer.
	 */
	static metadataKeys = new Set([
		TabContainer.keyPinnedTabsNo,
	]);

	/**
	 * Sets the sort state properties based on detected sorting
	 * @param {string} key - The key that tabs are sorted by
	 * @param {boolean} isAscending - Whether the sort is ascending
	 */
	#setSortState(key = null, isAscending = null) {
		this.#isSorted = key != null;
		this.#isSortedBy = key;
		this.#isSortedAsc = isAscending === true;
		this.#isSortedDesc = isAscending === false;
	}

	/**
	 * Constructor for the TabContainer class. Prevents direct instantiation and requires the use of the `TabContainer.create()` method.
	 * Throws an error if the provided secret does not match the expected secret value.
	 *
	 * @constructor
	 * @param {Symbol} secret - The secret value used to authorize instantiation.
	 * @throws {Error} Throws an error if the provided secret is invalid.
	 * @example
	 * const tabContainer = TabContainer.create(); // Correct way to create an instance.
	 * const tabContainer = new TabContainer("invalidSecret"); // Throws an error.
	 */
	constructor(secret) {
		if (secret !== _tabContainerSecret) {
			throw new Error(
				"error_tabcontainer_constructor",
			);
		}
		super();
	}

	/**
	 * Initializes the `TabContainer` by adding tabs, either from the saved tabs or provided as an argument. Called by the constructor.
	 *
	 * @param {TabContainer} instance - The TabContainer instance to be initialized.
	 * @return {Promise<boolean>} - A promise that resolves to `true` if initialization is successful, otherwise `false`.
	 * @private
	 */
	static async #initialize(instance) {
		if (instance == null) {
			throw new Error("error_tabcont_not_initialized");
		}
		const {
			[TabContainer.keyTabs]: savedTabs,
			[TabContainer.keyPinnedTabsNo]: pinnedTabs,
		} = await instance.getSavedTabs(false);
		// set pinned number based on storage (if pinned === 0, do not fail (with true))
		const setPinned = (n) => {
			instance[TabContainer.keyPinnedTabsNo] = n;
			return true;
		};
		return (
			Array.isArray(savedTabs) &&
			savedTabs.length > 0 &&
			await (instance.addTabs(savedTabs, false)) &&
			setPinned(pinnedTabs)
		) || await instance.setDefaultTabs();
	}

	/**
	 * Creates a non-initialized TabContainer instance
	 * @param {Object} [param0={}] an Object with the following keys
	 * @param {any[]} [param0.tabs=[]] the Tabs which should be inserted in the instance
	 * @param {number} [param0.pinned=0] the number of pinned Tabs which should be set
	 * @return a brand-new non-initialized TabContainer
	 */
	static getThrowawayInstance({
		tabs = [],
		pinned = 0,
	} = {}) {
		const res = new TabContainer(_tabContainerSecret);
		res.push(tabs);
		res[TabContainer.keyPinnedTabsNo] = pinned;
		return res;
	}
	/**
	 * Creates and initializes a new `TabContainer` instance.
	 *
	 * @return {Promise<TabContainer>} - A promise that resolves to the newly created and initialized `TabContainer` instance.
	 * @throws {Error} - Throws an error if the `TabContainer` cannot be initialized with the provided `tabs`.
	 * @async
	 */
	static create() {
		if (singletonAllTabs != null) {
			return singletonAllTabs;
		}
		singletonAllTabs = (async () => {
			const instance = new TabContainer(_tabContainerSecret);
			if (!await TabContainer.#initialize(instance)) {
				throw new Error(
					await TranslationService.getTranslations(
						"error_tabcont_not_initialized",
					),
				);
			}
			singletonAllTabs = instance;
			return instance;
		})();
		return singletonAllTabs;
	}

	/**
	 * Validates and converts an item to Tab objects
	 * @param {Object} item - an item to validate
	 * @return {Object} an object with `msg` if the item could not be converted to a Tab XOR `tab` if the item was correctly converted.
	 */
	#validateItem(item = null) {
		const res = {};
		if (Tab.isValid(item)) {
			const newTab = Tab.getTabObj(item);
			if (this.exists(newTab, true)) {
				res.msg = "error_duplicate_tab";
			} else {
				res.tab = newTab;
			}
		} else {
			res.msg = "error_invalid_tab";
		}
		return res;
	}

	/**
	 * Validates and converts items to Tab objects
	 * will not throw on errored items (they will be ignored)
	 * @param {Array} items - Items to validate
	 * @return {Array} Array of validated Tab objects
	 * @throws when items is not an Array
	 */
	#validateItems(items = null) {
		if (!Array.isArray(items)) {
			throw new TypeError("error_no_array", items);
		}
		// allow for an array to be passed without spread operator (...)
		if (items.length === 1 && Array.isArray(items[0])) {
			items = items[0];
		}
		const seen = new Set();
		return items
			.filter((item) => {
				const key = `${item?.url}|${item?.org}`;
				const seenLen = seen.size;
				return seen.add(key).size > seenLen;
			}) // remove internal duplicates
			.map((item) => this.#validateItem(item).tab) // validate each item
			.filter(Boolean); // select only the valid items
	}

	/**
	 * Adds one or more elements to the end of the TabContainer and returns the new length.
	 * Items may be passed with spread operator or inside an Array.
	 *
	 * @param {...T} items The elements to add to the end of the TabContainer.
	 * @return {number} The new length of the TabContainer.
	 */
	push(...items) {
		return super.push(...this.#validateItems(items));
	}

	/**
	 * Adds one or more elements to the beginning of the TabContainer and returns the new length.
	 * Items may be passed with spread operator or inside an Array.
	 *
	 * @param {...T} items The elements to add to the end of the TabContainer.
	 * @return {number} The new length of the TabContainer.
	 */
	unshift(...items) {
		return super.unshift(...this.#validateItems(items));
	}

	/**
	 * Changes the contents of an array by removing, replacing, or adding elements.
	 *
	 * @param {number} start - The index at which to start changing the array. If negative, it is treated as an offset from the end of the array.
	 * @param {number} deleteCount - The number of elements to remove from the array starting from the `start` index. If `deleteCount` is larger than the number of elements from `start` to the end of the array, all elements after `start` will be removed.
	 * @param {...*} items - The elements to add to the array, starting at the `start` index. If no elements are provided, elements are only removed.
	 * @return {Array} - An array containing the elements that were removed from the array.
	 */
	splice(start, deleteCount, ...items) {
		// Normalize start (assumes start can be negative)
		if (start < 0) {
			start = Math.max(this.length + start, 0);
		} else {
			start = Math.min(start, this.length);
		}
		// Clamp deleteCount so we don’t remove more than available
		deleteCount = Math.max(0, Math.min(deleteCount, this.length - start));
		// Create an array directly without using any Array methods
		const removedItems = TabContainer.getThrowawayInstance();
		// Manually copy the items to be removed
		for (let i = 0; i < deleteCount; i++) {
			if (start + i < this.length) {
				removedItems.push(this[start + i]);
			}
		}
		// Create a temporary array to hold the new result
		const temp = this.slice(start + deleteCount);
		this.length = start;
		const tabItems = items.map((item) => Tab.getTabObj(item));
		this.push(...tabItems, ...temp);
		return removedItems;
	}

	/**
	 * Returns a shallow copy of a portion of the array into a new array.
	 * The original array will not be modified.
	 *
	 * @param {number} [start] Zero-based index at which to start extraction.
	 *    A negative index can be used, indicating an offset from the end of the sequence.
	 *    If undefined, slice starts from index 0.
	 * @param {number} [end] Zero-based index before which to end extraction.
	 *    Slice extracts up to but not including end.
	 *    A negative index can be used, indicating an offset from the end of the sequence.
	 *    If undefined, slice extracts through the end of the sequence.
	 * @return {Array} A new array containing the extracted elements.
	 *
	 * @example
	 * const container = new TabContainer([{id: 1}, {id: 2}, {id: 3}]);
	 * const newContainer = container.slice(1, 2);
	 * // newContainer contains [{id: 2}]
	 */
	slice(start = 0, end = this.length) {
		// Convert negative indices to positive
		start = start < 0
			? Math.max(this.length + start, 0)
			: Math.min(start, this.length);
		end = end < 0
			? Math.max(this.length + end, 0)
			: Math.min(end, this.length);
		// Ensure start is not greater than end
		const sliced = TabContainer.getThrowawayInstance();
		if (start >= end) {
			return sliced;
		}
		// Copy elements to the new array
		for (let i = start; i < end && i < this.length; i++) {
			sliced.push(this[i]);
		}
		return sliced;
	}

	/**
	 * Creates a new array with all elements that pass the test implemented by the provided function.
	 *
	 * @param {Function} filterCallback Function to test each element of the array.
	 *    The filterCallback function accepts three arguments:
	 *    - element: The current element being processed in the array
	 *    - index: The index of the current element being processed in the array
	 *    - array: The array filter was called upon
	 * @return {Array} A new array with the elements that pass the test.
	 *    If no elements pass the test, an empty array will be returned.
	 */
	filter(filterCallback) {
		// Create a new instance of the same class
		const filtered = TabContainer.getThrowawayInstance();
		// Manually iterate through the array and apply the callback
		for (let i = 0; i < this.length; i++) {
			const element = this[i];
			if (filterCallback(element, i, this)) {
				filtered.push(element);
			}
		}
		return filtered;
	}

	/**
	 * Returns the JSON representation of the TabContainer from the JSON in input
	 *
	 * @param {Object|Array} tbContainerObj - the JSON input from which to find the data (Array is old implementation)
	 * @return {Object} the TabContainer represed in JSON with all the keys from tbContainerObj (if it was an Object) + `isUsingOldVersion` key (boolean)
	 */
	/**
	 * Retrieves the saved tabs from the browser's runtime and optionally replaces the current tabs.
	 *
	 * @param {boolean} [replace=true] - A flag indicating whether to replace the current tabs with the retrieved ones. Defaults to `true`.
	 * @return {Promise<Object|TabContainer>} - A promise that resolves to either the `TabContainer` instance (if `replace` is `true`) or the retrieved saved tabs.
	 */
	async getSavedTabs(replace = true) {
		const res = getTabContainerFromObj(
			await sendExtensionMessage({ what: WHAT_GET, key: WHY_KEY }),
		);
		if (replace) {
			res[TabContainer.keyTabs] = await this.replaceTabs(
				res[TabContainer.keyTabs],
				{
					resetTabs: true,
					removeOrgTabs: true,
					sync: false,
					updatePinnedTabs: false,
				},
			);
			this[TabContainer.keyPinnedTabsNo] =
				res[TabContainer.keyPinnedTabsNo];
		}
		return res;
	}

	/**
	 * Sets the default tabs for the `TabContainer` by replacing the current tabs with a predefined set of tabs.
	 *
	 * @return {Promise<void>} - A promise that resolves once the default tabs are successfully set.
	 */
	async setDefaultTabs() {
		const [flows, users] = await TranslationService.getTranslations([
			"flows",
			"users",
		]);
		this.length = 0;
		this[TabContainer.keyPinnedTabsNo] = 0;
		return this.addTabs([
			{ label: "⚡", url: "/lightning" },
			{ label: flows, url: "/lightning/app/standard__FlowsApp" },
			{ label: users, url: "ManageUsers/home" },
		]);
	}

	/**
	 * Adds a new tab to the `TabContainer` if it is valid and does not already exist.
	 *
	 * @param {Object} tab - The tab object to be added.
	 * @param {Object} [param1={}] - Add options.
	 * @param {boolean} [param1.sync=true] - Whether to synchronize the tabs after adding.
	 * @param {boolean} [param1.addInFront=false] - Whether to insert the tab after the pinned segment instead of at the end.
	 * @throws {Error} - Throws an error if the tab object is invalid or if the tab already exists.
	 * @return {Promise<boolean>} - A promise that resolves to `true` if the tab is added and synchronized (if `sync` is `true`), otherwise `true` if not synchronized.
	 */
	async addTab(tab, {
		sync = true,
		addInFront = false,
	} = {}) {
		const initialLength = this.length;
		if (addInFront) {
			// add in front but after the pinned Tabs
			this.splice(this[TabContainer.keyPinnedTabsNo], 0, tab);
		} else {
			// add at the end
			this.push(tab);
		}
		if (this.length <= initialLength) {
			// nothing was added
			const { msg } = this.#validateItem(tab);
			throw new Error(`${await TranslationService.getTranslations(
				msg,
			)} ${JSON.stringify(tab)}`);
		}
		return sync ? this.syncTabs() : this.checkSetSorted();
	}

	/**
	 * Adds multiple tabs to the `TabContainer`. If a Tab already exists, it is ignored.
	 *
	 * @param {Array<Object>} tabs - An array of Tab objects to be added to the container.
	 * @param {boolean} [sync=true] - A flag indicating whether to synchronize the Tabs after adding. Defaults to `true`.
	 * @param {Object} [param2={}] an object with the following keys
	 * @param {boolean} [param2.invalidateSort=false] - Wheter the function was called from an invalidate sort action
	 * @throws {Error} - Throws an error if any Tab (other than duplicates) fails to be added.
	 * @return {Promise<boolean>} - A promise that resolves to `true` if all Tabs were added successfully (excluding duplicates), otherwise `false` if any Tab could not be added.
	 * @async
	 */
	addTabs(tabs, sync = true, {
		invalidateSort = false,
	} = {}) {
		if (tabs == null || (tabs.length === 0 && !sync)) {
			return true;
		}
		const initialLength = this.length;
		const addedTabs = this.push(tabs) - initialLength;
		if (addedTabs < tabs.length) {
			// we did not add all the Tabs in `tabs`
			for (const tab of tabs) {
				const { msg } = this.#validateItem(tab);
				if (msg != "error_duplicate_tab") {
					throw new Error(`${msg} ${JSON.stringify(tab)}`);
				}
				// we will continue if all the errors were of duplicate Tabs
			}
		}
		return sync
			? this.syncTabs({ fromInvalidateSortFunction: invalidateSort })
			: this.checkSetSorted();
	}

	/**
	 * Filters and returns tabs based on whether they are associated with an organization.
	 *
	 * @param {boolean} [getWithOrg=true] - A flag indicating whether to return tabs with an associated organization (`true`) or without (`false`). Defaults to `true`.
	 * @return {Array<Tab>} - An array of tabs that match the specified organization condition.
	 */
	getTabsWithOrg(getWithOrg = true) {
		return this.filter((tab) => getWithOrg === (tab.org != null));
	}

	/**
	 * Filters and returns tabs based on the specified organization.
	 *
	 * @param {string|null} org - The organization to filter tabs by. If `null`, an error is thrown.
	 * @param {boolean} [match=true] - A flag indicating whether to return tabs that exactly match the specified organization (`true`), or the ones that do not (`false`). Defaults to `true`.
	 * @throws {Error} - Throws an error if the `org` parameter is not specified (`null`).
	 * @return {Array<Object>} - An array of tabs that match the specified organization condition.
	 */
	getTabsByOrg(org = null, match = true) {
		if (org == null) {
			throw new Error("error_get_with_no_org");
		}
		return this.filter((tab) =>
			tab.org != null &&
			match === (tab.org === org)
		);
	}

	/**
	 * Filters and returns tabs based on the specified tab data (label, url, and organization).
	 *
	 * @param {Object} [param={}] - An object containing the tab data to filter by. The object can include `label`, `url`, and `org` properties. Defaults to an empty object.
	 * @param {string|null} [param.label=null] - The label of the tab to filter by.
	 * @param {string|null} [param.url=null] - The URL of the tab to filter by.
	 * @param {string|null} [param.org=null] - The organization associated with the tab to filter by.
	 * @param {boolean} [match=true] - A flag indicating whether to return tabs that exactly match the specified tab data (`true`), or those that do not match (`false`). Defaults to `true`.
	 * @param {boolean} [strict=false] - Wheter to perform a strict check or a loose one
	 * @return {Array<Tab>} - An array of tabs that match the specified tab data condition.
	 */
	getTabsByData(
		{ label = null, url = null, org = null } = {},
		match = true,
		strict = false,
	) {
		if (label == null && url == null) {
			if (org == null) {
				return TabContainer.getThrowawayInstance();
			} else {
				return this.getTabsByOrg(org, match);
			}
		}
		return this.filter((tb) =>
			match === tb.equals({
				label,
				url,
				org,
			}, strict)
		);
	}

	/**
	 * Filters and returns a **single** Tab, based on the specified tab data (label, url, and organization).
	 *
	 * @param {Object} [tab={}] - An object containing the tab data to filter by. The object can include `label`, `url`, and `org` properties. Defaults to an empty object.
	 * @param {string|null} [tab.label=null] - The label of the tab to filter by.
	 * @param {string|null} [tab.url=null] - The URL of the tab to filter by.
	 * @param {Object|null} [tab.org=null] - The organization associated with the tab to filter by.
	 * @param {boolean} [match=true] - A flag indicating whether to return tabs that exactly match the specified tab data (`true`), or those that do not match (`false`). Defaults to `true`.
	 * @param {boolean} [isRetry=false] - If the call to this function is subsequent to the first one. Internal use.
	 * @throws {Error} - Throws an error if it finds 0 Tabs or more than 1 Tab.
	 * @return {Tab} - A Tab that matches the specified tab data condition.
	 */
	getSingleTabByData(tab, match = true, isRetry = false) {
		const matchingTabs = this.getTabsByData(tab, match, isRetry);
		if (matchingTabs.length === 0) {
			if (isRetry) {
				throw new Error("error_tab_not_found");
			}
			return this.getSingleTabByData(
				{
					label: tab.label,
					url: tab.url,
					org: undefined,
				},
				match,
				true,
			);
		}
		if (matchingTabs.length === 1) {
			return matchingTabs[0];
		}
		if (
			!match || (tab.url == null && tab.org == null) ||
			(tab.url == null && tab.org != null)
		) {
			throw new Error("error_many_tabs_found");
		}
		// try to filter by org
		const filteredTabs = matchingTabs.filter((tb) =>
			tb.org == null || tb.org === tab.org
		);
		if (filteredTabs.length === 0) {
			throw new Error("error_tab_not_found");
		}
		if (filteredTabs.length === 1) {
			return filteredTabs[0];
		}
		// filteredTabs should contain both a Tab with no org and a Tab with the same org
		// prefer to return the Tab with the same org
		if (tab.org != null) {
			const orgTabs = filteredTabs.filter((tb) => tb.org === tab.org);
			if (orgTabs.length === 1) {
				return orgTabs[0];
			}
		}
		const noorgTabs = filteredTabs.filter((tb) => tb.org == null);
		if (noorgTabs.length === 1) {
			return noorgTabs[0];
		}
		// nothing to do. we found more than one org Tab and more than one generic Tab
		// note: we should never get here because the TabContainer checks for duplicates before adding
		// we could get in here if the Tab passed as input did not have an org and filteredTabs only contained org tabs
		// in this case, we could not filter above and got here
		console.info({ tab, match, isRetry, matchingTabs, filteredTabs });
		throw new Error("error_many_tabs_found");
	}

	/**
	 * Finds the index of a tab in the container based on the specified tab data (label, url, and organization).
	 *
	 * @param {Object} [tab={}] - An object containing the tab data to find. The object can include `label`, `url`, and `org` properties. Defaults to an empty object.
	 * @param {string|null} [tab.label=null] - The label of the tab to find.
	 * @param {string|null} [tab.url=null] - The URL of the tab to find.
	 * @param {Object|null} [tab.org=null] - The organization associated with the tab to find.
	 * @throws {Error} - Throws an error if no tab data is provided or if the tab is not found.
	 * @return {number} - The index of the tab if found.
	 */
	getTabIndex({ label = null, url = null, org = null } = {}) {
		if (label == null && url == null && org == null) {
			throw new Error("error_no_data");
		}
		const index = this.findIndex((tb) =>
			tb.equals({
				label,
				url,
				org,
			})
		);
		if (index < 0) {
			throw new Error("error_tab_not_found");
		}
		return index;
	}

	/**
	 * Checks if a tab with the specified data (label, url, and organization) exists in the container.
	 *
	 * @param {Object} [tab={}] - An object containing the tab data to check for. The object can include `label`, `url`, and `org` properties. Defaults to an empty object.
	 * @param {string} [tab.label=null] - Optional label ignored by existence checks.
	 * @param {string} [tab.url=null] - The URL of the tab to check for.
	 * @param {string} [tab.org=null] - The organization associated with the tab to check for.
	 * @param {boolean} [checkDuplicate=false] - Whether to check for duplicates (true) or for equality (false)
	 *
	 * @return {boolean} - `true` if a tab with the specified data exists, otherwise `false`.
	 */
	exists({ url = null, org = null } = {}, checkDuplicate = false) {
		if (this.length === 0) {
			return false;
		}
		if (url != null) {
			url = Tab.minifyURL(url);
		}
		if (org != null) {
			org = Tab.extractOrgName(org);
		}
		return this.some((tb) =>
			checkDuplicate
				? tb.isDuplicate({
					url,
					org,
				})
				: tb.equals({
					url,
					org,
				})
		);
	}

	/**
	 * Checks if a tab with the specified data (url and organization) exists in the container. Checks both with the org and without the org
	 *
	 * @param {Object} [tab={}] - An object containing the tab data to check for. The object can include `url` and `org` properties. Defaults to an empty object.
	 * @param {string} [tab.url=null] - The URL of the tab to check for.
	 * @param {string} [tab.org=null] - The organization associated with the tab to check for.
	 * @return {boolean} - `true` if a tab with the specified data exists, otherwise `false`.
	 */
	existsWithOrWithoutOrg({ url = null, org = null } = {}) {
		return this.exists({ url, org }) || this.exists({ url });
	}

	/**
	 * Replace all current tabs
	 *
	 * @param {Array<Tab>} newTabs - New array of tabs to replace existing tabs
	 *
	 * @param {Object} [param1={}] - An Object containing the following keys
	 * @param {boolean} [param1.resetTabs=true] - If `true`, resets `this.tabs`.
	 * @param {boolean} [param1.removeOrgTabs=false] - This parameter changes its function based on the value of resetTabs. In any case, if `true`, removes all org-specific Tabs
	 * When `resetTabs=true` and `removeOrgTabs=false`, removes only non-org-specific Tabs (Tabs with `org == null`), sparing org-specific Tabs.
	 * When `resetTabs=false` and `removeOrgTabs=false`, does nothing.
	 * @param {boolean} [param1.sync=true] - Whether to perform a sync operation
	 * @param {string|null} [param1.keepTabsNotThisOrg=null] - Org-specific tabs outside this org are preserved when set.
	 * @param {string|null} [param1.removeThisOrgTabs=null] - The org for which to remove the org tabs.
	 * @param {boolean} [param1.updatePinnedTabs=true] - Wheter to update the currently pinned Tabs number
	 * @param {boolean} [param1.invalidateSort=false] - Wheter the function was called from an invalidate sort action
	 *
	 * @return {Promise<boolean>} - A Promise stating whether the operation was successful
	 * @async
	 *
	 * @example
	 * // Remove all tabs
	 * replaceTabs(null, true, true);
	 * replaceTabs([], true, true);
	 *
	 * @example
	 * // Remove all org-specific tabs
	 * replaceTabs(null, false, true);
	 * replaceTabs([], false, true);
	 *
	 * @example
	 * // DEFAULT: Keep only org-specific tabs
	 * replaceTabs(null);
	 * replaceTabs([]);
	 * replaceTabs(null, true);
	 * replaceTabs([], true);
	 * replaceTabs(null, true, false);
	 * replaceTabs([], true, false);
	 *
	 * @example
	 * // Remove all tabs and add new ones
	 * replaceTabs([{ label: "a", url: "a", org: "OrgA" }], true, true);
	 *
	 * @example
	 * // DEFAULT: Keep org-specific tabs and add new ones
	 * replaceTabs([{ label: "a", url: "a", org: "OrgA" }, { label: "b", url: "b" }]);
	 * replaceTabs([{ label: "a", url: "a", org: "OrgA" }, { label: "b", url: "b" }], true);
	 * replaceTabs([{ label: "a", url: "a", org: "OrgA" }, { label: "b", url: "b" }], true, false);
	 *
	 * @example
	 * // Keep all tabs and add new ones
	 * replaceTabs([{ label: "a", url: "a", org: "OrgA" }], false);
	 * replaceTabs([{ label: "a", url: "a", org: "OrgA" }], false, false);
	 *
	 * @example
	 * // Remove org-specific tabs and add new ones
	 * replaceTabs([{ label: "a", url: "a", org: "OrgA" }], false, true);
	 */
	replaceTabs(newTabs = [], {
		resetTabs = true,
		removeOrgTabs = false,
		sync = true,
		keepTabsNotThisOrg = null,
		removeThisOrgTabs = null,
		updatePinnedTabs = true,
		invalidateSort = false,
	} = {}) {
		if (newTabs === this) {
			return true;
		}
		const { tabs, pinnedTabsNo } = getFilteredReplaceState({
			currentTabs: this,
			pinnedTabsNo: this[TabContainer.keyPinnedTabsNo],
			resetTabs,
			removeOrgTabs,
			keepTabsNotThisOrg,
			removeThisOrgTabs,
		});
		if (resetTabs || removeOrgTabs) {
			this.splice(0, this.length, ...tabs);
			// set the pinnedTabs to the updated length of the pinnedTabsList
			if (updatePinnedTabs) {
				this[TabContainer.keyPinnedTabsNo] = pinnedTabsNo;
			}
		}
		// Add new tabs and sync them
		return this.addTabs(newTabs, sync, { invalidateSort });
	}

	/**
	 * Converts the `TabContainer` instance to a JSON representation.
	 *
	 * @return {Object} - A JSON object representing the `TabContainer` instance.
	 */
	toJSON() {
		return {
			[TabContainer.keyTabs]: Array.from(this).map((tb) => tb.toJSON()),
			[TabContainer.keyPinnedTabsNo]: this[TabContainer.keyPinnedTabsNo],
		};
	}

	/**
	 * Returns a string representation of the `TabContainer` instance.
	 *
	 * @return {string} - A string representing the `TabContainer` instance.
	 */
	toString() {
		return JSON.stringify(this.toJSON());
	}

	/**
	 * Import tabs from JSON
	 * @param {string} jsonString - JSON string of tabs
	 * @param {Object} [param1={}] - Import options.
	 * @param {boolean} [param1.resetTabs=false] - Whether the imported array should overwrite the currently saved tabs.
	 * @param {boolean} [param1.preserveOtherOrg=true] - Whether the org-specific tabs should be preserved.
	 * @param {boolean} [param1.importMetadata=false] - Whether pinned-tab metadata should also be restored.
	 * @param {boolean} [param1.importPinnedTabs=importMetadata] - Whether pinned-tab count should be restored.
	 * @param {string|null} [param1.currentOrg=null] - The current org when preserving other-org tabs during overwrite.
	 * @return {Promise<number>} - Number of tabs successfully imported
	 */
	async importTabs(jsonString, {
		resetTabs = false,
		preserveOtherOrg = true,
		importMetadata = false,
		importPinnedTabs = false,
		currentOrg = null,
	} = {}) {
		const parsedTabs = JSON.parse(jsonString);
		const {
			[TabContainer.keyTabs]: normalizedImported = [],
			...metadata
		} = getTabContainerFromObj(parsedTabs);
		if (metadata.isUsingOldVersion) {
			// tell the user to upgrade their backups
			sendExtensionMessage({
				what: TOAST_WARNING,
				message: "warn_upgrade_backup",
			});
		}
		const imported = importMetadata
			? normalizedImported
			: stripImportedTabMetadata(normalizedImported);
		const backupTabs = [...this]; // clones the Tabs inside this; otherwise, we would simply "rename" this.
		const backupPinnedTabs = this[TabContainer.keyPinnedTabsNo];
		try {
			// Keep old overwrite semantics: pinned overwrite without org-preserve context starts from empty state.
			const shouldKeepExistingTabs = !(
				resetTabs && importPinnedTabs && currentOrg == null
			);
			const baseState = shouldKeepExistingTabs
				? getFilteredReplaceState({
					currentTabs: this,
					pinnedTabsNo: this[TabContainer.keyPinnedTabsNo],
					resetTabs,
					removeOrgTabs: !preserveOtherOrg || currentOrg != null,
					removeThisOrgTabs: preserveOtherOrg ? currentOrg : null,
				})
				: {
					tabs: [],
					pinnedTabsNo: 0,
				};
			const pinnedState = importPinnedTabs
				? prepareImportedPinnedTabs({
					pinnedTabsNo: metadata?.[TabContainer.keyPinnedTabsNo],
					importedArr: imported,
					existingPinnedTabs: baseState.tabs.slice(
						0,
						baseState.pinnedTabsNo,
					),
					resetTabs,
				})
				: {
					importedPinnedTabs: [],
					remainingImportedTabs: Array.from(imported),
					pinnedTabsNo: 0,
					importedTabs: 0,
				};
			for (const tab of pinnedState.importedPinnedTabs) {
				if (!Tab.isValid(tab)) {
					throw new Error(`error_invalid_tab ${JSON.stringify(tab)}`);
				}
			}
			const nextTabs = [
				...baseState.tabs.slice(0, baseState.pinnedTabsNo),
				...pinnedState.importedPinnedTabs,
				...baseState.tabs.slice(baseState.pinnedTabsNo),
			];
			const nextPinnedTabsNo = baseState.pinnedTabsNo +
				pinnedState.pinnedTabsNo;
			// Stage full next container first so validation errors can roll back cleanly.
			const nextState = TabContainer.getThrowawayInstance();
			nextState.push(nextTabs);
			nextState[TabContainer.keyPinnedTabsNo] = nextPinnedTabsNo;
			const nextStateLength = nextState.length;
			await nextState.addTabs(pinnedState.remainingImportedTabs, false);
			this.splice(0, this.length, ...nextState);
			this[TabContainer.keyPinnedTabsNo] = nextPinnedTabsNo;
			await this.syncTabs();
			return pinnedState.importedTabs +
				(nextState.length - nextStateLength);
		} catch (error) {
			console.info(error);
			this.length = 0;
			this.push(...backupTabs);
			this[TabContainer.keyPinnedTabsNo] = backupPinnedTabs;
			throw error;
		}
	}

	/**
	 * Synchronizes the Tabs in `this` by sending them to the browser's runtime.
	 * Last function called by other entry points.
	 * Calls `checkSetSorted` before synching the Tabs
	 *
	 * @param {Array|null} [tabs=null] - An optional array of Tabs to replace the current Tabs before synchronization. If not provided, the current Tabs are used.
	 * @param {boolean} [fromSortFunction=false] - Whether the function was called from the sort function.
	 * @param {boolean} [fromInvalidateSortFunction=false] - Whether the function was called from a user action which invalidates the sorting function (like the moveTab function).
	 * @return {Promise<boolean>} - A promise that resolves to `true` if the synchronization is successful, otherwise `false`.
	 */
	async syncTabs(
		{
			fromSortFunction = false,
			fromInvalidateSortFunction = false,
		} = {},
	) {
		// Always compute the final tab order before serializing and persisting.
		await this.checkSetSorted(fromSortFunction, fromInvalidateSortFunction);
		await sendExtensionMessage({
			what: WHAT_SET,
			key: WHY_KEY,
			set: this.toJSON(),
		});
		return true;
	}

	/**
	 * Creates a new TabContainer with the results of calling a provided function for every element.
	 *
	 * @param {Function} mapCallback Function that produces an element of the new TabContainer.
	 *    The mapCallback function accepts three arguments:
	 *    - currentValue: The current element being processed
	 *    - index: The index of the current element being processed
	 *    - array: The TabContainer map was called upon
	 * @return {Array} A new Array with each element being the result of the callback function.
	 */
	map(mapCallback) {
		// Create a new instance of TabContainer
		const mapped = TabContainer.getThrowawayInstance();
		// Manually iterate and apply the callback
		for (let i = 0; i < this.length; i++) {
			mapped[i] = mapCallback(this[i], i, this);
		}
		return mapped;
	}

	/**
	 * Moves a tab to a new position in the `TabContainer`. The tab can be moved to the beginning or end of the container, or just to an adjacent position.
	 *
	 * @param {Object} [tab={ label: null, url: null }] - The tab data used to identify the tab to move. The object can include `label` and `url` properties.
	 * @param {string|null} [tab.label=null] - The label of the tab to move.
	 * @param {string|null} [tab.url=null] - The URL of the tab to move.
	 * @param {string|null} [tab.org=null] - The current org.
	 * @param {Object} [options={}] - Options for the movement behavior.
	 * @param {boolean} [options.moveBefore=true] - A flag indicating whether to move the tab before the current one (`true`) or after (`false`).
	 * @param {boolean} [options.fullMovement=false] - A flag indicating whether to move the tab to the start or end of the container (`true`), or just to an adjacent position (`false`).
	 * @param {boolean} [options.sync=true] - Whether to sync tabs after moving.
	 * @param {boolean|null} [options.pinMovement=null] - Indicates if the movement is for pinning/unpinning.
	 * @throws {Error} - Throws an error if no matching tab is found, if more than one matching tab is found, or if no valid `url` is provided.
	 * @return {Promise<number>} - A promise that resolves to the new index of the moved tab.
	 */
	async moveTab(
		{ label = null, url = null, org = null } = {},
		{
			moveBefore = true,
			fullMovement = false,
			sync = true,
			pinMovement = null,
		} = {},
	) {
		const currentIndex = this.getTabIndex(
			this.getSingleTabByData({ label, url, org }),
		);
		const isPinned = currentIndex < this[TabContainer.keyPinnedTabsNo];
		const newIndex = getMoveIndex({
			fullMovement,
			moveBefore,
			minIndex: isPinned ? 0 : this[TabContainer.keyPinnedTabsNo],
			maxIndex: isPinned
				? this[TabContainer.keyPinnedTabsNo] - 1
				: this.length - 1,
			currentIndex,
			org,
			tabs: this,
		});
		if (pinMovement != null) {
			if (pinMovement && newIndex < this[TabContainer.keyPinnedTabsNo]) {
				throw new Error("error_already_pinned");
			}
			if (
				!pinMovement && newIndex >= this[TabContainer.keyPinnedTabsNo]
			) {
				throw new Error("error_already_unpinned");
			}
		} else if (newIndex === currentIndex) {
			throw new Error("error_cannot_move_dir");
		}
		const [movedTab] = this.splice(currentIndex, 1);
		this.splice(newIndex, 0, movedTab);
		if (sync) {
			await this.syncTabs({ fromInvalidateSortFunction: true });
		}
		return newIndex;
	}

	/**
	 * Remove all tabs matching the label, url and org (based on the passed data)
	 *
	 * @param {Object} tab - an Object containing the following parameters to match a Tab to remove
	 * @param {string} tab.label - the label of the Tab to remove
	 * @param {string} tab.url - the url of the Tab to remove
	 * @param {string} tab.org - the org of the Tab to remove
	 * @return {Promise<boolean>} - Whether a tab was removed
	 */
	async remove({ label = null, url = null, org = null } = {}) {
		const tab = { label, url, org };
		if (tab.label == null && tab.url == null && tab.org == null) {
			const msg = await TranslationService.getTranslations(
				"error_no_data",
			);
			throw new Error(msg);
		}
		const index = this.getTabIndex(this.getSingleTabByData(tab));
		if (index < this[TabContainer.keyPinnedTabsNo]) {
			this[TabContainer.keyPinnedTabsNo]--;
		}
		const initialLength = this.length;
		this.splice(index, 1);
		return this.length < initialLength && this.syncTabs();
	}

	/**
	 * Checks if a Tab is org-specific and whether its `org` property is different from the one of the Tab received by the outer function.
	 *
	 * @param {Object} [checkTab] - The Tab that needs to be checked
	 * @param {Object} [inputTab] - The Tab with the Org to check.
	 * @return {boolean} whether the Tab is not of this org
	 */
	getTabsNotThisOrg(checkTab, inputTab) {
		return checkTab.org != null && checkTab.org !== inputTab.org;
	}

	/**
	 * Removes the pinned/unpinned Tab.
	 *
	 * @param {boolean} [rmPinned=null] - whether to remove the pinned Tabs (true) or the unpinned ones (false)
	 * @throws when rmPinned is null
	 * @throws when rmPinned is true but there are currently no pinned Tabs
	 * @throws when rmPinned is false but there are currently no unpinned Tabs
	 * @return {Promise<boolean>} whether the Tabs where removed and synced
	 * @async
	 */
	removePinned(rmPinned = null) {
		if (rmPinned == null) {
			throw new Error("error_no_data");
		}
		let index;
		let deleteCount;
		if (rmPinned) {
			if (this[TabContainer.keyPinnedTabsNo] < 1) {
				throw new Error("error_no_pinned");
			}
			index = 0;
			deleteCount = this[TabContainer.keyPinnedTabsNo];
			this[TabContainer.keyPinnedTabsNo] = 0;
		} else {
			if (this[TabContainer.keyPinnedTabsNo] >= this.length) {
				throw new Error("error_no_unpinned");
			}
			// remove unpinned
			index = this[TabContainer.keyPinnedTabsNo];
			deleteCount = this.length;
		}
		const initialLength = this.length;
		this.splice(index, deleteCount);
		return this.length < initialLength && this.syncTabs();
	}

	/**
	 * Removes all tabs except the specified one, and optionally removes tabs before or after the specified tab.
	 *
	 * @param {Object} [tab={ label: null, url: null }] - The tab data used to identify the tab to keep. The object can include `label` and `url` properties.
	 * @param {string|null} [tab.label=null] - The label of the tab to keep.
	 * @param {string|null} [tab.url=null] - The URL of the tab to keep.
	 * @param {string|null} [tab.org=null] - The Org of the tab to keep.
	 * @param {Object} [options={ removeBefore: null }] - Options for removing tabs.
	 * @param {boolean|null} [options.removeBefore=null] - A flag indicating whether to remove tabs before (`true`), after (`false`), or no tabs (`null`).
	 * @throws {Error} - Throws an error if no matching tab is found, if more than one matching tab is found, or if no valid `url` is provided.
	 * @return {Promise<boolean>} - A promise that resolves to `true` if the tabs are successfully synchronized after removal.
	 *
	 * @example
	 * for this example, we'll collapse miniURL and label into a single string and simply look at tabs as strings.
	 * tabs = ["a", "b", "c"]
	 *
	 * removeOtherTabs("b") || removeOtherTabs("b",null) ==> tabs = ["b"]
	 * removeOtherTabs("b",true) ==> tabs = ["b", "c"]
	 * removeOtherTabs("b",false) ==> tabs = ["a", "b"]
	 * @async
	 */
	removeOtherTabs(
		{ label = null, url = null, org = null } = {},
		{
			removeBefore = null,
		} = {},
	) {
		const tab = { label, url, org };
		const matchTab = this.getSingleTabByData(tab);
		const index = this.getTabIndex(matchTab);
		// remove all tabs but this one
		if (removeBefore == null) {
			// if the Tab is pinned, it will still be pinned; otherwise no more pinned Tabs will be present
			// if true => 1; else => 0
			this.splice(0, this.length);
			this.push(matchTab);
			this[TabContainer.keyPinnedTabsNo] = Number(
				index < this[TabContainer.keyPinnedTabsNo],
			);
			return this.syncTabs();
		}
		let minIndex;
		let deleteCount;
		let whereIndex;
		if (removeBefore) {
			minIndex = 0;
			deleteCount = index;
			whereIndex = minIndex;
			this[TabContainer.keyPinnedTabsNo] =
				this[TabContainer.keyPinnedTabsNo] - index;
		} else {
			minIndex = index + 1;
			deleteCount = this.length;
			whereIndex = deleteCount;
			this[TabContainer.keyPinnedTabsNo] = Math.min(
				this[TabContainer.keyPinnedTabsNo],
				minIndex,
			);
		}
		this.splice(
			whereIndex,
			0,
			...this
				.splice(minIndex, deleteCount)
				// prevent org tabs which are not for this org to be deleted unwillingly
				.filter((t) => this.getTabsNotThisOrg(t, tab)),
		);
		return this.syncTabs();
	}

	/**
	 * Perform case-insensitive comparison for strings
	 *
	 * @param {string} a - the first element
	 * @param {string} b - the second element
	 * @return {integer} negative if a < b; positive if a > b; 0 if a === b
	 */
	/**
	 * Sorts the tabs in the container by a specified property and order.
	 * After sorting, it synchronizes the changes.
	 *
	 * @param {Object} [options={}] - The sorting options.
	 * @param {string} [options.sortBy='label'] - The property to sort by. Valid options found at Tab.allowedKeys.
	 * @param {boolean} [options.sortAsc=true] - The sorting direction. Set to `true` for ascending order and `false` for descending.
	 * @param {boolean} [sync=true] - True to perform a sync operation
	 * @return {Promise<boolean>} - A promise that resolves to `true` if the sorting and (optional) synchronization are successful.
	 * @throws {Error} - Throws an error if an invalid `sortBy` property is provided.
	 * @async
	 */
	sort({ sortBy = "label", sortAsc = true } = {}, sync = true) {
		// Check for unexpected keys
		if (!Tab.allowedKeys.has(sortBy)) {
			throw new Error(
				`error_tab_unexpected_keys ${sortBy}`,
			);
		}
		// backup pinned Tabs (do not sort them)
		const pinnedTabsList = this.splice(
			0,
			this[TabContainer.keyPinnedTabsNo],
		);
		const sortFactor = sortAsc ? 1 : -1;
		super.sort((a, b) => {
			// Treat null or undefined values as "smaller" to ensure they are grouped together
			// Adjust direction for descending order
			return sortFactor * sortFunction(a[sortBy], b[sortBy]);
		});
		this.#setSortState(sortBy, sortAsc);
		// readd the pinned Tabs at the beginning
		this.unshift(...pinnedTabsList);
		// Persist the new order
		if (sync) {
			return this.syncTabs({
				fromSortFunction: true,
			});
		}
		return true;
	}

	/**
	 * Handles the invalidation of sort function by updating persisted settings
	 * @return {Promise} when the sorting has been invalidated
	 */
	/**
	 * Checks if the provided tabs are sorted by one of the allowed keys
	 * ('label', 'url', or 'org') in either ascending or descending order.
	 *
	 * Sets the following properties on the instance:
	 * - `#isSorted`: `true` if the tabs are sorted by any key, otherwise `false`
	 * - `#isSortedBy`: the key the tabs are sorted by (`'label'`, `'url'`, or `'org'`), or `null`
	 * - `#isSortedAsc`: `true` if sorted in ascending order, `false` otherwise
	 * - `#isSortedDesc`: `true` if sorted in descending order, `false` otherwise
	 *
	 * Rules:
	 * - If `#isSorted` is `false`, both `#isSortedAsc` and `#isSortedDesc` will also be `false`.
	 * - If `#isSorted` is `true`, exactly one of `#isSortedAsc` or `#isSortedDesc` will be `true`.
	 *
	 * @param {boolean} [fromSortFunction=false] - Whether the function was called from the sort function.
	 * @param {boolean} [fromInvalidateSortFunction=false] - Whether the function was called from a user action which invalidates the sorting function
	 * @return {Promise<boolean>} whether the tabs in input are sorted or not.
	 */
	async checkSetSorted(
		fromSortFunction = false,
		fromInvalidateSortFunction = false,
	) {
		if (fromSortFunction) {
			// already sorted everything
			return true;
		}
		if (fromInvalidateSortFunction) {
			await invalidateSort();
			// check if, out of luck, the array is still sorted (do not return)
		}
		// Check if the user wants to keep the Tabs always sorted
		if (await this.#checkShouldKeepSorted()) {
			return true;
		}
		// reset the sort state
		this.#setSortState();
		// check if the array is still sorted
		for (const key of Tab.allowedKeys) {
			const sortResult = checkSortOrderForKey({
				key,
				tabs: this,
				pinnedTabsNo: this[TabContainer.keyPinnedTabsNo],
			});
			if (sortResult.isSorted) {
				this.#setSortState(key, sortResult.isAscending);
				break;
			}
		}
		return this.#isSorted;
	}

	/**
	 * Retrieves the extension settings to know if the user wants to keep their Tabs sorted.
	 * If the setting is retrieved, proceeds to sort the array by the specified field and in the specified direction.
	 * @return {Promise<boolean>} whether the TabContainer is sorted
	 */
	async #checkShouldKeepSorted() {
		const persistSort = await getSettings(PERSIST_SORT);
		if (!persistSort?.enabled) {
			return false; // not set or esplicitly set as not enabled
		}
		// Tabs should be kept sorted by persistSort.enabled
		return this.sort({
			sortBy: persistSort.enabled,
			sortAsc: persistSort.ascending ?? true,
		}, false);
	}

	/**
	 * Takes care of updating a single Tab and synchronize the Array
	 *
	 * @param {{ label?: string; url?: string; org?: string; }} [tabToUpdate={label: undefined, url: undefined, org: undefined}] - The tab lookup data for the tab that has to be updated.
	 * @param {{ label?: string; url?: string; org?: string; [Tab.keyClickCount]?: number; [Tab.keyClickDate]?: number; }} [updateTo={label: undefined, url: undefined, org: undefined}] - An object which contains the keys that have to be updated.
	 *
	 * @return {Promise<boolean>} whether the Tab was updated AND the array was synced
	 * @async
	 */
	updateTab(
		{
			label: tabLabel = undefined,
			url: tabUrl = undefined,
			org: tabOrg = undefined,
		} = {},
		{
			label: updateLabel = undefined,
			url: updateUrl = undefined,
			org: updateOrg = undefined,
			[Tab.keyClickCount]: updateClickCount = undefined,
			[Tab.keyClickDate]: updateClickDate = undefined,
		} = {},
	) {
		const matchingTab = this.getSingleTabByData({
			label: tabLabel,
			url: tabUrl,
			org: tabOrg,
		});
		matchingTab.update({
			label: updateLabel,
			url: updateUrl,
			org: updateOrg,
			[Tab.keyClickCount]: updateClickCount,
			[Tab.keyClickDate]: updateClickDate,
		});
		return this.syncTabs();
	}

	/**
	 * Resets the singleton and returns a new instance. Only for use in tests!
	 * @return {Promise<TabContainer>} the new instance
	 * @async
	 */
	static _reset() {
		singletonAllTabs = null;
		return ensureAllTabsAvailability();
	}

	/**
	 * Clears the singleton instance. Only for use in tests!
	 */
	static _clear() {
		singletonAllTabs = null;
	}

	/**
	 * Invoked when a Tab is clicked. Finds the clicked Tab and calls its click handler
	 *
	 * @param {Object} [tabData={}] - data used to identify the clicked Tab
	 * @return {Promise<boolean>} whether the data was updated and synced
	 * @async
	 */
	handleClickTabByData(tabData = {}) {
		try {
			this.getSingleTabByData(tabData)
				?.handleClick();
			return this.syncTabs();
		} catch (e) {
			console.warn(e);
		}
		return true;
	}

	/**
	 * Pins or unpins the given Tab and updates the pinnedTabs value
	 *
	 * @param {Object} [tabData={}] - the Tab data used to identify the Tab to be pinned/unpinned
	 * @param {boolean} [isPin=null] - whether the user wants to pin (true) or unpin (false)
	 * @throws when isPin is null
	 * @throws when the Tab is not yet pinned
	 * @return {Promise<boolean>} - whether the Tab was pinned/unpinned and synced
	 */
	async pinOrUnpin(tabData = {}, isPin = null) {
		if (isPin == null) {
			throw new Error("error_no_data");
		}
		try {
			// if isPin, pin at the top of the Array
			// if !isPin, move tabData at index == this.#pinnedTabs
			await this.moveTab(tabData, {
				moveBefore: isPin,
				pinMovement: isPin,
				fullMovement: true,
				sync: false,
			});
		} catch (err) {
			// we'll get an error with error_cannot_move_dir if the user wants to unpin the already first Tab
			// in this specific case, we simply do not have to move the Tab, but we still have to add 1 on this.#pinnedTabs
			if (err.message !== "error_cannot_move_dir") {
				throw err;
			}
		}
		// update pinnedTabs
		this[TabContainer.keyPinnedTabsNo] += isPin ? 1 : -1;
		// sync tabs
		return this.syncTabs({
			fromInvalidateSortFunction: isPin ? undefined : true,
		});
	}

	/**
	 * Return the option object used to sort the Tabs
	 * @param {Object} [param0={}] - an object with the following keys
	 * @param {string} [param0.sortBy="label"] the Tab field to sort by
	 * @param {boolean} [param0.standardSort=true] whether to follow the ascending-then-descending sort or the reverse (descending-then-ascending)
	 * @throws Error when sortBy is not a key allowed by Tab
	 * @return {Object} ready to be used by the TabContainer
	 */
	getSortOptions({
		sortBy = "label",
		standardSort = true,
	} = {}) {
		if (!Tab.allowedKeys.has(sortBy)) {
			throw new Error("error_tab_unexpected_keys");
		}
		return {
			sortBy,
			sortAsc: (standardSort &&
				(this.isSortedBy !== sortBy || !this.isSortedAsc)) ||
				(!standardSort &&
					(this.isSortedBy === sortBy && !this.isSortedAsc)),
		};
	}
}

/**
 * Asynchronously retrieves all tabs, initializing them if needed.
 *
 * @return {Promise<TabContainer>} The TabContainer instance representing all tabs.
 * @async
 */
function getAllTabs_async() {
	return singletonAllTabs ?? TabContainer.create();
}

/**
 * Synchronously returns the TabContainer instance of all tabs if initialized.
 *
 * @throws {Error} Throws if the TabContainer is not yet initialized.
 * @return {TabContainer} The initialized TabContainer instance.
 */
function getAllTabs() {
	if (singletonAllTabs == null || singletonAllTabs instanceof Promise) {
		throw new Error("error_tabcont_not_initialized");
	}
	return singletonAllTabs;
}

/**
 * Ensures availability of the TabContainer instance, initializing it if necessary.
 *
 * @param {Object} [param0={}] an object with the following keys
 * @param {boolean} [param0.reset=false] - whether to reset the singleton to get fresh data
 * @return {Promise<TabContainer>} The TabContainer instance representing all tabs.
 */
export async function ensureAllTabsAvailability({
	reset = false,
} = {}) {
	try {
		if (reset) {
			return await TabContainer._reset();
		}
		return getAllTabs();
	} catch (e) {
		console.info(e);
		return getAllTabs_async();
	}
}
