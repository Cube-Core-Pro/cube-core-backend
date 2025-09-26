#!/bin/bash

# CUBE CORE Backend Quick Start Script
# This script quickly starts the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

echo "⚡ CUBE CORE Backend Quick Start"
echo "==============================="

# Quick health checks
print_step "Running quick health checks..."

# Check Node.js
if ! command_exists node; then
    print_error "Node.js not found. Please run the full setup script first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Dependencies not installed. Installing now..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please run the full setup script first."
    exit 1
fi

# Check if build exists
if [ ! -d "dist" ]; then
    print_step "Building application..."
    npm run build
fi

# Check PostgreSQL
print_step "Checking PostgreSQL..."
if command_exists psql && pg_isready -q 2>/dev/null; then
    print_status "PostgreSQL is running"
else
    print_warning "PostgreSQL is not running. Starting with Docker..."
    if command_exists docker; then
        docker run -d --name cubecore-postgres \
            -e POSTGRES_DB=cubecore_dev \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=password \
            -p 5432:5432 \
            postgres:16-alpine
        sleep 5
        print_status "PostgreSQL started with Docker"
    else
        print_error "PostgreSQL is not running and Docker is not available."
        print_error "Please start PostgreSQL manually or install Docker."
        exit 1
    fi
fi

# Check Redis
print_step "Checking Redis..."
if command_exists redis-cli && redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is running"
else
    print_warning "Redis is not running. Starting with Docker..."
    if command_exists docker; then
        docker run -d --name cubecore-redis \
            -p 6379:6379 \
            redis:7-alpine
        sleep 3
        print_status "Redis started with Docker"
    else
        print_error "Redis is not running and Docker is not available."
        print_error "Please start Redis manually or install Docker."
        exit 1
    fi
fi

# Run migrations if needed
print_step "Checking database migrations..."
if npm run prisma:migrate > /dev/null 2>&1; then
    print_status "Database migrations up to date"
else
    print_warning "Running database migrations..."
    npm run prisma:migrate
fi

# Check port availability
if port_in_use 3000; then
    print_warning "Port 3000 is in use. Trying to stop existing process..."
    pkill -f "node.*3000" || true
    sleep 2
fi

print_header "🚀 Starting CUBE CORE Backend..."

# Start the development server
print_step "Starting development server on port 3000..."

# Set environment for quick start
export NODE_ENV=development
export LOG_LEVEL=info

# Start with concurrency for better development experience
if command_exists concurrently; then
    # Start multiple services concurrently
    npx concurrently \
        --names "API,QUEUE,MONITOR" \
        --prefix-colors "green,yellow,blue" \
        "npm run start:dev" \
        "npm run queue:dev" \
        "npm run monitoring:start"
else
    # Just start the main server
    npm run start:dev
fi