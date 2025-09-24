#!/bin/bash
# 🚀 Build Performance Monitoring and Optimization Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to measure build time
measure_build_time() {
    local start_time=$(date +%s)
    "$@"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    echo "Build completed in ${duration} seconds"
}

# Function to check system resources
check_resources() {
    log "🔍 Checking system resources..."
    
    # Check available memory
    if command -v free &> /dev/null; then
        MEMORY=$(free -h | awk '/^Mem:/ {print $7}')
        log "Available Memory: $MEMORY"
    fi
    
    # Check CPU cores
    if command -v nproc &> /dev/null; then
        CORES=$(nproc)
        log "CPU Cores: $CORES"
    fi
    
    # Check disk space
    if command -v df &> /dev/null; then
        DISK=$(df -h . | awk 'NR==2 {print $4}')
        log "Available Disk Space: $DISK"
    fi
    
    # Check Docker resources
    if command -v docker &> /dev/null; then
        DOCKER_MEMORY=$(docker system info --format '{{.MemTotal}}' 2>/dev/null || echo "Unknown")
        DOCKER_CPUS=$(docker system info --format '{{.NCPU}}' 2>/dev/null || echo "Unknown")
        log "Docker Memory: $DOCKER_MEMORY"
        log "Docker CPUs: $DOCKER_CPUS"
    fi
}

# Function to optimize Docker build
optimize_docker_build() {
    log "🚀 Optimizing Docker build..."
    
    # Enable BuildKit
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    
    # Set build arguments for optimization
    export BUILDKIT_PROGRESS=plain
    
    # Clean up unused resources
    log "🧹 Cleaning up Docker resources..."
    docker system prune -f 2>/dev/null || true
    
    success "Docker build optimization complete"
}

# Function to run build with monitoring
run_optimized_build() {
    log "🏗️ Starting optimized build process..."
    
    # Check if optimized build script exists
    if [ -f "build-optimized.sh" ]; then
        log "Using optimized build script..."
        measure_build_time ./build-optimized.sh
    elif [ -f "winbuild-optimized.sh" ]; then
        log "Using Windows optimized build script..."
        measure_build_time ./winbuild-optimized.sh
    else
        warning "Optimized build script not found, using standard build..."
        if [ -f "build.sh" ]; then
            measure_build_time ./build.sh
        elif [ -f "winbuild.sh" ]; then
            measure_build_time ./winbuild.sh
        else
            error "No build script found!"
            exit 1
        fi
    fi
}

# Function to analyze build performance
analyze_performance() {
    log "📊 Analyzing build performance..."
    
    # Show Docker images
    log "Built Docker images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | head -10
    
    # Show disk usage
    log "Docker disk usage:"
    docker system df 2>/dev/null || true
    
    # Show build cache usage
    log "Build cache usage:"
    docker builder du 2>/dev/null || true
}

# Function to provide optimization recommendations
provide_recommendations() {
    log "💡 Optimization Recommendations:"
    echo ""
    echo "1. 🚀 Use optimized build scripts for faster builds"
    echo "2. 🧹 Regularly clean Docker cache: docker system prune -a"
    echo "3. 💾 Increase Docker memory allocation in Docker Desktop"
    echo "4. 🔄 Use multi-stage builds to reduce image sizes"
    echo "5. 📦 Enable BuildKit for better caching and parallel builds"
    echo "6. 🗂️ Use .dockerignore to exclude unnecessary files"
    echo "7. 🔧 Consider using Docker Compose for multi-service builds"
    echo "8. 📊 Monitor build times and optimize slow stages"
    echo ""
}

# Main execution
main() {
    log "🚀 Starting build performance optimization..."
    
    check_resources
    optimize_docker_build
    run_optimized_build
    analyze_performance
    provide_recommendations
    
    success "🎉 Build performance optimization complete!"
}

# Run main function
main "$@"
