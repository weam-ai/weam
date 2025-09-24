#!/bin/bash
# 🚀 Performance Monitoring and Optimization Script

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

# Function to check Docker performance
check_docker_performance() {
    log "🐳 Checking Docker performance..."
    
    if command -v docker &> /dev/null; then
        # Check Docker system info
        log "Docker System Information:"
        docker system info --format "table {{.ServerVersion}}\t{{.OperatingSystem}}\t{{.Architecture}}\t{{.CPUs}}\t{{.TotalMemory}}"
        
        # Check running containers
        log "Running Containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Size}}"
        
        # Check resource usage
        log "Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
        
        # Check disk usage
        log "Docker Disk Usage:"
        docker system df
    else
        warning "Docker not found"
    fi
}

# Function to check system performance
check_system_performance() {
    log "💻 Checking system performance..."
    
    # Check CPU usage
    if command -v top &> /dev/null; then
        log "CPU Usage:"
        top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1 "%"}'
    fi
    
    # Check memory usage
    if command -v free &> /dev/null; then
        log "Memory Usage:"
        free -h
    fi
    
    # Check disk usage
    if command -v df &> /dev/null; then
        log "Disk Usage:"
        df -h
    fi
    
    # Check network connections
    if command -v netstat &> /dev/null; then
        log "Network Connections:"
        netstat -tuln | grep -E ":(3000|8000|6333|6379|27017)" || true
    fi
}

# Function to optimize Docker
optimize_docker() {
    log "🔧 Optimizing Docker..."
    
    if command -v docker &> /dev/null; then
        # Clean up unused resources
        log "Cleaning up unused Docker resources..."
        docker system prune -f
        
        # Clean up unused volumes
        docker volume prune -f
        
        # Clean up unused networks
        docker network prune -f
        
        # Clean up unused images
        docker image prune -f
        
        success "Docker optimization complete"
    else
        warning "Docker not found, skipping optimization"
    fi
}

# Function to check service health
check_service_health() {
    log "🏥 Checking service health..."
    
    # Check if services are running
    services=("weamai-app:3000" "pybase_docker:8000" "qdrant:6333")
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        if curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
            success "$name is healthy"
        else
            warning "$name is not responding on port $port"
        fi
    done
}

# Function to provide optimization recommendations
provide_recommendations() {
    log "💡 Performance Optimization Recommendations:"
    echo ""
    echo "1. 🚀 Use optimized Docker images and configurations"
    echo "2. 🧹 Regularly clean Docker cache and unused resources"
    echo "3. 💾 Monitor memory usage and adjust container limits"
    echo "4. 🔄 Use health checks for better service monitoring"
    echo "5. 📊 Enable logging and monitoring for production"
    echo "6. 🗂️ Use volumes for persistent data storage"
    echo "7. 🔧 Optimize database queries and indexing"
    echo "8. 📦 Use multi-stage builds to reduce image sizes"
    echo "9. 🌐 Enable compression and caching headers"
    echo "10. 🔒 Implement proper security measures"
    echo ""
}

# Function to generate performance report
generate_report() {
    log "📊 Generating performance report..."
    
    REPORT_FILE="performance-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Weam Performance Report - $(date)"
        echo "=================================="
        echo ""
        echo "System Information:"
        uname -a
        echo ""
        echo "Docker Information:"
        docker system info 2>/dev/null || echo "Docker not available"
        echo ""
        echo "Container Status:"
        docker ps -a 2>/dev/null || echo "Docker not available"
        echo ""
        echo "Resource Usage:"
        docker stats --no-stream 2>/dev/null || echo "Docker not available"
        echo ""
        echo "Disk Usage:"
        df -h
        echo ""
        echo "Memory Usage:"
        free -h
        echo ""
    } > "$REPORT_FILE"
    
    success "Performance report saved to: $REPORT_FILE"
}

# Main execution
main() {
    log "🚀 Starting performance monitoring and optimization..."
    
    check_system_performance
    check_docker_performance
    check_service_health
    optimize_docker
    generate_report
    provide_recommendations
    
    success "🎉 Performance monitoring and optimization complete!"
}

# Run main function
main "$@"
