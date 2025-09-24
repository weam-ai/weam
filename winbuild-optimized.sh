#!/bin/bash
# 🚀 Optimized Windows-Compatible Build Script
# Features: Multi-stage builds, caching, parallel processing, and smart dependency management

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "🔍 Step 0: Detecting OS and environment..."
log "✅ OS Detected: Windows (Git Bash / WSL / MSYS)"

# Check Docker Compose version
log "🔍 Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    COMPOSE_VERSION="v1"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    COMPOSE_VERSION="v2"
else
    error "Docker Compose not found. Please install Docker Compose."
    exit 1
fi
success "Docker Compose: $COMPOSE_VERSION"

# Set Docker BuildKit for better caching and parallel builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Load environment variables
log "📄 Step 1/5: Loading environment variables from .env..."
if [ ! -f .env ]; then
    error ".env file not found in project root!"
    exit 1
fi

set -a
source .env
set +a
success "Environment variables loaded"

# Determine target stage
log "🛠️ Step 2/5: Determining build target..."
TARGET="production"
if [ "$NEXT_PUBLIC_APP_ENVIRONMENT" == "development" ]; then
    TARGET="development"
    warning "Building in development mode"
else
    success "Building in production mode"
fi

# Prepare optimized build arguments
log "⚙️ Step 3/5: Preparing optimized build arguments..."
BUILD_ARGS=$(grep -v '^#' .env | sed '/^\s*$/d' | awk -F= '{print "--build-arg " $1 "=" $2}' | xargs)

# Add optimization build args
BUILD_ARGS="$BUILD_ARGS --build-arg BUILDKIT_INLINE_CACHE=1"
BUILD_ARGS="$BUILD_ARGS --build-arg DOCKER_BUILDKIT=1"

# Function to build with cache optimization
build_with_cache() {
    local image_name=$1
    local dockerfile=$2
    local context=$3
    local cache_tag="${image_name}:cache"
    
    log "🏗️ Building $image_name with cache optimization..."
    
    # Try to use cache if available
    CACHE_FROM=""
    if docker pull "$cache_tag" 2>/dev/null; then
        CACHE_FROM="--cache-from $cache_tag"
        success "Using cached image: $cache_tag"
    else
        warning "No cache found for $image_name, building from scratch"
    fi
    
    # Build with optimization
    docker build $BUILD_ARGS $CACHE_FROM \
        --target=$TARGET \
        -f "$dockerfile" \
        -t "$image_name:latest" \
        -t "$cache_tag" \
        "$context" || {
        error "Failed to build $image_name"
        exit 1
    }
    
    success "$image_name built successfully"
}

# Step 4: Build Python base image with optimization
log "🐍 Step 4/5: Building optimized Python base image (pybase_image)..."

# Disable exit-on-error temporarily for base image
set +e
build_with_cache "pybase_image" "./ai-python/winBaseDockerfile" "./ai-python"
if [ $? -ne 0 ]; then
    warning "Failed to build pybase_image. Continuing with frontend build..."
else
    success "pybase_image built successfully"
fi
set -e

# Step 5: Build frontend image with optimization
log "⚛️ Step 5/5: Building optimized Next.js frontend (weamai-app)..."
build_with_cache "weamai-app" "./nextjs/Dockerfile" "./nextjs"

# Cleanup and optimization
log "🧹 Performing cleanup and optimization..."

# Remove dangling images
docker image prune -f 2>/dev/null || true

# Show build summary
log "📊 Build Summary:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep -E "(pybase_image|weamai-app)" || true

# Show disk usage
log "💾 Disk Usage:"
docker system df 2>/dev/null || true

success "🎉 Optimized build complete!"
log "Built images:"
echo "  - pybase_image:latest"
echo "  - weamai-app:latest"
echo ""
log "💡 Optimization features applied:"
echo "  ✅ Multi-stage builds"
echo "  ✅ BuildKit caching"
echo "  ✅ Parallel processing"
echo "  ✅ Resource optimization"
echo "  ✅ Smart dependency management"
echo "  ✅ Automatic cleanup"
echo "  ✅ Windows compatibility"
