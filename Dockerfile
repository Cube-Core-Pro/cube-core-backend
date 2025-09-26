# CUBE CORE - Production Dockerfile
# Multi-stage build for optimal performance and security

# ============================================================================
# Stage 1: Base Image with Dependencies
# ============================================================================
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cube-core -u 1001 -G nodejs

# ============================================================================
# Stage 2: Dependencies Installation
# ============================================================================
FROM base AS deps

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# ============================================================================
# Stage 3: Build Stage
# ============================================================================
FROM base AS builder

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY src ./src/

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build && \
    npm prune --production

# ============================================================================
# Stage 4: Python Dependencies (for AI/ML features)
# ============================================================================
FROM python:3.11-alpine AS python-deps

# Install Python dependencies
COPY python/requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# ============================================================================
# Stage 5: Production Image
# ============================================================================
FROM base AS production

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV NPM_CONFIG_LOGLEVEL=warn

# Install production system dependencies
RUN apk add --no-cache \
    tini \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy Python runtime and dependencies
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy node_modules from deps stage
COPY --from=deps --chown=cube-core:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=cube-core:nodejs /app/prisma ./prisma

# Copy built application from builder stage
COPY --from=builder --chown=cube-core:nodejs /app/dist ./dist
COPY --from=builder --chown=cube-core:nodejs /app/package*.json ./

# Copy Python scripts
COPY --chown=cube-core:nodejs python ./python/

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp /app/certs && \
    chown -R cube-core:nodejs /app/logs /app/uploads /app/temp /app/certs

# Copy startup script
COPY --chown=cube-core:nodejs scripts/start-production.sh ./
RUN chmod +x start-production.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Security: Use non-root user
USER cube-core

# Expose port
EXPOSE 3000

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start application
CMD ["./start-production.sh"]

# ============================================================================
# Metadata
# ============================================================================
LABEL maintainer="CUBE CORE Team <support@cube-core.com>"
LABEL version="1.0.0"
LABEL description="CUBE CORE - Enterprise Business Platform Backend"
LABEL org.opencontainers.image.title="CUBE CORE Backend"
LABEL org.opencontainers.image.description="Enterprise Business Platform with AI, Blockchain, IoT, and more"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="CUBE CORE"
LABEL org.opencontainers.image.licenses="Proprietary"
LABEL org.opencontainers.image.source="https://github.com/cube-core/backend"