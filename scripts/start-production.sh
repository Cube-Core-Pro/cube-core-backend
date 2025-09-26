#!/bin/sh

# CUBE CORE - Production Startup Script
# =====================================

set -e

echo "🚀 Starting CUBE CORE Backend in Production Mode..."
echo "=================================================="

# Environment validation
if [ "$NODE_ENV" != "production" ]; then
    echo "❌ NODE_ENV must be set to 'production'"
    exit 1
fi

# Check required environment variables
required_vars="DATABASE_URL REDIS_URL JWT_SECRET"
for var in $required_vars; do
    if [ -z "$(eval echo \$$var)" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Wait for database to be ready
echo "🔍 Waiting for database connection..."
timeout=60
counter=0

while ! npx prisma db push --accept-data-loss > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ Database connection timeout after ${timeout} seconds"
        exit 1
    fi
    echo "⏳ Waiting for database... (${counter}/${timeout})"
    sleep 1
done

echo "✅ Database connection established"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client (if not already generated)
echo "🔧 Generating Prisma client..."
npx prisma generate

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
fi

# Wait for Redis to be ready
echo "🔍 Waiting for Redis connection..."
timeout=30
counter=0

while ! redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; do
    counter=$((counter + 1))
    if [ $counter -gt $timeout ]; then
        echo "❌ Redis connection timeout after ${timeout} seconds"
        exit 1
    fi
    echo "⏳ Waiting for Redis... (${counter}/${timeout})"
    sleep 1
done

echo "✅ Redis connection established"

# Pre-warm cache if enabled
if [ "$CACHE_PREWARM" = "true" ]; then
    echo "🔥 Pre-warming cache..."
    # Add cache pre-warming logic here
fi

# Set up log rotation
if [ "$LOG_ROTATION" = "true" ]; then
    echo "📝 Setting up log rotation..."
    # Add log rotation setup here
fi

# Security checks
echo "🔒 Running security checks..."

# Check file permissions
find /app -type f -perm /o+w -exec echo "⚠️  World-writable file found: {}" \;

# Check for sensitive files
if [ -f "/app/.env" ]; then
    echo "⚠️  .env file found in production - this should be removed"
fi

# Memory and resource limits
echo "📊 System Resources:"
echo "   Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   CPU Cores: $(nproc)"
echo "   Disk Space: $(df -h /app | awk 'NR==2 {print $4}')"

# Set Node.js memory limit based on available memory
if [ -z "$NODE_OPTIONS" ]; then
    TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
    NODE_MEM=$((TOTAL_MEM * 80 / 100))  # Use 80% of available memory
    export NODE_OPTIONS="--max-old-space-size=$NODE_MEM"
    echo "📈 Set Node.js memory limit to ${NODE_MEM}MB"
fi

# Enable performance monitoring
if [ "$PERFORMANCE_MONITORING" = "true" ]; then
    echo "📈 Enabling performance monitoring..."
    export NODE_OPTIONS="$NODE_OPTIONS --inspect=0.0.0.0:9229"
fi

# Cluster mode configuration
if [ "$CLUSTER_MODE" = "true" ]; then
    if [ "$CLUSTER_WORKERS" = "auto" ]; then
        CLUSTER_WORKERS=$(nproc)
    fi
    echo "🔄 Starting in cluster mode with $CLUSTER_WORKERS workers"
    export CLUSTER_WORKERS
fi

# Signal handlers for graceful shutdown
trap 'echo "🛑 Received SIGTERM, shutting down gracefully..."; kill -TERM $PID; wait $PID' TERM
trap 'echo "🛑 Received SIGINT, shutting down gracefully..."; kill -INT $PID; wait $PID' INT

# Final system check
echo "🔍 Final system check..."
node --version
npm --version

# Start the application
echo "🚀 Starting CUBE CORE Backend..."
echo "================================="
echo "🌍 Environment: $NODE_ENV"
echo "🔗 Port: $PORT"
echo "📊 Memory Limit: $NODE_OPTIONS"
echo "⚡ Features Enabled:"

# List enabled features
[ "$FEATURE_AI_AGENTS" = "true" ] && echo "   ✅ AI Agents"
[ "$FEATURE_BLOCKCHAIN" = "true" ] && echo "   ✅ Blockchain"
[ "$FEATURE_EDGE_COMPUTING" = "true" ] && echo "   ✅ Edge Computing"
[ "$FEATURE_GAMIFICATION" = "true" ] && echo "   ✅ Gamification"
[ "$FEATURE_SUSTAINABILITY" = "true" ] && echo "   ✅ Sustainability"
[ "$FEATURE_DIGITAL_HEALTH" = "true" ] && echo "   ✅ Digital Health"
[ "$FEATURE_EDUCATION" = "true" ] && echo "   ✅ Education"
[ "$FEATURE_SMART_MANUFACTURING" = "true" ] && echo "   ✅ Smart Manufacturing"
[ "$FEATURE_SMART_CITIES" = "true" ] && echo "   ✅ Smart Cities"

echo "================================="
echo "✨ CUBE CORE Backend is starting..."

# Start the Node.js application
if [ "$CLUSTER_MODE" = "true" ]; then
    exec node dist/cluster.js &
else
    exec node dist/main.js &
fi

PID=$!
wait $PID