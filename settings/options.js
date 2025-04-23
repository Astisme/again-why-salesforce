import { 
    SETTINGS_KEY,
	LINK_NEW_BROWSER,
	SKIP_LINK_DETECTION,
	USE_LIGHTNING_NAVIGATION,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_LOGIN_NEW_TAB,
	POPUP_SETUP_NEW_TAB,
    TAB_GENERIC_STYLE,
    TAB_ORG_STYLE,
    GENERIC_TAB_STYLE_KEY,
    ORG_TAB_STYLE_KEY,
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_COLOR,
	TAB_STYLE_BORDER,
	TAB_STYLE_SHADOW,
	TAB_STYLE_HOVER,
	TAB_STYLE_BOLD,
	TAB_STYLE_ITALIC,
	TAB_STYLE_UNDERLINE,
	//TAB_STYLE_WAVY,
    TAB_STYLE_TOP,
    SLDS_ACTIVE,
    EXTENSION_NAME,
    sendExtensionMessage,
    getSettings,
    getStyleSettings,
} from "/constants.js";

function saveCheckboxOptions(e, ...dependentCheckboxElements) {
    const set = { what: "set", key: SETTINGS_KEY, set: [] };
    const setting = {};
    setting.id = e.target.id;
    setting.enabled = this?.checked ?? e.target.checked;
    set.set.push(setting)
    dependentCheckboxElements.forEach(dc => {
        const setting = {};
        setting.id = dc.id;
        setting.enabled = dc.checked;
        set.set.push(setting)
    });
    sendExtensionMessage(set);
}

const link_new_browser_el           = document.getElementById(LINK_NEW_BROWSER);
const skip_link_detection_el        = document.getElementById(SKIP_LINK_DETECTION);
const use_lightning_navigation_el   = document.getElementById(USE_LIGHTNING_NAVIGATION);
const popup_open_login_el           = document.getElementById(POPUP_OPEN_LOGIN);
const popup_open_setup_el           = document.getElementById(POPUP_OPEN_SETUP);
const popup_login_new_tab_el        = document.getElementById(POPUP_LOGIN_NEW_TAB);
const popup_setup_new_tab_el        = document.getElementById(POPUP_SETUP_NEW_TAB);

const generalContainer              = document.getElementById("general-container");
const generalHeader                 = document.getElementById("general-settings");
const tabGenericManagerContainer            = document.getElementById(`${TAB_GENERIC_STYLE}-container`);
const tabGenericManagerHeader       = document.getElementById(`${TAB_GENERIC_STYLE}-settings`);
const tabGenericPreview             = document.getElementById(`${TAB_GENERIC_STYLE}-preview`);
const tabOrgManagerContainer            = document.getElementById(`${TAB_ORG_STYLE}-container`);
const tabOrgManagerHeader       = document.getElementById(`${TAB_ORG_STYLE}-settings`);
const tabOrgPreview             = document.getElementById(`${TAB_ORG_STYLE}-preview`);

function toggleActivePreview(event){
    event.target.closest("li").classList.toggle(SLDS_ACTIVE);
}

tabGenericPreview.addEventListener("click", toggleActivePreview);
tabOrgPreview.addEventListener("click", toggleActivePreview);

const tab_inactive_generic_setting_background_el             = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BACKGROUND}-inactive`);
const tab_inactive_generic_setting_color_el                  = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_COLOR}-inactive`);
const tab_inactive_generic_setting_border_color_el           = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BORDER}-inactive`);
const tab_inactive_generic_setting_shadow_el                 = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_SHADOW}-inactive`);
const tab_inactive_generic_setting_hover_background_el       = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_HOVER}-inactive`);
const tab_inactive_generic_setting_decoration_bold_el        = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BOLD}-inactive`);
const tab_inactive_generic_setting_decoration_italic_el      = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_ITALIC}-inactive`);
const tab_inactive_generic_setting_decoration_underline_el   = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_UNDERLINE}-inactive`);
//const tab_inactive_generic_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_WAVY}-inactive`);

const tab_active_generic_setting_background_el             = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BACKGROUND}-active`);
const tab_active_generic_setting_color_el                  = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_COLOR}-active`);
const tab_active_generic_setting_border_color_el           = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BORDER}-active`);
const tab_active_generic_setting_shadow_el                 = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_SHADOW}-active`);
const tab_active_generic_setting_hover_background_el       = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_HOVER}-active`);
const tab_active_generic_setting_top_background_el          = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_TOP}-active`);
const tab_active_generic_setting_decoration_bold_el        = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BOLD}-active`);
const tab_active_generic_setting_decoration_italic_el      = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_ITALIC}-active`);
const tab_active_generic_setting_decoration_underline_el   = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_UNDERLINE}-active`);
//const tab_active_generic_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_WAVY}-active`);

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

const tab_inactive_org_setting_background_el             = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_BACKGROUND}-inactive`);
const tab_inactive_org_setting_color_el                  = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_COLOR}-inactive`);
const tab_inactive_org_setting_border_color_el           = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_BORDER}-inactive`);
const tab_inactive_org_setting_shadow_el                 = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_SHADOW}-inactive`);
const tab_inactive_org_setting_hover_background_el       = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_HOVER}-inactive`);
const tab_inactive_org_setting_decoration_bold_el        = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_BOLD}-inactive`);
const tab_inactive_org_setting_decoration_italic_el      = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_ITALIC}-inactive`);
const tab_inactive_org_setting_decoration_underline_el   = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_UNDERLINE}-inactive`);
//const tab_inactive_org_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_WAVY}-inactive`);

const tab_active_org_setting_background_el             = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_BACKGROUND}-active`);
const tab_active_org_setting_color_el                  = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_COLOR}-active`);
const tab_active_org_setting_border_color_el           = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_BORDER}-active`);
const tab_active_org_setting_shadow_el                 = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_SHADOW}-active`);
const tab_active_org_setting_hover_background_el       = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_HOVER}-active`);
const tab_active_org_setting_top_background_el          = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_TOP}-active`);
const tab_active_org_setting_decoration_bold_el        = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_BOLD}-active`);
const tab_active_org_setting_decoration_italic_el      = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_ITALIC}-active`);
const tab_active_org_setting_decoration_underline_el   = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_UNDERLINE}-active`);
//const tab_active_org_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_ORG_STYLE}-${TAB_STYLE_WAVY}-active`);

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
const ul_inactive_generic_decoration_available = document.getElementById(`${TAB_GENERIC_STYLE}-${decorationAvailableId}-inactive`);
const ul_inactive_generic_decoration_chosen = document.getElementById(`${TAB_GENERIC_STYLE}-${decorationChosenId}-inactive`);
const ul_active_generic_decoration_available = document.getElementById(`${TAB_GENERIC_STYLE}-${decorationAvailableId}-active`);
const ul_active_generic_decoration_chosen = document.getElementById(`${TAB_GENERIC_STYLE}-${decorationChosenId}-active`);

const ul_inactive_org_decoration_available = document.getElementById(`${TAB_ORG_STYLE}-${decorationAvailableId}-inactive`);
const ul_inactive_org_decoration_chosen = document.getElementById(`${TAB_ORG_STYLE}-${decorationChosenId}-inactive`);
const ul_active_org_decoration_available = document.getElementById(`${TAB_ORG_STYLE}-${decorationAvailableId}-active`);
const ul_active_org_decoration_chosen = document.getElementById(`${TAB_ORG_STYLE}-${decorationChosenId}-active`);

const backgroundStyleGenericInactiveId = `${EXTENSION_NAME}-background-style-generic-inactive`;
const colorStyleGenericInactiveId = `${EXTENSION_NAME}-color-style-generic-inactive`;
const borderStyleGenericInactiveId = `${EXTENSION_NAME}-border-style-generic-inactive`;
const shadowStyleGenericInactiveId = `${EXTENSION_NAME}-shadow-style-generic-inactive`;
const hoverStyleGenericInactiveId = `${EXTENSION_NAME}-hover-style-generic-inactive`;
const boldStyleGenericInactiveId = `${EXTENSION_NAME}-bold-style-generic-inactive`;
const italicStyleGenericInactiveId = `${EXTENSION_NAME}-italic-style-generic-inactive`;
const underlineStyleGenericInactiveId = `${EXTENSION_NAME}-underline-style-generic-inactive`;
//const wavyStyleGenericInactiveId = `${EXTENSION_NAME}-wavy-style-generic-inactive`;

const backgroundStyleGenericActiveId = `${EXTENSION_NAME}-background-style-generic-active`;
const colorStyleGenericActiveId = `${EXTENSION_NAME}-color-style-generic-active`;
const borderStyleGenericActiveId = `${EXTENSION_NAME}-border-style-generic-active`;
const shadowStyleGenericActiveId = `${EXTENSION_NAME}-shadow-style-generic-active`;
const hoverStyleGenericActiveId = `${EXTENSION_NAME}-hover-style-generic-active`;
const topStyleGenericActiveId = `${EXTENSION_NAME}-top-style-generic-active`;
const boldStyleGenericActiveId = `${EXTENSION_NAME}-bold-style-generic-active`;
const italicStyleGenericActiveId = `${EXTENSION_NAME}-italic-style-generic-active`;
const underlineStyleGenericActiveId = `${EXTENSION_NAME}-underline-style-generic-active`;
//const wavyStyleGenericActiveId = `${EXTENSION_NAME}-wavy-style-generic-active`;

const backgroundStyleOrgInactiveId = `${EXTENSION_NAME}-background-style-org-inactive`;
const colorStyleOrgInactiveId = `${EXTENSION_NAME}-color-style-org-inactive`;
const borderStyleOrgInactiveId = `${EXTENSION_NAME}-border-style-org-inactive`;
const shadowStyleOrgInactiveId = `${EXTENSION_NAME}-shadow-style-org-inactive`;
const hoverStyleOrgInactiveId = `${EXTENSION_NAME}-hover-style-org-inactive`;
const boldStyleOrgInactiveId = `${EXTENSION_NAME}-bold-style-org-inactive`;
const italicStyleOrgInactiveId = `${EXTENSION_NAME}-italic-style-org-inactive`;
const underlineStyleOrgInactiveId = `${EXTENSION_NAME}-underline-style-org-inactive`;
//const wavyStyleOrgInactiveId = `${EXTENSION_NAME}-wavy-style-org-inactive`;

const backgroundStyleOrgActiveId = `${EXTENSION_NAME}-background-style-org-active`;
const colorStyleOrgActiveId = `${EXTENSION_NAME}-color-style-org-active`;
const borderStyleOrgActiveId = `${EXTENSION_NAME}-border-style-org-active`;
const shadowStyleOrgActiveId = `${EXTENSION_NAME}-shadow-style-org-active`;
const hoverStyleOrgActiveId = `${EXTENSION_NAME}-hover-style-org-active`;
const topStyleOrgActiveId = `${EXTENSION_NAME}-top-style-org-active`;
const boldStyleOrgActiveId = `${EXTENSION_NAME}-bold-style-org-active`;
const italicStyleOrgActiveId = `${EXTENSION_NAME}-italic-style-org-active`;
const underlineStyleOrgActiveId = `${EXTENSION_NAME}-underline-style-org-active`;
//const wavyStyleOrgActiveId = `${EXTENSION_NAME}-wavy-style-org-active`;

function updateStyle(styleId, newStyle = null){
    // Remove any previous style for this element
    const oldStyle = document.getElementById(styleId);
    if (oldStyle != null)
        oldStyle.remove();
    if(newStyle == null)
        return;
    // Create new style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = newStyle;
    document.head.appendChild(style);
}

// update the style of the preview Tab
// reset the value of the input fields
function setPreviewAndInputValue(setting, isGeneric = true, updateViews = true){
    const isForInactive = !setting.forActive;
    //const tabPreview = isGeneric ? tabGenericPreview : tabOrgPreview;
    const slds_active_class = `.${SLDS_ACTIVE}`;
    const has_org_tab = ":has(.is-org-tab)";
    function getCssSelector(pseudoElement = ""){
        return `.${EXTENSION_NAME}${isForInactive ? `:not(${slds_active_class})` : slds_active_class}${isGeneric ? `:not(${has_org_tab})` : has_org_tab}${pseudoElement}`;
    }
    let relatedInput = null;
    let chosenUl = null;
    let moveToChosen = null;
    let styleId = null;
    const wasPicked = setting.value != null && setting.value !== "";
    switch (setting.id) {
        case "color":
            if(isForInactive){
				if(isGeneric){
					relatedInput = tab_inactive_generic_setting_color_el;
                    styleId = colorStyleGenericInactiveId;
                } else {
					relatedInput = tab_inactive_org_setting_color_el;
                    styleId = colorStyleOrgInactiveId;
                }
			} else {
				if(isGeneric) {
					relatedInput = tab_active_generic_setting_color_el;
                    styleId = colorStyleGenericActiveId;
                } else {
					relatedInput = tab_active_org_setting_color_el;
                    styleId = colorStyleOrgActiveId;
                }
			}
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ color: ${setting.value}; }` : null);
            break;
        case "background-color":
            if(isForInactive){
				if(isGeneric) {
					relatedInput = tab_inactive_generic_setting_background_el;
                    styleId = backgroundStyleGenericInactiveId;
                } else {
					relatedInput = tab_inactive_org_setting_background_el;
                    styleId = backgroundStyleOrgInactiveId;
                }
			} else {
				if(isGeneric) {
					relatedInput = tab_active_generic_setting_background_el;
                    styleId = backgroundStyleGenericActiveId;
                } else {
					relatedInput = tab_active_org_setting_background_el;
                    styleId = backgroundStyleOrgActiveId;
                }
			}
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ background-color: ${setting.value} !important; }` : null);
            break;
        case "border":
            if(isForInactive){
				if(isGeneric) {
					relatedInput = tab_inactive_generic_setting_border_color_el;
                    styleId = borderStyleGenericInactiveId;
                } else {
					relatedInput = tab_inactive_org_setting_border_color_el;
                    styleId = borderStyleOrgInactiveId;
                }
			} else {
				if(isGeneric) {
					relatedInput = tab_active_generic_setting_border_color_el;
                    styleId = borderStyleGenericActiveId;
                } else {
					relatedInput = tab_active_org_setting_border_color_el;
                    styleId = borderStyleOrgActiveId;
                }
			}
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ border: 2px solid ${setting.value}; }` : null);
            break;
        case "shadow":
            if(isForInactive){
				if(isGeneric) {
					relatedInput = tab_inactive_generic_setting_shadow_el;
                    styleId = shadowStyleGenericInactiveId;
                } else {
					relatedInput = tab_inactive_org_setting_shadow_el;
                    styleId = shadowStyleOrgInactiveId;
                }
			} else {
				if(isGeneric) {
					relatedInput = tab_active_generic_setting_shadow_el;
                    styleId = shadowStyleGenericActiveId;
                } else {
					relatedInput = tab_active_org_setting_shadow_el;
                    styleId = shadowStyleOrgActiveId;
                }
			}
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ text-shadow: 0px 0px 3px ${setting.value}; }` : null);
            break;
        case "hover":
            if(isForInactive){
				if(isGeneric) {
					relatedInput = tab_inactive_generic_setting_hover_background_el;
                    styleId = hoverStyleGenericInactiveId;
                } else {
					relatedInput = tab_inactive_org_setting_hover_background_el;
                    styleId = hoverStyleOrgInactiveId;
                }
			} else {
				if(isGeneric) {
					relatedInput = tab_active_generic_setting_hover_background_el;
                    styleId = hoverStyleGenericActiveId;
                } else {
					relatedInput = tab_active_org_setting_hover_background_el;
                    styleId = hoverStyleOrgActiveId;
                }
			}
            updateStyle(styleId, wasPicked ? `${getCssSelector(":hover")}{ background-color: ${setting.value} !important; }` : null);
            break;
        case "top":
            if(isForInactive)
                break;
            updateStyle(isGeneric ? topStyleGenericActiveId : topStyleOrgActiveId, wasPicked ? `${getCssSelector("::before")}{ background-color: ${setting.value} !important; }` : null);
            relatedInput = isGeneric ? tab_active_generic_setting_top_background_el : tab_active_org_setting_top_background_el;
            break;
        case "bold": {
            if(isForInactive){
                if(isGeneric){
                    chosenUl = wasPicked ? ul_inactive_generic_decoration_chosen : ul_inactive_generic_decoration_available;
                    moveToChosen = tab_inactive_generic_setting_decoration_bold_el;
                    styleId = boldStyleGenericInactiveId;
                } else {
                    chosenUl = wasPicked ? ul_inactive_org_decoration_chosen : ul_inactive_org_decoration_available;
                    moveToChosen = tab_inactive_org_setting_decoration_bold_el;
                    styleId = boldStyleOrgInactiveId;
                }
            } else {
                if(isGeneric){
                    chosenUl = wasPicked ? ul_active_generic_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_generic_setting_decoration_bold_el;
                    styleId = boldStyleGenericActiveId;
                } else {
                    chosenUl = wasPicked ? ul_active_org_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_org_setting_decoration_bold_el;
                    styleId = boldStyleOrgActiveId;
                }
            }   
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ font-weight: ${setting.value}; }` : null);
            break;
        }
        case "italic": {
            if(isForInactive){
                if(isGeneric){
                    chosenUl = wasPicked ? ul_inactive_generic_decoration_chosen : ul_inactive_org_decoration_available;
                    moveToChosen = tab_inactive_generic_setting_decoration_italic_el;
                    styleId = italicStyleGenericInactiveId;
                } else {
                    chosenUl = wasPicked ? ul_inactive_org_decoration_chosen : ul_inactive_org_decoration_available;
                    moveToChosen = tab_inactive_org_setting_decoration_italic_el;
                    styleId = italicStyleOrgInactiveId;
                }
            } else {
                if(isGeneric){
                    chosenUl = wasPicked ? ul_active_generic_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_generic_setting_decoration_italic_el;
                    styleId = italicStyleGenericActiveId;
                } else {
                    chosenUl = wasPicked ? ul_active_org_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_org_setting_decoration_italic_el;
                    styleId = italicStyleOrgActiveId;
                }
            }   
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ font-style: ${setting.value}; }` : null);
            break;
        }
        case "underline": {
            if(isForInactive){
                if(isGeneric){
                    chosenUl = wasPicked ? ul_inactive_generic_decoration_chosen : ul_inactive_org_decoration_available;
                    moveToChosen = tab_inactive_generic_setting_decoration_underline_el;
                    styleId = underlineStyleGenericInactiveId;
                } else {
                    chosenUl = wasPicked ? ul_inactive_org_decoration_chosen : ul_inactive_org_decoration_available;
                    moveToChosen = tab_inactive_org_setting_decoration_underline_el;
                    styleId = underlineStyleOrgInactiveId;
                }
            } else {
                if(isGeneric){
                    chosenUl = wasPicked ? ul_active_generic_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_generic_setting_decoration_underline_el;
                    styleId = underlineStyleGenericActiveId;
                } else {
                    chosenUl = wasPicked ? ul_active_org_decoration_chosen : ul_active_org_decoration_available;
                    moveToChosen = tab_active_org_setting_decoration_underline_el;
                    styleId = underlineStyleOrgActiveId;
                }
            }   
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ text-decoration: ${setting.value}; }` : null);
            break;
        }
        /*
        case "wavy": {
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
            updateStyle(styleId, wasPicked ? `${getCssSelector()}{ text-decoration: underline ${setting.value}; }` : null);
            break;
        }
        */
        default:
            console.error(`Unmatched style setting id: ${setting.id}`);
            break;
    }
    if(!updateViews)
        return;
    if(chosenUl != null && moveToChosen != null)
        chosenUl.insertAdjacentElement("beforeend", moveToChosen);
    if(relatedInput != null)
        relatedInput.value = setting.value;
}

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
        case GENERIC_TAB_STYLE_KEY:
        case ORG_TAB_STYLE_KEY:
            const isGeneric = setting.id === GENERIC_TAB_STYLE_KEY;
            setting.value instanceof Array
                ? setting.value.forEach(set => setPreviewAndInputValue(set, isGeneric))
                : setPreviewAndInputValue(setting.value, isGeneric);
            break;
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
];

let generalSettingsListenersSet = false;
async function restoreGeneralSettings() {
    if(generalSettingsListenersSet)
        return;
    const settings = await getSettings(allCheckboxes.map(el => el.id));
    if(settings != null)
        settings instanceof Array ? settings.forEach(set => setCurrentChoice(set)) : setCurrentChoice(settings);
    allCheckboxes.forEach(el => {
        if(el !== link_new_browser_el && el !== use_lightning_navigation_el)
            el.addEventListener("change", saveCheckboxOptions)
    });
    link_new_browser_el.addEventListener("change", e => {
        // click on dependent setting
        if(e.target.checked)
            use_lightning_navigation_el.checked = true;
        saveCheckboxOptions(e, use_lightning_navigation_el);
    });
    use_lightning_navigation_el.addEventListener("change", e => {
        // click on dependent setting
        if(!e.target.checked)
            link_new_browser_el.checked = false;
        saveCheckboxOptions(e, link_new_browser_el);
    });
    generalSettingsListenersSet = true;
}

const chosenBtnId = "move-chosen";
const availableBtnId = "move-available";
const btn_inactive_generic_chosen = document.getElementById(`${TAB_GENERIC_STYLE}-${chosenBtnId}-inactive`);
const btn_inactive_generic_available = document.getElementById(`${TAB_GENERIC_STYLE}-${availableBtnId}-inactive`);
const btn_active_generic_chosen = document.getElementById(`${TAB_GENERIC_STYLE}-${chosenBtnId}-active`);
const btn_active_generic_available = document.getElementById(`${TAB_GENERIC_STYLE}-${availableBtnId}-active`);

const btn_inactive_org_chosen = document.getElementById(`${TAB_ORG_STYLE}-${chosenBtnId}-inactive`);
const btn_inactive_org_available = document.getElementById(`${TAB_ORG_STYLE}-${availableBtnId}-inactive`);
const btn_active_org_chosen = document.getElementById(`${TAB_ORG_STYLE}-${chosenBtnId}-active`);
const btn_active_org_available = document.getElementById(`${TAB_ORG_STYLE}-${availableBtnId}-active`);

function saveTabOptions(e, key = GENERIC_TAB_STYLE_KEY) {
    const set = { what: "set", key, set: [] };
    const setting = {};
    const target = e.target;
    const styleKey = target.dataset.styleKey;
    setting.id = styleKey;
    setting.forActive = !target.id.endsWith("inactive");
    setting.value = e.target.value;
    setPreviewAndInputValue(setting, key === GENERIC_TAB_STYLE_KEY);
    set.set.push(setting)
    sendExtensionMessage(set);
}

function saveTabDecorations(selectedLis = [], isAdding = true, key = GENERIC_TAB_STYLE_KEY){
    const set = { what: "set", key, set: [] };
    selectedLis.forEach(li => {
        const setting = {};
        const styleKey = li.dataset.styleKey;
        setting.id = styleKey;
        setting.forActive = !li.id.endsWith("inactive");
        setting.value = isAdding ? styleKey : "";
        setPreviewAndInputValue(setting, key === GENERIC_TAB_STYLE_KEY, false);
        set.set.push(setting)
    });
    sendExtensionMessage(set);
}

function flipSelected(event){
    const li = event.target.closest("li");
    li.ariaSelected = li.ariaSelected !== "true";
}
function moveSelectedDecorationsTo(moveHereElement = null, allDecorations = null, isAdding = true, key = GENERIC_TAB_STYLE_KEY){
    if(moveHereElement == null)
        throw new Error('tbd');
    if(allDecorations == null)
        throw new Error('tbd');
    const selectedDecorations = allDecorations
        .filter(el => el.ariaSelected === "true");
    selectedDecorations
        .forEach(el => {
            moveHereElement.insertAdjacentElement("beforeend", el);
            el.ariaSelected = false;
        });
    saveTabDecorations(selectedDecorations, isAdding, key);
}

let genericTabListenersSet = false;
let orgTabListenersSet = false;
async function restoreTabSettings(key = GENERIC_TAB_STYLE_KEY) {
    if(key !== GENERIC_TAB_STYLE_KEY && key !== ORG_TAB_STYLE_KEY)
        throw new Error('tbd');
    if(
        (key === GENERIC_TAB_STYLE_KEY && genericTabListenersSet) ||
        (key === ORG_TAB_STYLE_KEY && orgTabListenersSet)
    ){
        return;
    }
    const settings = await getStyleSettings(key);
    if(settings != null)
        settings instanceof Array ? setCurrentChoice({ id: key, value: settings }) : setCurrentChoice(settings);
    const isGeneric = key === GENERIC_TAB_STYLE_KEY;
    const allInputs = isGeneric ? allGenericInputs : allOrgInputs;
    const allDecorations = isGeneric ? allGenericDecorations : allOrgDecorations;
    const allInactiveDecorations = isGeneric ? allInactiveGenericDecorations : allInactiveOrgDecorations;
    const allActiveDecorations = isGeneric ? allActiveGenericDecorations : allActiveOrgDecorations;
    const btn_inactive_available = isGeneric ? btn_inactive_generic_available : btn_inactive_org_available;
    const btn_inactive_chosen = isGeneric ? btn_inactive_generic_chosen : btn_inactive_org_chosen;
    const btn_active_available = isGeneric ? btn_active_generic_available : btn_active_org_available;
    const btn_active_chosen = isGeneric ? btn_active_generic_chosen : btn_active_org_chosen;
    const ul_inactive_decoration_available = isGeneric ? ul_inactive_generic_decoration_available : ul_inactive_org_decoration_available;
    const ul_inactive_decoration_chosen = isGeneric ? ul_inactive_generic_decoration_chosen : ul_inactive_org_decoration_chosen;
    const ul_active_decoration_available = isGeneric ? ul_active_generic_decoration_available : ul_active_org_decoration_available;
    const ul_active_decoration_chosen = isGeneric ? ul_active_generic_decoration_chosen : ul_active_org_decoration_chosen;
    const tabPreview = isGeneric ? tabGenericPreview : tabOrgPreview;

    tabPreview.classList.remove("hidden");
    allInputs.forEach(el => el.addEventListener("change", e => saveTabOptions(e, key)));
    allDecorations.forEach(el => {
        //el.addEventListener("active", flipSelected);
        //el.addEventListener("focus", flipSelected);
        el.addEventListener("click", flipSelected);
    });
    btn_inactive_available.addEventListener("click", () => {
        // move to available
        moveSelectedDecorationsTo(ul_inactive_decoration_available, allInactiveDecorations, false, key);
    });
    btn_inactive_chosen.addEventListener("click", () => {
        // move to chosen
        moveSelectedDecorationsTo(ul_inactive_decoration_chosen, allInactiveDecorations, true, key);
    });
    btn_active_available.addEventListener("click", () => {
        // move to available
        moveSelectedDecorationsTo(ul_active_decoration_available, allActiveDecorations, false, key);
    });
    btn_active_chosen.addEventListener("click", () => {
        // move to chosen
        moveSelectedDecorationsTo(ul_active_decoration_chosen, allActiveDecorations, true, key);
    });
    if(isGeneric)
        genericTabListenersSet = true;
    else
        orgTabListenersSet = true;
}

generalHeader.addEventListener("click", () => {
    restoreGeneralSettings();
    generalHeader.classList.add(SLDS_ACTIVE);
    generalContainer.classList.remove("hidden");
    tabGenericManagerHeader.classList.remove(SLDS_ACTIVE);
    tabGenericManagerContainer.classList.add("hidden");
    tabOrgManagerHeader.classList.remove(SLDS_ACTIVE);
    tabOrgManagerContainer.classList.add("hidden");
});

tabGenericManagerHeader.addEventListener("click", () => {
    restoreTabSettings(GENERIC_TAB_STYLE_KEY);
    tabGenericManagerHeader.classList.add(SLDS_ACTIVE);
    tabGenericManagerContainer.classList.remove("hidden");
    generalHeader.classList.remove(SLDS_ACTIVE);
    generalContainer.classList.add("hidden");
    tabOrgManagerHeader.classList.remove(SLDS_ACTIVE);
    tabOrgManagerContainer.classList.add("hidden");
});

tabOrgManagerHeader.addEventListener("click", () => {
    restoreTabSettings(ORG_TAB_STYLE_KEY);
    tabOrgManagerHeader.classList.add(SLDS_ACTIVE);
    tabOrgManagerContainer.classList.remove("hidden");
    generalHeader.classList.remove(SLDS_ACTIVE);
    generalContainer.classList.add("hidden");
    tabGenericManagerHeader.classList.remove(SLDS_ACTIVE);
    tabGenericManagerContainer.classList.add("hidden");
});

restoreGeneralSettings();
