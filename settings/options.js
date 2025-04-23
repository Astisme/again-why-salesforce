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
//const tabGenericManagerActiveContainer    = document.getElementById(`${TAB_GENERIC_STYLE}-active-container`);
//const tabGenericManagerInactiveContainer    = document.getElementById(`${TAB_GENERIC_STYLE}-inactive-container`);
const tabGenericManagerHeader       = document.getElementById(`${TAB_GENERIC_STYLE}-settings`);
const tabGenericPreview             = document.getElementById(`${TAB_GENERIC_STYLE}-preview`);

function toggleActivePreview(event){
    event.target.closest("li").classList.toggle(SLDS_ACTIVE);
}

tabGenericPreview.addEventListener("click", toggleActivePreview);

const tab_inactive_generic_setting_background_el             = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BACKGROUND}-inactive`);
const tab_inactive_generic_setting_color_el                  = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_COLOR}-inactive`);
const tab_inactive_generic_setting_border_color_el           = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BORDER}-inactive`);
const tab_inactive_generic_setting_shadow_el                 = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_SHADOW}-inactive`);
const tab_inactive_generic_setting_hover_background_el       = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_HOVER}-inactive`);
const tab_inactive_generic_setting_decoration_bold_el        = document.getElementById(`${TAB_STYLE_BOLD}-inactive`);
const tab_inactive_generic_setting_decoration_italic_el      = document.getElementById(`${TAB_STYLE_ITALIC}-inactive`);
const tab_inactive_generic_setting_decoration_underline_el   = document.getElementById(`${TAB_STYLE_UNDERLINE}-inactive`);
//const tab_inactive_generic_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_STYLE_WAVY}-inactive`);

const tab_active_generic_setting_background_el             = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BACKGROUND}-active`);
const tab_active_generic_setting_color_el                  = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_COLOR}-active`);
const tab_active_generic_setting_border_color_el           = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_BORDER}-active`);
const tab_active_generic_setting_shadow_el                 = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_SHADOW}-active`);
const tab_active_generic_setting_hover_background_el       = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_HOVER}-active`);
const tab_active_generic_setting_top_background_el          = document.getElementById(`${TAB_GENERIC_STYLE}-${TAB_STYLE_TOP}-active`);
const tab_active_generic_setting_decoration_bold_el        = document.getElementById(`${TAB_STYLE_BOLD}-active`);
const tab_active_generic_setting_decoration_italic_el      = document.getElementById(`${TAB_STYLE_ITALIC}-active`);
const tab_active_generic_setting_decoration_underline_el   = document.getElementById(`${TAB_STYLE_UNDERLINE}-active`);
//const tab_active_generic_setting_decoration_underline_wavy_el = document.getElementById(`${TAB_STYLE_WAVY}-active`);

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

const decorationAvailableId = "set_decoration_available";
const decorationChosenId = "set_decoration_chosen";
const ul_inactive_generic_decoration_available = document.getElementById(`${decorationAvailableId}-inactive`);
const ul_inactive_generic_decoration_chosen = document.getElementById(`${decorationChosenId}-inactive`);
const ul_active_generic_decoration_available = document.getElementById(`${decorationAvailableId}-active`);
const ul_active_generic_decoration_chosen = document.getElementById(`${decorationChosenId}-active`);

const backgroundStyleInactiveId = 'awsf-background-style-inactive';
const colorStyleInactiveId = 'awsf-color-style-inactive';
const borderStyleInactiveId = 'awsf-border-style-inactive';
const shadowStyleInactiveId = 'awsf-shadow-style-inactive';
const hoverStyleInactiveId = 'awsf-hover-style-inactive';
const boldStyleInactiveId = 'awsf-bold-style-inactive';
const italicStyleInactiveId = 'awsf-italic-style-inactive';
const underlineStyleInactiveId = 'awsf-underline-style-inactive';
//const wavyStyleInactiveId = 'awsf-wavy-style-inactive';

const backgroundStyleActiveId = 'awsf-background-style-active';
const colorStyleActiveId = 'awsf-color-style-active';
const borderStyleActiveId = 'awsf-border-style-active';
const shadowStyleActiveId = 'awsf-shadow-style-active';
const hoverStyleActiveId = 'awsf-hover-style-active';
const topStyleActiveId = 'awsf-top-style-active';
const boldStyleActiveId = 'awsf-bold-style-active';
const italicStyleActiveId = 'awsf-italic-style-active';
const underlineStyleActiveId = 'awsf-underline-style-active';
//const wavyStyleActiveId = 'awsf-wavy-style-active';

function updateStyle(styleId, newStyle){
    // Remove any previous style for this element
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) oldStyle.remove();
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
function setPreviewAndInputValue(setting, isGeneric = true){
    const isForInactive = !setting.forActive;
    const tabPreview = isGeneric ? tabGenericPreview : null;
    const slds_active_class = `.${SLDS_ACTIVE}`;
    function getCssSelector(pseudoElement = ""){
        return `#${tabPreview.id}${isForInactive ? `:not(${slds_active_class})` : slds_active_class}${pseudoElement}`;
    }
    let relatedInput = null;
    let chosenUl = null;
    let moveToChosen = null;
    const wasPicked = setting.value != null && setting.value !== "";
    switch (setting.id) {
        case "color":
            updateStyle(isForInactive ? colorStyleInactiveId : colorStyleActiveId, wasPicked ? `${getCssSelector()}{ color: ${setting.value}; }` : null);
            relatedInput = isForInactive ? tab_inactive_generic_setting_color_el : tab_active_generic_setting_color_el;
            break;
        case "background-color":
            updateStyle(isForInactive ? backgroundStyleInactiveId : backgroundStyleActiveId, wasPicked ? `${getCssSelector()}{ background-color: ${setting.value} !important; }` : null);
            relatedInput = isForInactive ? tab_inactive_generic_setting_background_el : tab_active_generic_setting_background_el;
            break;
        case "border":
            updateStyle(isForInactive ? borderStyleInactiveId : borderStyleActiveId, wasPicked ? `${getCssSelector()}{ border: 2px solid ${setting.value}; }` : null);
            relatedInput = isForInactive ? tab_inactive_generic_setting_border_color_el : tab_active_generic_setting_border_color_el;
            break;
        case "shadow":
            updateStyle(isForInactive ? shadowStyleInactiveId : shadowStyleActiveId, wasPicked ? `${getCssSelector()}{ text-shadow: 0px 0px 3px ${setting.value}; }` : null);
            relatedInput = isForInactive ? tab_inactive_generic_setting_shadow_el : tab_active_generic_setting_shadow_el;
            break;
        case "hover":
            updateStyle(isForInactive ? hoverStyleInactiveId : hoverStyleActiveId, wasPicked ? `${getCssSelector(":hover")}{ background-color: ${setting.value} !important; }` : null);
            relatedInput = isForInactive ? tab_inactive_generic_setting_hover_background_el : tab_active_generic_setting_hover_background_el;
            break;
        case "top":
            if(isForInactive)
                break;
            updateStyle(topStyleActiveId, wasPicked ? `${getCssSelector("::before")}{ background-color: ${setting.value} !important; }` : null);
            relatedInput = tab_active_generic_setting_top_background_el;
            break;
        case "bold": {
            updateStyle(isForInactive ? boldStyleInactiveId : boldStyleActiveId, wasPicked ? `${getCssSelector()}{ font-weight: ${setting.value}; }` : null);
            if(wasPicked){
                chosenUl = isForInactive ? ul_inactive_generic_decoration_chosen : ul_active_generic_decoration_chosen;   
                moveToChosen = isForInactive ? tab_inactive_generic_setting_decoration_bold_el : tab_active_generic_setting_decoration_bold_el;
            }
            break;
        }
        case "italic": {
            updateStyle(isForInactive ? italicStyleInactiveId : italicStyleActiveId, wasPicked ? `${getCssSelector()}{ font-style: ${setting.value}; }` : null);
            if(wasPicked){
                chosenUl = isForInactive ? ul_inactive_generic_decoration_chosen : ul_active_generic_decoration_chosen;   
                moveToChosen = isForInactive ? tab_inactive_generic_setting_decoration_italic_el : tab_active_generic_setting_decoration_italic_el;
            }
            break;
        }
        case "underline": {
            updateStyle(isForInactive ? underlineStyleInactiveId : underlineStyleActiveId, wasPicked ? `${getCssSelector()}{ text-decoration: ${setting.value}; }` : null);
            if(wasPicked){
                chosenUl = isForInactive ? ul_inactive_generic_decoration_chosen : ul_active_generic_decoration_chosen;   
                moveToChosen = isForInactive ? tab_inactive_generic_setting_decoration_underline_el : tab_active_generic_setting_decoration_underline_el;
            }
            break;
        }
        /*
        case "wavy": {
            updateStyle(isForInactive ? wavyStyleInactiveId : wavyStyleActiveId, wasPicked ? `${getCssSelector()}{ text-decoration: underline ${setting.value}; }` : null);
            if(wasPicked){
                chosenUl = isForInactive ? ul_inactive_generic_decoration_chosen : ul_active_generic_decoration_chosen;   
                moveToChosen = isForInactive ? tab_inactive_generic_setting_decoration_underline_wavy_el: tab_active_generic_setting_decoration_underline_wavy_el;
            }
            break;
        }
        */
        default:
            console.error(`Unmatched style setting id: ${setting.id}`);
            break;
    }
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
            setting.value instanceof Array
                ? setting.value.forEach(set => setPreviewAndInputValue(set, true))
                : setPreviewAndInputValue(setting.value, true);
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
    const settings = await getSettings(allCheckboxes.map(el => el.id));
    if(settings != null)
        settings instanceof Array ? settings.forEach(set => setCurrentChoice(set)) : setCurrentChoice(settings);
    if(generalSettingsListenersSet)
        return;
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

const genericChosenBtnId = "move-chosen";
const genericAvailableBtnId = "move-available";
const btn_inactive_generic_chosen = document.getElementById(`${genericChosenBtnId}-inactive`);
const btn_inactive_generic_available = document.getElementById(`${genericAvailableBtnId}-inactive`);
const btn_active_generic_chosen = document.getElementById(`${genericChosenBtnId}-active`);
const btn_active_generic_available = document.getElementById(`${genericAvailableBtnId}-active`);

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
        setPreviewAndInputValue(setting, key === GENERIC_TAB_STYLE_KEY);
        set.set.push(setting)
    });
    sendExtensionMessage(set);
}

function flipSelected(event){
    const li = event.target.closest("li");
    li.ariaSelected = li.ariaSelected !== "true";
}
function moveSelectedDecorationsTo(moveHereElement = null, allDecorations = null, isAdding = true){
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
    saveTabDecorations(selectedDecorations, isAdding);
}

let genericTabListenersSet = false;
async function restoreGenericTabSettings() {
    const settings = await getStyleSettings(GENERIC_TAB_STYLE_KEY);
    if(settings != null)
        settings instanceof Array ? setCurrentChoice({ id: GENERIC_TAB_STYLE_KEY, value: settings }) : setCurrentChoice(settings);
    tabGenericPreview.classList.remove("hidden");
    if(genericTabListenersSet)
        return;
    allGenericInputs.forEach(el => el.addEventListener("change", saveTabOptions));
    allGenericDecorations.forEach(el => {
        //el.addEventListener("active", flipSelected);
        //el.addEventListener("focus", flipSelected);
        el.addEventListener("click", flipSelected);
    });
    btn_inactive_generic_available.addEventListener("click", () => {
        // move to available
        moveSelectedDecorationsTo(ul_inactive_generic_decoration_available, allInactiveGenericDecorations, false);
    });
    btn_inactive_generic_chosen.addEventListener("click", () => {
        // move to chosen
        moveSelectedDecorationsTo(ul_inactive_generic_decoration_chosen, allInactiveGenericDecorations, true);
    });
    btn_active_generic_available.addEventListener("click", () => {
        // move to available
        moveSelectedDecorationsTo(ul_active_generic_decoration_available, allActiveGenericDecorations, false);
    });
    btn_active_generic_chosen.addEventListener("click", () => {
        // move to chosen
        moveSelectedDecorationsTo(ul_active_generic_decoration_chosen, allActiveGenericDecorations, true);
    });
    genericTabListenersSet = true;
}

generalHeader.addEventListener("click", () => {
    restoreGeneralSettings();
    generalHeader.classList.add(SLDS_ACTIVE);
    generalContainer.classList.remove("hidden");
    tabGenericManagerHeader.classList.remove(SLDS_ACTIVE);
    tabGenericManagerContainer.classList.add("hidden");
});

tabGenericManagerHeader.addEventListener("click", () => {
    restoreGenericTabSettings();
    tabGenericManagerHeader.classList.add(SLDS_ACTIVE);
    tabGenericManagerContainer.classList.remove("hidden");
    generalHeader.classList.remove(SLDS_ACTIVE);
    generalContainer.classList.add("hidden");
});

restoreGeneralSettings();
