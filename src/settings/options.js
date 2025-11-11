import ensureTranslatorAvailability from "/translator.js";
import {
	BROWSER,
	EXTENSION_NAME,
	FOLLOW_SF_LANG,
	GENERIC_TAB_STYLE_KEY,
	getCssRule,
	getCssSelector,
	getSettings,
	getStyleSettings,
	LINK_NEW_BROWSER,
	MANIFEST,
	NO_RELEASE_NOTES,
	NO_UPDATE_NOTIFICATION,
	ORG_TAB_STYLE_KEY,
	PERSIST_SORT,
	POPUP_LOGIN_NEW_TAB,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_SETUP_NEW_TAB,
	PREVENT_ANALYTICS,
	sendExtensionMessage,
	SETTINGS_KEY,
	SKIP_LINK_DETECTION,
	SLDS_ACTIVE,
	TAB_ADD_FRONT,
	TAB_AS_ORG,
	TAB_GENERIC_STYLE,
	TAB_ON_LEFT,
	TAB_ORG_STYLE,
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_BOLD,
	TAB_STYLE_BORDER,
	TAB_STYLE_COLOR,
	TAB_STYLE_HOVER,
	TAB_STYLE_ITALIC,
	TAB_STYLE_SHADOW,
	//TAB_STYLE_WAVY,
	TAB_STYLE_TOP,
	TAB_STYLE_UNDERLINE,
	USE_LIGHTNING_NAVIGATION,
	USER_LANGUAGE,
} from "/constants.js";

// no need to await as we do not need to call the translator
// we only need it to translate the text on the screen and it may take the time it needs to do so
ensureTranslatorAvailability();
const preventDefaultOverride = "user-set";
const hidden = "hidden";
const invisible = "invisible";

/**
 * Saves checkbox state and dependent checkbox states to settings
 * @param {Event} e - The event object from the checkbox interaction
 * @param {...HTMLElement} dependentCheckboxElements - Dependent checkbox elements whose states should also be saved
 */
function saveCheckboxOptions(e, ...dependentCheckboxElements) {
	const set_msg = { what: "set", key: SETTINGS_KEY };
	const set = [];
	set.push({
		id: e.target.id,
		enabled: this?.checked ?? e.target.checked,
	});
	for (const dc of dependentCheckboxElements) {
		set.push({
			id: dc.id,
			enabled: dc.checked,
		});
	}
	Object.assign(set_msg, { set });
	sendExtensionMessage(set_msg);
}

/**
 * Contains all checkbox elements used for settings, separated by their Id.
 */
const allCheckboxes = {
	[LINK_NEW_BROWSER]: document.getElementById(LINK_NEW_BROWSER),
	[SKIP_LINK_DETECTION]: document.getElementById(SKIP_LINK_DETECTION),
	[USE_LIGHTNING_NAVIGATION]: document.getElementById(
		USE_LIGHTNING_NAVIGATION,
	),
	[POPUP_OPEN_LOGIN]: document.getElementById(POPUP_OPEN_LOGIN),
	[POPUP_OPEN_SETUP]: document.getElementById(POPUP_OPEN_SETUP),
	[POPUP_LOGIN_NEW_TAB]: document.getElementById(POPUP_LOGIN_NEW_TAB),
	[POPUP_SETUP_NEW_TAB]: document.getElementById(POPUP_SETUP_NEW_TAB),
	[TAB_ON_LEFT]: document.getElementById(TAB_ON_LEFT),
	[TAB_ADD_FRONT]: document.getElementById(TAB_ADD_FRONT),
	[TAB_AS_ORG]: document.getElementById(TAB_AS_ORG),
	[NO_RELEASE_NOTES]: document.getElementById(NO_RELEASE_NOTES),
	[NO_UPDATE_NOTIFICATION]: document.getElementById(NO_UPDATE_NOTIFICATION),
	[PREVENT_ANALYTICS]: document.getElementById(PREVENT_ANALYTICS),
};

const user_language_select = document.getElementById(USER_LANGUAGE);

const keep_sorted_el = document.getElementById("keep_sorted");
const sortContainer = document.getElementById("sort-wrapper");
const picked_sort = {
	select: document.getElementById("picked-sort"),
	direction: document.getElementById(
		"picked-sort-direction",
	),
};

const inactive = "inactive";
const active = "active";

/**
 * Gets element by constructed ID from tab style components
 * @param {string} tabType - The tab type (e.g., TAB_GENERIC_STYLE, TAB_ORG_STYLE)
 * @param {string} styleType - The style type (e.g., TAB_STYLE_BACKGROUND, TAB_STYLE_COLOR)
 * @param {string} state - The state (e.g., active, inactive)
 * @returns {HTMLElement|null}
 */
function getTabElement({
	tabType = null,
	styleType = null,
	state = null,
	prefix = "",
	postfix = "",
} = {}) {
	if (tabType == null || styleType == null || state == null) {
		throw new Error("error_required_params");
	}
	return document.getElementById(
		`${prefix}${tabType}-${styleType}-${state}${postfix}`,
	);
}

const decorationAvailableId = "set_decoration_available";
const decorationChosenId = "set_decoration_chosen";
/**
 * Creates decoration list elements for a given tab type and state
 * @param {string} tabType - The tab type prefix
 * @param {string} state - The state (active/inactive)
 * @returns {Object} Object with available and chosen list elements
 */
function getDecorationUls({
	tabType = null,
	state = null,
	prefix = "",
	postfix = "",
} = {}) {
	if (tabType == null || state == null) {
		throw new Error("error_required_params");
	}
	const available = document.getElementById(
		`${prefix}${tabType}-${decorationAvailableId}-${state}${postfix}`,
	);
	const chosen = document.getElementById(
		`${prefix}${tabType}-${decorationChosenId}-${state}${postfix}`,
	);
	return { available, chosen };
}

const styleGeneric = "style-generic";
const styleOrg = "style-org";
/**
 * Creates style IDs for a given style type and state
 * @param {string} styleType - The style type (e.g., "style-generic", "style-org")
 * @param {string} state - The state (active/inactive)
 * @returns {Object} Object with all style IDs
 */
function createStyleIds({
	tabType = null,
	state = null,
} = {}) {
	if (tabType == null || state == null) {
		throw new Error("error_required_params");
	}
	const styleType = tabType === TAB_GENERIC_STYLE ? styleGeneric : styleOrg;
	const suffix = `${styleType}-${state}`;
	return {
		background: `${EXTENSION_NAME}-${TAB_STYLE_BACKGROUND}-${suffix}`,
		color: `${EXTENSION_NAME}-${TAB_STYLE_COLOR}-${suffix}`,
		border: `${EXTENSION_NAME}-${TAB_STYLE_BORDER}-${suffix}`,
		shadow: `${EXTENSION_NAME}-${TAB_STYLE_SHADOW}-${suffix}`,
		hover: `${EXTENSION_NAME}-${TAB_STYLE_HOVER}-${suffix}`,
		top: state === active
			? `${EXTENSION_NAME}-${TAB_STYLE_TOP}-${suffix}`
			: undefined,
		bold: `${EXTENSION_NAME}-${TAB_STYLE_BOLD}-${suffix}`,
		italic: `${EXTENSION_NAME}-${TAB_STYLE_ITALIC}-${suffix}`,
		underline: `${EXTENSION_NAME}-${TAB_STYLE_UNDERLINE}-${suffix}`,
	};
}

const chosenBtnId = "move-chosen";
const availableBtnId = "move-available";
/**
 * Retrieves the arrow buttons which move the decorations between the chosen and available Uls
 * @returns {Object} with chosen (the button to move to chosen) and available (the one to move to available)
 */
function getMoveButtons({
	tabType = null,
	state = null,
	prefix = "",
} = {}) {
	if (tabType == null || state == null) {
		throw new Error("error_required_params");
	}
	return {
		chosen: document.getElementById(
			`${prefix}${tabType}-${chosenBtnId}-${state}`,
		),
		available: document.getElementById(
			`${prefix}${tabType}-${availableBtnId}-${state}`,
		),
	};
}

/**
 * Creates an object with all tab elements for a given configuration
 * @param {string} tabType - The tab type prefix
 * @param {string} state - The state (active/inactive)
 * @returns {Object} Object with named properties for each element plus arrays
 */
function createTabElements({
	tabType = null,
	state = null,
	prefix = "",
	postfix = "",
} = {}) {
	if (tabType == null || state == null) {
		throw new Error("error_required_params");
	}
	const bold = getTabElement({
		tabType,
		styleType: TAB_STYLE_BOLD,
		state,
		prefix,
		postfix,
	});
	const italic = getTabElement({
		tabType,
		styleType: TAB_STYLE_ITALIC,
		state,
		prefix,
		postfix,
	});
	const underline = getTabElement({
		tabType,
		styleType: TAB_STYLE_UNDERLINE,
		state,
		prefix,
		postfix,
	});
	const elements = {
		[TAB_STYLE_BACKGROUND]: getTabElement({
			tabType,
			styleType: TAB_STYLE_BACKGROUND,
			state,
			prefix,
			postfix,
		}),
		[TAB_STYLE_COLOR]: getTabElement({
			tabType,
			styleType: TAB_STYLE_COLOR,
			state,
			prefix,
			postfix,
		}),
		[TAB_STYLE_BORDER]: getTabElement({
			tabType,
			styleType: TAB_STYLE_BORDER,
			state,
			prefix,
			postfix,
		}),
		[TAB_STYLE_SHADOW]: getTabElement({
			tabType,
			styleType: TAB_STYLE_SHADOW,
			state,
			prefix,
			postfix,
		}),
		[TAB_STYLE_HOVER]: getTabElement({
			tabType,
			styleType: TAB_STYLE_HOVER,
			state,
			prefix,
			postfix,
		}),
		[TAB_STYLE_TOP]: state === active
			? getTabElement({
				tabType,
				styleType: TAB_STYLE_TOP,
				state,
				prefix,
				postfix,
			})
			: null,
		[TAB_STYLE_BOLD]: bold,
		[TAB_STYLE_ITALIC]: italic,
		[TAB_STYLE_UNDERLINE]: underline,
	};
	return {
		elements,
		decorations: [bold, italic, underline],
		decorationUls: getDecorationUls({ tabType, state, prefix, postfix }),
		styleIds: createStyleIds({ tabType, state }),
		moveBtns: getMoveButtons({ tabType, state }),
	};
}

/**
 * Creates the complete style configuration object
 * @returns {Object} Configurations organized by style type
 */
function createStyleConfigurations() {
	const tabConfigs = {
		inactive: {
			generic: createTabElements({
				tabType: TAB_GENERIC_STYLE,
				state: inactive,
			}),
			org: createTabElements({ tabType: TAB_ORG_STYLE, state: inactive }),
		},
		active: {
			generic: createTabElements({
				tabType: TAB_GENERIC_STYLE,
				state: active,
			}),
			org: createTabElements({ tabType: TAB_ORG_STYLE, state: active }),
		},
	};
	const inputStyles = [
		TAB_STYLE_BACKGROUND,
		TAB_STYLE_COLOR,
		TAB_STYLE_BORDER,
		TAB_STYLE_SHADOW,
		TAB_STYLE_HOVER,
		TAB_STYLE_TOP,
	];
	const decorationStyles = [
		TAB_STYLE_BOLD,
		TAB_STYLE_ITALIC,
		TAB_STYLE_UNDERLINE,
	];
	const configs = {};
	for (const key of [...inputStyles, ...decorationStyles]) {
		configs[key] = {
			type: "input",
			elements: {
				inactive: {
					generic: tabConfigs.inactive.generic.elements[key],
					org: tabConfigs.inactive.org.elements[key],
				},
				active: {
					generic: tabConfigs.active.generic.elements[key],
					org: tabConfigs.active.org.elements[key],
				},
			},
			styleIds: {
				inactive: {
					generic: tabConfigs.inactive.generic.styleIds[key],
					org: tabConfigs.inactive.org.styleIds[key],
				},
				active: {
					generic: tabConfigs.active.generic.styleIds[key],
					org: tabConfigs.active.org.styleIds[key],
				},
			},
		};
	}
	for (const key of decorationStyles) {
		Object.assign(configs[key], {
			type: "decoration",
			chosenUls: {
				inactive: {
					generic: tabConfigs.inactive.generic.decorationUls.chosen,
					org: tabConfigs.inactive.org.decorationUls.chosen,
				},
				active: {
					generic: tabConfigs.active.generic.decorationUls.chosen,
					org: tabConfigs.active.org.decorationUls.chosen,
				},
			},
			availableUls: {
				inactive: {
					generic:
						tabConfigs.inactive.generic.decorationUls.available,
					org: tabConfigs.inactive.org.decorationUls.available,
				},
				active: {
					generic: tabConfigs.active.generic.decorationUls.available,
					org: tabConfigs.active.org.decorationUls.available,
				},
			},
		});
	}
	return {
		configs,
		generic: {
			inputs: [
				...Object.values(tabConfigs.inactive.generic.elements),
				...Object.values(tabConfigs.active.generic.elements),
			],
			active: {
				decorations: tabConfigs.active.generic.decorations,
				decorationUls: tabConfigs.active.generic.decorationUls,
				moveBtns: tabConfigs.active.generic.moveBtns,
			},
			inactive: {
				decorations: tabConfigs.inactive.generic.decorations,
				decorationUls: tabConfigs.inactive.generic.decorationUls,
				moveBtns: tabConfigs.inactive.generic.moveBtns,
			},
		},
		org: {
			inputs: [
				...Object.values(tabConfigs.inactive.org.elements),
				...Object.values(tabConfigs.active.org.elements),
			],
			active: {
				decorations: tabConfigs.active.org.decorations,
				decorationUls: tabConfigs.active.org.decorationUls,
				moveBtns: tabConfigs.active.org.moveBtns,
			},
			inactive: {
				decorations: tabConfigs.inactive.org.decorations,
				decorationUls: tabConfigs.inactive.org.decorationUls,
				moveBtns: tabConfigs.inactive.org.moveBtns,
			},
		},
	};
}

/**
 * Configuration object with style type keys and element/ID mappings
 * Each style type maps to element references, style IDs, and decoration containers
 * organized by active/inactive state and generic/org variants.
 */
const {
	configs: styleConfigurations,
	generic: {
		inputs: allGenericInputs,
		active: activeGeneric,
		inactive: inactiveGeneric,
	},
	org: {
		inputs: allOrgInputs,
		active: activeOrg,
		inactive: inactiveOrg,
	},
} = createStyleConfigurations();
const allGenericDecorations = [
	...activeGeneric.decorations,
	...inactiveGeneric.decorations,
];
const allOrgDecorations = [
	...activeOrg.decorations,
	...inactiveOrg.decorations,
];

/**
 * Updates or removes a style element in the document head
 * @param {string} styleId - ID of the style element to update or remove
 * @param {string|null} newStyle - CSS content to add, or null to only remove existing style
 */
function updateStyle(styleId, newStyle = null) {
	// Remove any previous style for this element
	const oldStyle = document.getElementById(styleId);
	if (oldStyle != null) {
		oldStyle.remove();
	}
	if (newStyle == null) {
		return;
	}
	// Create new style element
	const style = document.createElement("style");
	style.id = styleId;
	style.textContent = newStyle;
	document.head.appendChild(style);
}

/**
 * Extracts element references from configuration based on tab state and type.
 * Handles both input elements and decoration list containers.
 * @param {Object} config - Style configuration object containing element mappings
 * @param {boolean} isForInactive - Whether targeting inactive tabs
 * @param {boolean} isGeneric - Whether targeting generic tabs (vs org-specific)
 * @param {boolean} wasPicked - Whether the style value is set (affects chosen/available lists)
 * @returns {Object} Object containing input element and decoration list references
 */
function _getElementReferences(config, isForInactive, isGeneric, wasPicked) {
	const state = isForInactive ? "inactive" : "active";
	const variant = isGeneric ? "generic" : "org";
	const elements = {
		input: config.elements?.[state]?.[variant],
		moveToChosen: config.elements?.[state]?.[variant],
	};
	if (config.type === "decoration") {
		elements.chosenUl = wasPicked
			? config.chosenUls?.[state]?.[variant]
			: config.availableUls?.[state]?.[variant];
	}
	return elements;
}
/**
 * Retrieves the appropriate style ID from configuration based on tab state and type.
 * @param {Object} config - Style configuration object containing styleIds mappings
 * @param {boolean} isForInactive - Whether targeting inactive tabs
 * @param {boolean} isGeneric - Whether targeting generic tabs (vs org-specific)
 * @returns {string|undefined} Style ID for CSS rule application, or undefined if not found
 */
function _getStyleId(config, isForInactive, isGeneric) {
	const state = isForInactive ? "inactive" : "active";
	const variant = isGeneric ? "generic" : "org";
	return config.styleIds?.[state]?.[variant];
}
/**
 * Determines the appropriate CSS pseudo-selector for specific style types.
 * Some styles require pseudo-selectors like :hover or ::before for proper application.
 * @param {string} styleId - The style type identifier (TAB_STYLE_* constant)
 * @returns {string|null} Pseudo-selector string (:hover, ::before) or null for standard selectors
 */
function _getPseudoSelector(styleId) {
	switch (styleId) {
		case TAB_STYLE_HOVER:
			return ":hover";
		case TAB_STYLE_TOP:
			return "::before";
		default:
			return "";
	}
}
/**
 * Constructs a complete CSS rule string for the given style setting.
 * Returns null if no value is set, otherwise builds selector and rule combination.
 * @param {Object} setting - Style setting containing id and value
 * @param {boolean} isForInactive - Whether targeting inactive tabs
 * @param {boolean} isGeneric - Whether targeting generic tabs (vs org-specific)
 * @param {boolean} wasPicked - Whether the style value is set (non-null/non-empty)
 * @returns {string|null} Complete CSS rule string, or null if no value set
 */
function _buildCssRule(setting, isForInactive, isGeneric, wasPicked) {
	if (!wasPicked) return null;
	const pseudoSelector = _getPseudoSelector(setting.id);
	const cssSelector = getCssSelector(
		isForInactive,
		isGeneric,
		pseudoSelector,
	);
	const cssRule = getCssRule(setting.id, setting.value);
	return `${cssSelector}{ ${cssRule} }`;
}
/**
 * Updates DOM elements with new style values and moves decoration elements between lists.
 * For decoration styles, moves elements between "chosen" and "available" lists based on wasPicked state.
 * For input styles, sets the input element's value property.
 * @param {Object} elements - Object containing element references (input, chosenUl, moveToChosen)
 * @param {string|null} value - The style value to set in input elements
 */
function _updateUIElements(elements, value) {
	if (elements.chosenUl && elements.moveToChosen) {
		elements.chosenUl.append(
			elements.moveToChosen,
		);
	}
	if (elements.input) {
		elements.input.value = value;
	}
}
/**
 * Updates CSS styles of the preview Tab based on provided tab style settings
 * Sets inputs fields with the value passed in the setting
 * @param {Object} setting - The style setting to apply
 * @param {string} setting.id - Identifier for the style type
 * @param {string|null} setting.value - Value for the style, null or empty string if not set
 * @param {boolean} setting.forActive - Whether the style applies to active tabs
 * @param {boolean} [isGeneric=true] - Whether to apply styles to generic tabs or org-specific tabs
 * @param {boolean} [updateViews=true] - Whether to update UI elements in addition to applying styles
 */
function setPreviewAndInputValue(
	setting,
	isGeneric = true,
	updateViews = true,
) {
	const isForInactive = !setting.forActive;
	// Handle special case for TAB_STYLE_TOP (active only)
	if (
		(setting.id === TAB_STYLE_TOP && isForInactive) ||
		setting.id === preventDefaultOverride
	) {
		return;
	}
	const wasPicked = setting.value != null && setting.value !== "";
	// Configuration object for each style type
	const config = styleConfigurations[setting.id];
	if (config == null) {
		console.error(`Unmatched style setting id: ${setting.id}`);
		return;
	}
	// Get element references and style ID for current configuration
	const elements = _getElementReferences(
		config,
		isForInactive,
		isGeneric,
		wasPicked,
	);
	const styleId = _getStyleId(config, isForInactive, isGeneric);
	// Apply CSS style
	const cssRule = _buildCssRule(setting, isForInactive, isGeneric, wasPicked);
	updateStyle(styleId, cssRule);
	// Update UI elements if requested
	if (updateViews) {
		_updateUIElements(elements, setting.value);
	}
}

/**
 * Updates checkbox elements based on a setting configuration
 * @param {Object} setting - The setting to apply
 * @param {string} setting.id - Identifier for the setting type
 * @param {boolean} [setting.enabled] - Enabled state for checkbox settings
 * @param {Array|Object} [setting.value] - Value for tab style settings
 */
function setCurrentChoice(setting) {
	console.log(setting);
	switch (setting.id) {
		case LINK_NEW_BROWSER:
		case SKIP_LINK_DETECTION:
		case USE_LIGHTNING_NAVIGATION:
		case POPUP_OPEN_LOGIN:
		case POPUP_OPEN_SETUP:
		case POPUP_LOGIN_NEW_TAB:
		case POPUP_SETUP_NEW_TAB:
		case TAB_ON_LEFT:
		case TAB_ADD_FRONT:
		case TAB_AS_ORG:
		case NO_RELEASE_NOTES:
		case NO_UPDATE_NOTIFICATION:
		case PREVENT_ANALYTICS:
			allCheckboxes[setting.id].checked = setting.enabled;
			break;
		case USER_LANGUAGE:
			user_language_select.value = setting.enabled;
			break;
		case PERSIST_SORT: {
			const isEnabled = setting?.enabled;
			keep_sorted_el.checked = isEnabled;
			if (isEnabled) {
				picked_sort.select.value = setting.enabled;
				picked_sort.direction.value = setting.ascending
					? "ascending"
					: "descending";
				sortContainer.classList.remove(invisible);
			}
			break;
		}
		case GENERIC_TAB_STYLE_KEY:
		case ORG_TAB_STYLE_KEY: {
			const isGeneric = setting.id === GENERIC_TAB_STYLE_KEY;
			if (Array.isArray(setting.value)) {
				for (const set of setting.value) {
					setPreviewAndInputValue(set, isGeneric);
				}
			} else {
				setPreviewAndInputValue(setting.value, isGeneric);
			}
			break;
		}
		default:
			console.error(`Unmatched setting id: ${setting.id}`);
			break;
	}
}

/**
 * Wrapper for sendExtensionMessage for the PERSIST_SORT setting.
 *
 * @param {string|null} [enabled=null] - the value to keep the sort by. null === no selection
 * @param {string|null} [direction=null] - the direction to sort (ascending / descending). null === no selection
 * @see Tab.allowedKeys for enabled
 */
function savePickedSort(enabled = null, direction = null) {
	const set = [{
		id: PERSIST_SORT,
		enabled,
		ascending: direction == null ? null : direction === "ascending",
	}];
	if (enabled) {
		// TAB_ADD_FRONT cannot be set
		set.push({
			id: TAB_ADD_FRONT,
			enabled: false,
		});
		tab_add_front_el.checked = false;
	}
	sendExtensionMessage({
		what: "set",
		key: SETTINGS_KEY,
		set,
	});
}

keep_sorted_el.addEventListener("click", (e) => {
	if (e.currentTarget.checked) {
		sortContainer.classList.remove(invisible);
	} else {
		sortContainer.classList.add(invisible);
	}
});

const listenersSet = {};
/**
 * Restores general settings from storage and sets up event listeners
 * @returns {Promise<void>} Promise that resolves when settings are restored and listeners are set
 */
async function restoreGeneralSettings() {
	if (listenersSet["settings"]) {
		return;
	}
	const settings = await getSettings();
	if (settings != null) {
		if (Array.isArray(settings)) {
			for (const set of settings) {
				setCurrentChoice(set);
			}
		} else {
			setCurrentChoice(settings);
		}
	}
	const link_new_browser_el = allCheckboxes[LINK_NEW_BROWSER];
	const use_lightning_navigation_el = allCheckboxes[USE_LIGHTNING_NAVIGATION];
	const tab_add_front_el = allCheckboxes[TAB_ADD_FRONT];
	for (const el of Object.values(allCheckboxes)) {
		switch (el) {
			case link_new_browser_el:
			case use_lightning_navigation_el:
			case tab_add_front_el:
				continue;
			default:
				break;
		}
		el.addEventListener("change", saveCheckboxOptions);
	}
	link_new_browser_el.addEventListener("change", (e) => {
		// click on dependent setting
		if (e.target.checked) {
			use_lightning_navigation_el.checked = true;
		}
		saveCheckboxOptions(e, use_lightning_navigation_el);
	});
	use_lightning_navigation_el.addEventListener("change", (e) => {
		// click on dependent setting
		if (!e.target.checked) {
			link_new_browser_el.checked = false;
		}
		saveCheckboxOptions(e, link_new_browser_el);
	});
	tab_add_front_el.addEventListener("change", (e) => {
		// click on dependent setting
		if (e.target.checked && keep_sorted_el.checked) {
			keep_sorted_el.click();
		}
		saveCheckboxOptions(e);
	});
	let oldUserLanguage = user_language_select.value;
	user_language_select.addEventListener("change", (e) => {
		const cookiesPermObj = {
			permissions: ["cookies"],
			origins: MANIFEST.optional_host_permissions,
		};
		const languageMessage = {
			what: "set",
			key: SETTINGS_KEY,
			set: [{
				id: USER_LANGUAGE,
				enabled: e.target.value,
			}],
		};
		/**
		 * Updates the language used by the whole extension and backups the last language used.
		 */
		const sendLanguageMessage = () => {
			sendExtensionMessage(languageMessage);
			oldUserLanguage = e.target.value;
		};
		if (e.target.value === FOLLOW_SF_LANG) { // the user wants to follow the language on salesforce
			BROWSER.permissions.request(cookiesPermObj)
				.then((resp) => {
					if (resp === true) { // the extension has the cookies permission
						sendLanguageMessage();
					} else {
						user_language_select.value = oldUserLanguage;
					}
				});
		} else {
			sendLanguageMessage();
		}
	});
	listenersSet["settings"] = true;
}

/**
 * Saves Tab styling options to storage and updates the UI
 * @param {Event} e - The event object from the input interaction
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Key identifying which Tab type to save settings for
 */
function saveTabOptions(e, key = GENERIC_TAB_STYLE_KEY) {
	const set = { what: "set", key, set: [] };
	const setting = {};
	const target = e.target;
	const styleKey = target.dataset.styleKey;
	setting.id = styleKey;
	setting.forActive = !target.id.endsWith(inactive);
	setting.value = e.target.value;
	setPreviewAndInputValue(setting, key === GENERIC_TAB_STYLE_KEY);
	set.set.push(setting);
	sendExtensionMessage(set);
}

/**
 * Saves Tab decoration styles to storage and updates the UI
 * @param {HTMLElement[]} [selectedLis=[]] - Selected list items containing decoration settings
 * @param {boolean} [isAdding=true] - Whether adding (true) or removing (false) decorations
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Key identifying which Tab type to save settings for
 */
function saveTabDecorations(
	selectedLis = [],
	isAdding = true,
	key = GENERIC_TAB_STYLE_KEY,
) {
	const set_msg = {
		what: "set",
		key,
		set: [{
			id: preventDefaultOverride,
			value: "no-default",
		}],
	};
	for (const li of selectedLis) {
		const styleKey = li.dataset.styleKey;
		const setting = {
			id: styleKey,
			forActive: !li.id.endsWith(inactive),
			value: isAdding ? styleKey : "",
		};
		setPreviewAndInputValue(setting, key === GENERIC_TAB_STYLE_KEY, false);
		set_msg.set.push(setting);
	}
	sendExtensionMessage(set_msg);
}

/**
 * Toggles the `aria-selected` attribute of the clicked list item.
 * @param {Event} event - The event triggered by user interaction.
 */
function _flipSelected(event) {
	const li = event.target.closest("li");
	li.ariaSelected = li.ariaSelected !== "true";
}

/**
 * Moves selected decorations to a target element and updates their state.
 * @param {HTMLElement} moveHereElement - The element to move selected decorations into.
 * @param {HTMLElement[]} allDecorations - List of all decoration elements.
 * @param {boolean} [isAdding=true] - Whether decorations are being added or removed.
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Key used for saving decorations.
 * @throws {Error} If required parameters are missing.
 */
function moveSelectedDecorationsTo(
	moveHereElement = null,
	allDecorations = null,
	isAdding = true,
	key = GENERIC_TAB_STYLE_KEY,
) {
	if (moveHereElement == null || allDecorations == null) {
		throw new Error(
			"error_required_params",
			moveHereElement,
			allDecorations,
		);
	}
	const selectedDecorations = allDecorations
		.filter((el) => el.ariaSelected === "true");
	for (const el of selectedDecorations) {
		moveHereElement.append(el);
		el.ariaSelected = false;
	}
	saveTabDecorations(selectedDecorations, isAdding, key);
}

/**
 * Gets button element references for moving decorations between available/chosen states.
 * @param {boolean} isGeneric - Whether to get generic or org-specific button references
 * @returns {Object} Object containing button element references
 */
function _getButtonReferences(isGeneric) {
	return {
    inactive: {
      available: isGeneric
        ? inactiveGeneric.moveBtns.available
        : inactiveOrg.moveBtns.available,
      chosen: isGeneric
			? inactiveGeneric.moveBtns.chosen
			: inactiveOrg.moveBtns.chosen,
    },
    active: {
      available: isGeneric
			? activeGeneric.moveBtns.available
			: activeOrg.moveBtns.available,
      chosen: isGeneric
			? activeGeneric.moveBtns.chosen
			: activeOrg.moveBtns.chosen,
    },
	};
}

/**
 * Gets decoration list element references for organizing available/chosen decorations.
 * @param {boolean} isGeneric - Whether to get generic or org-specific list references
 * @returns {Object} Object containing list element references
 */
function _getListReferences(isGeneric) {
	return {
    inactive: {
      available: isGeneric
			? inactiveGeneric.decorationUls.available
			: inactiveOrg.decorationUls.available,
      chosen: isGeneric
			? inactiveGeneric.decorationUls.chosen
			: inactiveOrg.decorationUls.chosen,
    },
    active: {
      available: isGeneric
			? activeGeneric.decorationUls.available
			: activeOrg.decorationUls.available,
      chosen: isGeneric
			? activeGeneric.decorationUls.chosen
			: activeOrg.decorationUls.chosen,
    },
	};
}

/**
 * Gathers all UI element references needed for tab styling based on the key type.
 * @param {boolean} isGeneric - Whether to get generic or org-specific list references
 * @returns {Object} Object containing all necessary UI element references
 */
function _getTabResources(isGeneric) {
	const buttons = _getButtonReferences(isGeneric),
	const	lists= _getListReferences(isGeneric),
	return {
		isGeneric,
		inputs: isGeneric ? allGenericInputs : allOrgInputs,
		decorations: isGeneric ? allGenericDecorations : allOrgDecorations,
    inactive: {
      decorations: isGeneric
        ? inactiveGeneric.decorations
        : inactiveOrg.decorations,
      moveBtns: buttons.inactive,
      uls: lists.inactive,
    },
    active: {
      decorations: isGeneric
        ? activeGeneric.decorations
        : activeOrg.decorations,
      moveBtns: buttons.active,
      uls: lists.active,
    },
	};
}

/**
 * Restores saved style settings from storage and applies them to the current UI state.
 * @param {string} key - Storage key for the settings
 * @returns {Promise<void>}
 */
async function _restoreSettings(key) {
	const settings = await getStyleSettings(key);
	if (settings != null) {
		const choice = Array.isArray(settings)
			? { id: key, value: settings }
			: settings;
		setCurrentChoice(choice);
	}
}

/**
 * Sets up event listeners for buttons that move decorations between available/chosen lists.
 * @param {Object} resources - UI element references containing buttons and lists
 * @param {string} key - Tab style key for saving settings
 */
function _setupMoveButtonListeners(resources, key) {
	const {
    inactive: {
      decorations: allInactiveDecorations,
      moveBtns: inactiveMoveBtns,
      uls: inactiveUls,
    },
    active: {
      decorations: allActiveDecorations,
      moveBtns: activeMoveBtns,
      uls: activeUls,
    },
	} = resources;
	// Move to available buttons
	inactiveMoveBtns.available.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				inactiveUls.available,
				allInactiveDecorations,
				false,
				key,
			),
	);
	activeMoveBtns.available.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				activeUls.available,
				allActiveDecorations,
				false,
				key,
			),
	);
	// Move to chosen buttons
	inactiveMoveBtns.chosen.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				inactiveUls.chosen,
				allInactiveDecorations,
				true,
				key,
			),
	);
	activeMoveBtns.chosen.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				activeUls.chosen,
				allActiveDecorations,
				true,
				key,
			),
	);
}
/**
 * Sets up all event listeners for tab styling UI elements.
 * Includes input change handlers, decoration click handlers, and button move handlers.
 * @param {Object} resources - UI element references from _getTabResources
 * @param {string} key - Tab style key for saving settings
 */
function _setupUIListeners(resources, key) {
	// Input change listeners
	for (const el of resources.inputs) {
		el?.addEventListener("change", (e) => saveTabOptions(e, key));
	}
	// Decoration selection listeners
	for (const el of resources.decorations) {
		el.addEventListener("click", _flipSelected);
	}
}

/**
 * Restores Tab style settings and initializes related UI listeners.
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Storage key for Tab settings (generic or org).
 * @returns {Promise<void>}
 * @throws {Error} If `key` is invalid.
 */
async function restoreTabSettings(key = GENERIC_TAB_STYLE_KEY, {
	isPinned = false,
} = {}) {
	if (key !== GENERIC_TAB_STYLE_KEY && key !== ORG_TAB_STYLE_KEY) {
		throw new Error("error_invalid_key");
	}
	if (listenersSet[key]?.[isPinned]) {
		return;
	}
	const isGeneric = key === GENERIC_TAB_STYLE_KEY;
	await _restoreSettings(key);
	const resources = _getTabResources(isGeneric);
	_setupUIListeners(resources, key);
	// Button move listeners
	_setupMoveButtonListeners(resources, key);
	listenersSet[key][isPinned] = true;
}

/**
 * Finds elements in the page with a standardized Id, given the changing name.
 * @returns {Object} containing the `container`, `settings` and `preview` elements (if available).
 */
function getContainers(name = null) {
	if (name == null) {
		throw new Error("error_required_params");
	}
	const container = document.getElementById(`${name}-container`);
	const header = document.getElementById(`${name}-settings`);
	const preview = document.getElementById(`${name}-preview`);
	return { container, header, preview };
}

const settings_settings = getContainers("general");
const settings_generic = getContainers(TAB_GENERIC_STYLE);
const settings_org = getContainers(TAB_ORG_STYLE);
const settings_pinnedGeneric = getContainers(`pinned_${TAB_GENERIC_STYLE}`);
const settings_pinnedOrg = getContainers(`pinned_${TAB_ORG_STYLE}`);

/**
 * Toggles the active class on a list item containing the target element
 * @param {Event} event - The event object from the interaction
 */
function toggleActivePreview(event) {
	event.target.closest("li").classList.toggle(SLDS_ACTIVE);
}

const allPreviews = [
	settings_generic.preview,
	settings_org.preview,
	settings_pinnedGeneric.preview,
	settings_pinnedOrg.preview,
];
for (const prev of allPreviews) {
	prev.addEventListener("click", toggleActivePreview);
}

const allHeaders = [
	settings_settings.header,
	settings_generic.header,
	settings_org.header,
	settings_pinnedGeneric.header,
	settings_pinnedOrg.header,
];
const allContainers = [
	settings_settings.container,
	settings_generic.container,
	settings_org.container,
	settings_pinnedGeneric.container,
	settings_pinnedOrg.container,
];

/**
 * Activates one element and shows it, while deactivating and hiding others.
 * @param {Object} settings_object - Object with the Elements to show
 */
function showRelevantSettings_HideOthers(settings_object) {
	for (const el of allHeaders) {
		el.classList.remove(SLDS_ACTIVE);
	}
	for (const el of [...allContainers, ...allPreviews]) {
		el.classList.add(hidden);
	}
	settings_object.header.classList.add(SLDS_ACTIVE);
	settings_object.container.classList.remove(hidden);
	settings_object.preview?.classList.remove(hidden); // only if available
}

settings_settings.header.addEventListener("click", () => {
	restoreGeneralSettings();
	showRelevantSettings_HideOthers(settings_settings);
});

settings_generic.header.addEventListener("click", () => {
	restoreTabSettings(GENERIC_TAB_STYLE_KEY);
	showRelevantSettings_HideOthers(settings_generic);
});

settings_org.header.addEventListener("click", () => {
	restoreTabSettings(ORG_TAB_STYLE_KEY);
	showRelevantSettings_HideOthers(settings_org);
});

settings_pinnedGeneric.header.addEventListener("click", () => {
	restoreTabSettings(GENERIC_TAB_STYLE_KEY, { isPinned: true });
	showRelevantSettings_HideOthers(settings_pinnedGeneric);
});

settings_pinnedOrg.header.addEventListener("click", () => {
	restoreTabSettings(ORG_TAB_STYLE_KEY, { isPinned: true });
	showRelevantSettings_HideOthers(settings_pinnedOrg);
});

const saveToast = document.getElementById("save-confirm");
document.querySelector("#save-container > button").addEventListener(
	"click",
	() => {
		saveToast.classList.remove(invisible);
		savePickedSort(
			keep_sorted_el.checked && picked_sort.select.value,
			picked_sort.direction.value,
		);
		setTimeout(() => saveToast.classList.add(invisible), 2500);
	},
);

await restoreGeneralSettings();
