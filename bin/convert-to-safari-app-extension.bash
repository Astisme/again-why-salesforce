#!/bin/bash

EXT_NAME="Again, Why Salesforce"
INSTALLER_NAME="$EXT_NAME Installer"
PROJ_DIR="safari-proj"
BIN_DIR="safari-bin"
DMG_STAGING="dmg_staging/$INSTALLER_NAME"
BACKGROUND_DIR="dmg_resources"

# Create background resources directory if it doesn't exist
mkdir -p "$BACKGROUND_DIR"

# Unzip built extension
BASE_NAME=$(basename bin/awsf-safari-v*.*.*.zip .zip)
unzip -oq bin/$BASE_NAME.zip -d $BIN_DIR
rm bin/$BASE_NAME.zip
mkdir -p $PROJ_DIR "$DMG_STAGING"

# Convert Web Extension -> Safari App Extension
/Applications/Xcode.app/Contents/Developer/usr/bin/safari-web-extension-converter \
    --no-open \
    --no-prompt \
    --macos-only \
    --bundle-identifier "com.whysalesforce.again" \
    --project-location $PROJ_DIR \
    $BIN_DIR

# Build macOS App Archive (unsigned)
xcodebuild clean archive \
    -project "$PROJ_DIR/$EXT_NAME/$EXT_NAME.xcodeproj" \
    -scheme "$EXT_NAME" \
    -configuration Release \
    -archivePath "$BIN_DIR/AppArchive"

# Extract .app
cp -R "$BIN_DIR/AppArchive.xcarchive/Products/Applications/$EXT_NAME.app" "$DMG_STAGING/"

# Create Applications symlink
ln -s /Applications "$DMG_STAGING"/Applications

# Clean up any existing files
DMG_TEMP="temp_$BASE_NAME.dmg"
rm -f "$DMG_TEMP"
rm -f "bin/$BASE_NAME.dmg"

# Unmount any existing volumes with the same name
MOUNT_DIR="/Volumes/$INSTALLER_NAME"
if [ -d "$MOUNT_DIR" ]; then
    echo "Unmounting existing volume..."
    hdiutil detach "$MOUNT_DIR" -force 2>/dev/null || true
    sleep 1
fi

# Create a temporary DMG to customize
hdiutil create \
    -srcfolder "$DMG_STAGING" \
    -volname "$INSTALLER_NAME" \
    -fs HFS+ \
    -fsargs "-c c=64,a=16,e=16" \
    -format UDRW \
    -size 150m \
    "$DMG_TEMP"

# Mount the temporary DMG with proper options
echo "Mounting temporary DMG for customization..."
hdiutil attach "$DMG_TEMP" -readwrite -noverify -noautoopen -mountpoint "$MOUNT_DIR"

# Wait for mount and verify it's writable
sleep 3
if [ ! -w "$MOUNT_DIR" ]; then
    echo "Error: DMG not mounted as writable"
    exit 1
fi

# Copy background images to hidden .background folder in DMG
if [ -f "images/background-dmg.png" ]; then
    echo "Setting up background images..."
    mkdir -p "$MOUNT_DIR/.background"
    # Copy the regular resolution image
    cp "images/background-dmg.png" "$MOUNT_DIR/.background/background-dmg.png" || {
        echo "Warning: Could not copy background image"
    }
  # Use AppleScript to customize the DMG appearance
  osascript <<EOF
tell application "Finder"
    tell disk "$INSTALLER_NAME"
        open
        set current view of container window to icon view
        set toolbar visible of container window to false
        set statusbar visible of container window to false
        set the bounds of container window to {100, 100, 700, 500}
        set viewOptions to the icon view options of container window
        set arrangement of viewOptions to not arranged
        set icon size of viewOptions to 120
        try
          set text color of viewOptions to {65535, 65535, 65535}
        end try
        set label position of viewOptions to bottom
        set text size of viewOptions to 12
        if exists file ".background:background-dmg.png" then
          set background picture of viewOptions to file ".background:background-dmg.png"
        end if
        set position of item "$EXT_NAME.app" of container window to {150, 215}
        set position of item "Applications" of container window to {450, 215}
        close
        open
        update without registering applications
        delay 2
      end tell
    end tell
EOF
fi


# Hide background folder
SetFile -a V "$MOUNT_DIR/.background" 2>/dev/null || chflags hidden "$MOUNT_DIR/.background" 2>/dev/null

# Create and add custom volume icon from existing assets (do this BEFORE mounting)
VOLUME_ICON_ICNS="$BACKGROUND_DIR/VolumeIcon.icns"
if [ ! -f "$VOLUME_ICON_ICNS" ] && [ -d "assets/icons" ]; then
    echo "Creating volume icon from existing assets..."
    # Create iconset directory in the proper location
    ICONSET_DIR="$BACKGROUND_DIR/VolumeIcon.iconset"
    mkdir -p "$ICONSET_DIR"
    
    # Copy and rename existing PNGs to iconset format
    [ -f "assets/icons/awsf-16.png" ] && cp "assets/icons/awsf-16.png" "$ICONSET_DIR/icon_16x16.png"
    [ -f "assets/icons/awsf-32.png" ] && cp "assets/icons/awsf-32.png" "$ICONSET_DIR/icon_16x16@2x.png"
    [ -f "assets/icons/awsf-32.png" ] && cp "assets/icons/awsf-32.png" "$ICONSET_DIR/icon_32x32.png"
    [ -f "assets/icons/awsf-64.png" ] && cp "assets/icons/awsf-64.png" "$ICONSET_DIR/icon_32x32@2x.png"
    [ -f "assets/icons/awsf-128.png" ] && cp "assets/icons/awsf-128.png" "$ICONSET_DIR/icon_128x128.png"
    [ -f "assets/icons/awsf-256.png" ] && cp "assets/icons/awsf-256.png" "$ICONSET_DIR/icon_128x128@2x.png"
    [ -f "assets/icons/awsf-256.png" ] && cp "assets/icons/awsf-256.png" "$ICONSET_DIR/icon_256x256.png"
    [ -f "assets/icons/awsf-512.png" ] && cp "assets/icons/awsf-512.png" "$ICONSET_DIR/icon_256x256@2x.png"
    [ -f "assets/icons/awsf-512.png" ] && cp "assets/icons/awsf-512.png" "$ICONSET_DIR/icon_512x512.png"
    [ -f "assets/icons/awsf-1024.png" ] && cp "assets/icons/awsf-1024.png" "$ICONSET_DIR/icon_512x512@2x.png"
    
    # Check if we have at least one icon
    if [ "$(ls -1 "$ICONSET_DIR" 2>/dev/null | wc -l)" -gt 0 ]; then
        # Convert iconset to icns
        if iconutil -c icns "$ICONSET_DIR" -o "$VOLUME_ICON_ICNS" 2>/dev/null; then
            echo "✓ Created volume icon: $VOLUME_ICON_ICNS"
        else
            echo "✗ Failed to create .icns file with iconutil"
            # Fallback: try using the largest PNG directly (some tools accept this)
            if [ -f "assets/pics/awsf-512.png" ]; then
                cp "assets/pics/awsf-512.png" "$VOLUME_ICON_ICNS.png"
                echo "→ Using PNG fallback: $VOLUME_ICON_ICNS.png"
            fi
        fi
    else
        echo "✗ No icon files found in assets/pics/"
    fi
    
    # Clean up iconset directory
    rm -rf "$ICONSET_DIR"
fi

# Add custom volume icon to DMG
ICON_APPLIED=false
if [ -f "$VOLUME_ICON_ICNS" ]; then
    echo "Applying .icns volume icon..."
    cp "$VOLUME_ICON_ICNS" "$MOUNT_DIR/.VolumeIcon.icns"
    # Try multiple methods to set the icon
    if command -v SetFile >/dev/null 2>&1; then
        SetFile -c icnC "$MOUNT_DIR/.VolumeIcon.icns" 2>/dev/null
        SetFile -a C "$MOUNT_DIR" 2>/dev/null
        ICON_APPLIED=true
    fi
    # Alternative method using Finder attributes
    xattr -wx com.apple.FinderInfo "0000000000000000040000000000000000000000000000000000000000000000" "$MOUNT_DIR" 2>/dev/null
elif [ -f "$VOLUME_ICON_ICNS.png" ]; then
    echo "Applying PNG volume icon (fallback)..."
    cp "$VOLUME_ICON_ICNS.png" "$MOUNT_DIR/.VolumeIcon.icns"
    if command -v SetFile >/dev/null 2>&1; then
        SetFile -a C "$MOUNT_DIR" 2>/dev/null
        ICON_APPLIED=true
    fi
fi

if [ "$ICON_APPLIED" = true ]; then
    echo "✓ Volume icon applied successfully"
else
    echo "⚠ Volume icon may not display properly (SetFile not available)"
    echo "  This is normal on some macOS versions - the DMG will still work"
fi

# Unmount the temporary DMG with proper cleanup
echo "Unmounting DMG..."
sync  # Force write any pending changes
hdiutil detach "$MOUNT_DIR" -force
sleep 2

# Verify unmount
if [ -d "$MOUNT_DIR" ]; then
    echo "Warning: DMG may not have unmounted cleanly"
    # Try alternative unmount methods
    diskutil unmount "$MOUNT_DIR" 2>/dev/null || true
    sleep 1
fi

# Convert to final compressed DMG
hdiutil convert "$DMG_TEMP" \
    -format UDZO \
    -imagekey zlib-level=9 \
    -o "bin/$BASE_NAME.dmg"

echo "DMG created: bin/$BASE_NAME.dmg"
