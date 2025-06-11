import { BROWSER, FRAME_PATTERNS } from "/constants.js";
import ensureTranslatorAvailability from "/translator.js";
import "../themeHandler.js";
await ensureTranslatorAvailability();

const whichPermissions = new URL(globalThis.location.href).searchParams.get("whichid");
const popuplink = await BROWSER.runtime.getURL("action/popup/popup.html");

if(whichPermissions == null || whichPermissions === "hostpermissions"){
    const noPerm = document.getElementById("no-permissions");
    noPerm.href = `${popuplink}?noPerm=true`;

    document.getElementById("allow-permissions").addEventListener("click", (e) => {
        e.preventDefault();
        BROWSER.permissions.request({
            origins: FRAME_PATTERNS,
        });
        setTimeout(close, 100);
    });

    /**
     * Sets the `noPerm` item in localStorage then switches to the standard popup
     */
    const setNoPerm = (e) => {
        e.preventDefault();
        localStorage.setItem("noPerm", "true");
        globalThis.location = noPerm.href;
    }

    const rememberSkip = document.getElementById("remember-skip");
    rememberSkip.addEventListener("click", () => {
        const checked = rememberSkip.checked;
        if (checked) {
            noPerm.addEventListener("click", setNoPerm);
        } else {
            noPerm.removeEventListener("click", setNoPerm);
        }
    });
} else if(whichPermissions === "download"){
    document.getElementById("host_permissions").classList.add("hidden");
    document.getElementById("download").classList.remove("hidden");
    document.getElementById("no-permissions-down").href = popuplink;
    document.getElementById("allow-permissions-down").addEventListener("click", (e) => {
        e.preventDefault();
        BROWSER.permissions.request({
            permissions: ["downloads"],
        });
        BROWSER.action.setPopup({
            popup: popuplink
        });
        setTimeout(close, 100);
    });
}
