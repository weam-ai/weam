#!/bin/bash

# WEAM Nginx Setup Script (Cross-Platform)
# Supports: Ubuntu, macOS, and Windows (Git Bash / WSL / MSYS)

set -e

echo "🚀 Starting WEAM Nginx Setup..."

# -------------------------------
# Step 1: Load environment variables
# -------------------------------
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "✅ Loaded environment variables from .env"
else
    echo "❌ .env file not found. Please create one with NEXT_PUBLIC_DOMAIN_URL"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_DOMAIN_URL" ]; then
    echo "❌ NEXT_PUBLIC_DOMAIN_URL not found in .env file"
    exit 1
fi

DOMAIN=$(echo $NEXT_PUBLIC_DOMAIN_URL | sed 's|^https\?://||' | sed 's|:[0-9]*$||')
echo "🌐 Using domain: $DOMAIN"

# -------------------------------
# Step 2.5: Replace localhost URLs with domain in .env file
# -------------------------------
echo "🔄 Updating .env file with domain URLs..."
sed -i.bak "s|http://localhost:4050|$NEXT_PUBLIC_DOMAIN_URL|g" .env
sed -i.bak "s|http://localhost:9000|$NEXT_PUBLIC_DOMAIN_URL|g" .env
sed -i.bak "s|http://localhost:3000|$NEXT_PUBLIC_DOMAIN_URL|g" .env
echo "✅ Updated .env file with domain URLs"

# -------------------------------
# Step 2: Detect environment (local vs cloud)
# -------------------------------
echo "🔍 Detecting environment..."
if curl -s --connect-timeout 1 http://169.254.169.254/ >/dev/null 2>&1; then
    ENVIRONMENT_TYPE="cloud"
    echo "☁️ Environment: Cloud Platform"
    echo "ℹ️ Cloud environment detected - nginx setup will be skipped"
    echo "✅ Cloud setup complete (no nginx configuration needed)"
    exit 0
else
    ENVIRONMENT_TYPE="local"
    echo "🏠 Environment: Local"
fi

# -------------------------------
# Step 3: Detect OS
# -------------------------------
OS_TYPE="$(uname -s)"
echo "💻 Detected OS: $OS_TYPE"

# Default values
HOST_ENTRY="127.0.0.1 $DOMAIN"

# -------------------------------
# Step 4: Add domain entry to hosts file
# -------------------------------
echo "🌐 Adding host entry for $DOMAIN..."

if [[ "$OS_TYPE" == "Linux" ]]; then
    HOSTS_FILE="/etc/hosts"
elif [[ "$OS_TYPE" == "Darwin" ]]; then
    HOSTS_FILE="/etc/hosts"
elif [[ "$OS_TYPE" =~ MINGW|MSYS|CYGWIN ]]; then
    # Windows (Git Bash, MSYS, or WSL)
    HOSTS_FILE="/c/Windows/System32/drivers/etc/hosts"
else
    echo "⚠️ Unsupported OS: $OS_TYPE"
    exit 1
fi

# Check if domain already exists
if grep -qE "^[^#]*\b$DOMAIN\b" "$HOSTS_FILE"; then
    echo "✅ Host entry for '$DOMAIN' already exists in $HOSTS_FILE"
else
    echo "📝 Adding host entry to $HOSTS_FILE..."
    if [[ "$OS_TYPE" =~ MINGW|MSYS|CYGWIN ]]; then
        # Windows needs admin rights; use PowerShell if possible
        powershell.exe -Command "Start-Process cmd -Verb runAs -ArgumentList '/c echo $HOST_ENTRY >> C:\\Windows\\System32\\drivers\\etc\\hosts'" || {
            echo "⚠️ Failed to auto-edit hosts file. Please manually add this line:"
            echo "   $HOST_ENTRY"
        }
    else
        # Linux or macOS
        if echo "$HOST_ENTRY" | sudo tee -a "$HOSTS_FILE" >/dev/null; then
            echo "✅ Added $HOST_ENTRY to $HOSTS_FILE"
        else
            echo "❌ Failed to add host entry. Run this manually:"
            echo "   sudo sh -c 'echo \"$HOST_ENTRY\" >> $HOSTS_FILE'"
            exit 1
        fi
    fi
fi

# -------------------------------
# Step 5: Stop and remove existing nginx container
# -------------------------------
echo "🛑 Stopping existing nginx container..."
docker stop weam-nginx 2>/dev/null || true
docker rm weam-nginx 2>/dev/null || true

# -------------------------------
# Step 6: Build and run nginx container (local only)
# -------------------------------
if [ "$ENVIRONMENT_TYPE" = "local" ]; then
    echo "🐳 Building nginx Docker image..."
    docker build -t weam-nginx:latest ./nginx

    echo "🚀 Starting nginx container..."
    docker run -d \
        --name weam-nginx \
        --network weam_app-network \
        -p 80:80 \
        -p 443:443 \
        -e DOMAIN_NAME="$DOMAIN" \
        weam-nginx:latest

    echo "✅ Local nginx setup completed successfully!"
fi

echo "🎉 Setup Finished!"


