#!/bin/bash

# CUBE CORE Backend Development Setup Script
# This script sets up the development environment for the CUBE CORE backend

set -e

echo "🚀 CUBE CORE Backend Development Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
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

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to generate secure random string
generate_secret() {
    openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

# System requirements check
print_header "🔍 System Requirements Check"
print_step "Checking system requirements..."

# Check operating system
OS=$(uname -s)
print_status "Operating System: $OS"

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js version: $(node --version)"

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

print_success "npm version: $(npm --version)"

# Check for optional tools
if command_exists docker; then
    print_success "Docker found: $(docker --version | head -n1)"
else
    print_warning "Docker not found. Docker is recommended for development."
fi

if command_exists git; then
    print_success "Git found: $(git --version)"
else
    print_warning "Git not found. Git is recommended for version control."
fi

# Port availability check
print_step "Checking port availability..."
if port_in_use 3000; then
    print_warning "Port 3000 is already in use. You may need to stop the running service or change the port."
else
    print_success "Port 3000 is available"
fi

if port_in_use 5432; then
    print_status "Port 5432 is in use (likely PostgreSQL)"
else
    print_warning "Port 5432 is not in use. PostgreSQL may not be running."
fi

if port_in_use 6379; then
    print_status "Port 6379 is in use (likely Redis)"
else
    print_warning "Port 6379 is not in use. Redis may not be running."
fi

# Dependencies installation
print_header "📦 Dependencies Installation"
print_step "Installing Node.js dependencies..."

if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi

print_success "Dependencies installed successfully"

# Environment configuration
print_header "⚙️  Environment Configuration"
print_step "Setting up environment configuration..."

if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    
    # Create comprehensive .env file
    cat > .env << EOF
# Application Configuration
NODE_ENV=development
APP_NAME=CUBE CORE
APP_VERSION=1.0.0
APP_PORT=3000
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/cubecore_dev
DATABASE_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=$(generate_secret)
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=$(generate_secret)
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=$(generate_secret)

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@cubecore.com

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt

# Rate Limiting
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_API_USER_MAX=100
RATE_LIMIT_UPLOAD_MAX=50
RATE_LIMIT_EMAIL_MAX=100
RATE_LIMIT_AI_MAX=1000
RATE_LIMIT_BANKING_MAX=10

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=$(generate_secret)
CORS_ORIGIN=http://localhost:3001

# Monitoring & Logging
LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_AUDIT=true

# Cache Configuration
CACHE_DEFAULT_TTL=3600
CACHE_KEY_PREFIX=cube:cache:
CACHE_COMPRESSION_THRESHOLD=1024

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAILY=7
BACKUP_RETENTION_INCREMENTAL=3
BACKUP_STORAGE_PATH=./backups

# AI Configuration (Optional)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Banking Integration (Optional)
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENVIRONMENT=sandbox

STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Notification Services (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Webhook Configuration
WEBHOOK_SECRET=$(generate_secret)

# Development Tools
SWAGGER_ENABLED=true
DEBUG_MODE=true
ENABLE_CORS=true
HELMET_ENABLED=true
COMPRESSION_ENABLED=true
EOF

    print_success ".env file created with secure defaults"
    print_warning "Please update the .env file with your specific configuration values"
else
    print_success ".env file already exists"
fi

# Directory structure
print_header "📁 Directory Structure"
print_step "Creating required directories..."

directories=(
    "uploads"
    "uploads/temp"
    "uploads/images"
    "uploads/documents"
    "uploads/exports"
    "logs"
    "logs/app"
    "logs/error"
    "logs/audit"
    "backups"
    "backups/database"
    "backups/files"
    "temp"
    "temp/processing"
    "temp/exports"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    else
        print_status "Directory exists: $dir"
    fi
done

# Set proper permissions
chmod 755 uploads logs backups temp
chmod 644 .env

print_success "Directory structure created"

# Database setup
print_header "🗄️  Database Setup"
print_step "Checking database connection..."

# Check PostgreSQL
if command_exists psql; then
    if pg_isready -q 2>/dev/null; then
        print_success "PostgreSQL is running"
        
        # Generate Prisma client
        print_step "Generating Prisma client..."
        if npm run prisma:generate; then
            print_success "Prisma client generated"
        else
            print_error "Failed to generate Prisma client"
        fi
        
        # Run migrations
        print_step "Running database migrations..."
        if npm run prisma:migrate; then
            print_success "Database migrations completed"
        else
            print_warning "Database migrations failed. Please check your database connection."
        fi
        
        # Seed database (optional)
        if [ -f "prisma/seed.ts" ]; then
            print_step "Seeding database with initial data..."
            if npm run prisma:seed; then
                print_success "Database seeded successfully"
            else
                print_warning "Database seeding failed"
            fi
        fi
    else
        print_warning "PostgreSQL is not running. Please start PostgreSQL service."
        print_status "You can start PostgreSQL with: brew services start postgresql (macOS) or sudo systemctl start postgresql (Linux)"
    fi
else
    print_warning "PostgreSQL client not found. Please install PostgreSQL."
fi

# Redis setup
print_header "🔴 Redis Setup"
print_step "Checking Redis connection..."

if command_exists redis-cli; then
    if redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is running"
    else
        print_warning "Redis is not running. Please start Redis service."
        print_status "You can start Redis with: brew services start redis (macOS) or sudo systemctl start redis (Linux)"
    fi
else
    print_warning "Redis client not found. Please install Redis."
fi

# Build application
print_header "🔨 Application Build"
print_step "Building the application..."

if npm run build; then
    print_success "Application built successfully"
else
    print_error "Application build failed"
    exit 1
fi

# Run system check
print_header "🔍 System Verification"
print_step "Running comprehensive system check..."

if [ -f "scripts/system-check.ts" ]; then
    if npx ts-node scripts/system-check.ts; then
        print_success "System check passed"
    else
        print_warning "System check found issues. Please review and fix them."
    fi
else
    print_warning "System check script not found"
fi

# Final setup
print_header "✅ Setup Complete"
print_success "CUBE CORE Backend development environment setup completed successfully!"

echo ""
echo -e "${CYAN}📋 Next Steps:${NC}"
echo "1. 📝 Update your .env file with the correct configuration values"
echo "2. 🗄️  Ensure PostgreSQL and Redis are running"
echo "3. 🚀 Start the development server: npm run start:dev"
echo "4. 📚 Visit http://localhost:3000/api/docs for API documentation"
echo "5. ❤️  Visit http://localhost:3000/api/v1/health for health check"
echo ""

echo -e "${CYAN}🔧 Useful Commands:${NC}"
echo "• npm run start:dev          - Start development server"
echo "• npm run start:debug        - Start with debugging"
echo "• npm run test               - Run tests"
echo "• npm run prisma:studio      - Open Prisma Studio"
echo "• npm run docker:up          - Start with Docker"
echo "• npm run backup:create      - Create backup"
echo "• npm run monitoring:start   - Start monitoring"
echo ""

echo -e "${CYAN}📖 Documentation:${NC}"
echo "• API Docs: http://localhost:3000/api/docs"
echo "• Health Check: http://localhost:3000/api/v1/health"
echo "• Metrics: http://localhost:3000/api/v1/metrics"
echo ""

echo -e "${GREEN}🎉 Happy coding with CUBE CORE!${NC}"

# Optional: Start development server
read -p "Would you like to start the development server now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Starting development server..."
    npm run start:dev
fi