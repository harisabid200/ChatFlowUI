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
    
    # 2. Replace <base href="/" /> with the actual base path
    sed -i "s/<base href=\"\/\" \/>/<base href=\"${ESCAPED_PATH}\" \/>/g" "$INDEX_HTML"
    
    echo "✅ Base path configured successfully"
else
    echo "⚠️  Warning: index.html not found at $INDEX_HTML"
fi

# Execute the main command (start the Node.js server)
exec "$@"
