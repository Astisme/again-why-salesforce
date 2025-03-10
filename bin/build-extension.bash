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

# Define prefix
AWSF="awsf"

# Extract manifest version
MANIFEST_VERSION=$(grep -oP '"version":\s*"\K[0-9.]+' manifest/template-manifest.json)  # Get version from manifest

BROWSER_VERSION_NAME="${AWSF}-$BROWSER-v$MANIFEST_VERSION"

# Set variables
ZIP_NAME="${BROWSER_VERSION_NAME}.zip"

# Verify manifest.json exists
ls manifest.json >/dev/null 2>&1 || { echo "manifest.json not found!"; exit 1; }

# Zip $BROWSER extension
zip -r "bin/$ZIP_NAME" action assets background/bundledBackground.js salesforce/bundledContent.js salesforce/lightning-navigation.js *.js LICENSE* README.md manifest.json -x "*/README.md" >/dev/null 2>&1
