#!/bin/bash

# WEAM Nginx Setup Script
# This script sets up nginx with SSL certificates for both local and cloud environments

set -e

echo "🚀 Starting WEAM Nginx Setup..."

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "✅ Loaded environment variables from .env"
else
    echo "❌ .env file not found. Please create one with NEXT_PUBLIC_DOMAIN_URL"
    exit 1
fi

# Extract domain from NEXT_PUBLIC_DOMAIN_URL
if [ -z "$NEXT_PUBLIC_DOMAIN_URL" ]; then
    echo "❌ NEXT_PUBLIC_DOMAIN_URL not found in .env file"
    exit 1
fi

DOMAIN=$(echo $NEXT_PUBLIC_DOMAIN_URL | sed 's|^https\?://||' | sed 's|:[0-9]*$||')
echo "🌐 Using domain: $DOMAIN"

# Environment detection
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
    
    # Add hosts entry for local environment
    HOST_ENTRY="127.0.0.1 $DOMAIN"
    HOSTS_FILE="/etc/hosts"
    
    echo "🌐 Adding host entry for $DOMAIN..."
    
    # Check if already exists
    if grep -qE "^[^#]*\b$DOMAIN\b" "$HOSTS_FILE"; then
        echo "✅ Host entry for '$DOMAIN' already exists in $HOSTS_FILE"
    else
        # Add entry (requires sudo)
        if echo "$HOST_ENTRY" | sudo tee -a "$HOSTS_FILE" >/dev/null; then
            echo "✅ Added $HOST_ENTRY to $HOSTS_FILE"
        else
            echo "❌ Failed to add host entry. Run this manually:"
            echo "   sudo sh -c 'echo \"$HOST_ENTRY\" >> $HOSTS_FILE'"
            echo "   Then run this script again."
            exit 1
        fi
    fi
fi

# Stop and remove existing nginx container if it exists
echo "🛑 Stopping existing nginx container..."
docker stop weam-nginx 2>/dev/null || true
docker rm weam-nginx 2>/dev/null || true

# Build and run nginx container for local environment
if [ "$ENVIRONMENT_TYPE" = "local" ]; then
    echo "🏠 Local environment: Using custom nginx image with self-signed certificate..."
    
    # Build nginx Docker image
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
    
    echo "✅ Local nginx setup completed!"
fi






