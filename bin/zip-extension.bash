#!/bin/bash
if [ -z "$1" ]; then
    echo "Error: BROWSER argument is required (e.g., firefox, chrome, edge, safari)."
    exit 1
fi

BROWSER=$1
# Validate BROWSER input
if [[ ! "$BROWSER" =~ ^(firefox|chrome|edge|safari)$ ]]; then
  echo "Error: Invalid BROWSER. Please specify one of: firefox, chrome, edge, safari."
  exit 1
fi

TAG_VERSION=$(git describe --tags --exact-match HEAD 2>/dev/null | sed 's/^v//')
if [ -z "$TAG_VERSION" ]; then
    echo "No tag found on current commit"
    exit 1
fi

BROWSER_VERSION_NAME="awsf-$BROWSER-v$TAG_VERSION"
ZIP_NAME="${BROWSER_VERSION_NAME}.zip"

# Verify manifest.json exists
ls manifest.json >/dev/null 2>&1 || { echo "manifest.json not found!"; exit 1; }

# Zip $BROWSER extension
zip -r "bin/$ZIP_NAME" _locales action assets *.js background/bundledBackground.js salesforce/bundledContent.js salesforce/lightning-navigation.js LICENSE README.md manifest.json -x "*/README.md" >/dev/null 2>&1
