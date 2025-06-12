
<a href="https://github.com/Astisme/again-why-salesforce">
  <img src="https://github.com/Astisme/again-why-salesforce/blob/main/assets/icons/awsf-128.png?raw=true" align="right" title="Well hello there!" />
</a>

# Again, Why Salesforce

> A lightweight Chrome/Firefox/Edge extension that lets you create and manage custom Setup tabs for your most-used Salesforce settings.

## Badges

[![Release version](https://img.shields.io/github/manifest-json/v/Astisme/again-why-salesforce?filename=manifest%2Ftemplate-manifest.json&label=Version)](https://www.github.com/Astisme/releases)
[![Last commit](https://img.shields.io/github/last-commit/Astisme/again-why-salesforce?labelColor=black&color=white)](https://github.com/Astisme/again-why-salesforce/commits/main/)
[![License](https://img.shields.io/github/license/Astisme/again-why-salesforce?color=238636)](https://github.com/Astisme/again-why-salesforce/blob/main/LICENSE)
[![Code size](https://img.shields.io/github/languages/code-size/Astisme/again-why-salesforce)](https://github.com/Astisme/again-why-salesforce/#)
[![Chrome users](https://img.shields.io/chrome-web-store/users/bceeoimjhgjbihanbiifgpndmkklajbi?label=Chrome%20Users&color=blue)](https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi)
[![Firefox users](https://img.shields.io/amo/users/again@why.salesforce?label=Firefox%20Users&color=red)](https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/)
[![Edge users](https://img.shields.io/badge/dynamic/json?label=Edge%20Users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fdfdjpokbfeaamjcomllncennmfhpldmm)](https://microsoftedge.microsoft.com/addons/detail/dfdjpokbfeaamjcomllncennmfhpldmm)

<!--
![Chrome stars](https://img.shields.io/chrome-web-store/stars/:storeId)
![Firefox stars](https://img.shields.io/amo/stars/:addonId)
![GitHub closed issues](https://img.shields.io/github/issues-closed/Astisme/again-why-salesforce)
![GitHub stars](https://img.shields.io/github/stars/Astisme/again-why-salesforce)
-->

**Licensed under the GNU General Public License v3**.

---

## Table of Contents

1. [Install](#install)
2. [Demo](#demo)
3. [New Features](#new-features)
4. [Usage Example](#usage-example)
5. [Browser Support](#browser-support)
6. [Build & Dev Instructions](#build--dev-instructions)
7. [Contributing](#contributing)
8. [Contributors](#contributors)

---

## Install

Click on your preferred browser icon to go to the extension store:

<a href="https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi" target="_blank">
  <img src="https://www.google.com/chrome/static/images/chrome-logo-m100.svg" title="Add to Chrome" width="80px" height="80px" align="right"/>
</a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/" target="_blank">
  <img src="https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo.eb1324e44442.svg" title="Add to Firefox" width="80px" height="80px" align="right"/>
</a>
<a href="https://microsoftedge.microsoft.com/addons/detail/dfdjpokbfeaamjcomllncennmfhpldmm" target="_blank">
  <img src="https://edgestatic.azureedge.net/shared/cms/lrs1c69a1j/section-images/2c3f3c46bd764335beec466a0acfde0e.png" title="Add to Edge" width="80px" height="80px" align="right"/>
</a>

---

## Demo

Watch a quick walkthrough: [Demo Video](https://youtu.be/BtlKRvac9ZQ)

---

## New Features

| Feature             | Description                                          | Preview                                                                      |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Import Tabs         | Bulk-import Tab configurations from another org      | <img src="./images/import-modal.png" height="200" title="Import Modal"/>     |
| Context Menus       | Right-click setup pages to save Tabs instantly       | <img src="./images/context-menu.png" height="200" title="Context Menu"/>     |
| Open in Another Org | Launch a Setup Tab in a different org with one click | <img src="./images/open-other-org.png" height="200" title="Open Other Org"/> |
| Org-specific Tabs   | Customize Tabs per Salesforce org profile            | <img src="./images/popup-dark.png" height="200" title="Org-specific Tabs"/>  |
| Fast Save           | Quickly add or remove Tabs from the popup menu       | <img src="./images/remove-tab.png" height="200" title="Fast Save"/>          |

---

## Usage Example

<!-- Insert animated GIF or code snippet showing the Import Tabs feature in action -->

---

## Browser Support

 Browser | Minimum Version 
 ------- | --------------- 
 Chrome  | 90+             
 Firefox | 88+             
 Edge    | 90+          
 Safari    | 16.4             

---

## Build & Dev Instructions

If you prefer to self-host or contribute locally, run:

- **Chrome**: `deno task dev-chrome`
- **Firefox**: `deno task dev-firefox`
- **Edge**: `deno task dev-chrome`
- **Safari**: `deno task dev-safari`

Then load the unpacked extension in your browser’s developer mode.

---

## Contributing

Please read [CONTRIBUTING.md](/CONTRIBUTING.md) for details on code style, tests, and commit conventions. Then:

1. Fork the repo
2. Pick an unassigned issue and comment to claim it
3. Submit a PR following our semantic commit guidelines

---

## Contributors

- [Warren Walters](https://www.linkedin.com/in/walters954/)
- [Chris Rouse](https://www.linkedin.com/in/chris-rouse/)
- [Astisme](https://github.com/Astisme/)
