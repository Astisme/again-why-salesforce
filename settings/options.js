import { 
    BROWSER,
    SETTINGS_KEY,
	LINK_NEW_BROWSER,
	SKIP_LINK_DETECTION,
	USE_LIGHTNING_NAVIGATION,
	POPUP_OPEN_LOGIN,
	POPUP_OPEN_SETUP,
	POPUP_LOGIN_NEW_TAB,
	POPUP_SETUP_NEW_TAB,
} from "/constants.js";

async function op_sendMessage(message){
    return await BROWSER.runtime.sendMessage({ message });
}

function saveCheckboxOptions(e) {
    const set = { what: "set", key: SETTINGS_KEY, set: {} };
    set.set.id = e.target.id;
    set.set.enabled = this?.checked ?? e.target.checked;
    op_sendMessage(set);
}

let link_new_browser_el = document.getElementById(LINK_NEW_BROWSER);
let skip_link_detection_el = document.getElementById(SKIP_LINK_DETECTION);
let use_lightning_navigation_el = document.getElementById(USE_LIGHTNING_NAVIGATION);
let popup_open_login_el = document.getElementById(POPUP_OPEN_LOGIN);
let popup_open_setup_el = document.getElementById(POPUP_OPEN_SETUP);
let popup_login_new_tab_el = document.getElementById(POPUP_LOGIN_NEW_TAB);
let popup_setup_new_tab_el = document.getElementById(POPUP_SETUP_NEW_TAB);

let allCheckboxes = [
    skip_link_detection_el,
    use_lightning_navigation_el,
    popup_open_login_el,
    popup_open_setup_el,
    popup_login_new_tab_el,
    popup_setup_new_tab_el,
];

async function restoreOptions() {
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
            default:
                console.error(`Unmatched setting id: ${setting.id}`);
                break;
        }
    }
    const settings = await op_sendMessage({ what: "get-settings" });
    if(settings != null)
        settings instanceof Array ? settings.forEach(set => setCurrentChoice(set)) : setCurrentChoice(settings);
    allCheckboxes.forEach(el => el.addEventListener("change", saveCheckboxOptions));
    link_new_browser_el.addEventListener("change", e => {
        if(e.target.checked)
            use_lightning_navigation_el.click();
        saveCheckboxOptions(e);
    });
}

restoreOptions();
