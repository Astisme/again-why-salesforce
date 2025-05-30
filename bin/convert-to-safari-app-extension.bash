#!/bin/bash
EXT_NAME="Again, Why Salesforce"
INSTALLER_NAME="$EXT_NAME Installer"
PROJ_DIR="safari-proj"
BIN_DIR="safari-bin"
DMG_DIR="output"
DMG_STAGING="dmg_staging/$INSTALLER_NAME"
# Unzip built extension
BASE_NAME=$(basename bin/awsf-safari-v*.*.*.zip .zip)
unzip -oq bin/$BASE_NAME.zip -d $BIN_DIR
rm bin/$BASE_NAME.zip
mkdir $BIN_DIR $PROJ_DIR $DMG_DIR $DMG_STAGING
# Convert Web Extension -> Safari App Extension
/Applications/Xcode.app/Contents/Developer/usr/bin/safari-web-extension-converter \
    --no-open \
    --no-prompt \
    --macos-only \
    --bundle-identifier "com.whysalesforce.again" \
    --project-location $PROJ_DIR \
    $BIN_DIR #extension src
# Build macOS App Archive (unsigned)
xcodebuild clean archive \
    -project "$PROJ_DIR/$EXT_NAME/$EXT_NAME.xcodeproj" \
    -scheme "$EXT_NAME" \
    -configuration Release \
    -archivePath "$BIN_DIR/AppArchive"
    #CODE_SIGN_IDENTITY="" \
    #CODE_SIGNING_REQUIRED=NO \
    #CODE_SIGNING_ALLOWED=NO
# Extract .app and .appex
# copy the .app bundle
cp -R "$BIN_DIR/AppArchive.xcarchive/Products/Applications/$EXT_NAME.app" "$DMG_DIR/"
# find and copy the .appex inside
#cp -R "$DMG_DIR/$EXT_NAME.app/Contents/PlugIns/*.appex" "$DMG_DIR"/
# Create drag-and-drop .dmg
cp -R "$DMG_DIR/$EXT_NAME.app" "$DMG_STAGING"
ln -s /Applications "$DMG_STAGING"/Applications
# create image with dmg_staging
hdiutil create \
    -volname "$INSTALLER_NAME" \
    -srcfolder "$DMG_STAGING" \
    -ov -format UDZO \
    bin/"$BASE_NAME.dmg"
