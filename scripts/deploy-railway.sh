#!/bin/bash
# path: backend/scripts/deploy-railway.sh
# purpose: Deployment script for Railway with health checks and rollback capability
# dependencies: railway-cli, docker, prisma

set -e

echo "🚀 Starting CUBE CORE deployment to Railway..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cube-core"
SERVICE_NAME="backend"
HEALTH_CHECK_URL="/api/health"
MAX_RETRIES=30
RETRY_INTERVAL=10

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm not found. Please install it first."
        exit 1
    fi
    
    log_info "Prerequisites check passed ✅"
}

build_application() {
    log_info "Building application..."
    
    # Install dependencies
    npm ci --only=production
    
    # Run type checking
    npm run typecheck
    
    # Run linting
    npm run lint
    
    # Run tests
    npm run test
    
    # Build application
    npm run build
    
    log_info "Application built successfully ✅"
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma db push
    
    # Run seeding script
    npx ts-node scripts/migrate-and-seed.ts
    
    log_info "Database migrations completed ✅"
}

deploy_to_railway() {
    log_info "Deploying to Railway..."
    
    # Login to Railway (if not already logged in)
    railway login
    
    # Link to project
    railway link $PROJECT_NAME
    
    # Deploy
    railway up --service $SERVICE_NAME
    
    log_info "Deployment initiated ✅"
}

wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if railway status --service $SERVICE_NAME | grep -q "RUNNING"; then
            log_info "Service is running ✅"
            return 0
        fi
        
        log_warn "Service not ready yet, waiting ${RETRY_INTERVAL}s... (${retries}/${MAX_RETRIES})"
        sleep $RETRY_INTERVAL
        retries=$((retries + 1))
    done
    
    log_error "Deployment failed to become ready within timeout"
    return 1
}

health_check() {
    log_info "Performing health check..."
    
    # Get service URL
    SERVICE_URL=$(railway domain --service $SERVICE_NAME)
    
    if [ -z "$SERVICE_URL" ]; then
        log_error "Could not get service URL"
        return 1
    fi
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s "${SERVICE_URL}${HEALTH_CHECK_URL}" > /dev/null; then
            log_info "Health check passed ✅"
            return 0
        fi
        
        log_warn "Health check failed, retrying in ${RETRY_INTERVAL}s... (${retries}/${MAX_RETRIES})"
        sleep $RETRY_INTERVAL
        retries=$((retries + 1))
    done
    
    log_error "Health check failed after $MAX_RETRIES attempts"
    return 1
}

smoke_tests() {
    log_info "Running smoke tests..."
    
    SERVICE_URL=$(railway domain --service $SERVICE_NAME)
    
    # Test API endpoints
    endpoints=(
        "/api/health"
        "/api/health/detailed"
        "/api/metrics"
        "/api/docs"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "${SERVICE_URL}${endpoint}" > /dev/null; then
            log_info "✅ ${endpoint} - OK"
        else
            log_error "❌ ${endpoint} - FAILED"
            return 1
        fi
    done
    
    log_info "Smoke tests passed ✅"
}

rollback() {
    log_error "Deployment failed, initiating rollback..."
    
    # Get previous deployment
    PREVIOUS_DEPLOYMENT=$(railway deployments --service $SERVICE_NAME --limit 2 --json | jq -r '.[1].id')
    
    if [ "$PREVIOUS_DEPLOYMENT" != "null" ] && [ -n "$PREVIOUS_DEPLOYMENT" ]; then
        log_info "Rolling back to deployment: $PREVIOUS_DEPLOYMENT"
        railway rollback $PREVIOUS_DEPLOYMENT --service $SERVICE_NAME
        
        # Wait for rollback to complete
        wait_for_deployment
        
        # Verify rollback
        if health_check; then
            log_info "Rollback completed successfully ✅"
        else
            log_error "Rollback failed ❌"
            exit 1
        fi
    else
        log_error "No previous deployment found for rollback"
        exit 1
    fi
}

cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup tasks here
    log_info "Cleanup completed ✅"
}

# Main deployment flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    build_application
    run_migrations
    deploy_to_railway
    
    if wait_for_deployment && health_check && smoke_tests; then
        log_info "🎉 Deployment completed successfully!"
        log_info "🌐 Service URL: $(railway domain --service $SERVICE_NAME)"
        
        # Display deployment info
        echo ""
        echo "📊 Deployment Summary:"
        echo "====================="
        railway status --service $SERVICE_NAME
        
        exit 0
    else
        rollback
        exit 1
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health-check")
        health_check
        ;;
    "smoke-tests")
        smoke_tests
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health-check|smoke-tests]"
        exit 1
        ;;
esac