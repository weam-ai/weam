#!/bin/bash
# 🧰 Windows-Compatible Build Script for Dockerized Frontend (Next.js) and Base Python Image

# 🔧 Domain config (user-adjustable)
CUSTOM_DOMAIN_URL="https://weam.local"

# Only perform .env replacements on local machines (skip on cloud)
if ! curl -s --connect-timeout 1 http://169.254.169.254/ >/dev/null 2>&1; then
  TARGET_DOMAIN_URL="$CUSTOM_DOMAIN_URL"
  if [ -f .env ]; then
    ENV_DOMAIN="$(grep -E '^NEXT_PUBLIC_DOMAIN_URL=' .env | sed 's/^NEXT_PUBLIC_DOMAIN_URL=//')"
    if [ -n "$ENV_DOMAIN" ] && echo "$ENV_DOMAIN" | grep -vq "localhost"; then
      TARGET_DOMAIN_URL="$ENV_DOMAIN"
    fi

    echo "🔄 Updating .env URLs to $TARGET_DOMAIN_URL (excluding NEXT_PUBLIC_MCP_REDIRECT_URL) ..."
    sed -i.bak "/^NEXT_PUBLIC_MCP_REDIRECT_URL=/! s|http://localhost:4050|$TARGET_DOMAIN_URL|g" .env
    sed -i.bak "/^NEXT_PUBLIC_MCP_REDIRECT_URL=/! s|http://localhost:9000|$TARGET_DOMAIN_URL|g" .env
    sed -i.bak "/^NEXT_PUBLIC_MCP_REDIRECT_URL=/! s|http://localhost:3000|$TARGET_DOMAIN_URL|g" .env
    echo "✅ .env updated for domain ($TARGET_DOMAIN_URL)"
  fi
fi

echo "🔍 Step 0: Detecting OS and environment..."
echo "✅ OS Detected: Windows (Git Bash / WSL / MSYS)"

# Re-enable strict mode
set -e

# Step 2: Load environment variables
echo "📄 Step 1/3: Loading environment variables from .env..."
if [ ! -f .env ]; then
  echo "❌ .env file not found in project root!"
  exit 1
fi

set -a
source .env
set +a
echo "✅ Environment variables loaded."

# Step 3: Determine target stage
echo "🛠️ Step 2/3: Determining build target..."
TARGET="production"
[ "$NEXT_PUBLIC_APP_ENVIRONMENT" == "development" ] && TARGET="development"
echo "✅ Target selected: $TARGET (based on NEXT_PUBLIC_APP_ENVIRONMENT=$NEXT_PUBLIC_APP_ENVIRONMENT)"

# Step 4: Build frontend image
echo "🚀 Step 3/3: Building Docker image for Next.js frontend (weamai-app)..."

BUILD_ARGS=$(grep -v '^#' .env | sed '/^\s*$/d' | awk -F= '{print "--build-arg " $1}' | xargs)

docker build $BUILD_ARGS \
  --target=$TARGET \
  -f ./nextjs/Dockerfile \
  -t weamai-app:latest \
  ./nextjs --no-cache || { echo "❌ Docker build failed"; exit 1; }

echo "🎉 Build complete: weamai-app:latest"