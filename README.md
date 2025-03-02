<a href="https://github.com/Astisme/again-why-salesforce">
  <img src="https://github.com/Astisme/again-why-salesforce/blob/main/assets/icons/awsf-128.png?raw=true" align="right" title="Well hello there!" />
</a>

# Again, Why Salesforce

![Release version](https://img.shields.io/github/manifest-json/v/Astisme/again-why-salesforce?filename=manifest%2Ftemplate-manifest.json&label=Version) ![Last commit](https://img.shields.io/github/last-commit/Astisme/again-why-salesforce?labelColor=black&color=white) ![License](https://img.shields.io/github/license/Astisme/again-why-salesforce?color=238636) ![Code size](https://img.shields.io/github/languages/code-size/Astisme/again-why-salesforce)

<!--
![Chrome users](https://img.shields.io/chrome-web-store/users/:storeId)
![Chrome stars](https://img.shields.io/chrome-web-store/stars/:storeId)
![Firefox users](https://img.shields.io/amo/users/:addonId)
![Firefox stars](https://img.shields.io/amo/stars/:addonId)
![GitHub closed issues](https://img.shields.io/github/issues-closed/Astisme/again-why-salesforce)
![GitHub stars](https://img.shields.io/github/stars/Astisme/again-why-salesforce)
-->

This extension allows users to create custom tabs in Setup for their most-used settings.

This is a fork of [Why Salesforce](https://www.github.com/walters954/why-salesforce).

[Demo Video](https://youtu.be/BtlKRvac9ZQ)

## Install on browser

<a href="https://chromewebstore.google.com/detail/again-why-salesforce/bceeoimjhgjbihanbiifgpndmkklajbi" target="_blank">
  <img src="https://www.google.com/chrome/static/images/chrome-logo-m100.svg" title="Add to Chrome" width="80px" height="80px" align="right"/>
</a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/again-why-salesforce/" target="_blank">
  <img src="https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo.eb1324e44442.svg" title="Add to Firefox" width="80px" height="80px" align="right"/>
</a>
<a href="https://microsoftedge.microsoft.com/addons/detail/dfdjpokbfeaamjcomllncennmfhpldmm" target="_blank">
  <img src="https://edgestatic.azureedge.net/shared/cms/lrs1c69a1j/section-images/2c3f3c46bd764335beec466a0acfde0e.png" title="Add to Edge" width="80px" height="80px" align="right"/>
</a>

Click on the browser icon to be redirected to the extension page.

You may find the release for this extension [here](https://github.com/Astisme/again-why-salesforce/releases). You can download these releases to verify what is the code that's been uploaded to the extension stores.

If you prefer, you can build this extension by downloading it and running `deno task dev-(browser)` then add it to your browser following its specific steps.

## Roadmap

- [x] Ability to customize tab
  - [x] Salesforce SLDS
  - [x] Feedback on save and delete #3
  - [x] Update tabs onSave without refresh
  - [x] Disable save button if tabs list empty
  - [x] Reordering of tabs #5
- [x] Remove SLDS files
- [ ] Dark mode for flows
- [ ] Org specific tab customization
- [x] Highlight tab when user is on that url
- [x] Open full urls in new tab
- [ ] Better solutions for waiting until Salesforce setup is completely loaded
- [ ] Utils class for templates or other shared code
- [x] Favourite button on current Setup page #12
- [x] Import & Export tabs

## Contributing

All contributions are welcome. Please head to the [issues page](https://github.com/Astisme/again-why-salesforce/issues) and pick one unassigned issue to work on.

We'll assign it to you after you comment on it.

## Best Practices

The Best Practices followed by this project can be found [at this link](https://blog.jetbrains.com/webstorm/2024/10/javascript-best-practices-2024/).

## Contributors

- [Warren Walters](https://www.linkedin.com/in/walters954/)
- [Chris Rouse (Firefox port)](https://www.linkedin.com/in/chris-rouse/)
- [Astisme](https://www.github.com/Astisme/)
