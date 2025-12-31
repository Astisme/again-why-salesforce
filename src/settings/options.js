import {
	EXTENSION_NAME,
	FOLLOW_SF_LANG,
	GENERIC_PINNED_TAB_STYLE_KEY,
	GENERIC_TAB_STYLE_KEY,
	LINK_NEW_BROWSER,
	NO_RELEASE_NOTES,
	NO_UPDATE_NOTIFICATION,
	ORG_PINNED_TAB_STYLE_KEY,
	ORG_TAB_STYLE_KEY,
	PERSIST_SORT,
	POPUP_LOGIN_NEW_TAB,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_SETUP_NEW_TAB,
	PREVENT_ANALYTICS,
	PREVENT_DEFAULT_OVERRIDE,
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
	TAB_STYLE_TOP,
	TAB_STYLE_UNDERLINE,
	USE_LIGHTNING_NAVIGATION,
	USER_LANGUAGE,
} from "/constants.js";
import {
	areFramePatternsAllowed,
	getCssRule,
	getCssSelector,
	getPinnedSpecificKey,
	getSettings,
	getStyleSettings,
	isExportAllowed,
	isGenericKey,
	isPinnedKey,
	isStyleKey,
	requestCookiesPermission,
	requestExportPermission,
	requestFramePatternsPermission,
	sendExtensionMessage,
} from "/functions.js";
import ensureTranslatorAvailability from "/translator.js";

const hidden = "hidden";
const invisible = "invisible";
await ensureTranslatorAvailability();

/**
 * Creates the object used to update the settings
 *
 * @param {Object} [param0={}] - an Object with the following parameters
 * @param {null} [param0.key=null] - the key for which to set the setting
 * @param {any[]} [param0.set=[]] - the array containing the settings to save
 * @throws Error when key was not set
 * @return {Object} the object used to update the settings
 */
function getObjectToSet({
	key = null,
	set = [],
} = {}) {
	if (key == null) {
		throw new Error("error_required_params");
	}
	return {
		what: "set",
		key,
		set,
	};
}

/**
 * Saves checkbox state and dependent checkbox states to settings
 * @param {Event} e - The event object from the checkbox interaction
 * @param {...HTMLElement} dependentCheckboxElements - Dependent checkbox elements whose states should also be saved
 */
function saveCheckboxOptions(e, ...dependentCheckboxElements) {
	const set_msg = getObjectToSet({ key: SETTINGS_KEY });
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

const allowExport = document.getElementById("allow-export");
const allowDomains = document.getElementById("allow-domains");

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
 * @param {string} styleType - The style type (e.g., TAB_STYLE_BACKGROUND, TAB_STYLE_COLOR)
 * @param {Object} [tabConfig={}] - an Object containing the following parameters
 * @param {null} [tabConfig.tabType=null] - The Tab type prefix
 * @param {null} [tabConfig.state=null] - The state (active/inactive)
 * @param {string} [tabConfig.prefix=""] - the prefix used to get the id
 * @param {string} [tabConfig.postfix=""] - the suffix used to get the id
 * @throws Error when tabType and state where not set
 * @return {HTMLElement|null} the element found by its id
 */
function getTabElement(styleType, {
	tabType = null,
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
 * @param {Object} [tabConfig={}] - an Object containing the following parameters
 * @param {null} [tabConfig.tabType=null] - The Tab type prefix
 * @param {null} [tabConfig.state=null] - The state (active/inactive)
 * @param {string} [tabConfig.prefix=""] - the prefix used to get the id
 * @param {string} [tabConfig.postfix=""] - the suffix used to get the id
 * @throws Error when tabType and state where not set
 * @return {Object} Object with available and chosen list elements
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
	const newPref = `${prefix}${tabType}-`;
	const newPost = `-${state}${postfix}`;
	const available = `${newPref}${decorationAvailableId}${newPost}`;
	const chosen = `${newPref}${decorationChosenId}${newPost}`;
	return {
		available: document.getElementById(available),
		chosen: document.getElementById(chosen),
	};
}

const styleGeneric = "style-generic";
const styleOrg = "style-org";
/**
 * Creates style IDs for a given style type and state
 * @param {Object} [tabConfig={}] - an Object containing the following parameters
 * @param {null} [tabConfig.tabType=null] - The Tab type prefix
 * @param {null} [tabConfig.state=null] - The state (active/inactive)
 * @param {string} [tabConfig.prefix=""] - the prefix used to get the id
 * @param {string} [tabConfig.postfix=""] - the suffix used to get the id
 * @throws Error when tabType and state where not set
 * @return {Object} Object with all style IDs
 */
function createStyleIds({
	tabType = null,
	state = null,
	prefix = "",
	postfix = "",
} = {}) {
	if (tabType == null || state == null) {
		throw new Error("error_required_params");
	}
	const styleType = tabType === TAB_GENERIC_STYLE ? styleGeneric : styleOrg;
	const newPre = prefix === ""
		? EXTENSION_NAME
		: `${EXTENSION_NAME}-${prefix}`;
	const suffix = `${styleType}-${state}${postfix}`;
	return {
		background: `${newPre}-${TAB_STYLE_BACKGROUND}-${suffix}`,
		color: `${newPre}-${TAB_STYLE_COLOR}-${suffix}`,
		border: `${newPre}-${TAB_STYLE_BORDER}-${suffix}`,
		shadow: `${newPre}-${TAB_STYLE_SHADOW}-${suffix}`,
		hover: `${newPre}-${TAB_STYLE_HOVER}-${suffix}`,
		top: state === active
			? `${newPre}-${TAB_STYLE_TOP}-${suffix}`
			: undefined,
		bold: `${newPre}-${TAB_STYLE_BOLD}-${suffix}`,
		italic: `${newPre}-${TAB_STYLE_ITALIC}-${suffix}`,
		underline: `${newPre}-${TAB_STYLE_UNDERLINE}-${suffix}`,
	};
}

const chosenBtnId = "move-chosen";
const availableBtnId = "move-available";
/**
 * Retrieves the arrow buttons which move the decorations between the chosen and available Uls
 *
 * @param {Object} [tabConfig={}] - an Object containing the following parameters
 * @param {null} [tabConfig.tabType=null] - The Tab type prefix
 * @param {null} [tabConfig.state=null] - The state (active/inactive)
 * @param {string} [tabConfig.prefix=""] - the prefix used to get the id
 * @param {string} [tabConfig.postfix=""] - the suffix used to get the id
 * @throws Error when tabType and state where not set
 * @return {Object} with chosen (the button to move to chosen) and available (the one to move to available)
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
 * @param {Object} [tabConfig={}] - an Object containing the following parameters
 * @param {null} [tabConfig.tabType=null] - The Tab type prefix
 * @param {null} [tabConfig.state=null] - The state (active/inactive)
 * @param {string} [tabConfig.prefix=""] - the prefix used to get the id
 * @param {string} [tabConfig.postfix=""] - the suffix used to get the id
 * @throws Error when tabType and state where not set
 * @return {Object} Object with named properties for each element plus arrays
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
	const conf = {
		tabType,
		state,
		prefix,
		postfix,
	};
	const elements = {
		[TAB_STYLE_BACKGROUND]: getTabElement(TAB_STYLE_BACKGROUND, conf),
		[TAB_STYLE_COLOR]: getTabElement(TAB_STYLE_COLOR, conf),
		[TAB_STYLE_BORDER]: getTabElement(TAB_STYLE_BORDER, conf),
		[TAB_STYLE_SHADOW]: getTabElement(TAB_STYLE_SHADOW, conf),
		[TAB_STYLE_HOVER]: getTabElement(TAB_STYLE_HOVER, conf),
		[TAB_STYLE_TOP]: state === active
			? getTabElement(TAB_STYLE_TOP, conf)
			: null,
		[TAB_STYLE_BOLD]: getTabElement(TAB_STYLE_BOLD, conf),
		[TAB_STYLE_ITALIC]: getTabElement(TAB_STYLE_ITALIC, conf),
		[TAB_STYLE_UNDERLINE]: getTabElement(TAB_STYLE_UNDERLINE, conf),
	};
	return {
		elements,
		decorations: [
			elements[TAB_STYLE_BOLD],
			elements[TAB_STYLE_ITALIC],
			elements[TAB_STYLE_UNDERLINE],
		],
		decorationUls: getDecorationUls(conf),
		styleIds: createStyleIds(conf),
		moveBtns: getMoveButtons(conf),
	};
}

const pinned = "pinned";
const unpinned = "unpinned";
/**
 * Based on the input value, return a string used as configuration key
 * @param {boolean} [isPinned=false] - true when the element is pinned, false otherwise
 * @return {string} pinned / unpinned
 */
function getPinKey({ isPinned = false }) {
	return isPinned ? pinned : unpinned;
}

/**
 * Creates the configuration for the input elements
 *
 * @param {string[]} styles - the input element ids
 * @param {Object} configs - an Object from which to find the necessary information
 * @param {Object} configs.inactiveGenericUnpinned - the configuration for the inactive, generic, unpinned decorations
 * @param {Object} configs.inactiveGenericPinned - the configuration for the inactive, generic, pinned decorations
 * @param {Object} configs.inactiveOrgUnpinned - the configuration for the inactive, org, unpinned decorations
 * @param {Object} configs.inactiveOrgPinned - the configuration for the inactive, org, pinned decorations
 * @param {Object} configs.activeGenericUnpinned - the configuration for the active, generic, unpinned decorations
 * @param {Object} configs.activeGenericPinned - the configuration for the active, generic, pinned decorations
 * @param {Object} configs.activeOrgUnpinned - the configuration for the active, org, unpinned decorations
 * @param {Object} configs.activeOrgPinned - the configuration for the active, org, pinned decorations
 *
 * @return {Object} an object with all the necessary information for every given style
 */
function buildInputConfigs(styles, configs) {
	const result = {};
	for (const key of styles) {
		result[key] = {
			type: "input",
			elements: {
				inactive: {
					generic: {
						unpinned: configs.inactiveGenericUnpinned.elements[key],
						pinned: configs.inactiveGenericPinned.elements[key],
					},
					org: {
						unpinned: configs.inactiveOrgUnpinned.elements[key],
						pinned: configs.inactiveOrgPinned.elements[key],
					},
				},
				active: {
					generic: {
						unpinned: configs.activeGenericUnpinned.elements[key],
						pinned: configs.activeGenericPinned.elements[key],
					},
					org: {
						unpinned: configs.activeOrgUnpinned.elements[key],
						pinned: configs.activeOrgPinned.elements[key],
					},
				},
			},
			styleIds: {
				inactive: {
					generic: {
						unpinned: configs.inactiveGenericUnpinned.styleIds[key],
						pinned: configs.inactiveGenericPinned.styleIds[key],
					},
					org: {
						unpinned: configs.inactiveOrgUnpinned.styleIds[key],
						pinned: configs.inactiveOrgPinned.styleIds[key],
					},
				},
				active: {
					generic: {
						unpinned: configs.activeGenericUnpinned.styleIds[key],
						pinned: configs.activeGenericPinned.styleIds[key],
					},
					org: {
						unpinned: configs.activeOrgUnpinned.styleIds[key],
						pinned: configs.activeOrgPinned.styleIds[key],
					},
				},
			},
		};
	}
	return result;
}

/**
 * Creates the configuration for the elements to decorate the text
 *
 * @param {string[]} styles - the decoration styles
 * @param {Object} configs - an Object from which to find the necessary information
 * @param {Object} configs.inactiveGenericUnpinned - the configuration for the inactive, generic, unpinned decorations
 * @param {Object} configs.inactiveGenericPinned - the configuration for the inactive, generic, pinned decorations
 * @param {Object} configs.inactiveOrgUnpinned - the configuration for the inactive, org, unpinned decorations
 * @param {Object} configs.inactiveOrgPinned - the configuration for the inactive, org, pinned decorations
 * @param {Object} configs.activeGenericUnpinned - the configuration for the active, generic, unpinned decorations
 * @param {Object} configs.activeGenericPinned - the configuration for the active, generic, pinned decorations
 * @param {Object} configs.activeOrgUnpinned - the configuration for the active, org, unpinned decorations
 * @param {Object} configs.activeOrgPinned - the configuration for the active, org, pinned decorations
 *
 * @return {Object} an object with all the necessary information for every given style
 */
function buildDecorationConfigs(styles, configs) {
	const result = {};
	for (const key of styles) {
		result[key] = {
			type: "decoration",
			chosenUls: {
				inactive: {
					generic: {
						unpinned: configs.inactiveGenericUnpinned.decorationUls
							.chosen,
						pinned:
							configs.inactiveGenericPinned.decorationUls.chosen,
					},
					org: {
						unpinned:
							configs.inactiveOrgUnpinned.decorationUls.chosen,
						pinned: configs.inactiveOrgPinned.decorationUls.chosen,
					},
				},
				active: {
					generic: {
						unpinned:
							configs.activeGenericUnpinned.decorationUls.chosen,
						pinned:
							configs.activeGenericPinned.decorationUls.chosen,
					},
					org: {
						unpinned:
							configs.activeOrgUnpinned.decorationUls.chosen,
						pinned: configs.activeOrgPinned.decorationUls.chosen,
					},
				},
			},
			availableUls: {
				inactive: {
					generic: {
						unpinned: configs.inactiveGenericUnpinned.decorationUls
							.available,
						pinned: configs.inactiveGenericPinned.decorationUls
							.available,
					},
					org: {
						unpinned:
							configs.inactiveOrgUnpinned.decorationUls.available,
						pinned:
							configs.inactiveOrgPinned.decorationUls.available,
					},
				},
				active: {
					generic: {
						unpinned: configs.activeGenericUnpinned.decorationUls
							.available,
						pinned:
							configs.activeGenericPinned.decorationUls.available,
					},
					org: {
						unpinned:
							configs.activeOrgUnpinned.decorationUls.available,
						pinned: configs.activeOrgPinned.decorationUls.available,
					},
				},
			},
		};
	}
	return result;
}

/**
 * Creates a configuration for the style decorations
 *
 * @param {Object} configs - an Object from which to find the necessary information
 * @param {Object} configs.inactiveGenericUnpinned - the configuration for the inactive, generic, unpinned decorations
 * @param {Object} configs.inactiveGenericPinned - the configuration for the inactive, generic, pinned decorations
 * @param {Object} configs.inactiveOrgUnpinned - the configuration for the inactive, org, unpinned decorations
 * @param {Object} configs.inactiveOrgPinned - the configuration for the inactive, org, pinned decorations
 * @param {Object} configs.activeGenericUnpinned - the configuration for the active, generic, unpinned decorations
 * @param {Object} configs.activeGenericPinned - the configuration for the active, generic, pinned decorations
 * @param {Object} configs.activeOrgUnpinned - the configuration for the active, org, unpinned decorations
 * @param {Object} configs.activeOrgPinned - the configuration for the active, org, pinned decorations
 *
 * @return {Object} the better structured configuration, separated by style id
 */
function buildInputDecorationConfigs(configs) {
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
	const inputs = buildInputConfigs(
		[...inputStyles, ...decorationStyles],
		configs,
	);
	const decorations = buildDecorationConfigs(decorationStyles, configs);
	for (const key of Object.keys(decorations)) {
		if (inputs[key]) {
			Object.assign(inputs[key], decorations[key]);
		}
	}
	return inputs;
}

/**
 * Creates the configuration based on the given configs
 *
 * @param {Object} configs - the configuration of the Tab elements
 * @param {Object} configs.inactive - the configuration for the inactive elements
 * @param {Object} configs.inactive.unpinned - the configuration for the inactive unpinned elements
 * @param {Object} configs.inactive.pinned - the configuration for the inactive pinned elements
 * @param {Object} configs.active - the configuration for the active elements
 * @param {Object} configs.active.unpinned - the configuration for the active unpinned elements
 * @param {Object} configs.active.pinned - the configuration for the active pinned elements
 *
 * @return {Object} a newly structured configuration
 * -> unpinned.active
 * -> unpinned.inactive
 * -> pinned.active
 * -> pinned.inactive
 */
function buildStructuredConf(configs) {
	return {
		unpinned: {
			active: {
				decorations: configs.active.unpinned.decorations,
				decorationUls: configs.active.unpinned.decorationUls,
				moveBtns: configs.active.unpinned.moveBtns,
				inputs: Object.values(configs.active.unpinned.elements)
					.filter(Boolean),
			},
			inactive: {
				decorations: configs.inactive.unpinned.decorations,
				decorationUls: configs.inactive.unpinned.decorationUls,
				moveBtns: configs.inactive.unpinned.moveBtns,
				inputs: Object.values(configs.inactive.unpinned.elements)
					.filter(Boolean),
			},
		},
		pinned: {
			active: {
				decorations: configs.active.pinned.decorations,
				decorationUls: configs.active.pinned.decorationUls,
				moveBtns: configs.active.pinned.moveBtns,
				inputs: Object.values(configs.active.pinned.elements)
					.filter(Boolean),
			},
			inactive: {
				decorations: configs.inactive.pinned.decorations,
				decorationUls: configs.inactive.pinned.decorationUls,
				moveBtns: configs.inactive.pinned.moveBtns,
				inputs: Object.values(configs.inactive.pinned.elements)
					.filter(Boolean),
			},
		},
	};
}

const pinnedPrefix = `${pinned}_`;
/**
 * Creates the complete style configuration object
 * @return {Object} Configurations organized by style type
 */
function createStyleConfigurations() {
	const inactiveGenericUnpinned = createTabElements({
		tabType: TAB_GENERIC_STYLE,
		state: inactive,
	});
	const inactiveGenericPinned = createTabElements({
		tabType: TAB_GENERIC_STYLE,
		state: inactive,
		prefix: pinnedPrefix,
	});
	const inactiveOrgUnpinned = createTabElements({
		tabType: TAB_ORG_STYLE,
		state: inactive,
	});
	const inactiveOrgPinned = createTabElements({
		tabType: TAB_ORG_STYLE,
		state: inactive,
		prefix: pinnedPrefix,
	});
	const activeGenericUnpinned = createTabElements({
		tabType: TAB_GENERIC_STYLE,
		state: active,
	});
	const activeGenericPinned = createTabElements({
		tabType: TAB_GENERIC_STYLE,
		state: active,
		prefix: pinnedPrefix,
	});
	const activeOrgUnpinned = createTabElements({
		tabType: TAB_ORG_STYLE,
		state: active,
	});
	const activeOrgPinned = createTabElements({
		tabType: TAB_ORG_STYLE,
		state: active,
		prefix: pinnedPrefix,
	});
	const configs = {
		inactiveGenericUnpinned,
		inactiveGenericPinned,
		inactiveOrgUnpinned,
		inactiveOrgPinned,
		activeGenericUnpinned,
		activeGenericPinned,
		activeOrgUnpinned,
		activeOrgPinned,
	};
	return {
		configs: buildInputDecorationConfigs(configs),
		generic: buildStructuredConf({
			inactive: {
				unpinned: inactiveGenericUnpinned,
				pinned: inactiveGenericPinned,
			},
			active: {
				unpinned: activeGenericUnpinned,
				pinned: activeGenericPinned,
			},
		}),
		org: buildStructuredConf({
			inactive: {
				unpinned: inactiveOrgUnpinned,
				pinned: inactiveOrgPinned,
			},
			active: {
				unpinned: activeOrgUnpinned,
				pinned: activeOrgPinned,
			},
		}),
	};
}

/**
 * Configuration object with style type keys and element/ID mappings
 * Each style type maps to element references, style IDs, and decoration containers
 * organized by active/inactive state and generic/org variants.
 */
const {
	configs: styleConfigurations,
	generic: genericTabConf,
	org: orgTabConf,
} = createStyleConfigurations();
const allGenericInputs = {
	unpinned: {
		active: genericTabConf.unpinned.active.inputs,
		inactive: genericTabConf.unpinned.inactive.inputs,
	},
	pinned: {
		active: genericTabConf.pinned.active.inputs,
		inactive: genericTabConf.pinned.inactive.inputs,
	},
};
const allOrgInputs = {
	unpinned: {
		active: orgTabConf.unpinned.active.inputs,
		inactive: orgTabConf.unpinned.inactive.inputs,
	},
	pinned: {
		active: orgTabConf.pinned.active.inputs,
		inactive: orgTabConf.pinned.inactive.inputs,
	},
};
const allGenericDecorations = {
	unpinned: {
		active: genericTabConf.unpinned.active.decorations,
		inactive: genericTabConf.unpinned.inactive.decorations,
	},
	pinned: {
		active: genericTabConf.pinned.active.decorations,
		inactive: genericTabConf.pinned.inactive.decorations,
	},
};
const allOrgDecorations = {
	unpinned: {
		active: orgTabConf.unpinned.active.decorations,
		inactive: orgTabConf.unpinned.inactive.decorations,
	},
	pinned: {
		active: orgTabConf.pinned.active.decorations,
		inactive: orgTabConf.pinned.inactive.decorations,
	},
};

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
 * @return {Object} Object containing input element and decoration list references
 */
function _getElementReferences(config, {
	isForInactive = true,
	isGeneric = true,
	wasPicked = false,
	pinKey = "",
} = {}) {
	const state = isForInactive ? "inactive" : "active";
	const variant = isGeneric ? "generic" : "org";
	const elements = {
		input: config.elements?.[state]?.[variant]?.[pinKey],
	};
	if (config.type === "decoration") {
		elements.chosenUl = wasPicked
			? config.chosenUls?.[state]?.[variant]?.[pinKey]
			: config.availableUls?.[state]?.[variant]?.[pinKey];
	}
	return elements;
}
/**
 * Retrieves the appropriate style ID from configuration based on tab state and type.
 * @param {Object} config - Style configuration object containing styleIds mappings
 * @param {boolean} isForInactive - Whether targeting inactive tabs
 * @param {boolean} isGeneric - Whether targeting generic tabs (vs org-specific)
 * @return {string|undefined} Style ID for CSS rule application, or undefined if not found
 */
function _getStyleId(config, {
	isForInactive = true,
	isGeneric = true,
	pinKey = "",
} = {}) {
	const state = isForInactive ? "inactive" : "active";
	const variant = isGeneric ? "generic" : "org";
	return `${config.styleIds?.[state]?.[variant]?.[pinKey]}`;
}
/**
 * Determines the appropriate CSS pseudo-selector for specific style types.
 * Some styles require pseudo-selectors like :hover or ::before for proper application.
 * @param {string} styleId - The style type identifier (TAB_STYLE_* constant)
 * @return {string|null} Pseudo-selector string (:hover, ::before) or null for standard selectors
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
 * @param {boolean} isForInactive - Whether targeting inactive Tabs
 * @param {boolean} isGeneric - Whether targeting generic Tabs (vs org-specific)
 * @param {boolean} wasPicked - Whether the style value is set (non-null/non-empty)
 * @param {boolean} isPinned - Whether targeting pinned Tabs (vs org-specific)
 * @return {string|null} Complete CSS rule string, or null if no value set
 */
function _buildCssRule(setting, {
	isForInactive = true,
	isGeneric = true,
	wasPicked = false,
	isPinned = false,
} = {}) {
	if (!wasPicked) return null;
	const pseudoSelector = _getPseudoSelector(setting.id);
	const cssSelector = getCssSelector({
		isInactive: isForInactive,
		isGeneric,
		pseudoElement: pseudoSelector,
		isPinned,
	});
	const cssRule = getCssRule(setting.id, setting.value);
	return `${cssSelector}{ ${cssRule} }`;
}
/**
 * Updates DOM elements with new style values and moves decoration elements between lists.
 * For decoration styles, moves elements between "chosen" and "available" lists based on wasPicked state.
 * For input styles, sets the input element's value property.
 * @param {Object} elements - Object containing element references (input, chosenUl)
 * @param {string|null} value - The style value to set in input elements
 */
function _updateUIElements(elements, value) {
	if (elements.input) {
		elements.input.value = value;
		if (elements.chosenUl) {
			elements.chosenUl.append(
				elements.input,
			);
		}
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
	{
		updateViews = true,
		isGeneric = true,
		isPinned = false,
	} = {},
) {
	const isForInactive = !setting.forActive;
	// Handle special case for TAB_STYLE_TOP (active only)
	if (
		(setting.id === TAB_STYLE_TOP && isForInactive) ||
		setting.id === PREVENT_DEFAULT_OVERRIDE
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
	const pinKey = getPinKey({ isPinned });
	const elements = _getElementReferences(
		config,
		{
			isForInactive,
			isGeneric,
			wasPicked,
			pinKey,
		},
	);
	const styleId = _getStyleId(config, { isForInactive, isGeneric, pinKey });
	// Apply CSS style
	const cssRule = _buildCssRule(setting, {
		isForInactive,
		isGeneric,
		wasPicked,
		isPinned,
	});
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
		case ORG_TAB_STYLE_KEY:
		case GENERIC_PINNED_TAB_STYLE_KEY:
		case ORG_PINNED_TAB_STYLE_KEY: {
			const isGeneric = isGenericKey(setting.id);
			const isPinned = isPinnedKey(setting.id);
			if (Array.isArray(setting.value)) {
				for (const set of setting.value) {
					setPreviewAndInputValue(set, { isGeneric, isPinned });
				}
			} else {
				setPreviewAndInputValue(setting.value, { isGeneric, isPinned });
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
		allCheckboxes[TAB_ADD_FRONT].checked = false;
	}
	sendExtensionMessage(getObjectToSet({
		key: SETTINGS_KEY,
		set,
	}));
}

keep_sorted_el.addEventListener("click", (e) => {
	if (e.currentTarget.checked) {
		sortContainer.classList.remove(invisible);
	} else {
		sortContainer.classList.add(invisible);
	}
});

/**
 * Toggles the visibility of the given toast for a small amount of time
 * @param {HTMLElement} toast - a div on which the invisible class is present and can be toggled
 */
function showThenHideToast(toast) {
	toast.classList.remove(invisible);
	setTimeout(() => toast.classList.add(invisible), 2500);
}

/**
 * Shows the given message in a success / error toast.
 * @param {string} message - the message to be translated to be shown to the user
 * @param {boolean} [isSuccess=true] - whether the action concluded with a positive outcome
 */
async function showToast(message, isSuccess = true) {
	const translator = await ensureTranslatorAvailability();
	const toast = isSuccess ? successToast : errorToast;
	const messageDiv = toast.querySelector(
		"div.toastMessage.slds-text-heading--small.forceActionsText",
	);
	messageDiv.innerText = await translator.translate(message);
	showThenHideToast(toast);
}

const listenersSet = {};
/**
 * Restores general settings from storage and sets up event listeners
 * @return {Promise<void>} Promise that resolves when settings are restored and listeners are set
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
	user_language_select.addEventListener("change", async (e) => {
		const languageMessage = getObjectToSet({
			key: SETTINGS_KEY,
			set: [{
				id: USER_LANGUAGE,
				enabled: e.target.value,
			}],
		});
		/**
		 * Updates the language used by the whole extension and backups the last language used.
		 */
		const sendLanguageMessage = () => {
			sendExtensionMessage(languageMessage);
			oldUserLanguage = e.target.value;
		};
		if (e.target.value === FOLLOW_SF_LANG) { // the user wants to follow the language on salesforce
			const resp = await requestCookiesPermission();
			if (resp) { // the extension now has the cookies permission
				sendLanguageMessage();
			} else {
				user_language_select.value = oldUserLanguage;
				showToast("error_permission_unavailable", false);
			}
		} else {
			sendLanguageMessage();
		}
	});
	allowExport.checked = isExportAllowed();
	allowExport.addEventListener("change", async (e) => {
		e.preventDefault();
		const tryingToCheck = e.target.checked;
		e.target.checked = !e.target.checked;
		if (isExportAllowed() || !tryingToCheck) {
			return;
		}
		const res = await requestExportPermission();
		showToast(
			res ? "permission_request_success" : "permission_request_failure",
			res,
		);
		e.target.checked = res;
	});
	allowDomains.checked = await areFramePatternsAllowed();
	allowDomains.addEventListener("change", async (e) => {
		e.preventDefault();
		const tryingToCheck = e.target.checked;
		e.target.checked = !e.target.checked;
		if (!tryingToCheck) {
			return;
		}
		const res = await requestFramePatternsPermission();
		showToast(
			res ? "permission_request_success" : "permission_request_failure",
			res,
		);
		e.target.checked = res;
	});
	listenersSet["settings"] = true;
}

/**
 * Saves Tab styling options to storage and updates the UI
 * @param {Event} e - The event object from the input interaction
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Key identifying which Tab type to save settings for
 */
function saveTabOptions(e, key = GENERIC_TAB_STYLE_KEY) {
	const setting = {
		id: e.target.dataset.styleKey,
		forActive: !e.target.id.endsWith(inactive),
		value: e.target.value,
	};
	setPreviewAndInputValue(setting, {
		isGeneric: isGenericKey(key),
		isPinned: isPinnedKey(key),
	});
	sendExtensionMessage(getObjectToSet({
		key,
		set: [setting],
	}));
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
	const set_msg = getObjectToSet({
		key,
		set: [{
			id: PREVENT_DEFAULT_OVERRIDE,
			value: "no-default",
		}],
	});
	for (const li of selectedLis) {
		const styleKey = li.dataset.styleKey;
		const setting = {
			id: styleKey,
			forActive: !li.id.endsWith(inactive),
			value: isAdding ? styleKey : "",
		};
		setPreviewAndInputValue(setting, {
			isGeneric: isGenericKey(key),
			isPinned: isPinnedKey(key),
			updateViews: false,
		});
		set_msg.set.push(setting);
	}
	sendExtensionMessage(set_msg);
}

let activePreview = null;
/**
 * Toggles the `SLDS_ACTIVE` attribute of the currently viewable preview.
 * @param {boolean} [isActive=false] - whether the resource is for active state
 */
function setActivePreview({ isActive = false }) {
	if (isActive) {
		activePreview?.classList.add(SLDS_ACTIVE);
	} else {
		activePreview?.classList.remove(SLDS_ACTIVE);
	}
}

/**
 * Toggles the `aria-selected` attribute of the clicked list item.
 * @param {Event} event - The event triggered by user interaction.
 * @param {boolean} [isActive=false] - whether the resource is for active state
 */
function _flipSelected(event, isActive = false) {
	const li = event.target.closest("li");
	li.ariaSelected = li.ariaSelected !== "true";
	setActivePreview({ isActive });
}

/**
 * Moves selected decorations to a target element and updates their state.
 * @param {HTMLElement} moveHereElement - The element to move selected decorations into.
 * @param {HTMLElement[]} allDecorations - List of all decoration elements which refer to the button which was clicked.
 * @param {boolean} [isAdding=true] - Whether decorations are being added or removed.
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Key used for saving decorations.
 * @param {HTMLElement[]} allDecorations - List of all decoration elements.
 * @throws {Error} If required parameters are missing.
 */
function moveSelectedDecorationsTo({
	moveHereElement = null,
	allMovableDecorations = null,
	isAdding = true,
	key = GENERIC_TAB_STYLE_KEY,
	allDecorations = null,
} = {}) {
	if (moveHereElement == null || allMovableDecorations == null) {
		throw new Error(
			"error_required_params",
			moveHereElement,
			allMovableDecorations,
		);
	}
	const selectedDecorations = allMovableDecorations
		.filter((el) => el.ariaSelected === "true");
	for (const el of allDecorations) {
		el.ariaSelected = false;
	}
	for (const el of selectedDecorations) {
		moveHereElement.append(el);
	}
	saveTabDecorations(selectedDecorations, isAdding, key);
}

/**
 * Gets element references for organizing available/chosen elements.
 * @param {Object} [pinConf=null] the configuration from which to find the data
 * @param {String} [key=null] the key from which to extract the data
 * @throws Error when the parameters where not specified
 * @return {Object} Object containing list element references
 */
function _getReferencesByKey(pinConf = null, key = null) {
	if (pinConf == null || key == null) {
		throw new Error("error_required_params");
	}
	return {
		inactive: {
			available: pinConf.inactive[key].available,
			chosen: pinConf.inactive[key].chosen,
		},
		active: {
			available: pinConf.active[key].available,
			chosen: pinConf.active[key].chosen,
		},
	};
}

/**
 * Gathers all UI element references needed for tab styling based on the key type.
 * @param {boolean} isGeneric - Whether to get generic or org-specific list references
 * @param {boolean} isPinned - Whether to get pinned or unpinned list references
 * @return {Object} Object containing all necessary UI element references
 */
function _getTabResources({
	isGeneric = true,
	isPinned = false,
} = {}) {
	const pinKey = getPinKey({ isPinned });
	const pinConf = isGeneric ? genericTabConf[pinKey] : orgTabConf[pinKey];
	const buttons = _getReferencesByKey(pinConf, "moveBtns");
	const lists = _getReferencesByKey(pinConf, "decorationUls");
	return {
		isGeneric,
		isPinned,
		inputs: isGeneric ? allGenericInputs[pinKey] : allOrgInputs[pinKey],
		decorations: isGeneric
			? allGenericDecorations[pinKey]
			: allOrgDecorations[pinKey],
		inactive: {
			decorations: pinConf.inactive.decorations,
			moveBtns: buttons.inactive,
			uls: lists.inactive,
		},
		active: {
			decorations: pinConf.active.decorations,
			moveBtns: buttons.active,
			uls: lists.active,
		},
	};
}

/**
 * Restores saved style settings from storage and applies them to the current UI state.
 * @param {string} key - Storage key for the settings
 * @return {Promise<void>}
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
	const allDecorations = [
		...allInactiveDecorations,
		...allActiveDecorations,
	];
	inactiveMoveBtns.available.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo({
				moveHereElement: inactiveUls.available,
				allMovableDecorations: allInactiveDecorations,
				isAdding: false,
				key,
				allDecorations,
			}),
	);
	activeMoveBtns.available.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo({
				moveHereElement: activeUls.available,
				allMovableDecorations: allActiveDecorations,
				isAdding: false,
				key,
				allDecorations,
			}),
	);
	// Move to chosen buttons
	inactiveMoveBtns.chosen.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo({
				moveHereElement: inactiveUls.chosen,
				allMovableDecorations: allInactiveDecorations,
				isAdding: true,
				key,
				allDecorations,
			}),
	);
	activeMoveBtns.chosen.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo({
				moveHereElement: activeUls.chosen,
				allMovableDecorations: allActiveDecorations,
				isAdding: true,
				key,
				allDecorations,
			}),
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
	for (const el of resources.inputs.inactive) {
		el?.addEventListener("change", (e) => saveTabOptions(e, key));
		el?.addEventListener(
			"click",
			() => setActivePreview({ isActive: false }),
		);
	}
	for (const el of resources.inputs.active) {
		el?.addEventListener("change", (e) => saveTabOptions(e, key));
		el?.addEventListener(
			"click",
			() => setActivePreview({ isActive: true }),
		);
	}
	// Decoration selection listeners
	for (const el of resources.decorations.inactive) {
		el?.addEventListener("click", (e) => _flipSelected(e, false));
	}
	for (const el of resources.decorations.active) {
		el?.addEventListener("click", (e) => _flipSelected(e, true));
	}
	console.log(resources.decorations);
}

/**
 * Restores Tab style settings and initializes related UI listeners.
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Storage key for Tab settings (generic or org).
 * @param {Object} [param1={}] - an Object specifying the following parameters
 * @param {boolean} [param1.isPinned=false] - Whether the Tab is pinned or not
 * @return {Promise<void>}
 * @throws {Error} If `key` is not a style key
 */
async function restoreTabSettings(key = GENERIC_TAB_STYLE_KEY, {
	isPinned = false,
} = {}) {
	if (!isStyleKey(key)) {
		throw new Error("error_invalid_key");
	}
	const isGeneric = isGenericKey(key);
	const pinnedSpecificKey = getPinnedSpecificKey({ isGeneric, isPinned });
	if (listenersSet[pinnedSpecificKey]) {
		return;
	}
	await _restoreSettings(pinnedSpecificKey);
	const resources = _getTabResources({ isGeneric, isPinned });
	_setupUIListeners(resources, pinnedSpecificKey);
	// Button move listeners
	_setupMoveButtonListeners(resources, pinnedSpecificKey);
	listenersSet[pinnedSpecificKey] = true;
}

/**
 * Finds elements in the page with a standardized Id, given the changing name.
 * @param {string} [name=null] - the name used by the Id of the container
 * @throws Error when name was not set
 * @return {Object} containing the `container`, `settings` and `preview` elements (if available).
 */
function getContainers(name = null) {
	if (name == null || name == "") {
		throw new Error("error_required_params");
	}
	return {
		container: document.getElementById(`${name}-container`),
		header: document.getElementById(`${name}-settings`),
		preview: document.getElementById(`${name}-preview`),
	};
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
	settings_object.header?.classList.add(SLDS_ACTIVE);
	settings_object.container?.classList.remove(hidden);
	settings_object.preview?.classList.remove(hidden);
	activePreview = settings_object.preview;
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
const successToast = document.getElementById("toast-display-success");
const errorToast = document.getElementById("toast-display-error");

document.querySelector("#save-container > button").addEventListener(
	"click",
	() => {
		savePickedSort(
			keep_sorted_el.checked && picked_sort.select.value,
			picked_sort.direction.value,
		);
		showThenHideToast(saveToast);
	},
);

await restoreGeneralSettings();
