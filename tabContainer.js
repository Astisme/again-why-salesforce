import { Tab } from "./tab.js";

const _tabContainerSecret = Symbol('tabContainerSecret');

class TabContainer {
    /**
     * Creates the TabContainer while setting the this.tabs variable
     * @param {Array<Tab>|null} [tabs=null] - An array containing Tab objects (only valid Tabs are used). This will be used to set this.tabs if passed.
     */
    constructor(tabs = null, secret) {
        if (secret !== _tabContainerSecret) {
          throw new Error('You cannot instantiate different TabContainers.');
        }

        this.tabs = [];
        this._initializationPromise = this._initialize(tabs);
    }

    /**
     * Inizializes the this.tabs variable based on the synced tabs from the background.
     * Gets all the available tabs while also looking for synced ones.
     */
    async _initialize(tabs) {
        async function checkAddTabs(context, tabs){
            if (tabs != null && Array.isArray(tabs)) {
                await context.addTabs(tabs);
                return true;
            }
            return false;
        }
        
        if(await checkAddTabs(this, tabs))
            return;

        const savedTabs = await chrome.runtime.sendMessage(
            { message: { what: "get" }},
        ); 
        if(!await checkAddTabs(this, savedTabs))
            await this.setDefaultTabs();
    }

    /**
     *
     */
    async ensureInitialized() {
        await this._initializationPromise;
    }

	/**
	 * Initializes the default tabs and syncs them to storage.
	 */
	async setDefaultTabs() {
        const replaced = await this.replaceTabs([
			{ label: "⚡", url: "/lightning" },
			{ label: "Flows", url: "/lightning/app/standard__FlowsApp" },
			{ label: "Users", url: "ManageUsers/home" },
		], {
            resetTabs: true,
            removeOrgTabs: true,
            sync: true
        });
        return replaced;
	}

    /**
     * Gets all the available tabs
     * @returns {Array<Tab>} - An array containing zero or more Tab objects.
     */
    async getTabs() {
        return this.tabs;
    }

    /**
     * Add a new tab to the collection and sync it with the background.
     * @param {Object} tab - Tab object with label, url, and optional org
     * @param {boolean} [sync=true] - whether a sync operation should be performed
     * @returns {boolean} - Whether the tab was successfully added
     */
    async addTab(tab, sync = true) {
        if (!await Tab.isValid(tab)) { // await is needed
            throw new Error(`Invalid tab object: ${JSON.stringify(tab)}`);
        }
        if(await this.tabExistsByTab(tab)) // await is needed
            throw new Error(`This tab already exists: ${tab.toString()}`);


        const validTab = await Tab.create(tab);
        this.tabs.push(validTab);

        if(sync)
            await this.syncTabs();
        return true;
    }

    /**
     * Add a collection of tabs to the collection and sync it with the background.
     * @param {Array<Tab>} tabs - the tabs to be added
     * @param {boolean} [sync=true] - whether a sync operation should be performed
     * @returns {boolean} - Whether the tab was successfully added
     */
    async addTabs(tabs, sync = true) {
        TabContainer.errorOnInvalidTabs(tabs);
        if(tabs.length === 0 && sync === false)
            return true;

        let addedAll = true;
        for(const tab of tabs){
            try {
                await this.addTab(tab, false);
            } catch (error) {
                addedAll = false;
                if(error.message !== "This tab already exists")
                    throw error;
            }
        };

        if(sync)
            await this.syncTabs();

        return addedAll;
    }

    /**
     * Remove all tabs matching the label, url and org (based on the passed data)
     * @param {Object} param0  - an Object containing the following parameters to match a Tab to remove
     * @param {string} param0.label - the label of the Tab to remove
     * @param {string} param0.url - the url of the Tab to remove
     * @param {string} param0.org - the org of the Tab to remove
     * @returns {boolean} - Whether a tab was removed
     */
    async removeTabsByData({label, url, org} = {}) {
        const initialLength = this.tabs.length;
        this.tabs = this.tabs.filter(tab => 
            !tab.equalsByData({label,url,org})
        );
        return this.tabs.length < initialLength;
    }

    /**
     * Remove the Tab passed as input
     * @param {Tab} tab - the Tab to remove
     * @returns {boolean} - Whether a Tab was removed
     */
    async removeTabsByTab(tab) {
        const initialLength = this.tabs.length;
        this.tabs = this.tabs.filter(tb => !tb.equalsByTab(tab));
        return this.tabs.length < initialLength;
    }

    /**
     * Get tabs with or without an org
     * @param {boolean} [getWithOrg=true] - Wheter the org should be checked with or agains
     * @returns {Array} - Tabs belonging to the some organization
     */
    async getTabsWithOrg(getWithOrg = true) {
        return this.tabs.filter(tab => 
            (getWithOrg && tab.org != null)
            || (!getWithOrg && tab.org == null)
        );
    }

    /**
     * Get tabs filtered by organization
     * @param {string} org - Organization name to filter by
     * @param {boolean} [matchOrg=true] - Wheter the org specified should be checked with or agains
     * @returns {Array} - Tabs belonging to the specified organization
     */
    async getTabsByOrg(org, matchOrg = true) {
        return this.tabs.filter(tab => 
            tab.org != null 
            && (
                (matchOrg && tab.org === org) 
                || (!matchOrg && tab.org !== org)
            )
        );
    }

    /**
     *
     */
    async getTabsByData({label, url, org}){
        if(label == null && url == null && org == null)
            return [];
        return this.tabs.filter(tab => 
            tab.equalsByData({label,url,org})
        );
    }

    /**
     *
     */
    async _getTabIndex(tabOrData, isTab = true){ 
        if(tabOrData == null)
            throw new Error("Cannot search for null Tab.");
        if((isTab && !await Tab.isValid(tabOrData)) // await is needed
            || (!isTab && tabOrData.label == null && tabOrData.url == null && tabOrData.org == null))
            throw new Error("Cannot search for invalid Tab.");

        const index = this.tabs.findIndex((tab) =>
            (isTab && tab.equalsByTab(tabOrData))
            || (!isTab && tab.equalsByData({label:tabOrData.label,url:tabOrData.url,org:tabOrData.org}))
        );
        if(index === -1)
            throw new Error("Tab was not found.");
        return index;
    }

    /**
     *
     */
    async getTabIndexByTab(tabToFind){
        const res = await this._getTabIndex(tabToFind, true);
        return res;
    }

    /**
     *
     */
    async getTabIndexByData({label,url,org}){
        const res = await this._getTabIndex({label, url,org},false);
        return res;
    }

    /**
     * Check if a tab with a specific label, url and org (based on the passed data) already exists
     * @param {Object} param0  - an Object containing the following parameters to match a Tab to find
     * @param {string} param0.label - the label of the Tab to find
     * @param {string} param0.url - the url of the Tab to find
     * @param {string} param0.org - the org of the Tab to find
     * @returns {boolean} - Whether the tab exists
     */
    tabExistsByData({label,url,org} = {}) {
        return this.tabs.some(tab => 
            tab.equalsByData({label,url,org})
        );
    }
    
    /**
     * Check if a Tab is already exists added to the list
     * @param {Tab} tab - the Tab to find
     * @returns {boolean} - Whether the Tab exists
     */
    async tabExistsByTab(tab) {
        if (this.tabs == []) {
            return false;
        }
        
        try {
            console.log('tab passed to tabExistsByTab', tab, this.tabs, this.tabs.length);
            const results = await Promise.all(
                this.tabs.map(async tb => {
                    const res = await tb.equalsByTab(tab);
                    console.log('Checked tab:', tb, res);
                    return res;
                })
            );
            console.log('Equality check results:', results);
            return results.some(result => result);
        } catch (error) {
            console.error('Error in tabExistsByTab:', error);
            return false;
        }
        /*
        const results = await Promise.all(
            this.tabs.map(async tb => 
                await tb.equalsByTab(tab)
            )
        );
        return results.some(res => res);
        */
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
                if(keepTabsNotThisOrg != null){
                    this.tabs = this.tabs.filter(tab => tab.org != null && tab.org !== keepTabsNotThisOrg);
                } else {
                    this.tabs = [];
                }
            } else {
                // Keep only org-specific tabs
                this.tabs = this.tabs.filter(tab => tab.org != null);
            }
        } else if(removeOrgTabs){
            // if keepTabsNotThisOrg, remove the org tabs which do not match the keepTabsNotThisOrg string
            // else, keep only non-org-specific tabs
            if(keepTabsNotThisOrg != null){
                this.tabs = this.tabs.filter(tab => tab.org == null || tab.org !== keepTabsNotThisOrg);
            } else {
                this.tabs = this.tabs.filter(tab => tab.org == null);
            }
        }

        // Add new tabs and sync them
        const res = await this.addTabs(newTabs, sync);
        return res;
    }

    /**
     * 
     */
    toJSON(){
        return TabContainer.toJSON(this.tabs);
    }

    /**
     * Export Tabs to JSON
     * @returns {string} - JSON string of Tabs
     */
    toString() {
        return TabContainer.toString(this.tabs);
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

        if(await this.replaceTabs(imported, resetTabs, !preserveOtherOrg))
            return imported.length;
        return 0;
    }

    /**
     * Sync tabs with the background.
     * @param {Array<Tab>} tabs - The array which will be used from now on (if provided)
     */
    async syncTabs(tabs = null){
        const check = tabs == null;
        // replace tabs already checks the tabs
        !check && await this.replaceTabs(tabs, {sync: false});
        //console.log('synctabs',this.tabs);
        return TabContainer._syncTabs(this.tabs, check);
    }

    /**
     * Compares two TabContainers to check if they are equal.
     *
     * @param {Array<Tab>} tabs - The TabContainer to match against
     * @returns {boolean} True if the arrays are equal, false otherwise.
     */
    async equals(tabs){
        return tabs.every(async tab => await Tab.isValid(tab) && this.tabs.some(ttb => ttb.equalsByTab(tab))) // await is needed
            //&& JSON.stringify(this.tabs) === JSON.stringify(tabs);
    }

    /**
     * Sync tabs with the background
     * @param {Array<Tab>} tabs - The tabs to be synced
     */
    static _syncTabs(tabs, check){
        check && TabContainer.errorOnInvalidTabs(tabs);

        //console.warn('staticsync',tabs);
        return chrome.runtime.sendMessage(
            { message: { what: "set", tabs: TabContainer.toJSON(tabs) }},
        );
    }

    /**
     * Throw an error for every invalid Tab passed
     * @param {Array<Tab>} tabs - The tabs to be validated
     */
    static errorOnInvalidTabs(tabs){
        if(tabs == null || !Array.isArray(tabs))
            throw new Error("No array was passed",tabs);
        async function checkTabs(tabs){
            const res = [];
            for(const tab of tabs)
                if(!await Tab.isValid(tab)) // await is needed
                    res.push(tab);
            return res;
        }

        const invalidTabs = checkTabs(tabs);
        if(invalidTabs.length > 0){
            console.warn(tabs, TabContainer.isValid(tabs));
            throw new Error(`Invalid Tab${invalidTabs.length > 1 ? "s" : ""} detected: ${JSON.stringify(invalidTabs)}.\nEach item must have 'label' and 'url' as strings. Additionally, every item may have an 'org' as string.`);
        }
    }

    /**
     * Check if an array is a valid TabContainer
     * @param {Array<Tab>} tabs - The tabs to be validated
     * @returns {boolean} Whether the array as input is valid.
     */
    static isValid(tabs){
        return tabs != null
            && Array.isArray(tabs)
            && tabs.every(tab => Tab.isTab(tab));
    }

    /**
     *
     */
    static toJSON(tabs){
        TabContainer.errorOnInvalidTabs(tabs);

        const validArray = Array.isArray(tabs) ? [...tabs] : Array.from(tabs);
        if (validArray.length !== tabs.length) {
            console.warn('Array length mismatch:', {
                original: tabs.length,
                new: validArray.length
            });
        }

        const resultJson = [];
        for(const tab of validArray)
            if(Tab.isTab(tab))
                resultJson.push(tab.toJSON());
        return resultJson;
    }
    
    /**
     *
     */
    static toString(tabs){
        TabContainer.errorOnInvalidTabs(tabs);
        return `[\n${tabs.map(tab => tab.toString()).join(",\n")}\n]`;
        //return JSON.stringify(this.tabs, null, 4);
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
     */
    async moveTab({label = null, url = null} = {}, {moveBefore = true, fullMovement = false} = {}) {
        if(url == null)
            throw new Error("Cannot identify Tab.");
        if (label == null) {
            label = (await this.tabs.getTabsByData({url}))
                [0]?.label;
        }
        const index = await this.tabs.getTabIndexByData({label, url});
        // TODO changed signature of function

        const [tab] = this.tabs.splice(index, 1);

        if (fullMovement) {
            moveBefore ? this.tabs.unshift(tab) : this.tabs.push(tab);
        } else {
            const newIndex = moveBefore
                ? Math.max(0, index - 1)
                : Math.min(this.tabs.length, index + 1);
            // from newIndex, remove 0 tabs and insert `tab` in their place
            this.tabs.splice(newIndex, 0, tab);
        }

        await this.syncTabs();
    }

    /**
     * Removes the tab with the given url and title.
     *
     * @param {string} url - the minified URL of the tab to remove
     * @param {string} title - the label of the tab to remove. if null, all tabs with the given URL will be removed
     */
    async removeTab({label = null, url = null} = {}) {
        // TODO changed signature of function
        if(url == null)
            throw new Error("Cannot identify Tab without url.");
        const filteredTabs = this.tabs.filter((tab) =>
            !tab.equalsByData({label,url})
        );
        if (this.tabs.length === filteredTabs.length) {
            throw new Error("This tab was not found.");
        }
        await this.syncTabs();
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
     */
    async removeOtherTabs({label = null, url = null} = {}, {removeBefore = null} = {}) {
        // TODO changed signature of function
        if(url == null)
            throw new Error("Cannot identify Tab.");
        let tab;
        if (label == null) {
            tab = (await this.tabs.getTabsByData({url}))[0];
            label = tab?.label;
        }

        // check if the clicked tab is not one of the favourited ones
        if (
            !this.tabs.tabExistsByData({label,url})
        ) {
            throw new Error("This is not a saved tab!");
        }
        // remove all tabs but this one
        if (removeBefore == null) {
            // using filter, if the user picks an org-specific tab, the org info is kept intact
            let tabToSave;
            if(tab != null)
                tabToSave = [tab];
            else
                tabToSave = await this.tabs.getTabsByData({label,url});
            await this.syncTabs(tabToSave);
            return;
        }

        const index = this.tabs.getTabsIndexByData({label,url});
        //if (index === -1) return showToast("The tab could not be found.", false, true);

        removeBefore
            ? this.tabs.slice(index)
            : this.tabs.slice(0, index + 1);
        await this.syncTabs();
    }
}

const allTabs = new TabContainer(null, _tabContainerSecret);
const wait = async () => {
    await allTabs.ensureInitialized();
};
wait();
//globalThis.allTabs = allTabs;
//globalThis.TabContainer = TabContainer;
export { allTabs, TabContainer };
