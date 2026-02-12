#!/bin/bash

# 🔧 Domain config (user-adjustable)
CUSTOM_DOMAIN_URL="https://weam.local"

# .env ko bina source kiye NEXT_PUBLIC_DOMAIN_URL padh lo (agar hai aur localhost nahi)
# Only perform replacements on local machines (skip on cloud)
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

# 🧰 Universal Docker Build Script (Cross-Platform + Compose v1/v2 Compatible)

echo "🔍 Detecting Operating System..."
case "$(uname -s)" in
    Linux*)     OS="Linux/Ubuntu" ;;
    Darwin*)    OS="macOS" ;;
    MINGW*|MSYS*|CYGWIN*) OS="Windows (Git Bash/WSL)" ;;
    *)          echo "❌ Unsupported OS"; exit 1 ;;
esac
echo "✅ OS Detected: $OS"

echo "🔍 Checking Docker Compose version..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"  # v1
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"  # v2
else
    echo "❌ Docker Compose not found. Please install Docker Compose v1 or v2."
    exit 1
fi
echo "✅ Docker Compose Command: $COMPOSE_CMD"

# Step 1: Load .env
echo "📄 Step 1/4: Loading environment variables..."
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  exit 1
fi
set -e
set -a
source .env
set +a
echo "✅ Environment variables loaded."

# Step 2: Determine build target
echo "🛠️ Step 2/4: Determining target environment..."
TARGET="production"
[ "$NEXT_PUBLIC_APP_ENVIRONMENT" == "development" ] && TARGET="development"
echo "✅ Target selected: $TARGET"

# Step 3: Convert .env keys into --build-arg
echo "⚙️ Step 3/4: Preparing build arguments..."
BUILD_ARGS=$(grep -v '^#' .env | sed '/^\s*$/d' | awk -F= '{print "--build-arg " $1}' | xargs)
echo "✅ Build arguments prepared."

# Step 4: Build final frontend image
echo "🚀 Step 4/4: Building frontend Docker image (weamai-app)..."
docker build $BUILD_ARGS \
  --target=$TARGET \
  -f ./nextjs/Dockerfile \
  -t weamai-app:latest \
  ./nextjs --no-cache || { echo "❌ Docker build failed"; exit 1; }

echo "🎉 Build complete: weamai-app:latest"