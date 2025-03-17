import { initTheme } from "../themeHandler.js";
initTheme();
const noPerm = document.getElementById("no-permissions");
const popup = await chrome.runtime.getURL("action/popup/popup.html");
noPerm.href = `${popup}?noPerm=true`;
document.getElementById("allow-permissions").addEventListener("click", e => {
    e.preventDefault();
    chrome.permissions.request({
        origins: ["https://*.my.salesforce-setup.com/lightning/setup/*"]
    }/*, function(granted) {
        console.log(granted)
        if (granted) {
            globalThis.location = popup;
        } else {
            noPerm.click();
        }
    }*/);
    setTimeout(close, 100);
});
