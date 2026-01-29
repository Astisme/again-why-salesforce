import {
	HTTPS,
	LIGHTNING_FORCE_COM,
	MY_SALESFORCE_COM,
	MY_SALESFORCE_SETUP_COM,
	SALESFORCE_ID_PATTERN,
	SETUP_LIGHTNING,
} from "/constants.js";

const _tabSecret = Symbol("tabSecret");

/**
 * The class to create a single Tab (through Tab.create()).
 * It allows to check if an object is a Tab and to transform a Tab into JSON.
 */
export default class Tab {
	static keyClickCount = "click-count";
	static keyClickDate = "click-date";
	/**
	 * All the keys which express data about a Tab.
	 */
	static metadataKeys = new Set([
		Tab.keyClickCount,
		Tab.keyClickDate,
	]);
	/**
	 * All the keys which are available inside a Tab.
	 */
	static allowedKeys = new Set([
		"label",
		"url",
		"org",
		...Tab.metadataKeys,
	]);

	/**
	 * Creates a new instance of a `Tab` with the specified label, URL, and optional organization.
	 *
	 * **Note:** This constructor should not be called directly. Use `Tab.create()` instead.
	 *
	 * @param {string} label - The label of the Tab.
	 * @param {string} url - The URL of the Tab.
	 * @param {string|undefined} [org=undefined] - The optional organization associated with the Tab.
	 * @param {string|null} [clickCount=undefined] - The number of times the Tab was clicked.
	 * @param {string|null} [clickDate=undefined] - The Date in which the Tab was clicked last.
	 * @param {string} secret - A secret value required to initialize the tab. Must match `_tabSecret`.
	 * @throws {Error} - Throws an error if the `secret` does not match `_tabSecret` or if `Tab.create()` is not used.
	 */
	constructor(
		label,
		url,
		org = undefined,
		clickCount = undefined,
		clickDate = undefined,
		secret = null,
	) {
		if (secret !== _tabSecret) {
			throw new Error("error_tab_constructor");
		}
		this.label = label;
		this.url = url;
		this.org = org;
		this[Tab.keyClickCount] = clickCount;
		this[Tab.keyClickDate] = clickDate;
	}

	/**
	 * Checks if a Tab in input contains unsupported keys
	 * @param {Object} tab - the Tab to be checked
	 * @return {boolean} false if the Tab contains only supported keys
	 */
	static hasUnexpectedKeys(tab) {
		return tab != null &&
			Object.keys(tab)
				.some((key) => !Tab.allowedKeys.has(key));
	}

	/**
	 * Creates a new `Tab` instance. Can be called with either individual parameters (label, url, org) or an object-style argument.
	 *
	 * @param {string|Object} labelOrTab - The label of the Tab, or an object representing a Tab (with `label`, `url`, and optional `org` properties).
	 * @param {string|null} [url=null] - The URL of the Tab. Ignored if `labelOrTab` is an object.
	 * @param {string|undefined} [org=undefined] - The optional organization associated with the Tab. Ignored if `labelOrTab` is an object.
	 * @param {string|null} [clickCount=undefined] - The number of times the Tab was clicked. Ignored if `labelOrTab` is an object.
	 * @param {string|null} [clickDate=undefined] - The Date in which the Tab was clicked last. Ignored if `labelOrTab` is an object.
	 * @throws {Error} - Throws an error if the parameters are invalid, or if unexpected keys are found in the object.
	 * @return {Tab} - A new instance of the `Tab` class.
	 */
	static create(
		labelOrTab,
		url = null,
		org = undefined,
		clickCount = undefined,
		clickDate = undefined,
	) {
		if (Tab.isTab(labelOrTab)) {
			return labelOrTab;
		}
		// Check if first argument is an object (for object-style creation)
		if (labelOrTab && typeof labelOrTab === "object") {
			if (url || org || clickCount || clickDate) {
				throw new Error(
					"error_tab_object_creation",
				);
			}
			const tab = labelOrTab;
			// Check for unexpected keys
			if (Tab.hasUnexpectedKeys(tab)) {
				throw new Error(
					"error_tab_unexpected_keys",
				);
			}
			return Tab.create(
				tab.label,
				tab.url,
				tab.org,
				tab[Tab.keyClickCount],
				tab[Tab.keyClickDate],
			);
		}
		// Original method signature (label, url, org, clickCount, clickDate)
		const label = labelOrTab;
		// Check types of parameters
		if (typeof label !== "string" || label.trim() === "") {
			throw new Error("error_tab_label");
		}
		if (typeof url !== "string" || url.trim() === "") {
			throw new Error("error_tab_url");
		}
		if (typeof org !== "string" && org != null) {
			throw new Error("error_tab_org");
		}
		const miniURL = Tab.minifyURL(url);
		let orgName;
		if (org != null) {
			orgName = Tab.extractOrgName(org);
		}
		if (
			clickCount != null &&
			(typeof clickCount !== "number" || clickCount < 0)
		) {
			throw new Error("error_tab_click_count");
		}
		if (
			clickDate != null &&
			(typeof clickDate !== "number" || clickDate > Date.now())
		) {
			throw new Error("error_tab_click_date");
		}
		// Create instance of Tab
		return new Tab(
			label,
			miniURL,
			orgName,
			clickCount,
			clickDate,
			_tabSecret,
		);
	}

	/**
	 * Minifies a URL by the domain and removing Salesforce-specific parts.
	 *
	 * @param {string|null} url - The URL to minify.
	 * @throws {Error} - Throws an error if the provided URL is empty or invalid.
	 * @return {string} The minified URL.
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
	static minifyURL(url = null) {
		if (url == null || url == "") {
			throw new Error("error_minify_url");
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
		const setupLightningNoBeginSlash = SETUP_LIGHTNING.slice(
			1,
			SETUP_LIGHTNING.length,
		);
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
			url = url.slice(0, -1);
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
	 * @param {string|null} url - The URL to expand.
	 * @param {string|null} baseUrl - The host to prepend to the URL.
	 * @param {string|null} [org=null] - The Org to inject in the URL
	 * @throws {Error} - Throws an error if either the base URL is not valid, or if the provided URL is empty or invalid.
	 * @return {string|null} The expanded URL.
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
	static expandURL(url = null, baseUrl = null, org = null) {
		if (!baseUrl?.startsWith(HTTPS)) {
			throw new Error("error_expand_url_no_base");
		}
		if (url == null || url === "") {
			throw new Error("error_expand_url");
		}
		baseUrl = new URL(baseUrl).origin;
		const oldOrg = Tab.extractOrgName(baseUrl);
		// update the url with the given org name
		const shouldUpdateOrg = org != null && org !== "" && oldOrg !== org;
		if (
			url.startsWith(HTTPS) &&
			!url.includes(MY_SALESFORCE_SETUP_COM) &&
			!url.includes(MY_SALESFORCE_COM) &&
			!url.includes(LIGHTNING_FORCE_COM)
		) {
			return shouldUpdateOrg ? url.replace(oldOrg, org) : url;
		}
		url = Tab.minifyURL(url);
		const isSetupLink = !url.startsWith("/") && url.length > 0;
		return `${shouldUpdateOrg ? baseUrl.replace(oldOrg, org) : baseUrl}${
			isSetupLink ? SETUP_LIGHTNING : ""
		}${url}`;
	}

	/**
	 * Checks if a given URL contains a valid Salesforce ID.
	 *
	 * A Salesforce ID is either 15 or 18 alphanumeric characters, typically found
	 * in URL paths or query parameters. The function also handles encoded URLs
	 * (e.g., `%2F` becomes `/`) by decoding them before matching.
	 *
	 * @param {string|null} [url=null] - The URL to check for a Salesforce ID.
	 * @throws {Error} - Throws an error if the provided URL is null or invalid.
	 * @return {boolean} - Returns `true` if the URL contains a Salesforce ID, otherwise `false`.
	 */
	static containsSalesforceId(url = null) {
		if (url == null) {
			throw new Error("error_no_url");
		}
		return SALESFORCE_ID_PATTERN.test(decodeURIComponent(url));
	}

	/**
	 * Extracts the organization name from a given Salesforce URL by parsing the host part of the URL.
	 *
	 * @param {string|null} [url=null] - The URL from which to extract the organization name.
	 * @throws {Error} - Throws an error if the provided URL is null or invalid.
	 * @return {string} - The extracted organization name.
	 */
	static extractOrgName(url = null) {
		if (url == null) {
			throw new Error("error_extract_empty_url");
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
	 * Given an Object, returns a Tab of said Object
	 *
	 * @param {Object} tab - The Object representing a Tab (not necessarily an instanceof Tab)
	 * @return {Tab} - the input Object, now instanceof Tab
	 */
	static getTabObj(tab) {
		return Tab.isTab(tab) ? tab : Tab.create(tab);
	}

	/**
	 * Checks if the provided object is an instance of the `Tab` class.
	 *
	 * @param {any} tab - The object to check.
	 * @return {boolean} - Returns `true` if the object is an instance of `Tab`, otherwise `false`.
	 */
	static isTab(tab) {
		return tab instanceof Tab;
	}

	/**
	 * Validates if the provided object can be successfully created as a `Tab` instance.
	 *
	 * @param {any} tab - The object to validate.
	 * @throws {Error} - Catches and logs errors related to invalid tab creation but does not throw an error.
	 * @return {boolean} - Returns `true` if the object can be created as a valid `Tab`, otherwise `false`.
	 */
	static isValid(tab) {
		try {
			Tab.create(tab);
			return true;
		} catch (e) {
			console.info(e);
			// error on creation of tab
			return false;
		}
	}

	/**
	 * Transforms a Tab into a JSON Object.
	 * @return {Object} this Tab transformed into an Object
	 */
	toJSON() {
		const res = {
			label: this.label,
			url: this.url,
		};
		if (this.org) {
			res.org = this.org;
		}
		if (this[Tab.keyClickCount]) {
			res[Tab.keyClickCount] = this[Tab.keyClickCount];
		}
		if (this[Tab.keyClickDate]) {
			res[Tab.keyClickDate] = this[Tab.keyClickDate];
		}
		return res;
	}

	/**
	 * Transforms a Tab into a JSON String.
	 * @return {string} this Tab transformed into a JSON String
	 */
	toString() {
		return JSON.stringify(this.toJSON(), null, 4);
	}

	/**
	 * Compares the current `Tab` instance to another object for equality based on `label`, `url`, and `org` properties.
	 *
	 * @param {Object} [param] - The object to compare against.
	 * @param {string|null} [param.label=null] - The label to compare.
	 * @param {string|null} [param.url=null] - The URL to compare.
	 * @param {string|null} [param.org=null] - The organization to compare.
	 * @param {boolean} [strict=true] - True to perform a strict check, false to perform a loose check
	 * @return {boolean} - Returns `true` if the `Tab` is equal to the provided object based on the specified properties, otherwise `false`.
	 */
	equals({ label = null, url = null, org = null } = {}, strict = true) {
		return !(label == null && url == null && org == null) &&
			(label == null || label === this.label) &&
			(url == null || url === this.url) &&
			(
				(strict &&
					((org == null && this.org == null) || org === this.org)) ||
				(!strict && (org == null || org === this.org))
			);
	}

	/**
	 * Compares the current `Tab` instance to another object for equality based on the `url`, and possibly on the `org` properties.
	 * Two Tabs are duplicaters if they have the same `url` and the same `org` properties.
	 * If two Tabs have the same `url`, but different `org` (and viceversa) they are NOT duplicates.
	 *
	 * @param {Object} [param] - The object to compare against.
	 * @param {string|null} [param.url=null] - The URL to compare.
	 * @param {string|null} [param.org=null] - The organization to compare.
	 * @return {boolean} - Returns `true` if the `Tab` is duplicate to the provided object based on the specified properties, otherwise `false`.
	 */
	isDuplicate({ url = null, org = null } = {}) {
		return url != null &&
			url === this.url &&
			(
				( // could be passed one as null and the other one as undefined
					org == null &&
					this.org == null
				) ||
				org === this.org
			);
	}

	/**
	 * Update a Tab based on the options passed. YOU MUST take care of syncing after updating the Tab
	 * @param {Object} tab - an Object containing the following data
	 * @param {*} tab.label - the new label for the Tab
	 * @param {*} tab.url - the new url for the Tab
	 * @param {*} tab.org - the new org for the Tab
	 * @return {Tab} The updated Tab
	 */
	update(
		{
			label,
			url,
			org,
			[Tab.keyClickCount]: clickCount,
			[Tab.keyClickDate]: clickDate,
		} = {},
	) {
		if (
			label == null &&
			url == null &&
			org == null &&
			clickCount == null &&
			clickDate == null
		) {
			return this;
		}
		if (label != null && label !== "") {
			this.label = label;
		}
		if (url != null && url !== "") {
			this.url = Tab.minifyURL(url);
		}
		if (org != null) {
			this.org = org === "" ? undefined : Tab.extractOrgName(org);
		}
		if (clickCount != null) {
			this[Tab.keyClickCount] = clickCount === ""
				? undefined
				: clickCount;
		}
		if (clickDate != null) {
			this[Tab.keyClickDate] = clickDate === "" ? undefined : clickDate;
		}
		return this;
	}

	/**
	 * Returns a string representation of the `Tab` instance as its hash code.
	 * This may be used as an Id for the given Tab
	 * @return {string} - The string representation of the `Tab` instance.
	 */
	hashCode() {
		return `${this.url}@${this.org}`;
	}

	/**
	 * Increments the click-count and sets the new click-date to now.
	 */
	handleClick() {
		if (this[Tab.keyClickCount] == null) {
			this[Tab.keyClickCount] = 1; // the user as just clicked this Tab
		} else {
			this[Tab.keyClickCount]++;
		}
		this[Tab.keyClickDate] = Date.now();
	}
}
