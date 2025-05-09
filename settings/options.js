import ensureTranslatorAvailability from "/translator.js";
import {
	EXTENSION_NAME,
	GENERIC_TAB_STYLE_KEY,
	getCssRule,
	getCssSelector,
	getSettings,
	getStyleSettings,
	LINK_NEW_BROWSER,
	NO_RELEASE_NOTES,
	NO_UPDATE_NOTIFICATION,
	ORG_TAB_STYLE_KEY,
	POPUP_LOGIN_NEW_TAB,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_SETUP_NEW_TAB,
	sendExtensionMessage,
	SETTINGS_KEY,
	SKIP_LINK_DETECTION,
	SLDS_ACTIVE,
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
const no_release_notes_el = document.getElementById(NO_RELEASE_NOTES);
const no_update_notification_el = document.getElementById(
	NO_UPDATE_NOTIFICATION,
);
const user_language_select = document.getElementById(USER_LANGUAGE);

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
/*
const allGenericTabSettings = [
    ...allGenericInputs,
    ...allGenericDecorations,
];
*/

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
/*
const allOrgTabSettings = [
    ...allOrgInputs,
    ...allOrgDecorations,
];
*/

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
	let relatedInput = null;
	let chosenUl = null;
	let moveToChosen = null;
	let styleId = null;
	const wasPicked = setting.value != null && setting.value !== "";
	switch (setting.id) {
		case TAB_STYLE_COLOR:
			if (isForInactive) {
				if (isGeneric) {
					relatedInput = tab_inactive_generic_setting_color_el;
					styleId = colorStyleGenericInactiveId;
				} else {
					relatedInput = tab_inactive_org_setting_color_el;
					styleId = colorStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					relatedInput = tab_active_generic_setting_color_el;
					styleId = colorStyleGenericActiveId;
				} else {
					relatedInput = tab_active_org_setting_color_el;
					styleId = colorStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric)}{ ${
						getCssRule(TAB_STYLE_COLOR, setting.value)
					} }`
					: null,
			);
			break;
		case TAB_STYLE_BACKGROUND:
			if (isForInactive) {
				if (isGeneric) {
					relatedInput = tab_inactive_generic_setting_background_el;
					styleId = backgroundStyleGenericInactiveId;
				} else {
					relatedInput = tab_inactive_org_setting_background_el;
					styleId = backgroundStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					relatedInput = tab_active_generic_setting_background_el;
					styleId = backgroundStyleGenericActiveId;
				} else {
					relatedInput = tab_active_org_setting_background_el;
					styleId = backgroundStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric)}{ ${
						getCssRule(TAB_STYLE_BACKGROUND, setting.value)
					} }`
					: null,
			);
			break;
		case TAB_STYLE_BORDER:
			if (isForInactive) {
				if (isGeneric) {
					relatedInput = tab_inactive_generic_setting_border_color_el;
					styleId = borderStyleGenericInactiveId;
				} else {
					relatedInput = tab_inactive_org_setting_border_color_el;
					styleId = borderStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					relatedInput = tab_active_generic_setting_border_color_el;
					styleId = borderStyleGenericActiveId;
				} else {
					relatedInput = tab_active_org_setting_border_color_el;
					styleId = borderStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric)}{ ${
						getCssRule(TAB_STYLE_BORDER, setting.value)
					} }`
					: null,
			);
			break;
		case TAB_STYLE_SHADOW:
			if (isForInactive) {
				if (isGeneric) {
					relatedInput = tab_inactive_generic_setting_shadow_el;
					styleId = shadowStyleGenericInactiveId;
				} else {
					relatedInput = tab_inactive_org_setting_shadow_el;
					styleId = shadowStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					relatedInput = tab_active_generic_setting_shadow_el;
					styleId = shadowStyleGenericActiveId;
				} else {
					relatedInput = tab_active_org_setting_shadow_el;
					styleId = shadowStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric)}{ ${
						getCssRule(TAB_STYLE_SHADOW, setting.value)
					} }`
					: null,
			);
			break;
		case TAB_STYLE_HOVER:
			if (isForInactive) {
				if (isGeneric) {
					relatedInput =
						tab_inactive_generic_setting_hover_background_el;
					styleId = hoverStyleGenericInactiveId;
				} else {
					relatedInput = tab_inactive_org_setting_hover_background_el;
					styleId = hoverStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					relatedInput =
						tab_active_generic_setting_hover_background_el;
					styleId = hoverStyleGenericActiveId;
				} else {
					relatedInput = tab_active_org_setting_hover_background_el;
					styleId = hoverStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric, ":hover")}{ ${
						getCssRule(TAB_STYLE_HOVER, setting.value)
					} }`
					: null,
			);
			break;
		case TAB_STYLE_TOP:
			if (isForInactive) {
				break;
			}
			updateStyle(
				isGeneric ? topStyleGenericActiveId : topStyleOrgActiveId,
				wasPicked
					? `${
						getCssSelector(isForInactive, isGeneric, "::before")
					}{ ${getCssRule(TAB_STYLE_TOP, setting.value)} }`
					: null,
			);
			relatedInput = isGeneric
				? tab_active_generic_setting_top_background_el
				: tab_active_org_setting_top_background_el;
			break;
		case TAB_STYLE_BOLD:
			if (isForInactive) {
				if (isGeneric) {
					chosenUl = wasPicked
						? ul_inactive_generic_decoration_chosen
						: ul_inactive_generic_decoration_available;
					moveToChosen =
						tab_inactive_generic_setting_decoration_bold_el;
					styleId = boldStyleGenericInactiveId;
				} else {
					chosenUl = wasPicked
						? ul_inactive_org_decoration_chosen
						: ul_inactive_org_decoration_available;
					moveToChosen = tab_inactive_org_setting_decoration_bold_el;
					styleId = boldStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					chosenUl = wasPicked
						? ul_active_generic_decoration_chosen
						: ul_active_org_decoration_available;
					moveToChosen =
						tab_active_generic_setting_decoration_bold_el;
					styleId = boldStyleGenericActiveId;
				} else {
					chosenUl = wasPicked
						? ul_active_org_decoration_chosen
						: ul_active_org_decoration_available;
					moveToChosen = tab_active_org_setting_decoration_bold_el;
					styleId = boldStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric)}{ ${
						getCssRule(TAB_STYLE_BOLD, setting.value)
					} }`
					: null,
			);
			break;
		case TAB_STYLE_ITALIC:
			if (isForInactive) {
				if (isGeneric) {
					chosenUl = wasPicked
						? ul_inactive_generic_decoration_chosen
						: ul_inactive_org_decoration_available;
					moveToChosen =
						tab_inactive_generic_setting_decoration_italic_el;
					styleId = italicStyleGenericInactiveId;
				} else {
					chosenUl = wasPicked
						? ul_inactive_org_decoration_chosen
						: ul_inactive_org_decoration_available;
					moveToChosen =
						tab_inactive_org_setting_decoration_italic_el;
					styleId = italicStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					chosenUl = wasPicked
						? ul_active_generic_decoration_chosen
						: ul_active_org_decoration_available;
					moveToChosen =
						tab_active_generic_setting_decoration_italic_el;
					styleId = italicStyleGenericActiveId;
				} else {
					chosenUl = wasPicked
						? ul_active_org_decoration_chosen
						: ul_active_org_decoration_available;
					moveToChosen = tab_active_org_setting_decoration_italic_el;
					styleId = italicStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric)}{ ${
						getCssRule(TAB_STYLE_ITALIC, setting.value)
					} }`
					: null,
			);
			break;
		case TAB_STYLE_UNDERLINE:
			if (isForInactive) {
				if (isGeneric) {
					chosenUl = wasPicked
						? ul_inactive_generic_decoration_chosen
						: ul_inactive_org_decoration_available;
					moveToChosen =
						tab_inactive_generic_setting_decoration_underline_el;
					styleId = underlineStyleGenericInactiveId;
				} else {
					chosenUl = wasPicked
						? ul_inactive_org_decoration_chosen
						: ul_inactive_org_decoration_available;
					moveToChosen =
						tab_inactive_org_setting_decoration_underline_el;
					styleId = underlineStyleOrgInactiveId;
				}
			} else {
				if (isGeneric) {
					chosenUl = wasPicked
						? ul_active_generic_decoration_chosen
						: ul_active_org_decoration_available;
					moveToChosen =
						tab_active_generic_setting_decoration_underline_el;
					styleId = underlineStyleGenericActiveId;
				} else {
					chosenUl = wasPicked
						? ul_active_org_decoration_chosen
						: ul_active_org_decoration_available;
					moveToChosen =
						tab_active_org_setting_decoration_underline_el;
					styleId = underlineStyleOrgActiveId;
				}
			}
			updateStyle(
				styleId,
				wasPicked
					? `${getCssSelector(isForInactive, isGeneric)}{ ${
						getCssRule(TAB_STYLE_UNDERLINE, setting.value)
					} }`
					: null,
			);
			break;
		/*
        case TAB_STYLE_WAVY:
            if(isForInactive){
                if(isGeneric){
                    chosenUl = wasPicked ? ul_inactive_generic_decoration_chosen : ul_inactive_org_decoration_available;
                    moveToChosen = tab_inactive_generic_setting_decoration_underline_wavy_el;
                    styleId = wavyStyleGenericInactiveId;
                } else {
                    chosenUl = wasPicked ? ul_inactive_org_decoration_chosen : ul_inactive_org_decoration_available;
                    moveToChosen = tab_inactive_org_setting_decoration_underline_wavy_el;
                    styleId = wavyStyleOrgInactiveId;
                }
            } else {
                if(isGeneric){
                    chosenUl = wasPicked ? ul_active_generic_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_generic_setting_decoration_underline_wavy_el;
                    styleId = wavyStyleGenericActiveId;
                } else {
                    chosenUl = wasPicked ? ul_active_org_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_org_setting_decoration_underline_wavy_el;
                    styleId = wavyStyleOrgActiveId;
                }
            }
            updateStyle(styleId, wasPicked ? `${getCssSelector(isForInactive, isGeneric)}{ ${getCssRule(TAB_STYLE_WAVY, setting.value)} }` : null);
            break;
        */
		default:
			if (setting.id !== preventDefaultOverride) {
				console.error(`Unmatched style setting id: ${setting.id}`);
			}
			break;
	}
	if (!updateViews) {
		return;
	}
	if (chosenUl != null && moveToChosen != null) {
		chosenUl.insertAdjacentElement("beforeend", moveToChosen);
	}
	if (relatedInput != null) {
		relatedInput.value = setting.value;
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
		case NO_RELEASE_NOTES:
			no_release_notes_el.checked = setting.enabled;
			break;
		case NO_UPDATE_NOTIFICATION:
			no_update_notification_el.checked = setting.enabled;
			break;
		case USER_LANGUAGE:
			user_language_select.value = setting.enabled;
			break;
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

const allCheckboxes = [
	link_new_browser_el,
	skip_link_detection_el,
	use_lightning_navigation_el,
	popup_open_login_el,
	popup_open_setup_el,
	popup_login_new_tab_el,
	popup_setup_new_tab_el,
	tab_on_left_el,
	no_release_notes_el,
	no_update_notification_el,
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
		settings instanceof Array
			? settings.forEach((set) => setCurrentChoice(set))
			: setCurrentChoice(settings);
	}
	allCheckboxes.forEach((el) => {
		if (el !== link_new_browser_el && el !== use_lightning_navigation_el) {
			el.addEventListener("change", saveCheckboxOptions);
		}
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
	user_language_select.addEventListener("change", (e) => {
		sendExtensionMessage({
			what: "set",
			key: SETTINGS_KEY,
			set: [{
				id: USER_LANGUAGE,
				enabled: e.target.value,
			}],
		});
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
	const settings = await getStyleSettings(key);
	if (settings != null) {
		settings instanceof Array
			? setCurrentChoice({ id: key, value: settings })
			: setCurrentChoice(settings);
	}
	// gather correct resources
	const isGeneric = key === GENERIC_TAB_STYLE_KEY;
	const allInputs = isGeneric ? allGenericInputs : allOrgInputs;
	const allDecorations = isGeneric
		? allGenericDecorations
		: allOrgDecorations;
	const allInactiveDecorations = isGeneric
		? allInactiveGenericDecorations
		: allInactiveOrgDecorations;
	const allActiveDecorations = isGeneric
		? allActiveGenericDecorations
		: allActiveOrgDecorations;
	const btn_inactive_available = isGeneric
		? btn_inactive_generic_available
		: btn_inactive_org_available;
	const btn_inactive_chosen = isGeneric
		? btn_inactive_generic_chosen
		: btn_inactive_org_chosen;
	const btn_active_available = isGeneric
		? btn_active_generic_available
		: btn_active_org_available;
	const btn_active_chosen = isGeneric
		? btn_active_generic_chosen
		: btn_active_org_chosen;
	const ul_inactive_decoration_available = isGeneric
		? ul_inactive_generic_decoration_available
		: ul_inactive_org_decoration_available;
	const ul_inactive_decoration_chosen = isGeneric
		? ul_inactive_generic_decoration_chosen
		: ul_inactive_org_decoration_chosen;
	const ul_active_decoration_available = isGeneric
		? ul_active_generic_decoration_available
		: ul_active_org_decoration_available;
	const ul_active_decoration_chosen = isGeneric
		? ul_active_generic_decoration_chosen
		: ul_active_org_decoration_chosen;
	const tabPreview = isGeneric ? tabGenericPreview : tabOrgPreview;
	// create event listeners
	tabPreview.classList.remove("hidden");
	allInputs.forEach((el) =>
		el.addEventListener("change", (e) => saveTabOptions(e, key))
	);
	allDecorations.forEach((el) => el.addEventListener("click", flipSelected));
	// move to available
	btn_inactive_available.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				ul_inactive_decoration_available,
				allInactiveDecorations,
				false,
				key,
			),
	);
	btn_active_available.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				ul_active_decoration_available,
				allActiveDecorations,
				false,
				key,
			),
	);
	// move to chosen
	btn_inactive_chosen.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				ul_inactive_decoration_chosen,
				allInactiveDecorations,
				true,
				key,
			),
	);
	btn_active_chosen.addEventListener(
		"click",
		() =>
			moveSelectedDecorationsTo(
				ul_active_decoration_chosen,
				allActiveDecorations,
				true,
				key,
			),
	);
	if (isGeneric) {
		genericTabListenersSet = true;
	} else {
		orgTabListenersSet = true;
	}
}

const saveContainer = document.getElementById("save-container");
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
		el.classList.remove("hidden");
	});
	elementsToDeactivate.forEach((el) => {
		el.classList.remove(SLDS_ACTIVE);
	});
	elementsToHide.forEach((el) => {
		el.classList.add("hidden");
	});
}

generalHeader.addEventListener("click", () => {
	restoreGeneralSettings();
	showRelevantSettings_HideOthers([generalHeader], [generalContainer], [
		tabGenericManagerContainer,
		tabOrgManagerHeader,
	], [tabGenericManagerContainer, tabOrgManagerContainer, saveContainer]);
});

tabGenericManagerHeader.addEventListener("click", () => {
	restoreTabSettings(GENERIC_TAB_STYLE_KEY);
	showRelevantSettings_HideOthers(
		[tabGenericManagerHeader],
		[tabGenericManagerContainer, saveContainer],
		[generalHeader, tabOrgManagerHeader],
		[generalContainer, tabOrgManagerContainer],
	);
});

tabOrgManagerHeader.addEventListener("click", () => {
	restoreTabSettings(ORG_TAB_STYLE_KEY);
	showRelevantSettings_HideOthers(
		[tabOrgManagerHeader],
		[tabOrgManagerContainer, saveContainer],
		[generalHeader, tabGenericManagerHeader],
		[generalContainer, tabGenericManagerContainer],
	);
});

restoreGeneralSettings();
