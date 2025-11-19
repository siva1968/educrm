# Multi-stage Dockerfile for Phase 3 Services
# Base image optimized for Node.js microservices

FROM node:18-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Create app directory
WORKDIR /app

# Install PM2 globally for process management
RUN npm install -g pm2

# Copy package files
COPY package*.json ./

# ============================================
# Development Stage
# ============================================
FROM base AS development

# Install all dependencies including devDependencies
RUN npm ci

# Copy application code
COPY . .

# Create logs and storage directories
RUN mkdir -p logs storage/reports storage/temp storage/models

# Expose all service ports
EXPOSE 3010 3012 3013 3014 3015

# Use PM2 in development mode
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "development"]

# ============================================
# Production Stage
# ============================================
FROM base AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Install only production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs and storage directories
RUN mkdir -p logs storage/reports storage/temp storage/models

# Set proper permissions
RUN chown -R node:node /app

# Use non-root user
USER node

# Expose all service ports
EXPOSE 3010 3012 3013 3014 3015

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/api/v1/bi/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use PM2 in production mode with cluster
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
