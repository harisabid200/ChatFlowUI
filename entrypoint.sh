#!/bin/sh
# Entrypoint script to configure base path at runtime

set -e

# Get BASE_PATH from environment variable, default to /
BASE_PATH="${BASE_PATH:-/}"

echo "🔧 Configuring base path: ${BASE_PATH}"

# Find the index.html file in the admin dist directory
INDEX_HTML="/app/admin/dist/index.html"

if [ -f "$INDEX_HTML" ]; then
    # Escape forward slashes in BASE_PATH for sed
    ESCAPED_PATH=$(echo "$BASE_PATH" | sed 's/\//\\\//g')
    
    # 1. Replace window.__BASE_PATH__ = '/'; with the actual path
    sed -i "s/window.__BASE_PATH__ = '\/';/window.__BASE_PATH__ = '${ESCAPED_PATH}';/g" "$INDEX_HTML"
    
    # 2. Fix relative asset paths for nested routes
    # Convert ./assets/ to absolute paths using BASE_PATH
    if [ "$BASE_PATH" != "/" ]; then
        # Remove trailing slash for base path construction
        CLEAN_PATH=$(echo "$BASE_PATH" | sed 's/\/$//')
        ESCAPED_CLEAN=$(echo "$CLEAN_PATH" | sed 's/\//\\\//g')
        
        # Replace src="./assets/ with src="/basepath/assets/
        sed -i "s/src=\"\.\/assets\//src=\"${ESCAPED_CLEAN}\/assets\//g" "$INDEX_HTML"
        
        # Replace href="./assets/ with href="/basepath/assets/
        sed -i "s/href=\"\.\/assets\//href=\"${ESCAPED_CLEAN}\/assets\//g" "$INDEX_HTML"
        
        # Replace href="/vite.svg" with href="/basepath/vite.svg"
        sed -i "s/href=\"\/vite\.svg\"/href=\"${ESCAPED_CLEAN}\/vite.svg\"/g" "$INDEX_HTML"
    fi
    
    echo "✅ Base path configured successfully"
else
    echo "⚠️  Warning: index.html not found at $INDEX_HTML"
fi

# Execute the main command (start the Node.js server)
exec "$@"
