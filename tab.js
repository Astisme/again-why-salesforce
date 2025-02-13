const _tabSecret = Symbol("tabSecret");

/**
 * The class to create a single Tab (through Tab.create()).
 * It allows to check if an object is a Tab and to transform a Tab into JSON.
 */
class Tab {
    /**
     * All the keys which are available inside a Tab.
     */
    static allowedKeys = new Set(["label", "url", "org", "tabTitle"]);
    // TODO tabTitle will be removed in a later version

    /**
     * Creates the Tab object
     * @param {string} label - the text that will represent the tab
     * @param {string} url - the minifiedURL that represents the link to where the tab points
     * @param {string|undefined} [org=undefined] - the org to which the tab is specific to
     * @param {Symbol} secret - the secret to allow the constructo
     */
    constructor(label, url, org = undefined, secret) {
        if (secret !== _tabSecret) {
          throw new Error("Use Tab.create() instead of new Tab()");
        }
        this.label = label;
        this.url = url;
        this.org = org;
    }

    /**
     * Creates the Tab object
     * @param {string|Object} labelOrTab - the text that will represent the tab OR the object from which to create the Tab
     * @param {string} url - the minifiedURL that represents the link to where the tab points
     * @param {string|undefined} [org=undefined] - the org to which the tab is specific to
     */
    static async create(labelOrTab, url, org = undefined) {
        if(Tab.isTab(labelOrTab))
            return labelOrTab;
        // Check if first argument is an object (for object-style creation)
        if (labelOrTab && typeof labelOrTab === "object") {
            if(url || org)
                throw new Error("When calling with an object, do not pass anything else.");

            const tab = labelOrTab;

            // Check for unexpected keys
            const unexpectedKeys = Object.keys(tab).filter(key => !Tab.allowedKeys.has(key));
            if (unexpectedKeys.length > 0) {
                throw new Error(`Unexpected keys found: ${unexpectedKeys.join(", ")}`);
            }

            // TODO tabTitle will be removed in a later version
            const createdTab = await Tab.create(tab.label ?? tab.tabTitle, tab.url, tab.org);
            return createdTab;
        }
        
        // Original method signature (label, url, org)
        const label = labelOrTab;

        // Check types of parameters
        if (typeof label !== "string" || label.trim() === "") {
            throw new Error("Label must be a non-empty string");
        }
        
        if (typeof url !== "string" || url.trim() === "") {
            throw new Error("URL must be a non-empty string");
        }
        
        if (org !== undefined && typeof org !== "string") {
            throw new Error("Org must be a string or undefined");
        }
        
        const miniURL = await Tab.minifyURL(url);
        
        // Create instance of Tab
        return new Tab(
            label, 
            miniURL, 
            org,
            _tabSecret
        );
    }

    /**
     * Removes all standard bits of the URL, reducing its lenght.
     * @param {string} url - the url to reduce
     * @returns {Promise<string>} a Promise containing the smaller URL
     */
    static async minifyURL(url){
        const newUrl = await chrome.runtime.sendMessage(
            { message: { what: "minify", url }}
        );
        return newUrl;
    }

    /**
     *
     */
    static isTab(tab){
        const result = tab instanceof Tab;
        console.log('isTab check:', {
            input: tab,
            constructor: tab?.constructor?.name,
            isInstance: result
        });
        return result;
    }

    /**
     * Checks if the tab passed is (or could be) a Tab.
     * @param {Object} tab - the tab to be checked
     * @returns {boolean} true if the tab is a Tab; false otherwise
     */
    static async isValid(tab) {
        console.warn('tabisvalid',Tab.isTab(tab),JSON.stringify(tab));
        if(Tab.isTab(tab))
            return true;
        // if the tab is not a Tab, try creating one
        try {
            return Tab.isTab(await Tab.create(tab));
        } catch (error) {
            console.error("Invalid Tab: ",error.message);
            // error on creation of tab
            return false;
        }
    }

    /**
     * Transforms a Tab into a JSON Object.
     * @returns {Object} this Tab transformed into an Object
     */
    toJSON(){
        console.log('tabtojson');
        return {
            label: this.label,
            url: this.url,
            org: this.org
        };
    }

    /**
     * Transforms a Tab into a JSON Object.
     * @returns {Object} this Tab transformed into an Object
     */
    toString(){
        return JSON.stringify(this.toJSON(), null, 4);
    }

    /**
     * Checks if the tab is equal to the one passed as input.
     * @param {Object} [param0={}] - an object containing the following keys
     * @param {*} param0.label - the label of the tab to check
     * @param {*} param0.url - the url of the tab to check
     * @param {*} param0.org - the org of the tab to check
     * @returns {boolean} whether the tabs are equal
     */
    equalsByData({label, url, org} = {}){
        return (label != null && label === this.label)
            && (url != null && url === this.url)
            && (org != null && org === this.org)
    }

    /**
     * Checks if the tab is equal to the one passed as input.
     * @param {Tab} tab - The Tab object to be checked against.
     * @returns {boolean} whether the tabs are equal
     */
    async equalsByTab(tab){
        console.warn('tabequals',tab,this.tab,tab === this.tab, tab == this.tab,this.equalsByData(await Tab.create(tab)));
        if(tab === this.tab)
            return true;
        try {
            const tabToCompare = await Tab.create(tab);
            return this.equalsByData(tabToCompare);
        } catch (error) {
            return false;
        }
    }

    /**
     * Update a Tab based on the options passed.
     * @param {Tab} tabToUpdate - the Tab to be updated
     * @param {Object} param1 - an Object containing the following data
     * @param {*} param1.label - the new label for the Tab
     * @param {*} param1.url - the new url for the Tab
     * @param {*} param1.org - the new org for the Tab
     * @returns {Tab} The updated Tab
     */
    static updateTab(tabToUpdate, {label,url,org} = {}){
        if(tabToUpdate == null)
            throw new Error(`Unknown tab: ${JSON.stringify(tabToUpdate)}`);

        if(label == null && url == null && org == null)
            return tabToUpdate;

        label != null && (tabToUpdate.label = label);
        url != null && (tabToUpdate.url = url);
        org != null && (tabToUpdate.org = org);

        return tabToUpdate;
    }
}

//globalThis.Tab = Tab;
export { Tab };
