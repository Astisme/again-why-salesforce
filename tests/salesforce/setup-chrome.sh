#!/bin/bash

set -e

echo "Setting up Chrome for testing..."

if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null; then
    echo "Chrome already installed"
    exit 0
fi

CHROME_DIR="$HOME/.local/chrome"
mkdir -p "$CHROME_DIR"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Downloading Chrome for Linux..."
    cd "$CHROME_DIR"
    
    # Download Chrome .deb package
    wget -O chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    
    # Extract without installing system-wide
    ar x chrome.deb
    tar -xf data.tar.xz
    
    # Create wrapper script
    cat > "$HOME/.local/bin/google-chrome" << 'EOF'
#!/bin/bash
exec "$HOME/.local/chrome/opt/google/chrome/chrome" "$@"
EOF
    chmod +x "$HOME/.local/bin/google-chrome"
    
    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    echo "Chrome installed to $CHROME_DIR"

elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Downloading Chrome for macOS..."
    cd "$CHROME_DIR"
    
    # Download Chrome DMG
    curl -L -o chrome.dmg "https://dl.google.com/chrome/mac/stable/GGRO/googlechrome.dmg"
    
    # Mount and extract
    hdiutil attach chrome.dmg -quiet
    cp -R "/Volumes/Google Chrome/Google Chrome.app" "$CHROME_DIR/"
    hdiutil detach "/Volumes/Google Chrome" -quiet
    
    # Create wrapper script
    mkdir -p "$HOME/.local/bin"
    cat > "$HOME/.local/bin/google-chrome" << 'EOF'
#!/bin/bash
exec "$HOME/.local/chrome/Google Chrome.app/Contents/MacOS/Google Chrome" "$@"
EOF
    chmod +x "$HOME/.local/bin/google-chrome"
    
    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    echo "Chrome installed to $CHROME_DIR"

else
    echo "Unsupported OS. Please install Chrome manually."
    exit 1
fi

echo "Chrome setup complete!"
