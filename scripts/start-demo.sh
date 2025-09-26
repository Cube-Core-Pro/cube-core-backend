#!/bin/bash

# CUBE CORE Backend - Demo Startup Script

set -e

echo "🚀 Starting CUBE CORE Backend Demo Environment"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is not supported. Please install Node.js >= $REQUIRED_VERSION"
    exit 1
fi
print_success "Node.js version $NODE_VERSION ✅"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed ✅"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating demo environment file..."
    cat > .env << EOF
# CUBE CORE Backend - Demo Environment Configuration

# Database
DATABASE_URL="postgresql://cube_user:cube_password@localhost:5432/cube_core_demo?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="cube-core-demo-jwt-secret-key-2024-very-secure"
JWT_EXPIRES_IN="24h"

# Encryption
WEBMAIL_ENCRYPTION_KEY="cube-core-webmail-encryption-key-2024"

# SMTP (Demo - configure with real SMTP for production)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="demo@cube-core.com"
SMTP_PASS="demo-password"

# AI Services (Optional - configure for AI features)
OPENAI_API_KEY="your-openai-api-key-here"

# Application
NODE_ENV="development"
PORT="3000"
APP_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# Security
BCRYPT_ROUNDS="12"
RATE_LIMIT_TTL="60"
RATE_LIMIT_LIMIT="100"
HELMET_ENABLED="true"

# Features
WEBMAIL_ENABLED="true"
AI_ENABLED="true"
ANALYTICS_ENABLED="true"

# Logging
LOG_LEVEL="info"
EOF
    print_success "Demo .env file created ✅"
    print_warning "Please update the .env file with your actual configuration"
fi

# Check if database is running
print_status "Checking database connection..."
if ! npx prisma db pull > /dev/null 2>&1; then
    print_warning "Database not accessible. Please ensure PostgreSQL is running."
    print_status "You can start PostgreSQL with Docker:"
    echo "  docker run --name cube-postgres -e POSTGRES_PASSWORD=cube_password -e POSTGRES_USER=cube_user -e POSTGRES_DB=cube_core_demo -p 5432:5432 -d postgres:16"
    echo ""
    read -p "Press Enter when database is ready, or Ctrl+C to exit..."
fi

# Check if Redis is running
print_status "Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    print_warning "Redis not accessible. Please ensure Redis is running."
    print_status "You can start Redis with Docker:"
    echo "  docker run --name cube-redis -p 6379:6379 -d redis:7-alpine"
    echo ""
    read -p "Press Enter when Redis is ready, or Ctrl+C to exit..."
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npm run prisma:generate
print_success "Prisma client generated ✅"

# Run database migrations
print_status "Running database migrations..."
npm run prisma:deploy
print_success "Database migrations completed ✅"

# Seed test users
print_status "Seeding test users and data..."
npm run seed:test-users
print_success "Test data seeded ✅"

# Build the application
print_status "Building application..."
npm run build
print_success "Application built ✅"

# Start the application
print_status "Starting CUBE CORE Backend..."
echo ""
print_success "🎉 CUBE CORE Backend Demo is starting!"
echo ""
echo "📊 Demo Information:"
echo "   🌐 API URL: http://localhost:3000"
echo "   📚 API Docs: http://localhost:3000/api/docs"
echo "   🔍 Health Check: http://localhost:3000/api/v1/health"
echo "   📧 Webmail API: http://localhost:3000/api/v1/webmail"
echo ""
echo "👥 Test User Credentials:"
echo "   📧 admin@cube-core.com | 🔑 CubeCore2024! | 👑 SUPERADMIN"
echo "   📧 ceo@cube-core.com | 🔑 CubeCore2024! | 👑 ADMIN"
echo "   📧 sales@cube-core.com | 🔑 CubeCore2024! | 👤 USER"
echo "   📧 support@cube-core.com | 🔑 CubeCore2024! | 👤 USER"
echo ""
echo "🔧 Webmail Features Available:"
echo "   ✅ Enterprise-grade security"
echo "   ✅ Multi-tenant isolation"
echo "   ✅ AI-powered spam detection"
echo "   ✅ Real-time notifications"
echo "   ✅ Advanced search & filtering"
echo "   ✅ Email templates & automation"
echo "   ✅ Analytics & tracking"
echo "   ✅ Secure IMAP/SMTP integration"
echo ""
echo "🚀 Starting server..."
echo "   Press Ctrl+C to stop"
echo ""

# Start the development server
npm run start:dev