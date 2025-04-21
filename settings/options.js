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
	TAB_STYLE_BACKGROUND,
	TAB_STYLE_COLOR,
	TAB_STYLE_BORDER,
	TAB_STYLE_SHADOW,
	TAB_STYLE_HOVER,
	TAB_STYLE_BOLD,
	TAB_STYLE_ITALIC,
	TAB_STYLE_UNDERLINE,
	TAB_STYLE_WAVY,
    sendExtensionMessage,
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

const link_new_browser_el = document.getElementById(LINK_NEW_BROWSER);
const skip_link_detection_el = document.getElementById(SKIP_LINK_DETECTION);
const use_lightning_navigation_el = document.getElementById(USE_LIGHTNING_NAVIGATION);
const popup_open_login_el = document.getElementById(POPUP_OPEN_LOGIN);
const popup_open_setup_el = document.getElementById(POPUP_OPEN_SETUP);
const popup_login_new_tab_el = document.getElementById(POPUP_LOGIN_NEW_TAB);
const popup_setup_new_tab_el = document.getElementById(POPUP_SETUP_NEW_TAB);

const generalContainer = document.getElementById("general-container");
const generalHeader = document.getElementById("general-settings");
const tabGenericManagerContainer = document.getElementById(`${TAB_GENERIC_STYLE}-container`);
const tabGenericManagerHeader = document.getElementById(`${TAB_GENERIC_STYLE}-settings`);

const tab_generic_setting_background_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_BACKGROUND}`);
const tab_generic_setting_color_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_COLOR}`);
const tab_generic_setting_border_color_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_BORDER}`);
const tab_generic_setting_shadow_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_SHADOW}`);
const tab_generic_setting_hover_background_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_HOVER}`);
const tab_generic_setting_decoration_bold_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_BOLD}`);
const tab_generic_setting_decoration_italic_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_ITALIC}`);
const tab_generic_setting_decoration_underline_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_UNDERLINE}`);
const tab_generic_setting_decoration_underline_wavy_el = tabGenericManagerContainer.querySelector(`#${TAB_STYLE_WAVY}`);

const genericTabKey = `${SETTINGS_KEY}-${TAB_GENERIC_STYLE}`;


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
        case genericTabKey:
            popup_setup_new_tab_el.checked = setting.enabled;
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

async function restoreGeneralSettings() {
    const settings = await sendExtensionMessage({ what: "get-settings", keys: allCheckboxes.map(el => el.id) });
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
}

const allInputs = [
    tab_generic_setting_background_el,
    tab_generic_setting_color_el,
    tab_generic_setting_border_color_el,
    tab_generic_setting_shadow_el,
    tab_generic_setting_hover_background_el,
];
const allGenericTabSettings = [
    ...allInputs,
    tab_generic_setting_decoration_bold_el,
    tab_generic_setting_decoration_italic_el,
    tab_generic_setting_decoration_underline_el,
    tab_generic_setting_decoration_underline_wavy_el,
];

const decorationAvailableId = "set_decoration_available";
const decorationChosenId = "set_decoration_chosen";
const tab_decoration_available = tabGenericManagerContainer.querySelector(`#${decorationAvailableId}`);
const tab_decoration_chosen = tabGenericManagerContainer.querySelector(`#${decorationChosenId}`);

function saveTabOptions(e, key = genericTabKey/*, ...dependentTabElements*/) {
    const set = { what: "set", key, set: [] };
    const setting = {};
    console.log(e);
    setting.id = e.target.id;
    setting.enabled = this?.checked ?? e.target.checked;
    set.set.push(setting)
    /*
    dependentTabElements.forEach(dc => {
        const setting = {};
        setting.id = dc.id;
        setting.enabled = dc.checked;
        set.set.push(setting)
    });
    */
    sendExtensionMessage(set);
}

async function restoreGenericTabSettings() {
    const settings = await sendExtensionMessage({ what: "get-settings", keys: TAB_GENERIC_STYLE });
    console.log('retrieved',settings);
    if(settings != null)
        settings instanceof Array ? settings.forEach(set => setCurrentChoice(set)) : setCurrentChoice(settings);
    allInputs.forEach(el => el.addEventListener("change", saveTabOptions));
}

generalHeader.addEventListener("click", () => {
    restoreGeneralSettings();
    generalHeader.classList.add("slds-is-active");
    generalContainer.classList.remove("hidden");
    tabGenericManagerHeader.classList.remove("slds-is-active");
    tabGenericManagerContainer.classList.add("hidden");
});

tabGenericManagerHeader.addEventListener("click", () => {
    restoreGenericTabSettings();
    tabGenericManagerHeader.classList.add("slds-is-active");
    tabGenericManagerContainer.classList.remove("hidden");
    generalHeader.classList.remove("slds-is-active");
    generalContainer.classList.add("hidden");
});

restoreGeneralSettings();
