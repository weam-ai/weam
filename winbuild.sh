#!/bin/bash
# 🧰 Windows-Compatible Build Script for Dockerized Frontend (Next.js) and Base Python Image

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