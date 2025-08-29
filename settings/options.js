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
	const set = { what: "set", key: SETTINGS_KEY, set: [] };
	const setting = {};
	setting.id = e.target.id;
	setting.enabled = this?.checked ?? e.target.checked;
	set.set.push(setting);
	dependentCheckboxElements.forEach((dc) => {
		const setting = {};
		setting.id = dc.id;
		setting.enabled = dc.checked;
		set.set.push(setting);
	});
	sendExtensionMessage(set);
}

const link_new_browser_el = document.getElementById(LINK_NEW_BROWSER);
const skip_link_detection_el = document.getElementById(SKIP_LINK_DETECTION);
const use_lightning_navigation_el = document.getElementById(
	USE_LIGHTNING_NAVIGATION,
);
const popup_open_login_el = document.getElementById(POPUP_OPEN_LOGIN);
const popup_open_setup_el = document.getElementById(POPUP_OPEN_SETUP);
const popup_login_new_tab_el = document.getElementById(POPUP_LOGIN_NEW_TAB);
const popup_setup_new_tab_el = document.getElementById(POPUP_SETUP_NEW_TAB);
const tab_on_left_el = document.getElementById(TAB_ON_LEFT);
const tab_add_front_el = document.getElementById(TAB_ADD_FRONT);
const tab_as_org_el = document.getElementById(TAB_AS_ORG);
const no_release_notes_el = document.getElementById(NO_RELEASE_NOTES);
const no_update_notification_el = document.getElementById(
	NO_UPDATE_NOTIFICATION,
);
const prevent_analytics_el = document.getElementById(PREVENT_ANALYTICS);
const user_language_select = document.getElementById(USER_LANGUAGE);

const keep_sorted_el = document.getElementById("keep_sorted");
const sortContainer = document.getElementById("sort-wrapper");
const picked_sort_select = document.getElementById("picked-sort");
const picked_sort_direction_select = document.getElementById(
	"picked-sort-direction",
);

const generalContainer = document.getElementById("general-container");
const generalHeader = document.getElementById("general-settings");
const tabGenericManagerContainer = document.getElementById(
	`${TAB_GENERIC_STYLE}-container`,
);
const tabGenericManagerHeader = document.getElementById(
	`${TAB_GENERIC_STYLE}-settings`,
);
const tabGenericPreview = document.getElementById(
	`${TAB_GENERIC_STYLE}-preview`,
);
const tabOrgManagerContainer = document.getElementById(
	`${TAB_ORG_STYLE}-container`,
);
const tabOrgManagerHeader = document.getElementById(
	`${TAB_ORG_STYLE}-settings`,
);
const tabOrgPreview = document.getElementById(`${TAB_ORG_STYLE}-preview`);

/**
 * Toggles the active class on a list item containing the target element
 * @param {Event} event - The event object from the interaction
 */
function toggleActivePreview(event) {
	event.target.closest("li").classList.toggle(SLDS_ACTIVE);
}

const inactive = "inactive";
const active = "active";
tabGenericPreview.addEventListener("click", toggleActivePreview);
tabOrgPreview.addEventListener("click", toggleActivePreview);

const tab_inactive_generic_setting_background_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_BACKGROUND}-${inactive}`,
);
const tab_inactive_generic_setting_color_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_COLOR}-${inactive}`,
);
const tab_inactive_generic_setting_border_color_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_BORDER}-${inactive}`,
);
const tab_inactive_generic_setting_shadow_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_SHADOW}-${inactive}`,
);
const tab_inactive_generic_setting_hover_background_el = document
	.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_HOVER}-${inactive}`);
const tab_inactive_generic_setting_decoration_bold_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_BOLD}-${inactive}`,
);
const tab_inactive_generic_setting_decoration_italic_el = document
	.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_ITALIC}-${inactive}`);
const tab_inactive_generic_setting_decoration_underline_el = document
	.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_UNDERLINE}-${inactive}`);
//const tab_inactive_generic_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_WAVY}-${inactive}`);

const tab_active_generic_setting_background_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_BACKGROUND}-${active}`,
);
const tab_active_generic_setting_color_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_COLOR}-${active}`,
);
const tab_active_generic_setting_border_color_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_BORDER}-${active}`,
);
const tab_active_generic_setting_shadow_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_SHADOW}-${active}`,
);
const tab_active_generic_setting_hover_background_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_HOVER}-${active}`,
);
const tab_active_generic_setting_top_background_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_TOP}-${active}`,
);
const tab_active_generic_setting_decoration_bold_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_BOLD}-${active}`,
);
const tab_active_generic_setting_decoration_italic_el = document.getElementById(
	`${TAB_GENERIC_STYLE}-${TAB_STYLE_ITALIC}-${active}`,
);
const tab_active_generic_setting_decoration_underline_el = document
	.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_UNDERLINE}-${active}`);
//const tab_active_generic_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_WAVY}-${active}`);

const allInactiveGenericInputs = [
	tab_inactive_generic_setting_background_el,
	tab_inactive_generic_setting_color_el,
	tab_inactive_generic_setting_border_color_el,
	tab_inactive_generic_setting_shadow_el,
	tab_inactive_generic_setting_hover_background_el,
];
const allActiveGenericInputs = [
	tab_active_generic_setting_background_el,
	tab_active_generic_setting_color_el,
	tab_active_generic_setting_border_color_el,
	tab_active_generic_setting_shadow_el,
	tab_active_generic_setting_hover_background_el,
	tab_active_generic_setting_top_background_el,
];
const allGenericInputs = [
	...allInactiveGenericInputs,
	...allActiveGenericInputs,
];

const allInactiveGenericDecorations = [
	tab_inactive_generic_setting_decoration_bold_el,
	tab_inactive_generic_setting_decoration_italic_el,
	tab_inactive_generic_setting_decoration_underline_el,
	//tab_inactive_generic_setting_decoration_underline_wavy_el,
];
const allActiveGenericDecorations = [
	tab_active_generic_setting_decoration_bold_el,
	tab_active_generic_setting_decoration_italic_el,
	tab_active_generic_setting_decoration_underline_el,
	//tab_active_generic_setting_decoration_underline_wavy_el,
];
const allGenericDecorations = [
	...allInactiveGenericDecorations,
	...allActiveGenericDecorations,
];

const tab_inactive_org_setting_background_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_BACKGROUND}-${inactive}`,
);
const tab_inactive_org_setting_color_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_COLOR}-${inactive}`,
);
const tab_inactive_org_setting_border_color_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_BORDER}-${inactive}`,
);
const tab_inactive_org_setting_shadow_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_SHADOW}-${inactive}`,
);
const tab_inactive_org_setting_hover_background_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_HOVER}-${inactive}`,
);
const tab_inactive_org_setting_decoration_bold_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_BOLD}-${inactive}`,
);
const tab_inactive_org_setting_decoration_italic_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_ITALIC}-${inactive}`,
);
const tab_inactive_org_setting_decoration_underline_el = document
	.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_UNDERLINE}-${inactive}`);
//const tab_inactive_org_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_WAVY}-${inactive}`);

const tab_active_org_setting_background_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_BACKGROUND}-${active}`,
);
const tab_active_org_setting_color_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_COLOR}-${active}`,
);
const tab_active_org_setting_border_color_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_BORDER}-${active}`,
);
const tab_active_org_setting_shadow_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_SHADOW}-${active}`,
);
const tab_active_org_setting_hover_background_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_HOVER}-${active}`,
);
const tab_active_org_setting_top_background_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_TOP}-${active}`,
);
const tab_active_org_setting_decoration_bold_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_BOLD}-${active}`,
);
const tab_active_org_setting_decoration_italic_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_ITALIC}-${active}`,
);
const tab_active_org_setting_decoration_underline_el = document.getElementById(
	`${TAB_ORG_STYLE}-${TAB_STYLE_UNDERLINE}-${active}`,
);
//const tab_active_org_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_WAVY}-${active}`);

const allInactiveOrgInputs = [
	tab_inactive_org_setting_background_el,
	tab_inactive_org_setting_color_el,
	tab_inactive_org_setting_border_color_el,
	tab_inactive_org_setting_shadow_el,
	tab_inactive_org_setting_hover_background_el,
];
const allActiveOrgInputs = [
	tab_active_org_setting_background_el,
	tab_active_org_setting_color_el,
	tab_active_org_setting_border_color_el,
	tab_active_org_setting_shadow_el,
	tab_active_org_setting_hover_background_el,
	tab_active_org_setting_top_background_el,
];
const allOrgInputs = [
	...allInactiveOrgInputs,
	...allActiveOrgInputs,
];

const allInactiveOrgDecorations = [
	tab_inactive_org_setting_decoration_bold_el,
	tab_inactive_org_setting_decoration_italic_el,
	tab_inactive_org_setting_decoration_underline_el,
	//tab_inactive_org_setting_decoration_underline_wavy_el,
];
const allActiveOrgDecorations = [
	tab_active_org_setting_decoration_bold_el,
	tab_active_org_setting_decoration_italic_el,
	tab_active_org_setting_decoration_underline_el,
	//tab_active_org_setting_decoration_underline_wavy_el,
];
const allOrgDecorations = [
	...allInactiveOrgDecorations,
	...allActiveOrgDecorations,
];

const decorationAvailableId = "set_decoration_available";
const decorationChosenId = "set_decoration_chosen";
const decorationAvailableInactiveId = `${decorationAvailableId}-${inactive}`;
const decorationChosenInactiveId = `${decorationChosenId}-${inactive}`;
const decorationAvailableActiveId = `${decorationAvailableId}-${active}`;
const decorationChosenActiveId = `${decorationChosenId}-${active}`;

const ul_inactive_generic_decoration_available = document.getElementById(
	`${TAB_GENERIC_STYLE}-${decorationAvailableInactiveId}`,
);
const ul_inactive_generic_decoration_chosen = document.getElementById(
	`${TAB_GENERIC_STYLE}-${decorationChosenInactiveId}`,
);
const ul_active_generic_decoration_available = document.getElementById(
	`${TAB_GENERIC_STYLE}-${decorationAvailableActiveId}`,
);
const ul_active_generic_decoration_chosen = document.getElementById(
	`${TAB_GENERIC_STYLE}-${decorationChosenActiveId}`,
);

const ul_inactive_org_decoration_available = document.getElementById(
	`${TAB_ORG_STYLE}-${decorationAvailableInactiveId}`,
);
const ul_inactive_org_decoration_chosen = document.getElementById(
	`${TAB_ORG_STYLE}-${decorationChosenInactiveId}`,
);
const ul_active_org_decoration_available = document.getElementById(
	`${TAB_ORG_STYLE}-${decorationAvailableActiveId}`,
);
const ul_active_org_decoration_chosen = document.getElementById(
	`${TAB_ORG_STYLE}-${decorationChosenActiveId}`,
);

const styleGeneric = "style-generic";
const styleGenericInactive = `${styleGeneric}-${inactive}`;
const styleGenericActive = `${styleGeneric}-${active}`;
const styleOrg = "style-org";
const styleOrgInactive = `${styleOrg}-${inactive}`;
const styleOrgActive = `${styleOrg}-${active}`;

const backgroundStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BACKGROUND}-${styleGenericInactive}`;
const colorStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_COLOR}-${styleGenericInactive}`;
const borderStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BORDER}-${styleGenericInactive}`;
const shadowStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_SHADOW}-${styleGenericInactive}`;
const hoverStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_HOVER}-${styleGenericInactive}`;
const boldStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BOLD}-${styleGenericInactive}`;
const italicStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_ITALIC}-${styleGenericInactive}`;
const underlineStyleGenericInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_UNDERLINE}-${styleGenericInactive}`;
//const wavyStyleGenericInactiveId      = `${EXTENSION_NAME}-${TAB_STYLE_WAVY}-${styleGenericInactive}`;

const backgroundStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BACKGROUND}-${styleGenericActive}`;
const colorStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_COLOR}-${styleGenericActive}`;
const borderStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BORDER}-${styleGenericActive}`;
const shadowStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_SHADOW}-${styleGenericActive}`;
const hoverStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_HOVER}-${styleGenericActive}`;
const topStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_TOP}-${styleGenericActive}`;
const boldStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BOLD}-${styleGenericActive}`;
const italicStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_ITALIC}-${styleGenericActive}`;
const underlineStyleGenericActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_UNDERLINE}-${styleGenericActive}`;
//const wavyStyleGenericActiveId        = `${EXTENSION_NAME}-${TAB_STYLE_WAVY}-${styleGenericActive}`;

const backgroundStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BACKGROUND}-${styleOrgInactive}`;
const colorStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_COLOR}-${styleOrgInactive}`;
const borderStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BORDER}-${styleOrgInactive}`;
const shadowStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_SHADOW}-${styleOrgInactive}`;
const hoverStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_HOVER}-${styleOrgInactive}`;
const boldStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BOLD}-${styleOrgInactive}`;
const italicStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_ITALIC}-${styleOrgInactive}`;
const underlineStyleOrgInactiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_UNDERLINE}-${styleOrgInactive}`;
//const wavyStyleOrgInactiveId      = `${EXTENSION_NAME}-${TAB_STYLE_WAVY}-${styleOrgInactive}`;

const backgroundStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BACKGROUND}-${styleOrgActive}`;
const colorStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_COLOR}-${styleOrgActive}`;
const borderStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BORDER}-${styleOrgActive}`;
const shadowStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_SHADOW}-${styleOrgActive}`;
const hoverStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_HOVER}-${styleOrgActive}`;
const topStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_TOP}-${styleOrgActive}`;
const boldStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_BOLD}-${styleOrgActive}`;
const italicStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_ITALIC}-${styleOrgActive}`;
const underlineStyleOrgActiveId =
	`${EXTENSION_NAME}-${TAB_STYLE_UNDERLINE}-${styleOrgActive}`;
//const wavyStyleOrgActiveId        = `${EXTENSION_NAME}-${TAB_STYLE_WAVY}-${styleOrgActive}`;

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
	if (setting.id === TAB_STYLE_TOP && isForInactive) {
		return;
	}
	/**
	 * Returns configuration mappings for all supported tab style types.
	 * Each style type maps to element references, style IDs, and decoration containers
	 * organized by active/inactive state and generic/org variants.
	 * @returns {Object} Configuration object with style type keys and element/ID mappings
	 */
	function getStyleConfigurations() {
		return {
			[TAB_STYLE_COLOR]: {
				type: "input",
				elements: {
					inactive: {
						generic: tab_inactive_generic_setting_color_el,
						org: tab_inactive_org_setting_color_el,
					},
					active: {
						generic: tab_active_generic_setting_color_el,
						org: tab_active_org_setting_color_el,
					},
				},
				styleIds: {
					inactive: {
						generic: colorStyleGenericInactiveId,
						org: colorStyleOrgInactiveId,
					},
					active: {
						generic: colorStyleGenericActiveId,
						org: colorStyleOrgActiveId,
					},
				},
			},
			[TAB_STYLE_BACKGROUND]: {
				type: "input",
				elements: {
					inactive: {
						generic: tab_inactive_generic_setting_background_el,
						org: tab_inactive_org_setting_background_el,
					},
					active: {
						generic: tab_active_generic_setting_background_el,
						org: tab_active_org_setting_background_el,
					},
				},
				styleIds: {
					inactive: {
						generic: backgroundStyleGenericInactiveId,
						org: backgroundStyleOrgInactiveId,
					},
					active: {
						generic: backgroundStyleGenericActiveId,
						org: backgroundStyleOrgActiveId,
					},
				},
			},
			[TAB_STYLE_BORDER]: {
				type: "input",
				elements: {
					inactive: {
						generic: tab_inactive_generic_setting_border_color_el,
						org: tab_inactive_org_setting_border_color_el,
					},
					active: {
						generic: tab_active_generic_setting_border_color_el,
						org: tab_active_org_setting_border_color_el,
					},
				},
				styleIds: {
					inactive: {
						generic: borderStyleGenericInactiveId,
						org: borderStyleOrgInactiveId,
					},
					active: {
						generic: borderStyleGenericActiveId,
						org: borderStyleOrgActiveId,
					},
				},
			},
			[TAB_STYLE_SHADOW]: {
				type: "input",
				elements: {
					inactive: {
						generic: tab_inactive_generic_setting_shadow_el,
						org: tab_inactive_org_setting_shadow_el,
					},
					active: {
						generic: tab_active_generic_setting_shadow_el,
						org: tab_active_org_setting_shadow_el,
					},
				},
				styleIds: {
					inactive: {
						generic: shadowStyleGenericInactiveId,
						org: shadowStyleOrgInactiveId,
					},
					active: {
						generic: shadowStyleGenericActiveId,
						org: shadowStyleOrgActiveId,
					},
				},
			},
			[TAB_STYLE_HOVER]: {
				type: "input",
				elements: {
					inactive: {
						generic:
							tab_inactive_generic_setting_hover_background_el,
						org: tab_inactive_org_setting_hover_background_el,
					},
					active: {
						generic: tab_active_generic_setting_hover_background_el,
						org: tab_active_org_setting_hover_background_el,
					},
				},
				styleIds: {
					inactive: {
						generic: hoverStyleGenericInactiveId,
						org: hoverStyleOrgInactiveId,
					},
					active: {
						generic: hoverStyleGenericActiveId,
						org: hoverStyleOrgActiveId,
					},
				},
			},
			[TAB_STYLE_TOP]: {
				type: "input",
				elements: {
					active: {
						generic: tab_active_generic_setting_top_background_el,
						org: tab_active_org_setting_top_background_el,
					},
				},
				styleIds: {
					active: {
						generic: topStyleGenericActiveId,
						org: topStyleOrgActiveId,
					},
				},
			},
			[TAB_STYLE_BOLD]: {
				type: "decoration",
				elements: {
					inactive: {
						generic:
							tab_inactive_generic_setting_decoration_bold_el,
						org: tab_inactive_org_setting_decoration_bold_el,
					},
					active: {
						generic: tab_active_generic_setting_decoration_bold_el,
						org: tab_active_org_setting_decoration_bold_el,
					},
				},
				styleIds: {
					inactive: {
						generic: boldStyleGenericInactiveId,
						org: boldStyleOrgInactiveId,
					},
					active: {
						generic: boldStyleGenericActiveId,
						org: boldStyleOrgActiveId,
					},
				},
				chosenUls: {
					inactive: {
						generic: ul_inactive_generic_decoration_chosen,
						org: ul_inactive_org_decoration_chosen,
					},
					active: {
						generic: ul_active_generic_decoration_chosen,
						org: ul_active_org_decoration_chosen,
					},
				},
				availableUls: {
					inactive: {
						generic: ul_inactive_generic_decoration_available,
						org: ul_inactive_org_decoration_available,
					},
					active: {
						generic: ul_active_generic_decoration_available,
						org: ul_active_org_decoration_available,
					},
				},
			},
			[TAB_STYLE_ITALIC]: {
				type: "decoration",
				elements: {
					inactive: {
						generic:
							tab_inactive_generic_setting_decoration_italic_el,
						org: tab_inactive_org_setting_decoration_italic_el,
					},
					active: {
						generic:
							tab_active_generic_setting_decoration_italic_el,
						org: tab_active_org_setting_decoration_italic_el,
					},
				},
				styleIds: {
					inactive: {
						generic: italicStyleGenericInactiveId,
						org: italicStyleOrgInactiveId,
					},
					active: {
						generic: italicStyleGenericActiveId,
						org: italicStyleOrgActiveId,
					},
				},
				chosenUls: {
					inactive: {
						generic: ul_inactive_generic_decoration_chosen,
						org: ul_inactive_org_decoration_chosen,
					},
					active: {
						generic: ul_active_generic_decoration_chosen,
						org: ul_active_org_decoration_chosen,
					},
				},
				availableUls: {
					inactive: {
						generic: ul_inactive_generic_decoration_available,
						org: ul_inactive_org_decoration_available,
					},
					active: {
						generic: ul_active_generic_decoration_available,
						org: ul_active_org_decoration_available,
					},
				},
			},
			[TAB_STYLE_UNDERLINE]: {
				type: "decoration",
				elements: {
					inactive: {
						generic:
							tab_inactive_generic_setting_decoration_underline_el,
						org: tab_inactive_org_setting_decoration_underline_el,
					},
					active: {
						generic:
							tab_active_generic_setting_decoration_underline_el,
						org: tab_active_org_setting_decoration_underline_el,
					},
				},
				styleIds: {
					inactive: {
						generic: underlineStyleGenericInactiveId,
						org: underlineStyleOrgInactiveId,
					},
					active: {
						generic: underlineStyleGenericActiveId,
						org: underlineStyleOrgActiveId,
					},
				},
				chosenUls: {
					inactive: {
						generic: ul_inactive_generic_decoration_chosen,
						org: ul_inactive_org_decoration_chosen,
					},
					active: {
						generic: ul_active_generic_decoration_chosen,
						org: ul_active_org_decoration_chosen,
					},
				},
				availableUls: {
					inactive: {
						generic: ul_inactive_generic_decoration_available,
						org: ul_inactive_org_decoration_available,
					},
					active: {
						generic: ul_active_generic_decoration_available,
						org: ul_active_org_decoration_available,
					},
				},
			},
		};
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
	function getElementReferences(config, isForInactive, isGeneric, wasPicked) {
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
	function getStyleId(config, isForInactive, isGeneric) {
		const state = isForInactive ? "inactive" : "active";
		const variant = isGeneric ? "generic" : "org";
		return config.styleIds?.[state]?.[variant];
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
	function buildCssRule(setting, isForInactive, isGeneric, wasPicked) {
		if (!wasPicked) return null;
		/**
		 * Determines the appropriate CSS pseudo-selector for specific style types.
		 * Some styles require pseudo-selectors like :hover or ::before for proper application.
		 * @param {string} styleId - The style type identifier (TAB_STYLE_* constant)
		 * @returns {string|null} Pseudo-selector string (:hover, ::before) or null for standard selectors
		 */
		function getPseudoSelector(styleId) {
			switch (styleId) {
				case TAB_STYLE_HOVER:
					return ":hover";
				case TAB_STYLE_TOP:
					return "::before";
				default:
					return null;
			}
		}
		const pseudoSelector = getPseudoSelector(setting.id);
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
	function updateUIElements(elements, value) {
		if (elements.chosenUl && elements.moveToChosen) {
			elements.chosenUl.insertAdjacentElement(
				"beforeend",
				elements.moveToChosen,
			);
		}
		if (elements.input) {
			elements.input.value = value;
		}
	}
	const wasPicked = setting.value != null && setting.value !== "";
	// Configuration object for each style type
	const styleConfigs = getStyleConfigurations();
	const config = styleConfigs[setting.id];
	if (config == null) {
		if (setting.id !== preventDefaultOverride) {
			console.error(`Unmatched style setting id: ${setting.id}`);
		}
		return;
	}
	// Get element references and style ID for current configuration
	const elements = getElementReferences(
		config,
		isForInactive,
		isGeneric,
		wasPicked,
	);
	const styleId = getStyleId(config, isForInactive, isGeneric);
	// Apply CSS style
	const cssRule = buildCssRule(setting, isForInactive, isGeneric, wasPicked);
	updateStyle(styleId, cssRule);
	// Update UI elements if requested
	if (updateViews) {
		updateUIElements(elements, setting.value);
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
			link_new_browser_el.checked = setting.enabled;
			break;
		case SKIP_LINK_DETECTION:
			skip_link_detection_el.checked = setting.enabled;
			break;
		case USE_LIGHTNING_NAVIGATION:
			use_lightning_navigation_el.checked = setting.enabled;
			break;
		case POPUP_OPEN_LOGIN:
			popup_open_login_el.checked = setting.enabled;
			break;
		case POPUP_OPEN_SETUP:
			popup_open_setup_el.checked = setting.enabled;
			break;
		case POPUP_LOGIN_NEW_TAB:
			popup_login_new_tab_el.checked = setting.enabled;
			break;
		case POPUP_SETUP_NEW_TAB:
			popup_setup_new_tab_el.checked = setting.enabled;
			break;
		case TAB_ON_LEFT:
			tab_on_left_el.checked = setting.enabled;
			break;
		case TAB_ADD_FRONT:
			tab_add_front_el.checked = setting.enabled;
			break;
		case TAB_AS_ORG:
			tab_as_org_el.checked = setting.enabled;
			break;
		case NO_RELEASE_NOTES:
			no_release_notes_el.checked = setting.enabled;
			break;
		case NO_UPDATE_NOTIFICATION:
			no_update_notification_el.checked = setting.enabled;
			break;
		case PREVENT_ANALYTICS:
			prevent_analytics_el.checked = setting.enabled;
			break;
		case USER_LANGUAGE:
			user_language_select.value = setting.enabled;
			break;
		case PERSIST_SORT: {
			const isEnabled = setting.enabled != null;
			keep_sorted_el.checked = isEnabled;
			if (isEnabled) {
				picked_sort_select.value = setting.enabled;
				picked_sort_direction_select.value = setting.ascending
					? "ascending"
					: "descending";
				sortContainer.classList.remove(invisible);
			}
			break;
		}
		case GENERIC_TAB_STYLE_KEY:
		case ORG_TAB_STYLE_KEY: {
			const isGeneric = setting.id === GENERIC_TAB_STYLE_KEY;
			Array.isArray(setting.value)
				? setting.value.forEach((set) =>
					setPreviewAndInputValue(set, isGeneric)
				)
				: setPreviewAndInputValue(setting.value, isGeneric);
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

const allCheckboxes = [
	link_new_browser_el,
	skip_link_detection_el,
	use_lightning_navigation_el,
	popup_open_login_el,
	popup_open_setup_el,
	popup_login_new_tab_el,
	popup_setup_new_tab_el,
	tab_on_left_el,
	tab_add_front_el,
	tab_as_org_el,
	no_release_notes_el,
	no_update_notification_el,
	prevent_analytics_el,
];

let generalSettingsListenersSet = false;
/**
 * Restores general settings from storage and sets up event listeners
 * @returns {Promise<void>} Promise that resolves when settings are restored and listeners are set
 */
async function restoreGeneralSettings() {
	if (generalSettingsListenersSet) {
		return;
	}
	const settings = await getSettings();
	if (settings != null) {
		Array.isArray(settings)
			? settings.forEach((set) => setCurrentChoice(set))
			: setCurrentChoice(settings);
	}
	allCheckboxes.forEach((el) => {
		switch (el) {
			case link_new_browser_el:
			case use_lightning_navigation_el:
			case tab_add_front_el:
				return;
			default:
				break;
		}
		el.addEventListener("change", saveCheckboxOptions);
	});
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
		console.log(e.target.checked, keep_sorted_el.checked);
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
	generalSettingsListenersSet = true;
}

const chosenBtnId = "move-chosen";
const chosenBtnInactiveId = `${chosenBtnId}-${inactive}`;
const chosenBtnActiveId = `${chosenBtnId}-${active}`;
const availableBtnId = "move-available";
const availableBtnInactiveId = `${availableBtnId}-${inactive}`;
const availableBtnActiveId = `${availableBtnId}-${active}`;

const btn_inactive_generic_chosen = document.getElementById(
	`${TAB_GENERIC_STYLE}-${chosenBtnInactiveId}`,
);
const btn_inactive_generic_available = document.getElementById(
	`${TAB_GENERIC_STYLE}-${availableBtnInactiveId}`,
);
const btn_active_generic_chosen = document.getElementById(
	`${TAB_GENERIC_STYLE}-${chosenBtnActiveId}`,
);
const btn_active_generic_available = document.getElementById(
	`${TAB_GENERIC_STYLE}-${availableBtnActiveId}`,
);

const btn_inactive_org_chosen = document.getElementById(
	`${TAB_ORG_STYLE}-${chosenBtnInactiveId}`,
);
const btn_inactive_org_available = document.getElementById(
	`${TAB_ORG_STYLE}-${availableBtnInactiveId}`,
);
const btn_active_org_chosen = document.getElementById(
	`${TAB_ORG_STYLE}-${chosenBtnActiveId}`,
);
const btn_active_org_available = document.getElementById(
	`${TAB_ORG_STYLE}-${availableBtnActiveId}`,
);

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
	const set = {
		what: "set",
		key,
		set: [{
			id: preventDefaultOverride,
			value: "no-default",
		}],
	};
	selectedLis.forEach((li) => {
		const setting = {};
		const styleKey = li.dataset.styleKey;
		setting.id = styleKey;
		setting.forActive = !li.id.endsWith(inactive);
		setting.value = isAdding ? styleKey : "";
		setPreviewAndInputValue(setting, key === GENERIC_TAB_STYLE_KEY, false);
		set.set.push(setting);
	});
	sendExtensionMessage(set);
}

/**
 * Toggles the `aria-selected` attribute of the clicked list item.
 * @param {Event} event - The event triggered by user interaction.
 */
function flipSelected(event) {
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
	selectedDecorations
		.forEach((el) => {
			moveHereElement.insertAdjacentElement("beforeend", el);
			el.ariaSelected = false;
		});
	saveTabDecorations(selectedDecorations, isAdding, key);
}

let genericTabListenersSet = false;
let orgTabListenersSet = false;
/**
 * Restores Tab style settings and initializes related UI listeners.
 * @param {string} [key=GENERIC_TAB_STYLE_KEY] - Storage key for Tab settings (generic or org).
 * @returns {Promise<void>}
 * @throws {Error} If `key` is invalid.
 */
async function restoreTabSettings(key = GENERIC_TAB_STYLE_KEY) {
	if (key !== GENERIC_TAB_STYLE_KEY && key !== ORG_TAB_STYLE_KEY) {
		throw new Error("error_invalid_key");
	}
	if (
		(key === GENERIC_TAB_STYLE_KEY && genericTabListenersSet) ||
		(key === ORG_TAB_STYLE_KEY && orgTabListenersSet)
	) {
		return;
	}
	/**
	 * Restores saved style settings from storage and applies them to the current UI state.
	 * @param {string} key - Storage key for the settings
	 * @returns {Promise<void>}
	 */
	async function restoreSettings(key) {
		const settings = await getStyleSettings(key);
		if (settings != null) {
			const choice = Array.isArray(settings)
				? { id: key, value: settings }
				: settings;
			setCurrentChoice(choice);
		}
	}
	/**
	 * Gathers all UI element references needed for tab styling based on the key type.
	 * @param {string} key - Tab style key determining which resource set to use
	 * @returns {Object} Object containing all necessary UI element references
	 */
	function getTabResources(key) {
		/**
		 * Gets button element references for moving decorations between available/chosen states.
		 * @param {boolean} isGeneric - Whether to get generic or org-specific button references
		 * @returns {Object} Object containing button element references
		 */
		function getButtonReferences(isGeneric) {
			return {
				inactiveAvailable: isGeneric
					? btn_inactive_generic_available
					: btn_inactive_org_available,
				inactiveChosen: isGeneric
					? btn_inactive_generic_chosen
					: btn_inactive_org_chosen,
				activeAvailable: isGeneric
					? btn_active_generic_available
					: btn_active_org_available,
				activeChosen: isGeneric
					? btn_active_generic_chosen
					: btn_active_org_chosen,
			};
		}
		/**
		 * Gets decoration list element references for organizing available/chosen decorations.
		 * @param {boolean} isGeneric - Whether to get generic or org-specific list references
		 * @returns {Object} Object containing list element references
		 */
		function getListReferences(isGeneric) {
			return {
				inactiveAvailable: isGeneric
					? ul_inactive_generic_decoration_available
					: ul_inactive_org_decoration_available,
				inactiveChosen: isGeneric
					? ul_inactive_generic_decoration_chosen
					: ul_inactive_org_decoration_chosen,
				activeAvailable: isGeneric
					? ul_active_generic_decoration_available
					: ul_active_org_decoration_available,
				activeChosen: isGeneric
					? ul_active_generic_decoration_chosen
					: ul_active_org_decoration_chosen,
			};
		}
		const isGeneric = key === GENERIC_TAB_STYLE_KEY;
		return {
			isGeneric,
			allInputs: isGeneric ? allGenericInputs : allOrgInputs,
			allDecorations: isGeneric
				? allGenericDecorations
				: allOrgDecorations,
			allInactiveDecorations: isGeneric
				? allInactiveGenericDecorations
				: allInactiveOrgDecorations,
			allActiveDecorations: isGeneric
				? allActiveGenericDecorations
				: allActiveOrgDecorations,
			buttons: getButtonReferences(isGeneric),
			lists: getListReferences(isGeneric),
			tabPreview: isGeneric ? tabGenericPreview : tabOrgPreview,
		};
	}
	/**
	 * Sets up all event listeners for tab styling UI elements.
	 * Includes input change handlers, decoration click handlers, and button move handlers.
	 * @param {Object} resources - UI element references from getTabResources
	 * @param {string} key - Tab style key for saving settings
	 */
	function setupUIListeners(resources, key) {
		/**
		 * Sets up event listeners for buttons that move decorations between available/chosen lists.
		 * @param {Object} resources - UI element references containing buttons and lists
		 * @param {string} key - Tab style key for saving settings
		 */
		function setupMoveButtonListeners(resources, key) {
			const {
				buttons,
				lists,
				allInactiveDecorations,
				allActiveDecorations,
			} = resources;
			// Move to available buttons
			buttons.inactiveAvailable.addEventListener(
				"click",
				() =>
					moveSelectedDecorationsTo(
						lists.inactiveAvailable,
						allInactiveDecorations,
						false,
						key,
					),
			);
			buttons.activeAvailable.addEventListener(
				"click",
				() =>
					moveSelectedDecorationsTo(
						lists.activeAvailable,
						allActiveDecorations,
						false,
						key,
					),
			);
			// Move to chosen buttons
			buttons.inactiveChosen.addEventListener(
				"click",
				() =>
					moveSelectedDecorationsTo(
						lists.inactiveChosen,
						allInactiveDecorations,
						true,
						key,
					),
			);
			buttons.activeChosen.addEventListener(
				"click",
				() =>
					moveSelectedDecorationsTo(
						lists.activeChosen,
						allActiveDecorations,
						true,
						key,
					),
			);
		}
		// Show preview tab
		resources.tabPreview.classList.remove("hidden");
		// Input change listeners
		resources.allInputs.forEach((el) =>
			el.addEventListener("change", (e) => saveTabOptions(e, key))
		);
		// Decoration selection listeners
		resources.allDecorations.forEach((el) =>
			el.addEventListener("click", flipSelected)
		);
		// Button move listeners
		setupMoveButtonListeners(resources, key);
	}
	await restoreSettings(key);
	const resources = getTabResources(key);
	setupUIListeners(resources, key);
	if (isGeneric) {
		genericTabListenersSet = true;
	} else {
		orgTabListenersSet = true;
	}
}

/**
 * Activates one element and shows it, while deactivating and hiding others.
 * @param {HTMLElement} elementToActivate - Element to set as active.
 * @param {HTMLElement} elementToShow - Element to reveal (remove hidden).
 * @param {HTMLElement[]} elementsToDeactivate - Elements to unset active state.
 * @param {HTMLElement[]} elementsToHide - Elements to hide.
 */
function showRelevantSettings_HideOthers(
	elementsToActivate,
	elementsToShow,
	elementsToDeactivate,
	elementsToHide,
) {
	elementsToActivate.forEach((el) => {
		el.classList.add(SLDS_ACTIVE);
	});
	elementsToShow.forEach((el) => {
		el.classList.remove(hidden);
	});
	elementsToDeactivate.forEach((el) => {
		el.classList.remove(SLDS_ACTIVE);
	});
	elementsToHide.forEach((el) => {
		el.classList.add(hidden);
	});
}

generalHeader.addEventListener("click", () => {
	restoreGeneralSettings();
	showRelevantSettings_HideOthers([generalHeader], [generalContainer], [
		tabGenericManagerHeader,
		tabOrgManagerHeader,
	], [tabGenericManagerContainer, tabOrgManagerContainer]);
});

tabGenericManagerHeader.addEventListener("click", () => {
	restoreTabSettings(GENERIC_TAB_STYLE_KEY);
	showRelevantSettings_HideOthers(
		[tabGenericManagerHeader],
		[tabGenericManagerContainer],
		[generalHeader, tabOrgManagerHeader],
		[generalContainer, tabOrgManagerContainer],
	);
});

tabOrgManagerHeader.addEventListener("click", () => {
	restoreTabSettings(ORG_TAB_STYLE_KEY);
	showRelevantSettings_HideOthers(
		[tabOrgManagerHeader],
		[tabOrgManagerContainer],
		[generalHeader, tabGenericManagerHeader],
		[generalContainer, tabGenericManagerContainer],
	);
});

restoreGeneralSettings();

const saveToast = document.getElementById("save-confirm");
document.querySelector("#save-container > button").addEventListener(
	"click",
	() => {
		saveToast.classList.remove(invisible);
		savePickedSort(
			keep_sorted_el.checked && picked_sort_select.value,
			picked_sort_direction_select.value,
		);
		setTimeout(() => saveToast.classList.add(invisible), 2500);
	},
);
