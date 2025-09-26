#!/bin/bash
set -e
echo "Setting up Chrome for testing..."

# Check if Chrome is already installed
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
    mkdir -p "$HOME/.local/bin"
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
    
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    echo "Setting up Chrome for Windows..."
    
    # Convert paths for Windows compatibility
    WIN_CHROME_DIR=$(cygpath -w "$CHROME_DIR" 2>/dev/null || echo "$CHROME_DIR")
    
    # Check if running in WSL and look for existing Windows Chrome
    if grep -q Microsoft /proc/version 2>/dev/null; then
        echo "Detected WSL environment"
        WIN_CHROME_PATHS=(
            "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
            "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
        )
        
        for chrome_path in "${WIN_CHROME_PATHS[@]}"; do
            if [[ -f "$chrome_path" ]]; then
                echo "Using existing Windows Chrome installation"
                mkdir -p "$HOME/.local/bin"
                cat > "$HOME/.local/bin/google-chrome" << EOF
#!/bin/bash
exec "$chrome_path" "\$@"
EOF
                chmod +x "$HOME/.local/bin/google-chrome"
                echo "Chrome wrapper created"
                exit 0
            fi
        done
        
        echo "Chrome not found in Windows. Please install Chrome on Windows first."
        exit 1
    else
        # Running in Git Bash/MSYS2/Cygwin
        echo "Downloading Chrome for Windows..."
        cd "$CHROME_DIR"
        
        # Download Chrome installer
        curl -L -o chrome_installer.exe "https://dl.google.com/chrome/install/375.126/chrome_installer.exe"
        
        # Create a portable installation directory
        mkdir -p chrome_portable
        
        echo "Please run the downloaded installer manually:"
        echo "Location: $WIN_CHROME_DIR\\chrome_installer.exe"
        echo ""
        echo "For portable installation, extract to: $WIN_CHROME_DIR\\chrome_portable"
        echo ""
        echo "After installation, Chrome will be available via the created wrapper script."
        
        # Create wrapper script for manual setup
        mkdir -p "$HOME/.local/bin"
        cat > "$HOME/.local/bin/google-chrome" << 'EOF'
#!/bin/bash
# Try common Chrome installation paths
CHROME_PATHS=(
    "$HOME/.local/chrome/chrome_portable/chrome.exe"
    "/c/Program Files/Google/Chrome/Application/chrome.exe"
    "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
)

for chrome_path in "${CHROME_PATHS[@]}"; do
    if [[ -f "$chrome_path" ]]; then
        exec "$chrome_path" "$@"
    fi
done

echo "Chrome executable not found. Please ensure Chrome is installed."
exit 1
EOF
        chmod +x "$HOME/.local/bin/google-chrome"
    fi
    
    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    echo "Chrome setup configured for Windows"
    
else
    echo "Unsupported OS: $OSTYPE"
    echo "Please install Chrome manually."
    exit 1
fi

echo "Chrome setup complete!"
echo "Restart your shell or run 'source ~/.bashrc' (Linux) or 'source ~/.zshrc' (macOS) to use the chrome command."
