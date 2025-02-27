import { HTTPS, LIGHTNING_FORCE_COM, MY_SALESFORCE_COM, MY_SALESFORCE_SETUP_COM, SALESFORCE_ID_PATTERN, SETUP_LIGHTNING } from "./constants.js";

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
        
        const miniURL = Tab.minifyURL(url);
        let orgName;
        if(org != null)
            orgName = Tab.extractOrgName(org);
        
        // Create instance of Tab
        return new Tab(
            label, 
            miniURL, 
            orgName,
            _tabSecret
        );
    }

    /**
     * Minifies a URL by the domain and removing Salesforce-specific parts.
     *
     * @param {string} url - The URL to minify.
     * @returns {string} The minified URL.
     *
     * These links would all collapse into "SetupOneHome/home".
     * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
     * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
     * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
     * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
     * /lightning/setup/SetupOneHome/home/
     * /lightning/setup/SetupOneHome/home
     * lightning/setup/SetupOneHome/home/
     * lightning/setup/SetupOneHome/home
     * SetupOneHome/home/
     * SetupOneHome/home
     *
     * Please note that these ones will not collapse as they're not though of as setup links
     * /SetupOneHome/home/
     * /SetupOneHome/home * this will be the result for both these urls
     */
    static minifyURL(url = null){
        if (url == null || url == "") {
            throw new Error("Cannot minify an empty URL!");
        }
        // remove org-specific url
        if (url.includes(LIGHTNING_FORCE_COM)) {
            url = url.slice(
                url.indexOf(LIGHTNING_FORCE_COM) +
                    LIGHTNING_FORCE_COM.length,
            );
        } else if (url.includes(MY_SALESFORCE_SETUP_COM)) {
            url = url.slice(
                url.indexOf(MY_SALESFORCE_SETUP_COM) +
                    MY_SALESFORCE_SETUP_COM.length,
            );
        }
        const setupLightningNoBeginSlash = SETUP_LIGHTNING.slice(1, SETUP_LIGHTNING.length);
        if (url.includes(SETUP_LIGHTNING)) {
            url = url.slice(
                url.indexOf(SETUP_LIGHTNING) +
                    SETUP_LIGHTNING.length,
            );
        } else if (url.includes(setupLightningNoBeginSlash)) {
            url = url.slice(
                url.indexOf(setupLightningNoBeginSlash) +
                    setupLightningNoBeginSlash.length,
            );
        }
        if (url.endsWith("/")) {
            url = url.slice(0, url.length - 1);
        }
        if (url.length === 0) {
            url = "/";
        }
        return url;
    }

    /**
     * Expands a URL by adding the domain and the Salesforce setup parts.
     * This function undoes what bg_minifyURL did to a URL.
     *
     * @param {string} url - The URL to expand.
     * @returns {string} The expanded URL.
     *
     * These links would all collapse into "https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/".
     * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
     * https://myorgdomain.sandbox.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
     * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home/
     * https://myorgdomain.my.salesforce-setup.com/lightning/setup/SetupOneHome/home
     * lightning/setup/SetupOneHome/home/
     * lightning/setup/SetupOneHome/home
     * SetupOneHome/home/
     * SetupOneHome/home
     */
    static expandURL(url = null, baseUrl = null){
        if(baseUrl == null || !baseUrl.startsWith(HTTPS))
            throw new Error("Cannot expand a URL without its base!");
        if (url == null || url === "") {
            throw new Error("Cannot expand an empty URL!");
        }
        baseUrl = new URL(baseUrl).origin;
        url = Tab.minifyURL(url);
        const isSetupLink = !url.startsWith("/") && url.length > 0;
        return `${baseUrl}${isSetupLink ? SETUP_LIGHTNING : ""}${url}`;
    }

    /**
     * Checks if a given URL contains a valid Salesforce ID.
     *
     * A Salesforce ID is either 15 or 18 alphanumeric characters, typically found
     * in URL paths or query parameters. The function also handles encoded URLs
     * (e.g., `%2F` becomes `/`) by decoding them before matching.
     *
     * @param {string} url - The URL to check for a Salesforce ID.
     * @returns {boolean} - Returns `true` if the URL contains a Salesforce ID, otherwise `false`.
     */
    static containsSalesforceId(url = null){
        if(url == null)
            throw new Error("No URL to check!");
        return SALESFORCE_ID_PATTERN.test(decodeURIComponent(url));
    }

    /**
     * Extracts the Org name from the url passed as input.
     *
     * @param {string} url - The URL from which the Org name has to be extracted.
     * @returns {string} - The Org name OR nothing if an error occurs
     */
    static extractOrgName(url = null){
        if (url == null) {
            throw new Error("Cannot extract org name from empty URL!");
        }
        let host = new URL(
            url.startsWith(HTTPS) ? url : `${HTTPS}${url}`,
        ).host;
        if (host.endsWith(LIGHTNING_FORCE_COM)) {
            host = host.slice(0, host.indexOf(LIGHTNING_FORCE_COM));
        }
        if (host.endsWith(MY_SALESFORCE_SETUP_COM)) {
            host = host.slice(0, host.indexOf(MY_SALESFORCE_SETUP_COM));
        }
        if (host.endsWith(MY_SALESFORCE_COM)) {
            host = host.slice(0, host.indexOf(MY_SALESFORCE_COM));
        }
        return host;
    }

    /**
     * Checks if the inputted object is an instanceof Tab
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
            console.log("Invalid Tab: ",error.message);
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
