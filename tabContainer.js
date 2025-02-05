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

        if(tabs != null && Array.isArray(tabs))
            this.addTabs(tabs);
        else 
            this.tabs = [];
        this._initializeTabs();
    }

    /**
     * Gets all the available tabs while also looking for synced ones.
     * @returns {Array<Tab>} - An array containing zero or more Tab objects.
     */
    async _getSavedTabs(){
        return await chrome.runtime.sendMessage(
            { message: { what: "get" }},
        );
    }

    /**
     * Inizializes the this.tabs variable based on the synced tabs from the background.
     */
    async _initializeTabs() {
        const savedTabs = await this._getSavedTabs();
        this.tabs = savedTabs ?? [];
    }

    /**
     * Gets all the available tabs while also looking for synced ones.
     * @returns {Array<Tab>} - An array containing zero or more Tab objects.
     */
    async getTabs() {
        if (this.tabs.length === 0) {
            await this._initializeTabs();
        }
        return this.tabs;
    }

    /**
     * Add a new tab to the collection and sync it with the background.
     * @param {Object} tab - Tab object with label, url, and optional org
     * @param {boolean} [sync=true] - whether a sync operation should be performed
     * @returns {boolean} - Whether the tab was successfully added
     */
    addTab(tab, sync = true) {
        if (!Tab.isValid(tab)) {
            throw new Error(`Invalid tab object: ${tab.toString()}`);
        }
        if(this.tabExistsByTab(tab))
            throw new Error(`This tab already exists: ${tab.toString()}`);

        this.tabs.push(tab);
        if(sync)
            this.syncTabs();
        return true;
    }

    /**
     * Add a collection of tabs to the collection and sync it with the background.
     * @param {Array<Tab>} tabs - the tabs to be added
     * @param {boolean} [sync=true] - whether a sync operation should be performed
     * @returns {boolean} - Whether the tab was successfully added
     */
    addTabs(tabs, sync = true) {
        TabContainer.errorOnInvalidTabs(tabs);
        if(tabs.length === 0 && sync === false)
            return true;

        const addedAll = tabs.every(tab => {
            try {
                this.addTab(tab, false);
            } catch (error) {
                if(error.message !== "This tab already exists")
                    throw error;
            }
        });
        if(sync)
            this.syncTabs();
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
    removeTabByData({label, url, org} = {}) {
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
    removeTabByTab(tab) {
        const initialLength = this.tabs.length;
        this.tabs = this.tabs.filter(tb => !tb.equalsByTab(tab));
        return this.tabs.length < initialLength;
    }

    /**
     * Get tabs with or without an org
     * @param {boolean} [getWithOrg=true] - Wheter the org should be checked with or agains
     * @returns {Array} - Tabs belonging to the some organization
     */
    getTabsWithOrg(getWithOrg = true) {
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
    getTabsByOrg(org, matchOrg = true) {
        return this.tabs.filter(tab => 
            tab.org != null 
            && (
                (matchOrg && tab.org === org) 
                || (!matchOrg && tab.org !== org)
            )
        );
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
    tabExistsByTab(tab) {
        return this.tabs.some(tb => 
            tb.equalsByTab(tab)
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
         */
    replaceTabs(newTabs = [], {
        resetTabs = true,
        removeOrgTabs = false,
        sync = true,
    } = {}) {
        // If reset tabs, clear existing tabs
        if (resetTabs) {
            if (removeOrgTabs) {
                this.tabs = [];
            } else {
                // Keep only org-specific tabs
                this.tabs = this.tabs.filter(tab => tab.org != null);
            }
        } else if(removeOrgTabs){
            // Keep only non-org-specific tabs
            this.tabs = this.tabs.filter(tab => tab.org == null);
        }

        // Add new tabs and sync them
        this.addTabs(newTabs, sync);
    }

    /**
     * Export Tabs to JSON
     * @returns {string} - JSON string of Tabs
     */
    toString() {
        return `[\n${this.tabs.map(tab => tab.toString()).join(",\n")}\n]`;
        //return JSON.stringify(this.tabs, null, 4);
    }

    /**
     * Import tabs from JSON
     * @param {string} jsonString - JSON string of tabs
     * @param {boolean} [resetTabs=false] - Whether the imported array should overwrite the currently saved tabs
     * @param {boolean} [preserveOtherOrg=true] - Whether the org-specific tabs should be preserved 
     * @returns {number} - Number of tabs successfully imported
     */
    importTabs(jsonString, resetTabs = false, preserveOtherOrg = true) {
        const imported = JSON.parse(jsonString);
        
        TabContainer.errorOnInvalidTabs(imported);

        this.replaceTabs(imported, resetTabs, !preserveOtherOrg);
        return imported.length;
    }

    /**
     * Sync tabs with the background.
     * @param {Array<Tab>} tabs - The array which will be used from now on (if provided)
     */
    async syncTabs(tabs = null){
        const check = tabs == null;
        // replace tabs already checks the tabs
        !check && this.replaceTabs(tabs, {sync: false});
        return await TabContainer._syncTabs(this.tabs, check);
    }

    /**
     * Compares two TabContainers to check if they are equal.
     *
     * @param {Array<Tab>} tabs - The TabContainer to match against
     * @returns {boolean} True if the arrays are equal, false otherwise.
     */
    equals(tabs){
        return tabs.every(tab => Tab.isValid(tab) && this.tabs.some(ttb => ttb.equalsByTab(tab)))
            //&& JSON.stringify(this.tabs) === JSON.stringify(tabs);
    }

    /**
     * Sync tabs with the background
     * @param {Array<Tab>} tabs - The tabs to be synced
     */
    static async _syncTabs(tabs, check){
        check && TabContainer.errorOnInvalidTabs(tabs);

        return await chrome.runtime.sendMessage(
            { message: { what: "set", tabs }},
        );
    }

    /**
     * Throw an error for every invalid Tab passed
     * @param {Array<Tab>} tabs - The tabs to be validated
     */
    static errorOnInvalidTabs(tabs){
        if(tabs == null || !Array.isArray(tabs))
            throw new Error("No array was passed",tabs);

        const invalidTabs = tabs.filter(tab => !Tab.isValid(tab));
        if(invalidTabs.length > 0){
            throw new Error(`Invalid Tab${invalidTabs.length > 1 ? "s" : ""} detected: ${JSON.stringify(invalidTabs)}`);
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
            && tabs.every(tab => Tab.isValid(tab));
    }
}

const allTabs = new TabContainer(null, _tabContainerSecret);
export { allTabs, TabContainer };
