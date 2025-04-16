import { BROWSER, SETTINGS_KEY } from "/constants.js";

async function op_sendMessage(message){
    return await BROWSER.runtime.sendMessage({ message });
}

function saveCheckboxOptions(e) {
    const set = { what: "set", key: SETTINGS_KEY, set: {} };
    set.set.id = e.target.id;
    set.set.enabled = this?.checked ?? e.target.checked;
    op_sendMessage(set);
}

const link_new_browser_id = "link_new_browser";
const skip_link_detection_id = "skip_link_detection";
const use_lightning_navigation_id = "use_lightning_navigation";
const popup_open_login_id = "popup_open_login";
const popup_open_setup_id = "popup_open_setup";
const popup_login_new_tab_id = "popup_login_new_tab";
const popup_setup_new_tab_id = "popup_setup_new_tab";

let link_new_browser = document.getElementById(link_new_browser_id);
let skip_link_detection = document.getElementById(skip_link_detection_id);
let use_lightning_navigation = document.getElementById(use_lightning_navigation_id);
let popup_open_login = document.getElementById(popup_open_login_id);
let popup_open_setup = document.getElementById(popup_open_setup_id);
let popup_login_new_tab = document.getElementById(popup_login_new_tab_id);
let popup_setup_new_tab = document.getElementById(popup_setup_new_tab_id);

let allCheckboxes = [
    skip_link_detection,
    use_lightning_navigation,
    popup_open_login,
    popup_open_setup,
    popup_login_new_tab,
    popup_setup_new_tab,
];

async function restoreOptions() {
    function setCurrentChoice(setting) {
        switch (setting.id) {
            case link_new_browser_id:
                link_new_browser.checked = setting.enabled;
                break;
            case skip_link_detection_id:
                skip_link_detection.checked = setting.enabled;
                break;
            case use_lightning_navigation_id:
                use_lightning_navigation.checked = setting.enabled;
                break;
            case popup_open_login_id:
                popup_open_login.checked = setting.enabled;
                break;
            case popup_open_setup_id:
                popup_open_setup.checked = setting.enabled;
                break;
            case popup_login_new_tab_id:
                popup_login_new_tab.checked = setting.enabled;
                break;
            case popup_setup_new_tab_id:
                popup_setup_new_tab.checked = setting.enabled;
                break;
            default:
                console.error(`Unmatched setting id: ${setting.id}`);
                break;
        }
    }
    const settings = await op_sendMessage({ what: "get", key: SETTINGS_KEY });
    if(settings != null)
        settings instanceof Array ? settings.forEach(set => setCurrentChoice(set)) : setCurrentChoice(settings);
    allCheckboxes.forEach(el => el.addEventListener("change", saveCheckboxOptions));
    link_new_browser.addEventListener("change", e => {
        if(e.target.checked)
            use_lightning_navigation.click();
        saveCheckboxOptions(e);
    });
}

restoreOptions();
