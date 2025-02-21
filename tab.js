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
     * // TESTOK
     */
    static async create(labelOrTab, url = null, org = undefined) {
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
        
        if (typeof org !== "string" && org != null) {
            throw new Error("Org must be a string or undefined");
        }
        
        const miniURL = await Tab.minifyURL(url);
        let orgName;
        if(org != null)
            orgName = await Tab.extractOrgName(org);
        
        // Create instance of Tab
        return new Tab(
            label, 
            miniURL, 
            orgName,
            _tabSecret
        );
    }

    /**
     * Removes all standard bits of the URL, reducing its lenght.
     * @param {string} url - the url to reduce
     * @returns {Promise<string>} a Promise containing the smaller URL
     * // TESTOK
     */
    static async minifyURL(url){
        const newUrl = await Promise.all([new Promise((resolve, reject) => 
            chrome.runtime.sendMessage(
                { message: { what: "minify", url }},
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                }
            )
        )]);
        return newUrl[0] ?? url;
    }

    /**
     * Removes all standard bits of the URL, reducing its lenght.
     * @param {string} url - the url to reduce
     * @returns {string} the smaller URL
     * // TESTOK
     */
    static async extractOrgName(url){
        const newUrl = await chrome.runtime.sendMessage(
            { message: { what: "extract-org", url }}
        );
        return newUrl;
    }

    /**
     *
     * // TESTOK
     */
    static isTab(tab){
        return tab instanceof Tab;
    }

    /**
     * Checks if the tab passed is (or could be) a Tab.
     * @param {Object} tab - the tab to be checked
     * @returns {boolean} true if the tab is a Tab; false otherwise
     * // TESTOK
     */
    static async isValid(tab) {
        try {
            await Tab.create(tab);
            return true;
        } catch (error) {
            console.error("Invalid Tab: ",error.message);
            // error on creation of tab
            return false;
        }
    }

    /**
     * Transforms a Tab into a JSON Object.
     * @returns {Object} this Tab transformed into an Object
     * // TESTOK
     */
    toJSON(){
        const res = {
            label: this.label,
            url: this.url,
        }
        if(this.org != null)
            res.org = this.org;
        return res;
    }

    /**
     * Transforms a Tab into a JSON String.
     * @returns {String} this Tab transformed into a JSON String
     * // TESTOK
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
     * // TESTOK
     */
    equals({label, url, org} = {}){
        return !(label == null && url == null && org == null)
            && (label == null || label === this.label)
            && (url == null || url === this.url)
            && (org == null || (this.org != null && org === this.org))
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
    /*
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
    */

  hashCode() {
    return this.toString();
  }
}

//globalThis.Tab = Tab;
export { Tab };
