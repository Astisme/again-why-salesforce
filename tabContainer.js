import { Tab } from "./tab.js";

const _tabContainerSecret = Symbol('tabContainerSecret');

export class TabContainer extends Array {
    /**
     * Creates the TabContainer while setting the tabs
     * @param {Array<Tab>|null} [tabs=null] - An array containing Tab objects (only valid Tabs are used)
     */
    constructor(secret) {
        if(secret !== _tabContainerSecret){
            console.trace()
            throw new Error("Use TabContainer.create() instead of new TabContainer()")
        }
        super();
    }

    /**
      * //TESTOK
      */
    static async create(tabs = null){
        const tabcont = new TabContainer(_tabContainerSecret);
        if(!await tabcont._initialize(tabs))
            throw new Error(`Cannot initialize with ${JSON.stringify(tabs)}`)
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
    */

    /**
     * Safely splice tabs while maintaining TabContainer instance
     * @param {number} start - The start index
     * @param {number} deleteCount - Number of elements to delete
     * @param {...Tab} items - Items to insert
     * @returns {Tab[]} - Array of removed elements
      * //TESTOK
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

        // Calculate the new length
        const newLength = this.length - deleteCount + items.length;
        // Create a temporary array to hold the new result
        const temp = new Array(newLength);
        let j = 0;

        // Copy elements before start
        for (let i = 0; i < start; i++) {
            temp[j++] = this[i];
        }
        // Copy the inserted items
        for (let i = 0; i < items.length; i++) {
            temp[j++] = items[i];
        }
        // Copy the rest of the original elements
        for (let i = start + deleteCount; i < this.length; i++) {
            temp[j++] = this[i];
        }

        // Copy back into "this" and update length
        for (let i = 0; i < newLength; i++) {
            this[i] = temp[i];
        }
        this.length = newLength;

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
    /*
    slice(start = 0, end = this.length) {
        // Convert negative indices to positive
        let normalizedStart = start < 0 
            ? Math.max(this.length + start, 0)
            : Math.min(start, this.length);
            
        let normalizedEnd = end < 0
            ? Math.max(this.length + end, 0)
            : Math.min(end, this.length);
        
        // Ensure start is not greater than end
        if (normalizedStart > normalizedEnd) {
            normalizedStart = normalizedEnd;
        }
        
        const sliced = [];
        // Copy elements to the new array
        for (let i = normalizedStart; i < normalizedEnd; i++) {
            if (i in this) {
                sliced.push(this[i]);
            }
        }
        
        return sliced;
    }
    */

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
      * //TESTOK
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
     * Initializes the tabs based on the synced tabs from the background.
     * Gets all the available tabs while also looking for synced ones.
      * //TESTOK
     */
    async _initialize(tabs = null) {
        async function checkAddTabs(context, tabs) {
            if (await TabContainer.isValid(tabs, false)) {
                return await context.addTabs(tabs);
            }
            return false;
        }
        
        const savedTabs = await this.getSavedTabs(false);
        const addedSomething = await checkAddTabs(this, savedTabs) && savedTabs.length > 0;
        if(tabs == null && addedSomething)
            return addedSomething;

        if(await checkAddTabs(this, tabs) || addedSomething)
            return true;

        return await this.setDefaultTabs();
    }

    async getSavedTabs(replace = true){
        const res = await chrome.runtime.sendMessage(
            { message: { what: "get" }},
        );

        if(replace)
            await this.replaceTabs(res, {
                resetTabs: true,
                removeOrgTabs: true,
                sync: false,
            });

        return replace ? this : res;
    }

    /**
     * Initializes the default tabs and syncs them to storage.
      * //TESTOK
     */
    async setDefaultTabs() {
        const res = await this.replaceTabs([
            { label: "⚡", url: "/lightning" },
            { label: "Flows", url: "/lightning/app/standard__FlowsApp" },
            { label: "Users", url: "ManageUsers/home" },
        ], {
            resetTabs: true,
            removeOrgTabs: true,
            sync: true
        });
        return res;
    }


    /**
     * Add a new tab to the collection and sync it with the background.
     * @param {Object} tab - Tab object with label, url, and optional org
     * @param {boolean} [sync=true] - whether a sync operation should be performed
     * @returns {boolean} - Whether the tab was successfully added
      * //TESTOK
     */
    async addTab(tab, sync = true) {
        if (!await Tab.isValid(tab)) { // await is needed
            throw new Error(`Invalid tab object: ${JSON.stringify(tab)}`);
        }
        if (await this.exists(tab)){
            throw new Error(`This tab already exists: ${JSON.stringify(tab)}`);
        }

        const validTab = await Tab.create(tab);
        this.push(validTab);

        if (sync)
            await this.syncTabs();
        return true;
    }

    /**
     * Add a collection of tabs to the collection and sync it with the background.
     * @param {Array<Tab>} tabs - the tabs to be added
     * @param {boolean} [sync=true] - whether a sync operation should be performed
     * @returns {boolean} - Whether the tab was successfully added
      * //TESTOK
     */
    async addTabs(tabs, sync = true) {
        //this.push(...tabs);
        if(tabs.length === 0 && sync === false)
            return true;

        await TabContainer.errorOnInvalidTabs(tabs);

        let addedAll = true;
        for(const tab of tabs){
            try {
                await this.addTab(tab, false);
            } catch (error) {
                if(!error.message.startsWith("This tab already exists")){
                    addedAll = false; // count duplicates as inserted
                    throw error;
                }
            }
        };

        if(sync)
            await this.syncTabs();

        return addedAll;
    }
    /*
    async push({sync = true, ...tab} = {}) {
        console.log('push',sync, tab);
        if (!await Tab.isValid(tab)) { // await is needed
            throw new Error(`Invalid tab object: ${JSON.stringify(tab)}`);
        }
        if (await this.exists(tab)) // await is needed
            throw new Error(`This tab already exists: ${tab.toString()}`);

        const validTab = await Tab.create(tab);
        this.push(validTab);

        if (sync)
            await this.syncTabs();
        return true;
    }
    */

    /**
     * Get tabs with or without an org
     * @param {boolean} [getWithOrg=true] - Wheter the org should be checked with or agains
     * @returns {Array} - Tabs belonging to the some organization
      * //TESTOK
     */
    getTabsWithOrg(getWithOrg = true) {
        return this.filter(tab => 
            getWithOrg === (tab.org != null)
        );
    }

    /**
     * Get tabs filtered by organization
     * @param {string} org - Organization name to filter by
     * @param {boolean} [matchOrg=true] - Wheter the org specified should be checked with or agains
     * @returns {Array} - Tabs belonging to the specified organization
      * //TESTOK
     */
    getTabsByOrg(org = null, matchOrg = true) {
        if(org == null)
            throw new Error("Cannot get Tabs if Org is not specified.");
        return this.filter(tab => 
            tab.org != null 
            && (
                matchOrg === (tab.org === org) 
            )
        );
    }

    /**
     *
      * //TESTOK except match = false
     */
    getTabsByData(tab = {label: null, url: null, org: null}, match = true){
        if(tab.label == null && tab.url == null)
            if(tab.org == null)
                return [];
            else
                return this.getTabsByOrg(tab.org);

        return this.filter(tb => 
            match === tb.equals({
                label: tab.label,
                url: tab.url,
                org: tab.org,
            })
        );
    }

    /**
     *
      * //TESTOK
     */
    getTabIndex(tab = {label: null, url: null, org: null}){ 
        if(tab.label == null && tab.url == null && tab.org == null)
            throw new Error("Cannot find index without data.");

        const index = this.findIndex((tb) =>
            tb.equals({
                label: tab.label,
                url: tab.url,
                org: tab.org,
            })
        );

        if(index < 0)
            throw new Error("Tab was not found.");
        return index;
    }

    /**
     * Check if a tab with a specific label, url and org (based on the passed data) already exists
     * @param {Object} param0  - an Object containing the following parameters to match a Tab to find
     * @param {string} param0.label - the label of the Tab to find
     * @param {string} param0.url - the url of the Tab to find
     * @param {string} param0.org - the org of the Tab to find
     * @returns {boolean} - Whether the tab exists
      * //TESTOK
     */
    async exists(tab = {label: undefined, url: undefined, org: undefined}) {
        if(tab.url != null)
            tab.url = Tab.minifyURL(tab.url);
        if(tab.org != null)
            tab.org = Tab.extractOrgName(tab.org);
        return this.length !== 0 && 
                this.some(tb => 
                    tb.equals(tab)
                );
    }

    /**
     * Replace all current tabs
     * @param {Array<Tab>} newTabs - New array of tabs to replace existing tabs
     * @param {Object} param1 - An Object containing the followig keys
     * @param {boolean} [param1.resetTabs=true] - If `true`, resets `this.tabs`.
     * @param {boolean} [param1.removeOrgTabs=false] - This parameter changes its function based on the value of resetTabs. In any case, if `true`, removes all org-specific Tabs
     * When `resetTabs=true` and `removeOrgTabs=false`, removes only non-org-specific Tabs (Tabs with `org == null`), sparing org-specific Tabs.
     * When `resetTabs=false` and `removeOrgTabs=false`, does nothing.
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
      * //TESTOK
         */
    async replaceTabs(newTabs = [], {
        resetTabs = true,
        removeOrgTabs = false,
        sync = true,
        keepTabsNotThisOrg = null,
    } = {}) {
        // If resetTabs, clear existing tabs
        if (resetTabs) {
            // if removeOrgTabs, clear existing tabs and existing tabs with an org set as well
            // else, clear existing tabs which do not have an org set
            if (removeOrgTabs) {
                // if keepTabsNotThisOrg, clear existing tabs and existing tabs with an org set but not matching the keepTabsNotThisOrg string
                // else, clear existing tabs
                if (keepTabsNotThisOrg != null) {
                    this.splice(0, this.length, ...this.filter(tab => tab.org != null && tab.org !== keepTabsNotThisOrg));
                } else {
                    this.splice(0, this.length);
                }
            } else {
                // Keep only org-specific tabs
                this.splice(0, this.length, ...this.filter(tab => tab.org != null));
            }
        } else if (removeOrgTabs) {
            // if keepTabsNotThisOrg, remove the org tabs which do not match the keepTabsNotThisOrg string
            // else, keep only non-org-specific tabs
            if (keepTabsNotThisOrg != null) {
                this.splice(0, this.length, ...this.filter(tab => tab.org == null || tab.org !== keepTabsNotThisOrg));
            } else {
                this.splice(0, this.length, ...this.filter(tab => tab.org == null));
            }
        }

        // Add new tabs and sync them
        return await this.addTabs(newTabs, sync);
    }
    /**
     * 
      * //TESTOK
     */
    async toJSON(){
        return await TabContainer.toJSON(this);
    }

    /**
     * Export Tabs to JSON
     * @returns {string} - JSON string of Tabs
      * //TESTOK
     */
    async toString() {
        return await TabContainer.toString(this);
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
        
        await TabContainer.errorOnInvalidTabs(imported);

        const currentTabs = [];
        currentTabs.push(...this);
        try {
            if(await this.replaceTabs(imported, {
                resetTabs,
                removeOrgTabs: !preserveOtherOrg,
            }))
                return imported.length;
        } catch (error) {
            this.push(...currentTabs);
            throw error;
        }
        return 0;
    }

    /**
     * Sync tabs with the background.
     * @param {Array<Tab>} tabs - The array which will be used from now on (if provided)
      * //TESTOK
     */
    async syncTabs(tabs = null){
        // replace tabs already checks the tabs
        if(tabs != null && !await this.replaceTabs(tabs, {sync: false}))
            return false;
        return await TabContainer._syncTabs(this);
    }

    /**
     * Sync tabs with the background
     * @param {Array<Tab>} tabs - The tabs to be synced
      * //TESTOK
     */
    static async _syncTabs(inputTabs = null){
        if(inputTabs == null)
            throw new Error("Cannot sync null tabs!");
        const tabs = await TabContainer.toJSON(inputTabs);
        await chrome.runtime.sendMessage(
            { message: { what: "set", tabs }},
        );
        if(chrome.runtime.lastError)
            throw new Error(chrome.runtime.lastError);
        return true;
    }

    /**
     * Throw an error for every invalid Tab passed
     * @param {Array<Tab>} tabs - The tabs to be validated
      * //TESTOK
     */
    static async errorOnInvalidTabs(tabs = null){
        if(!await TabContainer.isValid(tabs, false))
            throw new Error("Invalid array or no array was passed",tabs);

        async function checkTabs(tabs){
            for(const tab of tabs)
                if(!await Tab.isValid(tab)) // await is needed
                    return tab;
            return null;
        }

        const invalidTab = await checkTabs(tabs);
        if(invalidTab != null){
            throw new Error(`Invalid Tab(s) detected.\nFirst occurrence: ${JSON.stringify(invalidTab)}.\nEach item must have 'label' and 'url' as strings. Additionally, every item may have an 'org' as string.`);
        }
    }

    /**
     * Check if an array is a valid TabContainer
     * @param {Array<Tab>} tabs - The tabs to be validated
     * @returns {boolean} Whether the array as input is valid.
      * //TESTOK
     */
    static async isValid(tabs, strict = true){
        const basicCheck = tabs != null && Array.isArray(tabs);
        if(!strict || !basicCheck)
            return basicCheck;

        const tabValidResults = await Promise.all(
            tabs.map(async tab => await Tab.isValid(tab))
        );
        return tabValidResults.every(Boolean);
        /*
            && (
                !strict ||
                (
                    tabs.every(tab => Tab.isTab(tab))
                    //&& tabs instanceof TabContainer
                )
            );
        */
    }

    /**
     *
      * //TESTOK
     */
    static async toJSON(tabs){
        await TabContainer.errorOnInvalidTabs(tabs);
        const validArray = await TabContainer.isValid(tabs) ? tabs : Array.from(tabs);
        if (validArray.length !== tabs.length) {
            console.warn('Array length mismatch:', {
                original: tabs.length,
                new: validArray.length
            });
        }
        const resultJson = [];
        for(const tab of validArray){
            let pushTab;
            if(Tab.isTab(tab))
                pushTab = tab;
            else {
                try {
                    pushTab = await Tab.create(tab);
                } catch (error) {
                    // do not add a failing tab to the JSON
                    continue;
                }
            }
            resultJson.push(pushTab.toJSON());
        }
        return resultJson;
    }
    
    /**
     *
      * //TESTOK
     */
    static async toString(tabs){
        await TabContainer.errorOnInvalidTabs(tabs);
        return `[\n${tabs.map(tab => tab.toString()).join(",\n")}\n]`;
        //return JSON.stringify(this.tabs, null, 4);
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
     * 
      * //TESTOK
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
     * Moves a tab to the specified spot and then reloads.
     *
     * @param {string} miniURL - the minified URL of the tab to keep
     * @param {string} tabTitle - the title of the tab to keep
     * @param {boolean} [moveBefore=true] - whether the tab should be moved one space before in the array
     * @param {boolean} [fullMovement=false] - whether the tab should be moved at the begin or end of the array instead of moving it only one space
     *
     * @example
     * for this example, we'll collapse miniURL and tabTitle into a single string and simply look at tabs as strings.
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
      * //TESTOK
     */
    async moveTab({label = null, url = null} = {}, {moveBefore = true, fullMovement = false} = {}) {
        if(url == null)
            throw new Error("Cannot identify Tab.");

        const matchingTabs = this.getTabsByData({label,url});
        if(matchingTabs.length === 0)
            throw new Error("Did not find any matching Tabs.");

        const matchTab = matchingTabs[0];
        if (label == null) {
            if(matchingTabs.length > 1)
                throw new Error("Found more than 1 matching Tab.");
            label = matchTab.label;
        }

        const index = await this.getTabIndex({label, url});
        // TODO changed signature of function

        const [tab] = this.splice(index, 1);

        let newIndex;
        if (fullMovement) {
            if(moveBefore){
                this.unshift(tab);
                newIndex = 0;
            } else {
                this.push(tab);
                newIndex = this.length - 1;
            }
        } else {
            newIndex = moveBefore
                ? Math.max(0, index - 1)
                : Math.min(this.length, index + 1);
            // from newIndex, remove 0 tabs and insert `tab` in their place
            this.splice(newIndex, 0, tab);
        }

        await this.syncTabs();
        return newIndex;
    }

    /**
     * Remove all tabs matching the label, url and org (based on the passed data)
     * @param {Object} param0  - an Object containing the following parameters to match a Tab to remove
     * @param {string} param0.label - the label of the Tab to remove
     * @param {string} param0.url - the url of the Tab to remove
     * @param {string} param0.org - the org of the Tab to remove
     * @returns {boolean} - Whether a tab was removed
      * //TESTOK
     */
    async remove(tab = {label: null, url: null, org: null}) {
        if(tab.label == null && tab.url == null && tab.org == null)
            throw new Error("Cannot identify Tab without data.");
        const index = this.getTabIndex(tab);
        const initialLength = this.length;
        this.splice(index, 1);
        await this.syncTabs();
        return this.length < initialLength;
    }

    /**
     * Removes the other saved tabs and then reloads.
     *
     * @param {string} miniURL - the minified URL of the tab to keep
     * @param {string} tabTitle - the title of the tab to keep
     * @param {boolean || null} [removeBefore=null] - special value to change the behaviour of the function. When not passed, the specified tab will be the only one kept. When true, only the tabs before it will be removed. When false, only the tabs after it will be removed.
     *
     * @example
     * for this example, we'll collapse miniURL and tabTitle into a single string and simply look at tabs as strings.
     * tabs = ["a", "b", "c"]
     *
     * removeOtherTabs("b") || removeOtherTabs("b",null) ==> tabs = ["b"]
     * removeOtherTabs("b",true) ==> tabs = ["b", "c"]
     * removeOtherTabs("b",false) ==> tabs = ["a", "b"]
      * //TESTOK
     */
    async removeOtherTabs({label = null, url = null} = {}, {removeBefore = null} = {}) {
        // TODO changed signature of function
        if(url == null)
            throw new Error("Cannot identify Tab.");

        const matchingTabs = this.getTabsByData({label,url});
        if(matchingTabs.length === 0)
            throw new Error("This is not a saved tab!");

        const matchTab = matchingTabs[0];
        if (label == null) {
            if(matchingTabs.length > 1)
                throw new Error("Found more than 1 matching Tab.");
            label = matchTab.label;
        }

        // remove all tabs but this one
        if (removeBefore == null) {
            return await this.syncTabs([matchTab]);
        }

        const index = this.getTabIndex({label,url});

        removeBefore
            ? this.splice(0, index)
            : this.splice(index + 1, this.length);
        return await this.syncTabs();
    }

    /**
     * changed to async and not aligned anything
     */
    /*
    static async removeDuplicates(tabs) {
        if (!await TabContainer.isValid(tabs, false)) {
            throw new Error("Cannot remove duplicates from an invalid container.");
        }

        // make sure we have Tabs
        //tabs = await Promise.all(
            //tabs.map(tab => 
                //Tab.create(tab)
            //)
        //);


        // all elements of the array are Tabs
        const uniqueTabs = new Map();
        tabs.forEach(tab => {
            //const key = tab.hashCode();
            const key = JSON.stringify(tab);
            if (!uniqueTabs.has(key)) {
                uniqueTabs.set(key, tab);
            }
        });
        
        return new TabContainer(
            Array.from(uniqueTabs.values()),
            _tabContainerSecret,
        );
    }
    */
}
