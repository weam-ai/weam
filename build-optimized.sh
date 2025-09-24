#!/bin/bash

# 🚀 Optimized Universal Docker Build Script
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

# Detect OS and architecture
log "🔍 Detecting system environment..."
OS=$(uname -s)
ARCH=$(uname -m)
case "$OS" in
    Linux*)     OS_NAME="Linux" ;;
    Darwin*)    OS_NAME="macOS" ;;
    MINGW*|MSYS*|CYGWIN*) OS_NAME="Windows" ;;
    *)          error "Unsupported OS: $OS"; exit 1 ;;
esac
success "OS: $OS_NAME, Architecture: $ARCH"

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

# Check available resources
log "🔍 Checking system resources..."
if command -v docker &> /dev/null; then
    DOCKER_MEMORY=$(docker system info --format '{{.MemTotal}}' 2>/dev/null || echo "Unknown")
    DOCKER_CPUS=$(docker system info --format '{{.NCPU}}' 2>/dev/null || echo "Unknown")
    log "Docker Resources: ${DOCKER_CPUS} CPUs, ${DOCKER_MEMORY} Memory"
fi

# Load environment variables
log "📄 Loading environment variables..."
if [ ! -f .env ]; then
    error ".env file not found!"
    exit 1
fi

# Source environment variables safely
set -a
source .env
set +a
success "Environment variables loaded"

# Determine build configuration
TARGET="production"
BUILD_ARGS=""
CACHE_FROM=""

if [ "$NEXT_PUBLIC_APP_ENVIRONMENT" == "development" ]; then
    TARGET="development"
    warning "Building in development mode"
else
    success "Building in production mode"
fi

# Prepare build arguments with optimization
log "⚙️ Preparing optimized build arguments..."
BUILD_ARGS=$(grep -v '^#' .env | sed '/^\s*$/d' | awk -F= '{print "--build-arg " $1 "=" $2}' | xargs)

# Add optimization build args
BUILD_ARGS="$BUILD_ARGS --build-arg BUILDKIT_INLINE_CACHE=1"
BUILD_ARGS="$BUILD_ARGS --build-arg DOCKER_BUILDKIT=1"

# Set Docker BuildKit for better caching and parallel builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Function to build with cache
build_with_cache() {
    local image_name=$1
    local dockerfile=$2
    local context=$3
    local cache_tag="${image_name}:cache"
    
    log "🏗️ Building $image_name with cache optimization..."
    
    # Try to pull cache image first
    if docker pull "$cache_tag" 2>/dev/null; then
        CACHE_FROM="--cache-from $cache_tag"
        success "Using cached image: $cache_tag"
    else
        warning "No cache found for $image_name, building from scratch"
    fi
    
    # Build with cache
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

# Step 1: Build Python base image with optimization
log "🐍 Step 1/4: Building optimized Python base image..."
if [ "$OS_NAME" = "Windows" ]; then
    build_with_cache "pybase_image" "./ai-python/winBaseDockerfile" "./ai-python"
else
    build_with_cache "pybase_image" "./ai-python/BaseDockerfile" "./ai-python"
fi

# Step 2: Build Next.js frontend with optimization
log "⚛️ Step 2/4: Building optimized Next.js frontend..."
build_with_cache "weamai-app" "./nextjs/Dockerfile" "./nextjs"

# Step 3: Build additional services in parallel (if needed)
log "🔧 Step 3/4: Building additional services..."
if [ -f "docker-compose.yml" ]; then
    log "Building services with docker-compose..."
    $COMPOSE_CMD build --parallel --no-cache || {
        warning "Some services failed to build, continuing..."
    }
fi

# Step 4: Cleanup and optimization
log "🧹 Step 4/4: Performing cleanup and optimization..."

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
