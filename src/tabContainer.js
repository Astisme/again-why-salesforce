import {
	BROWSER,
	getSettings,
	PERSIST_SORT,
	sendExtensionMessage,
	SETTINGS_KEY,
	WHY_KEY,
} from "/constants.js";
import Tab from "./tab.js";
import ensureTranslatorAvailability from "/translator.js";

let translator = null;
let singletonAllTabs = null;

const _tabContainerSecret = Symbol("tabContainerSecret");

/**
 * The class to manage multiple Tabs (through TabContainer.create()).
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
		if (typeof pinnedTabs !== "number") {
			throw new TypeError("error_required_params");
		}
		pinnedTabs = pinnedTabs ?? 0;
		if (pinnedTabs < 0) {
			pinnedTabs = 0;
		}
		this.#pinnedTabs = pinnedTabs;
	}

	static keyPinnedTabsNo = "pinned";
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
			console.trace();
			throw new Error(
				"error_tabcontainer_constructor",
			);
		}
		super();
	}

	/**
	 * Checks if the given tabs are valid and adds them to the context if so.
	 *
	 * @param {Array} tabs - The tabs to validate and add.
	 * @return {Promise<boolean>} Resolves to true if tabs were added, otherwise false.
	 */
	static async #checkAddTabs(tabs) {
		if (singletonAllTabs == null) {
			throw new Error("error_tabcont_initialize");
		}
		if (
			tabs == null || tabs.length <= 0 ||
			!Array.isArray(tabs)
		) {
			return false;
		}
		return await singletonAllTabs.addTabs(tabs);
	}
	/**
	 * Initializes the `TabContainer` by adding tabs, either from the saved tabs or provided as an argument. Called by the constructor.
	 *
	 * @return {Promise<boolean>} - A promise that resolves to `true` if initialization is successful, otherwise `false`.
	 * @private
	 */
	static async #initialize() {
		if (singletonAllTabs == null) {
			throw new Error("error_tabcont_initialize");
		}
		const savedTabs = await singletonAllTabs.getSavedTabs(false);
		if (await TabContainer.#checkAddTabs(savedTabs)) {
			return true;
		}
		return await singletonAllTabs.setDefaultTabs();
	}

	/**
	 * Creates a non-initialized TabContainer instance
	 * @return a brand-new non-initialized TabContainer
	 */
	static getThrowawayInstance() {
		return new TabContainer(_tabContainerSecret);
	}
	/**
	 * Creates and initializes a new `TabContainer` instance.
	 *
	 * @return {Promise<TabContainer>} - A promise that resolves to the newly created and initialized `TabContainer` instance.
	 * @throws {Error} - Throws an error if the `TabContainer` cannot be initialized with the provided `tabs`.
	 */
	static async create() {
		if (singletonAllTabs != null) {
			return singletonAllTabs;
		}
		singletonAllTabs = new TabContainer(_tabContainerSecret);
		translator = await ensureTranslatorAvailability();
		if (!await TabContainer.#initialize()) {
			throw new Error(
				await translator.translate([
					"error_tabcont_initialize",
				]),
			);
		}
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
		return items
			.map((item) => this.#validateItem(item).tab)
			.filter((tb) => tb != null);
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
	 * @param {Function} callback Function to test each element of the array.
	 *    The callback function accepts three arguments:
	 *    - element: The current element being processed in the array
	 *    - index: The index of the current element being processed in the array
	 *    - array: The array filter was called upon
	 * @return {Array} A new array with the elements that pass the test.
	 *    If no elements pass the test, an empty array will be returned.
	 */
	filter(callback) {
		// Create a new instance of the same class
		const filtered = TabContainer.getThrowawayInstance();
		// Manually iterate through the array and apply the callback
		for (let i = 0; i < this.length; i++) {
			const element = this[i];
			if (callback(element, i, this)) {
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
	#getTabContainerFromObj(tbContainerObj) {
		const res = {};
		res.isUsingOldVersion = Array.isArray(tbContainerObj);
		if (res.isUsingOldVersion) {
			// deprecated (old version of saving the Tabs)
			// the Tabs will automatically get saved in the newer version at the first sync
			res[TabContainer.keyTabs] = tbContainerObj;
		} else {
			// new version of saving the Tabs
			// in a later release, we'll have to remove the deprecated way of saving them.
			// currently this is not possible because we're using this for import as well (meaning someone might have "old" versions of their Tabs backed up as json files
			Object.assign(res, tbContainerObj);
		}
		return res;
	}

	/**
	 * Retrieves the saved tabs from the browser's runtime and optionally replaces the current tabs.
	 *
	 * @param {boolean} [replace=true] - A flag indicating whether to replace the current tabs with the retrieved ones. Defaults to `true`.
	 * @return {Promise<Object|TabContainer>} - A promise that resolves to either the `TabContainer` instance (if `replace` is `true`) or the retrieved saved tabs.
	 */
	async getSavedTabs(replace = true) {
		const {
			[TabContainer.keyTabs]: tabs,
			[TabContainer.keyPinnedTabsNo]: pinnedTabs,
		} = this.#getTabContainerFromObj(
			await sendExtensionMessage({ what: "get", key: WHY_KEY }),
		);
		this.#pinnedTabs = pinnedTabs ?? 0;
		if (replace) {
			await this.replaceTabs(tabs, {
				resetTabs: true,
				removeOrgTabs: true,
				sync: false,
				updatePinnedTabs: false,
			});
			return this;
		}
		return tabs;
	}

	/**
	 * Sets the default tabs for the `TabContainer` by replacing the current tabs with a predefined set of tabs.
	 *
	 * @return {Promise<void>} - A promise that resolves once the default tabs are successfully set.
	 */
	async setDefaultTabs() {
		const flows = await translator.translate("flows");
		const users = await translator.translate("users");
		this.length = 0;
		this.#pinnedTabs = 0;
		return await this.addTabs([
			{ label: "⚡", url: "/lightning" },
			{ label: flows, url: "/lightning/app/standard__FlowsApp" },
			{ label: users, url: "ManageUsers/home" },
		]);
	}

	/**
	 * Adds a new tab to the `TabContainer` if it is valid and does not already exist.
	 *
	 * @param {Object} tab - The tab object to be added.
	 * @param {boolean} [sync=true] - A flag indicating whether to synchronize the tabs after adding. Defaults to `true`.
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
			this.splice(this.#pinnedTabs, 0, tab);
		} else {
			// add at the end
			this.push(tab);
		}
		if (this.length <= initialLength) {
			// nothing was added
			const { msg } = this.#validateItem(tab);
			throw new Error(`${await translator.translate([
				msg,
			])} ${JSON.stringify(tab)}`);
		}
		return await (sync ? this.syncTabs() : this.checkSetSorted());
	}

	/**
	 * Adds multiple tabs to the `TabContainer`. If a Tab already exists, it is ignored.
	 *
	 * @param {Array<Object>} tabs - An array of Tab objects to be added to the container.
	 * @param {boolean} [sync=true] - A flag indicating whether to synchronize the Tabs after adding. Defaults to `true`.
	 * @throws {Error} - Throws an error if any Tab (other than duplicates) fails to be added.
	 * @return {Promise<boolean>} - A promise that resolves to `true` if all Tabs were added successfully (excluding duplicates), otherwise `false` if any Tab could not be added.
	 */
	async addTabs(tabs, sync = true) {
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
		return await (sync ? this.syncTabs() : this.checkSetSorted());
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
	 * @param {Object} [tab={}] - An object containing the tab data to check for. The object can include `url` and `org` properties. Defaults to an empty object.
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
	 * @param {boolean} [param1.keepTabsNotThisOrg=null] - Whether to keep the org-specific Tabs which are not of this Org
	 * @param {string} [param1.removeThisOrgTabs=null] - The Org for which to remove the Org Tabs
	 * @param {boolean} [param1.updatePinnedTabs=true] - Wheter to update the currently pinned Tabs number
	 *
	 * @return {Promise<boolean>} - A Promise stating whether the operation was successful
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
	async replaceTabs(newTabs = [], {
		resetTabs = true,
		removeOrgTabs = false,
		sync = true,
		keepTabsNotThisOrg = null,
		removeThisOrgTabs = null,
		updatePinnedTabs = true,
	} = {}) {
		if (newTabs === this) {
			return true;
		} else if (
			resetTabs && removeOrgTabs && keepTabsNotThisOrg == null &&
			removeThisOrgTabs == null
		) {
			this.splice(0, this.length);
			if (updatePinnedTabs) {
				this.#pinnedTabs = 0;
			}
		} else if (resetTabs || removeOrgTabs) {
			// treat the pinned Tabs as their own list
			const pinnedTabsList = this.splice(0, this.#pinnedTabs);
			// loop on both this and pinnedTabsList with the same splice function
			for (const what of [this, pinnedTabsList]) {
				what.splice(
					0,
					what.length,
					...what.filter((tab) => {
						// If resetTabs, clear existing tabs
						if (resetTabs) {
							// if removeOrgTabs, clear existing tabs and existing tabs with an org set as well
							// else, clear existing tabs which do not have an org set
							if (!removeOrgTabs) {
								return tab.org != null;
							} else if (
								keepTabsNotThisOrg != null ||
								removeThisOrgTabs != null
							) {
								return tab.org != null &&
									(keepTabsNotThisOrg == null ||
										tab.org !== keepTabsNotThisOrg) &&
									(removeThisOrgTabs == null ||
										tab.org !== removeThisOrgTabs);
								// if keepTabsNotThisOrg, clear existing tabs and existing tabs with an org set but not matching the keepTabsNotThisOrg string
								// if removeThisOrgTabs, clear existing tabs and existing tabs with an org set and matching the removeThisOrgTabs string
							} else {
								// else, clear existing tabs
								return false;
							}
						} else if (removeOrgTabs) {
							// if keepTabsNotThisOrg, remove the org tabs which do not match the keepTabsNotThisOrg string
							// else, keep only non-org-specific tabs
							return tab.org == null ||
								(keepTabsNotThisOrg != null &&
									tab.org === keepTabsNotThisOrg) ||
								(removeThisOrgTabs != null &&
									tab.org !== removeThisOrgTabs);
						}
					}),
				);
			}
			// set the pinnedTabs to the updated length of the pinnedTabsList
			if (updatePinnedTabs) {
				this.#pinnedTabs = pinnedTabsList.length;
			}
		}
		// Add new tabs and sync them
		return await this.addTabs(newTabs, sync);
	}

	/**
	 * Converts the `TabContainer` instance to a JSON representation.
	 *
	 * @return {Object} - A JSON object representing the `TabContainer` instance.
	 */
	toJSON() {
		return {
			[TabContainer.keyTabs]: Array.from(this).map((tb) => tb.toJSON()),
			[TabContainer.keyPinnedTabsNo]: this.#pinnedTabs,
		};
	}

	/**
	 * Returns a string representation of the `TabContainer` instance.
	 *
	 * @return {string} - A string representing the `TabContainer` instance.
	 */
	toString() {
		return `[\n${this.map((tb) => tb.toString()).join(",\n")}\n]`;
	}

	/**
	 * Import tabs from JSON
	 * @param {string} jsonString - JSON string of tabs
	 * @param {boolean} [resetTabs=false] - Whether the imported array should overwrite the currently saved tabs
	 * @param {boolean} [preserveOtherOrg=true] - Whether the org-specific tabs should be preserved
	 * @return {number} - Number of tabs successfully imported
	 */
	async importTabs(jsonString, {
		resetTabs = false,
		preserveOtherOrg = true,
		importMetadata = false,
	} = {}) {
		let { [TabContainer.keyTabs]: imported, ...metadata } = this
			.#getTabContainerFromObj(JSON.parse(jsonString));
		if (metadata.isUsingOldVersion) {
			// tell the user to upgrade their backups
			sendExtensionMessage({
				what: "warning",
				message: "warn_upgrade_backup",
			});
		}
		// imported is now a valid Array of Tabs
		const backupTabs = [...this]; // clones the Tabs inside this; otherwise, we would simply "rename" this.
		const backupPinnedTabs = this.#pinnedTabs;
		try {
			let importPinnedTabs = 0;
			let importedTabsNo = 0;
			if (importMetadata) {
				const {
					pinnedTabs: _importPinnedTabs,
					importedTabs: _importedTabsNo,
				} = this.#importPinnedTabs({
					pinnedTabsNo: metadata?.[TabContainer.keyPinnedTabsNo],
					importedArr: imported,
					resetTabs,
				});
				importPinnedTabs = _importPinnedTabs;
				importedTabsNo = _importedTabsNo;
			} else {
				// remove metadata from the JSON string
				const metadataKeys = new Set([
					...Tab.metadataKeys,
					...TabContainer.metadataKeys,
				]);
				imported = this.#getTabContainerFromObj(
					JSON.parse(
						jsonString,
						(key, value) =>
							metadataKeys.has(key) ? undefined : value,
					),
				)[TabContainer.keyTabs];
				// no need to save metadata
			}
			// perform actions on current Array
			if (
				await this.replaceTabs(undefined, {
					resetTabs,
					removeOrgTabs: !preserveOtherOrg,
					updatePinnedTabs: false,
				})
			) {
				const newLen = this.length;
				// import the Tabs from the JSON string (except for pinned Tabs of the list)
				if (await this.addTabs(imported)) {
					importedTabsNo += this.length - newLen;
					if (resetTabs && importMetadata) {
						this.#pinnedTabs = importPinnedTabs;
					}
					return importedTabsNo;
				}
			}
		} catch (error) {
			console.info(error);
			this.length = 0;
			this.push(...backupTabs);
			this.#pinnedTabs = backupPinnedTabs;
			throw error;
		}
		return 0;
	}

	/**
	 * Helper function for importTabs used to import the pinned Tabs
	 *
	 * @param {Object} [param0={}] - an object containing the following parameters
	 * @param {number} [param0.pinnedTabsNo=0] - the number of the pinned Tabs to be imported
	 * @param {Tab[]} [param0.importedArr=[]] - an array of Tabs to import
	 * @param {boolean} [param0.resetTabs=false] - whether the currently pinned Tabs should be reset
	 *
	 * @return {Object} containing the number of pinnedTabs and the importTabs number
	 */
	#importPinnedTabs({
		pinnedTabsNo = 0,
		importedArr = [],
		resetTabs = false,
	} = {}) {
		const res = {
			pinnedTabs: 0,
			importedTabs: 0,
		};
		res.pinnedTabs = Math.max(
			0,
			// check for out of bounds number
			Math.min(
				pinnedTabsNo ?? 0,
				importedArr.length,
			),
		);
		if (res.pinnedTabs <= 0) {
			return res;
		}
		// if the user does not want to reset their Tabs, get the pinned Tabs to be imported and add them to the pinned list
		if (resetTabs) {
			this.#pinnedTabs = 0;
			this.length = 0;
			return res;
		}
		// merge the already pinned Tabs with the imported pinned Tabs
		// if pinnedTabs is 0, we'll simply do an unshift of the importPinnedTabsList
		const pinnedTabsList = this.splice(
			0,
			this.#pinnedTabs,
		);
		const uniqueImportPinnedTabsList = importedArr
			.splice(
				0,
				res.pinnedTabs,
			) // the `importedArr` array does not have the pinned Tabs anymore
			.filter((tb, index, arr) =>
				// remove internal duplicates
				(
					arr.findIndex((t) => t.equals?.(tb) || t === tb) === index
				) &&
				// remove duplicates of the other list
				!pinnedTabsList.exists(tb)
			);
		this.unshift(
			...pinnedTabsList,
			...uniqueImportPinnedTabsList,
		);
		this.#pinnedTabs = pinnedTabsList.length +
			uniqueImportPinnedTabsList.length;
		res.importedTabs = uniqueImportPinnedTabsList.length;
		return res;
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
		// replace tabs already checks the tabs
		await this.checkSetSorted(fromSortFunction, fromInvalidateSortFunction);
		await sendExtensionMessage({
			what: "set",
			set: this.toJSON(),
			key: WHY_KEY,
		});
		if (BROWSER.runtime.lastError) {
			throw new Error(BROWSER.runtime.lastError);
		}
		return true;
	}

	/**
	 * Creates a new TabContainer with the results of calling a provided function for every element.
	 *
	 * @param {Function} callback Function that produces an element of the new TabContainer.
	 *    The callback function accepts three arguments:
	 *    - currentValue: The current element being processed
	 *    - index: The index of the current element being processed
	 *    - array: The TabContainer map was called upon
	 * @return {Array} A new Array with each element being the result of the callback function.
	 */
	map(callback) {
		// Create a new instance of TabContainer
		const mapped = TabContainer.getThrowawayInstance();
		// Manually iterate and apply the callback
		for (let i = 0; i < this.length; i++) {
			mapped[i] = callback(this[i], i, this);
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
		const isPinned = currentIndex < this.#pinnedTabs;
		const newIndex = this.#getMoveIndex({
			fullMovement,
			moveBefore,
			minIndex: isPinned ? 0 : this.#pinnedTabs,
			maxIndex: isPinned ? this.#pinnedTabs - 1 : this.length - 1,
			currentIndex,
			org,
		});
		if (pinMovement != null) {
			if (pinMovement && newIndex < this.#pinnedTabs) {
				throw new Error("error_already_pinned");
			}
			if (!pinMovement && newIndex >= this.#pinnedTabs) {
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
	 * Finds the index where to put the new Tab while moving it.
	 * @param {Object} param0 an Object containing the following keys
	 * @param {boolean} [param0.fullMovement=false] - A flag indicating whether to move the tab to the start or end of the container (`true`), or just to an adjacent position (`false`).
	 * @param {boolean} [param0.moveBefore=true] - A flag indicating whether to move the tab before the current one (`true`) or after (`false`).
	 * @param {number} [param0.minIndex=0] - the minimum index where to put the Tab
	 * @param {number} [param0.maxIndex=this.length] - the maximum index where to put the Tab
	 * @param {number} [param0.currentIndex=0] - the index where the Tab is currently located
	 * @param {null} [param0.org=null] - the org of the Tab
	 * @return {number} the index where to move the Tab
	 */
	#getMoveIndex({
		fullMovement = false,
		moveBefore = true,
		minIndex,
		maxIndex,
		currentIndex = 0,
		org = null,
	}) {
		if (fullMovement) {
			return moveBefore ? minIndex : maxIndex;
		}
		const direction = moveBefore ? -1 : 1;
		const clamp = moveBefore ? Math.max : Math.min;
		const boundary = moveBefore ? minIndex : maxIndex;
		let lastIndex;
		for (let offset = 1; offset <= maxIndex; offset++) {
			const candidateIndex = clamp(
				boundary,
				currentIndex + direction * offset,
			);
			if (lastIndex === candidateIndex) {
				break;
			}
			const targetTab = this[candidateIndex];
			if (
				org == null || targetTab?.org == null || targetTab.org === org
			) {
				return candidateIndex;
			}
			lastIndex = candidateIndex;
		}
		return boundary;
	}
	/**
	 * Remove all tabs matching the label, url and org (based on the passed data)
	 *
	 * @param {Object} tab - an Object containing the following parameters to match a Tab to remove
	 * @param {string} tab.label - the label of the Tab to remove
	 * @param {string} tab.url - the url of the Tab to remove
	 * @param {string} tab.org - the org of the Tab to remove
	 * @return {boolean} - Whether a tab was removed
	 */
	async remove({ label = null, url = null, org = null } = {}) {
		const tab = { label, url, org };
		if (tab.label == null && tab.url == null && tab.org == null) {
			const msg = await translator.translate("error_no_data");
			throw new Error(msg);
		}
		const index = this.getTabIndex(this.getSingleTabByData(tab));
		if (index < this.#pinnedTabs) {
			this.#pinnedTabs--;
		}
		const initialLength = this.length;
		this.splice(index, 1);
		return this.length < initialLength && await this.syncTabs();
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
	 * @return {boolean} whether the Tabs where removed and synced
	 */
	async removePinned(rmPinned = null) {
		if (rmPinned == null) {
			throw new Error("error_no_data");
		}
		let index;
		let deleteCount;
		if (rmPinned) {
			if (this.#pinnedTabs < 1) {
				throw new Error("error_no_pinned");
			}
			index = 0;
			deleteCount = this.#pinnedTabs;
			this.#pinnedTabs = 0;
		} else {
			if (this.#pinnedTabs >= this.length) {
				throw new Error("error_no_unpinned");
			}
			// remove unpinned
			index = this.#pinnedTabs;
			deleteCount = this.length;
		}
		const initialLength = this.length;
		this.splice(index, deleteCount);
		return this.length < initialLength && await this.syncTabs();
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
	 */
	async removeOtherTabs(
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
			this.#pinnedTabs = Number(index < this.#pinnedTabs);
			return await this.syncTabs();
		}
		let minIndex;
		let deleteCount;
		let whereIndex;
		if (removeBefore) {
			minIndex = 0;
			deleteCount = index;
			whereIndex = minIndex;
			this.#pinnedTabs = Math.max(0, this.#pinnedTabs - index);
		} else {
			minIndex = index + 1;
			deleteCount = this.length;
			whereIndex = deleteCount;
			this.#pinnedTabs = Math.min(this.#pinnedTabs, minIndex);
		}
		this.splice(
			whereIndex,
			0,
			...this
				.splice(minIndex, deleteCount)
				// prevent org tabs which are not for this org to be deleted unwillingly
				.filter((t) => this.getTabsNotThisOrg(t, tab)),
		);
		return await this.syncTabs();
	}

	/**
	 * Perform case-insensitive comparison for strings
	 *
	 * @param {string} a - the first element
	 * @param {string} b - the second element
	 * @return {integer} negative if a < b; positive if a > b; 0 if a === b
	 */
	#sortFunction(a, b) {
		a = a == null ? "" : String(a);
		b = b == null ? "" : String(b);
		return String(a).localeCompare(
			String(b),
			undefined,
			{
				sensitivity: "base",
			},
		);
	}

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
	 */
	async sort({ sortBy = "label", sortAsc = true } = {}, sync = true) {
		// Check for unexpected keys
		if (!Tab.allowedKeys.has(sortBy)) {
			throw new Error(
				["error_tab_unexpected_keys", sortBy],
			);
		}
		// backup pinned Tabs (do not sort them)
		const pinnedTabsList = this.splice(0, this.#pinnedTabs);
		const sortFactor = sortAsc ? 1 : -1;
		super.sort((a, b) => {
			// Treat null or undefined values as "smaller" to ensure they are grouped together
			// Adjust direction for descending order
			return sortFactor * this.#sortFunction(a[sortBy], b[sortBy]);
		});
		this.#setSortState(sortBy, sortAsc);
		// readd the pinned Tabs at the beginning
		this.unshift(...pinnedTabsList);
		// Persist the new order
		if (sync) {
			return await this.syncTabs({
				fromSortFunction: true,
			});
		}
		return true;
	}

	/**
	 * Handles the invalidation of sort function by updating persisted settings
	 */
	#invalidateSort() {
		// Update the sort setting persisted (do not wait for response)
		sendExtensionMessage({
			what: "set",
			key: SETTINGS_KEY,
			set: [{
				id: PERSIST_SORT,
				enabled: false,
			}],
		});
	}

	/**
	 * Checks if tabs are sorted by a specific key
	 * @param {string} key - The key to check sorting for
	 * @return {{isSorted: boolean, isAscending: boolean}} Sort result
	 */
	#checkSortOrderForKey(key) {
		let asc = true;
		let desc = true;
		for (
			let i = this.#pinnedTabs + 1;
			i < this.length && (asc || desc);
			i++
		) {
			const comparison = this.#sortFunction(
				this[i - 1][key],
				this[i][key],
			);
			if (comparison === 0) continue;
			if (comparison > 0) asc = false;
			if (comparison < 0) desc = false;
		}
		return {
			isSorted: asc || desc,
			isAscending: asc && !desc,
		};
	}

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
	 * @return {boolean} whether the tabs in input are sorted or not.
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
			this.#invalidateSort();
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
			const sortResult = this.#checkSortOrderForKey(key);
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
	 * @return {boolean} whether the TabContainer is sorted
	 */
	async #checkShouldKeepSorted() {
		const persistSort = await getSettings(PERSIST_SORT);
		if (!persistSort?.enabled) {
			return false; // not set or esplicitly set as not enabled
		}
		// Tabs should be kept sorted by persistSort.enabled
		return await this.sort({
			sortBy: persistSort.enabled,
			sortAsc: persistSort.ascending ?? true,
		}, false);
	}

	/**
	 * Takes care of updating a single Tab and synchronize the Array
	 *
	 * @param {Tab} [tabToUpdate={label: undefined, url: undefined, org: undefined}] - the Tab that has to be updated; it MUST be a Tab which is already present in the Array
	 * @param {{ label: undefined; url: undefined; org: undefined; }} [updateTo={label: undefined, url: undefined, org: undefined}] - an Object which contains the keys that have to be updated
	 *
	 * @return {boolean} whether the Tab was updated AND the array was synced
	 */
	async updateTab(
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
		return await this.syncTabs();
	}

	/**
	 * Resets the singleton and returns a new instance. Only for use in tests!
	 *
	 * @return {Promise<TabContainer>} the new instance
	 */
	static async _reset() {
		singletonAllTabs = null;
		return await ensureAllTabsAvailability();
	}

	/**
	 * Invoked when a Tab is clicked. Finds the clicked Tab and calls its click handler
	 *
	 * @param {Object} [tabData={}] - data used to identify the clicked Tab
	 * @return {boolean} whether the data was updated and synced
	 */
	async handleClickTabByData(tabData = {}) {
		this.getSingleTabByData(tabData)
			?.handleClick();
		return await this.syncTabs();
	}

	/**
	 * Pins or unpins the given Tab and updates the pinnedTabs value
	 *
	 * @param {Object} [tabData={}] - the Tab data used to identify the Tab to be pinned/unpinned
	 * @param {boolean} [isPin=null] - whether the user wants to pin (true) or unpin (false)
	 * @throws when isPin is null
	 * @throws when the Tab is not yet pinned
	 * @return {boolean} - whether the Tab was pinned/unpinned and synced
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
		this.#pinnedTabs += isPin ? 1 : -1;
		// sync tabs
		return await this.syncTabs({
			fromInvalidateSortFunction: isPin ? undefined : true,
		});
	}
}

/**
 * Asynchronously retrieves all tabs, initializing them if needed.
 *
 * @return {Promise<TabContainer>} The TabContainer instance representing all tabs.
 */
async function getAllTabs_async() {
	if (singletonAllTabs == null) {
		await TabContainer.create();
	} else if (singletonAllTabs instanceof Promise) {
		await singletonAllTabs;
	}
	return singletonAllTabs;
}

/**
 * Synchronously returns the TabContainer instance of all tabs if initialized.
 *
 * @throws {Error} Throws if the TabContainer is not yet initialized.
 * @return {TabContainer} The initialized TabContainer instance.
 */
function getAllTabs() {
	if (singletonAllTabs == null || singletonAllTabs instanceof Promise) {
		throw new Error(["singleton", "error_not_initilized"]);
	}
	return singletonAllTabs;
}

/**
 * Ensures availability of the TabContainer instance, initializing it if necessary.
 *
 * @return {Promise<TabContainer>} The TabContainer instance representing all tabs.
 */
export async function ensureAllTabsAvailability() {
	try {
		return getAllTabs();
	} catch (e) {
		console.info(e);
		return await getAllTabs_async();
	}
}
