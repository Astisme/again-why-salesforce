import { BROWSER, WHY_KEY, PERSIST_SORT } from "/constants.js";
import Tab from "./tab.js";
import ensureTranslatorAvailability from "/translator.js";
import { getSettings } from "./constants.js";
let translator = null;
let fromSortFunction = false;

const _tabContainerSecret = Symbol("tabContainerSecret");

export default class TabContainer extends Array {

  isSorted = false;
  isSortedBy = null;
  isSortedAsc = false;
  isSortedDesc = false;

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
	 * Creates and initializes a new `TabContainer` instance.
	 *
	 * @param {Array|null} [tabs=null] - An optional array of tabs to initialize the container with. If not provided, defaults to null.
	 * @returns {Promise<TabContainer>} - A promise that resolves to the newly created and initialized `TabContainer` instance.
	 * @throws {Error} - Throws an error if the `TabContainer` cannot be initialized with the provided `tabs`.
	 */
	static async create(tabs = null) {
		translator = await ensureTranslatorAvailability();
		const tabcont = new TabContainer(_tabContainerSecret);
		if (!await tabcont._initialize(tabs)) {
			const msg = await translator.translate([
				"error_tabcont_initialize",
				JSON.stringify(tabs),
			]);
			throw new Error(msg);
		}
		return tabcont;
	}

	/**
	 * Adds one or more elements to the end of the TabContainer and returns the new length.
	 *
	 * @param {...T} items The elements to add to the end of the TabContainer.
	 * @returns {number} The new length of the TabContainer.
	 *
	 * @example
	 * const container = new TabContainer<Tab>();
	 * container.push({ id: 1, url: 'example.com' });
	 * // returns 1, container now has length 1
	 *
	 * @example
	 * // Adding multiple items
	 * container.push(
	 *   { id: 2, url: 'test1.com' },
	 *   { id: 3, url: 'test2.com' }
	 * );
	 * // returns 3, container now has length 3
	 */
	/*
    push(...items) {
        // Add each item to the end of the container
        for (let i = 0; i < items.length; i++) {
            this[this.length] = items[i];
            this.length++;
        }
        return this.length;
    }
    async push({sync = true, ...tab} = {}) {
        console.log('push',sync, tab);
        if (!Tab.isValid(tab)) { // await is needed
            throw new Error(`Invalid tab object: ${JSON.stringify(tab)}`);
        }
        if (this.exists(tab)) // await is needed
            throw new Error(`This tab already exists: ${tab.toString()}`);

        const validTab = Tab.create(tab);
        this.push(validTab);

        if (sync)
            await this.syncTabs();
        return true;
    }
    */

	/**
	 * Changes the contents of an array by removing, replacing, or adding elements.
	 *
	 * @param {number} start - The index at which to start changing the array. If negative, it is treated as an offset from the end of the array.
	 * @param {number} deleteCount - The number of elements to remove from the array starting from the `start` index. If `deleteCount` is larger than the number of elements from `start` to the end of the array, all elements after `start` will be removed.
	 * @param {...*} items - The elements to add to the array, starting at the `start` index. If no elements are provided, elements are only removed.
	 * @returns {Array} - An array containing the elements that were removed from the array.
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
		const removedItems = [];
		// Manually copy the items to be removed
		for (let i = 0; i < deleteCount; i++) {
			if (start + i < this.length) {
				removedItems.push(this[start + i]);
			}
		}
		// Create a temporary array to hold the new result
		const temp = this.slice(start + deleteCount);
		this.length = start;
		this.push(...items, ...temp);
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
	 * @returns {Array} A new array containing the extracted elements.
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
		if (start >= end) {
			return [];
		}
		const sliced = [];
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
	 * @returns {Array} A new array with the elements that pass the test.
	 *    If no elements pass the test, an empty array will be returned.
	 */
	filter(callback) {
		// Create a new instance of the same class
		const filtered = [];
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
	 * Initializes the `TabContainer` by adding tabs, either from the saved tabs or provided as an argument. Called by the constructor.
	 *
	 * @param {Array|null} [tabs=null] - An optional array of tabs to initialize the container with. If not provided, defaults to null.
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if initialization is successful, otherwise `false`.
	 * @private
	 */
	async _initialize(tabs = null) {
		/**
		 * Checks if the given tabs are valid and adds them to the context if so.
		 *
		 * @param {Object} context - The context object with an addTabs method.
		 * @param {Array} tabs - The tabs to validate and add.
		 * @returns {Promise<boolean>} Resolves to true if tabs were added, otherwise false.
		 */
		async function checkAddTabs(context, tabs) {
			if (TabContainer.isValid(tabs, false)) {
				return await context.addTabs(tabs);
			}
			return false;
		}
		const savedTabs = await this.getSavedTabs(false);
		const addedSomething = await checkAddTabs(this, savedTabs) &&
			savedTabs.length > 0;
		if (tabs == null && addedSomething) {
			return true;
		}
		if (await checkAddTabs(this, tabs) || addedSomething) {
			return true;
		}
		return await this.setDefaultTabs();
	}

	/**
	 * Retrieves the saved tabs from the browser's runtime and optionally replaces the current tabs.
	 *
	 * @param {boolean} [replace=true] - A flag indicating whether to replace the current tabs with the retrieved ones. Defaults to `true`.
	 * @returns {Promise<Object|TabContainer>} - A promise that resolves to either the `TabContainer` instance (if `replace` is `true`) or the retrieved saved tabs.
	 */
	async getSavedTabs(replace = true) {
		const res = await BROWSER.storage.sync.get([WHY_KEY]);
		const tabs = res[WHY_KEY];
		if (replace) {
			await this.replaceTabs(tabs, {
				resetTabs: true,
				removeOrgTabs: true,
				sync: false,
			});
			return this;
		}
		return tabs;
	}

	/**
	 * Sets the default tabs for the `TabContainer` by replacing the current tabs with a predefined set of tabs.
	 *
	 * @returns {Promise<void>} - A promise that resolves once the default tabs are successfully set.
	 */
	async setDefaultTabs() {
		const flows = await translator.translate("flows");
		const users = await translator.translate("users");
		return await this.replaceTabs([
			{ label: "⚡", url: "/lightning" },
			{ label: flows, url: "/lightning/app/standard__FlowsApp" },
			{ label: users, url: "ManageUsers/home" },
		], {
			resetTabs: true,
			removeOrgTabs: true,
			sync: true,
		});
	}

	/**
	 * Adds a new tab to the `TabContainer` if it is valid and does not already exist.
	 *
	 * @param {Object} tab - The tab object to be added.
	 * @param {boolean} [sync=true] - A flag indicating whether to synchronize the tabs after adding. Defaults to `true`.
	 * @throws {Error} - Throws an error if the tab object is invalid or if the tab already exists.
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if the tab is added and synchronized (if `sync` is `true`), otherwise `true` if not synchronized.
	 */
	async addTab(tab, sync = true, fromAddTabs = false) {
		if (!Tab.isValid(tab)) {
			const msg = await translator.translate([
				"error_invalid_tab",
				JSON.stringify(tab),
			]);
			throw new Error(msg);
		}
		if (this.exists(tab, true)) {
			const msg = await translator.translate([
				"error_duplicate_tab",
				JSON.stringify(tab),
			]);
			throw new Error(msg);
		}
		this.push(Tab.create(tab));
		if (sync) {
			return await this.syncTabs();
		} else if(!fromAddTabs) {
            await this.checkSetSorted();
        }
		return true;
	}

	/**
	 * Adds multiple tabs to the `TabContainer`. If a tab already exists, it is ignored.
	 *
	 * @param {Array<Object>} tabs - An array of tab objects to be added to the container.
	 * @param {boolean} [sync=true] - A flag indicating whether to synchronize the tabs after adding. Defaults to `true`.
	 * @throws {Error} - Throws an error if any tab (other than duplicates) fails to be added.
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if all tabs were added successfully (excluding duplicates), otherwise `false` if any tab could not be added.
	 */
	async addTabs(tabs, sync = true) {
		//this.push(...tabs);
		if (tabs.length === 0 && sync === false) {
			return true;
		}
		TabContainer.errorOnInvalidTabs(tabs);
		let addedAll = true;
		for (const tab of tabs) {
			try {
				await this.addTab(tab, false, true);
			} catch (error) {
				const msg = await translator.translate("error_duplicate_tab");
				if (!error.message.startsWith(msg)) {
					addedAll = false; // count duplicates as inserted
					throw error;
				}
			}
		}
		if (sync) {
			await this.syncTabs();
		} else {
            await this.checkSetSorted();
        }
		return addedAll;
	}

	/**
	 * Filters and returns tabs based on whether they are associated with an organization.
	 *
	 * @param {boolean} [getWithOrg=true] - A flag indicating whether to return tabs with an associated organization (`true`) or without (`false`). Defaults to `true`.
	 * @returns {Array<Tab>} - An array of tabs that match the specified organization condition.
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
	 * @returns {Array<Object>} - An array of tabs that match the specified organization condition.
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
	 * @param {Object|null} [param.org=null] - The organization associated with the tab to filter by.
	 * @param {boolean} [match=true] - A flag indicating whether to return tabs that exactly match the specified tab data (`true`), or those that do not match (`false`). Defaults to `true`.
	 * @returns {Array<Tab>} - An array of tabs that match the specified tab data condition.
	 */
	getTabsByData(
		{ label = null, url = null, org = null } = {},
		match = true,
		strict = false,
	) {
		if (label == null && url == null) {
			if (org == null) {
				return [];
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
	 * @throws {Error} - Throws an error if it finds 0 Tabs or more than 1 Tab.
	 * @returns {Tab} - A Tab that matches the specified tab data condition.
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
		if (matchingTabs.length > 1) {
			if (
				!match || (tab.url == null && tab.org == null) ||
				(tab.url == null && tab.org != null)
			) {
				throw new Error("error_many_tabs_found");
			}
			const filteredTabs = matchingTabs.filter((tb) =>
				tb.org == null || tb.org === tab.org
			);
			if (filteredTabs.length === 1) {
				return filteredTabs[0];
			}
			if (filteredTabs.length >= 1) {
				return filteredTabs.filter((tb) => tb.org != null)?.[0];
			}
			throw new Error("error_many_tabs_found");
		}
		return matchingTabs[0];
	}

	/**
	 * Finds the index of a tab in the container based on the specified tab data (label, url, and organization).
	 *
	 * @param {Object} [tab={}] - An object containing the tab data to find. The object can include `label`, `url`, and `org` properties. Defaults to an empty object.
	 * @param {string|null} [tab.label=null] - The label of the tab to find.
	 * @param {string|null} [tab.url=null] - The URL of the tab to find.
	 * @param {Object|null} [tab.org=null] - The organization associated with the tab to find.
	 * @throws {Error} - Throws an error if no tab data is provided or if the tab is not found.
	 * @returns {number} - The index of the tab if found.
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
	 * @param {Object} - An object containing the tab data to check for. The object can include `url` and `org` properties. Defaults to an empty object.
	 * @param {string|null} [tab.url=null] - The URL of the tab to check for.
	 * @param {Object|null} [tab.org=null] - The organization associated with the tab to check for.
	 * @returns {boolean} - `true` if a tab with the specified data exists, otherwise `false`.
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
	 * @param {Object} - An object containing the tab data to check for. The object can include `url` and `org` properties. Defaults to an empty object.
	 * @param {string|null} [tab.url=null] - The URL of the tab to check for.
	 * @param {Object|null} [tab.org=null] - The organization associated with the tab to check for.
	 * @returns {boolean} - `true` if a tab with the specified data exists, otherwise `false`.
	 */
	existsWithOrWithoutOrg({ url = null, org = null } = {}) {
		return this.exists({ url, org }) || this.exists({ url });
	}

	/**
	 * Replace all current tabs
	 * @param {Array<Tab>} newTabs - New array of tabs to replace existing tabs
	 * @param {Object} param1 - An Object containing the followig keys
	 * @param {boolean} [param1.resetTabs=true] - If `true`, resets `this.tabs`.
	 * @param {boolean} [param1.removeOrgTabs=false] - This parameter changes its function based on the value of resetTabs. In any case, if `true`, removes all org-specific Tabs
	 * When `resetTabs=true` and `removeOrgTabs=false`, removes only non-org-specific Tabs (Tabs with `org == null`), sparing org-specific Tabs.
	 * When `resetTabs=false` and `removeOrgTabs=false`, does nothing.
	 * @returns {Promise<boolean>} - A Promise stating whether the operation was successful
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
	} = {}) {
		if (
			resetTabs && removeOrgTabs && keepTabsNotThisOrg == null &&
			removeThisOrgTabs == null
		) {
			this.splice(0, this.length);
		} else if (resetTabs || removeOrgTabs) {
			this.splice(
				0,
				this.length,
				...this.filter((tab) => {
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
		// Add new tabs and sync them
		return await this.addTabs(newTabs, sync);
	}

	/**
	 * Converts the `TabContainer` instance to a JSON representation.
	 *
	 * @returns {Object} - A JSON object representing the `TabContainer` instance.
	 */
	toJSON() {
		return TabContainer.toJSON(this);
	}

	/**
	 * Returns a string representation of the `TabContainer` instance.
	 *
	 * @returns {string} - A string representing the `TabContainer` instance.
	 */
	toString() {
		return TabContainer.toString(this);
	}

	/**
	 * Import tabs from JSON
	 * @param {string} jsonString - JSON string of tabs
	 * @param {boolean} [resetTabs=false] - Whether the imported array should overwrite the currently saved tabs
	 * @param {boolean} [preserveOtherOrg=true] - Whether the org-specific tabs should be preserved
	 * @returns {number} - Number of tabs successfully imported
	 */
	async importTabs(jsonString, resetTabs = false, preserveOtherOrg = true) {
		const imported = JSON.parse(jsonString);
		TabContainer.errorOnInvalidTabs(imported);
		const backupTabs = [...this];
		try {
			if (
				await this.replaceTabs(imported, {
					resetTabs,
					removeOrgTabs: !preserveOtherOrg,
				})
			) {
				return imported.length;
			}
		} catch (error) {
			this.length = 0;
			this.push(...backupTabs);
			throw error;
		}
		return 0;
	}

	/**
	 * Synchronizes the tabs in the `TabContainer`. Optionally replaces the current tabs before synchronization.
	 * Last function called by other entry points.
	 *
	 * @param {Array|null} [tabs=null] - An optional array of tabs to replace the current tabs before synchronization. If not provided, the current tabs are used.
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if the synchronization is successful, otherwise `false`.
	 */
	async syncTabs(tabs = null, checkSort = true) {
		// replace tabs already checks the tabs
		if (tabs != null && !await this.replaceTabs(tabs, { sync: false })) {
			return false;
		}
    if(checkSort)
        await this.checkSetSorted();
		return await TabContainer._syncTabs(tabs ?? this);
	}

	/**
	 * Synchronizes the specified tabs by sending them to the browser's runtime.
	 *
	 * @param {Array|TabContainer|null} [tabs=null] - The tabs to synchronize. If `null`, synchronization is not possible.
	 * @throws {Error} - Throws an error if `tabs` is `null` or if there is an issue with the runtime message.
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if the synchronization is successful.
	 * @private
	 */
	static async _syncTabs(tabs = null) {
		if (tabs == null) {
			const msg = await translator.translate("error_sync_nothing");
			throw new Error(msg);
		}
		const set = {};
		set[WHY_KEY] = TabContainer.toJSON(tabs);
		await BROWSER.storage.sync.set(set);
		if (BROWSER.runtime.lastError) {
			throw new Error(BROWSER.runtime.lastError);
		}
		return true;
	}

	/**
	 * Validates an array of tabs, throwing an error if any tab is invalid or if the provided data is not a valid array.
	 *
	 * @param {Array|null} [tabs=null] - The array of tabs to validate.
	 * @throws {Error} - Throws an error if the array is invalid or if any tab in the array is not valid.
	 */
	static errorOnInvalidTabs(tabs = null) {
		if (!TabContainer.isValid(tabs, false)) {
			throw new Error("error_no_array", tabs);
		}
		let invalidTab = null;
		for (const tab of tabs) {
			if (!Tab.isValid(tab)) {
				invalidTab = tab;
				break;
			}
		}
		if (invalidTab != null) {
			console.trace();
			throw new Error([
				"error_tabcont_invalid_tabs",
				JSON.stringify(invalidTab),
				"tab_explain",
			]);
		}
	}

	/**
	 * Validates if the provided data is a valid array of tabs. Optionally checks if each tab in the array is valid.
	 *
	 * @param {Array|null} tabs - The array of tabs to validate.
	 * @param {boolean} [strict=true] - A flag that, when `true`, also checks if each individual tab in the array is valid. Defaults to `true`.
	 * @returns {boolean} - `true` if the tabs are valid (and all tabs are valid if `strict` is `true`), otherwise `false`.
	 */
	static isValid(tabs, strict = true) {
		const basicCheck = tabs != null && Array.isArray(tabs);
		if (!strict || !basicCheck) {
			return basicCheck;
		}
		const tabValidResults = tabs.map((tab) => Tab.isValid(tab));
		return tabValidResults.every(Boolean);
	}

	/**
	 * Converts an array of tabs to a JSON representation. Validates the tabs before conversion.
	 *
	 * @param {Array} tabs - The array of tabs to convert to JSON.
	 * @throws {Error} - Throws an error if the provided tabs are invalid.
	 * @returns {Array<Object>} - A JSON array representing the valid tabs.
	 */
	static toJSON(tabs) {
		TabContainer.errorOnInvalidTabs(tabs);
		const validArray = TabContainer.isValid(tabs) ? tabs : Array.from(tabs);
		const resultJson = [];
		for (const tab of validArray) {
			let pushTab;
			if (Tab.isTab(tab)) {
				pushTab = tab;
			} else {
				try {
					pushTab = Tab.create(tab);
				} catch (_) {
					// do not add a failing tab to the JSON
					continue;
				}
			}
			resultJson.push(pushTab.toJSON());
		}
		return resultJson;
	}

	/**
	 * Converts an array of tabs to a string representation. Validates the tabs before conversion.
	 *
	 * @param {Array} tabs - The array of tabs to convert to a string.
	 * @throws {Error} - Throws an error if the provided tabs are invalid.
	 * @returns {string} - A string representation of the valid tabs.
	 */
	static toString(tabs) {
		TabContainer.errorOnInvalidTabs(tabs);
		return `[\n${tabs.map((tab) => tab.toString()).join(",\n")}\n]`;
	}

	/**
	 * Creates a new TabContainer with the results of calling a provided function for every element.
	 *
	 * @param {Function} callback Function that produces an element of the new TabContainer.
	 *    The callback function accepts three arguments:
	 *    - currentValue: The current element being processed
	 *    - index: The index of the current element being processed
	 *    - array: The TabContainer map was called upon
	 * @returns {Array} A new Array with each element being the result of the callback function.
	 */
	map(callback) {
		// Create a new instance of TabContainer
		const mapped = [];
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
	 * @param {Object} [options={ moveBefore: true, fullMovement: false }] - Options for the movement behavior.
	 * @param {boolean} [options.moveBefore=true] - A flag indicating whether to move the tab before the current one (`true`) or after (`false`).
	 * @param {boolean} [options.fullMovement=false] - A flag indicating whether to move the tab to the start or end of the container (`true`), or just to an adjacent position (`false`).
	 * @throws {Error} - Throws an error if no matching tab is found, if more than one matching tab is found, or if no valid `url` is provided.
	 * @returns {Promise<number>} - A promise that resolves to the new index of the moved tab.
	 *
	 * @example
	 * for this example, we'll collapse miniURL and label into a single string and simply look at tabs as strings.
	 * tabs = ["a", "b", "c", "d", "e"]
	 *
	 * moveTab("c") || moveTab("c",true) || moveTab("c",true,false)
	 * ==> tabs = ["a", "c", "b", "d", "e"]
	 *
	 * moveTab("c",false) || moveTab("c",false,false)
	 * ==> tabs = ["a", "b", "d", "c", "e"]
	 *
	 * moveTab("c",true,true)
	 * ==> tabs = ["c", "a", "b", "d", "e"]
	 *
	 * moveTab("c",false,true)
	 * ==> tabs = ["a", "b", "d", "e", "c"]
	 */
	async moveTab(
		inputTab = { label: null, url: null, org: null },
		{ moveBefore = true, fullMovement = false } = {},
	) {
		const matchTab = this.getSingleTabByData(inputTab);
		const currentIndex = this.getTabIndex(matchTab);
		let newIndex;
		if (fullMovement) {
			const [tab] = this.splice(currentIndex, 1);
			if (moveBefore) {
				this.unshift(tab);
				newIndex = 0;
			} else {
				this.push(tab);
				newIndex = this.length - 1;
			}
		} else {
			// check that the new index place does not contain a not-this-org Tab
			let correctedIndexFound = false;
			let i = 1;
			while (!correctedIndexFound && i < this.length) {
				newIndex = moveBefore
					? Math.max(0, currentIndex - i)
					: Math.min(this.length, currentIndex + i);
				const targetTabAtIndex = this[newIndex];
				correctedIndexFound = inputTab.org == null ||
					targetTabAtIndex?.org == null ||
					targetTabAtIndex?.org === inputTab.org;
				i++;
			}
			// from newIndex, remove 0 tabs and insert `tab` in their place
			this.splice(newIndex, 0, ...this.splice(currentIndex, 1));
		}
		await this.syncTabs();
		return newIndex;
	}

	/**
	 * Remove all tabs matching the label, url and org (based on the passed data)
	 *
	 * @param {Object} tab - an Object containing the following parameters to match a Tab to remove
	 * @param {string} tab.label - the label of the Tab to remove
	 * @param {string} tab.url - the url of the Tab to remove
	 * @param {string} tab.org - the org of the Tab to remove
	 * @returns {boolean} - Whether a tab was removed
	 */
	async remove(tab = { label: null, url: null, org: null }) {
		if (tab.label == null && tab.url == null && tab.org == null) {
			const msg = await translator.translate("error_no_data");
			throw new Error(msg);
		}
		const index = this.getTabIndex(this.getSingleTabByData(tab));
		const initialLength = this.length;
		this.splice(index, 1);
		if (!await this.syncTabs()) {
			return false;
		}
		return this.length < initialLength;
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
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if the tabs are successfully synchronized after removal.
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
		tab = { label: null, url: null, org: null },
		{ removeBefore = null } = {},
	) {
		const matchTab = this.getSingleTabByData(tab);
		// remove all tabs but this one
		if (removeBefore == null) {
			return await this.syncTabs([matchTab]);
		}
		/**
		 * Checks if a Tab is org-specific and whether its `org` property is different from the one of the Tab received by the outer function.
		 *
		 * @param {Object} [tb] - The Tab that needs to be checked
		 * @param {string|null} [tab.org=null] - The Org of the Tab to check.
		 */
		function getTabsNotThisOrg(tb) {
			return tb.org != null && tb.org !== tab.org;
		}
		const index = this.getTabIndex(matchTab);
		// prevent org tabs which are not for this org to be deleted unwillingly
		if (removeBefore) {
			this.unshift(
				...this.splice(0, index)
					.filter(getTabsNotThisOrg),
			);
		} else {
			this.push(
				...this.splice(index + 1, this.length)
					.filter(getTabsNotThisOrg),
			);
		}
		return await this.syncTabs();
	}

  /**
	 * Sorts the tabs in the container by a specified property and order.
	 * After sorting, it synchronizes the changes.
	 *
	 * @param {Object} [options={}] - The sorting options.
	 * @param {string} [options.sortBy='label'] - The property to sort by. Valid options found at Tab.allowedKeys.
	 * @param {boolean} [options.sortAsc=true] - The sorting direction. Set to `true` for ascending order and `false` for descending.
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if the sorting and (optional) synchronization are successful.
	 * @throws {Error} - Throws an error if an invalid `sortBy` property is provided.
	 */
	async sort({ sortBy = 'label', sortAsc = true } = {}, sync = true) {
    // Check for unexpected keys
    if (!Tab.allowedKeys.has(sortBy)) {
      throw new Error(
        ["error_tab_unexpected_keys", sortBy],
      );
    }
    const sortFactor = sortAsc ? 1 : -1;
		super.sort((a, b) => {
			const valA = a[sortBy];
			const valB = b[sortBy];
			// Treat null or undefined values as "smaller" to ensure they are grouped together
			if (valA == null && valB != null) return -sortFactor;
			if (valA != null && valB == null) return sortFactor;
			if (valA == null && valB == null) return 0;
			// Perform case-insensitive comparison for strings
      // Adjust direction for descending order
			return sortFactor * String(valA).localeCompare(String(valB), undefined, { sensitivity: 'base' });
		});
    this.isSorted = true;
    this.isSortedBy = sortBy;
    this.isSortedAsc = sortAsc;
    this.isSortedDesc = !sortAsc;
		// Persist the new order
        if(sync){
            fromSortFunction = true;
            return await this.syncTabs(undefined, false);
        }
        return true;
	}


  /**
   * Checks if the provided tabs are sorted by one of the allowed keys
   * ('label', 'url', or 'org') in either ascending or descending order.
   * 
   * Sets the following properties on the instance:
   * - `isSorted`: `true` if the tabs are sorted by any key, otherwise `false`
   * - `isSortedBy`: the key the tabs are sorted by (`'label'`, `'url'`, or `'org'`), or `null`
   * - `isSortedAsc`: `true` if sorted in ascending order, `false` otherwise
   * - `isSortedDesc`: `true` if sorted in descending order, `false` otherwise
   * 
   * Rules:
   * - If `isSorted` is `false`, both `isSortedAsc` and `isSortedDesc` will also be `false`.
   * - If `isSorted` is `true`, exactly one of `isSortedAsc` or `isSortedDesc` will be `true`.
   *
   * @returns {boolean} whether the tabs in input are sorted or not.
   */
  async checkSetSorted() {
    if(fromSortFunction){
      fromSortFunction = false;
      return;
    }
      // check if the user wants to keep the Tabs always sorted
      if(await this.checkShouldKeepSorted()) // if true, has already sorted and set the variables
          return;
    this.isSorted = false;
    this.isSortedBy = null;
    this.isSortedAsc = false;
    this.isSortedDesc = false;
    for (const key of Tab.allowedKeys) {
      let asc = true;
      let desc = true;
      for (let i = 1; i < this.length; i++) {
        const prev = this[i - 1][key];
        const curr = this[i][key];
        const prevVal = prev == null ? '' : String(prev).toLowerCase();
        const currVal = curr == null ? '' : String(curr).toLowerCase();
        if (prevVal > currVal) asc = false;
        if (prevVal < currVal) desc = false;
        if (!asc && !desc) break; // No need to continue checking
      }
      if (asc || desc) {
        this.isSorted = true;
        this.isSortedBy = key;
        this.isSortedAsc = asc;
        this.isSortedDesc = desc;
        break; // Exit after first detected sort order
      }
    }
    return this.isSorted;
  }

    async checkShouldKeepSorted(){
        const persistSort = await getSettings(PERSIST_SORT);
        if(persistSort == null || persistSort.enabled === null)
            return false; // not set or esplicitly set as not enabled
        // Tabs should be kept sorted by persistSort.enabled
        return await this.sort({
            sortBy: persistSort.enabled,
            sortAsc: persistSort.ascending ?? true,
        }, false);
    }
}
