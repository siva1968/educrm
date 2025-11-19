# Phase 3 Setup Guide
## AI-Enabled Educational Management System

**Version**: 1.0.0
**Last Updated**: November 19, 2025
**Status**: Production Ready

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Installation Methods](#installation-methods)
4. [Database Setup](#database-setup)
5. [Configuration](#configuration)
6. [Starting Services](#starting-services)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | Runtime environment |
| PostgreSQL | 14.x or higher | Primary database |
| Redis | 7.x or higher | Caching and queues |
| npm | 9.x or higher | Package manager |

### Optional Software

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 20.x or higher | Containerization |
| Docker Compose | 2.x or higher | Multi-container orchestration |
| PM2 | 5.x or higher | Process management |
| NGINX | 1.24.x or higher | API Gateway / Load Balancer |

### System Requirements

- **RAM**: Minimum 4GB, Recommended 8GB
- **Storage**: Minimum 10GB free space
- **CPU**: Minimum 2 cores, Recommended 4 cores
- **OS**: Linux, macOS, or Windows with WSL2

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository (if not already done)
cd educrm

# 2. Copy environment file
cp backend/services/.env.example backend/services/.env

# 3. Edit environment variables
nano backend/services/.env  # Set your values

# 4. Start all services
docker-compose -f docker-compose-phase3.yml up -d

# 5. Check status
docker-compose -f docker-compose-phase3.yml ps

# 6. View logs
docker-compose -f docker-compose-phase3.yml logs -f
```

**That's it!** All services will be running on their respective ports.

---

## Installation Methods

### Method 1: Docker Compose (Production)

**Pros**: Easy deployment, isolated environment, scalable
**Cons**: Requires Docker

```bash
# Start all services
docker-compose -f docker-compose-phase3.yml up -d

# Start with API Gateway
docker-compose -f docker-compose-phase3.yml --profile gateway up -d

# Scale specific services
docker-compose -f docker-compose-phase3.yml up -d --scale ai-analytics=3

# Stop all services
docker-compose -f docker-compose-phase3.yml down

# Stop and remove volumes (WARNING: Deletes data)
docker-compose -f docker-compose-phase3.yml down -v
```

### Method 2: PM2 (Production)

**Pros**: Fine-grained control, native performance
**Cons**: Requires manual database setup

```bash
# 1. Install dependencies for all services
cd backend/services

# Install for each service
cd business-intelligence && npm install && cd ..
cd ai-analytics && npm install && cd ..
cd automated-alerts && npm install && cd ..
cd crm && npm install && cd ..
cd alumni && npm install && cd ..

# 2. Start all services with PM2
pm2 start ecosystem.config.js

# 3. View status
pm2 status

# 4. Monitor services
pm2 monit

# 5. View logs
pm2 logs

# 6. Restart specific service
pm2 restart bi-service

# 7. Stop all services
pm2 stop all

# 8. Save PM2 configuration
pm2 save

# 9. Setup PM2 to start on boot
pm2 startup
```

### Method 3: Manual (Development)

**Pros**: Full control, easy debugging
**Cons**: Manual process for each service

```bash
# Terminal 1: Business Intelligence
cd backend/services/business-intelligence
npm install
npm start

# Terminal 2: AI Analytics
cd backend/services/ai-analytics
npm install
npm start

# Terminal 3: Automated Alerts
cd backend/services/automated-alerts
npm install
npm start

# Terminal 4: CRM
cd backend/services/crm
npm install
npm start

# Terminal 5: Alumni
cd backend/services/alumni
npm install
npm start
```

---

## Database Setup

### Option 1: Automated (Docker)

If using Docker Compose, migrations run automatically on first startup.

### Option 2: Manual Setup

```bash
# 1. Create database
createdb -U postgres educrm

# Or using psql:
psql -U postgres
CREATE DATABASE educrm;
\q

# 2. Run migrations in order
cd backend/database/migrations

# Phase 3 migrations
psql -U postgres -d educrm -f 008_create_business_intelligence_schema.sql
psql -U postgres -d educrm -f 009_create_ai_analytics_schema.sql
psql -U postgres -d educrm -f 010_create_alerts_crm_alumni_schema.sql

# 3. Verify schemas
psql -U postgres -d educrm -c "\dn"

# Expected output:
# analytics | Schemas for BI and AI
# alerts    | Alert management
# crm       | CRM and lead management
# alumni    | Alumni management
```

### Verify Database Tables

```sql
-- Connect to database
psql -U postgres -d educrm

-- Check analytics schema (14 tables)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'analytics';

-- Check alerts schema (4 tables)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'alerts';

-- Check crm schema (4 tables)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'crm';

-- Check alumni schema (7 tables)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'alumni';
```

---

## Configuration

### Environment Variables

Create `.env` file in `backend/services/`:

```bash
# Copy template
cp backend/services/.env.example backend/services/.env
```

**Critical Variables to Configure**:

```bash
# Database (REQUIRED)
DB_HOST=localhost                    # or 'postgres' for Docker
DB_PORT=5432
DB_NAME=educrm
DB_USER=postgres
DB_PASSWORD=your_secure_password     # CHANGE THIS

# Redis (REQUIRED for BI Service)
REDIS_HOST=localhost                 # or 'redis' for Docker
REDIS_PORT=6379
REDIS_PASSWORD=                      # Optional

# JWT Authentication (REQUIRED)
JWT_SECRET=your_random_secret_key    # CHANGE THIS - Use strong random string
JWT_EXPIRES_IN=24h

# Service Ports (Optional - defaults shown)
BUSINESS_INTELLIGENCE_PORT=3010
AI_ANALYTICS_PORT=3012
ALERTS_PORT=3013
CRM_PORT=3014
ALUMNI_PORT=3015

# CORS (REQUIRED)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200

# Email (Optional - for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@educrm.com
```

### Generating Secrets

```bash
# Generate JWT secret (Linux/Mac)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use openssl
openssl rand -hex 64
```

---

## Starting Services

### Start All Services

```bash
# Docker Compose
docker-compose -f docker-compose-phase3.yml up -d

# PM2
pm2 start ecosystem.config.js

# Manual (requires 5+ terminals)
# See "Method 3: Manual" above
```

### Start Individual Services

```bash
# Docker Compose
docker-compose -f docker-compose-phase3.yml up -d business-intelligence

# PM2
pm2 start ecosystem.config.js --only bi-service

# Manual
cd backend/services/business-intelligence && npm start
```

### Start with API Gateway

```bash
# Docker Compose with NGINX
docker-compose -f docker-compose-phase3.yml --profile gateway up -d

# All services now available at http://localhost
```

---

## Verification

### 1. Health Checks

```bash
# Test each service health endpoint
curl http://localhost:3010/api/v1/bi/health
curl http://localhost:3012/api/v1/analytics/health
curl http://localhost:3013/api/v1/alerts/health
curl http://localhost:3014/api/v1/crm/health
curl http://localhost:3015/api/v1/alumni/health

# Expected response for each:
# {
#   "service": "Service Name",
#   "status": "Active",
#   "version": "1.0.0"
# }
```

### 2. Test Database Connection

```bash
# Using psql
psql -U postgres -d educrm -c "SELECT count(*) FROM analytics.dashboards;"

# Should return: count = 0 (or more if data exists)
```

### 3. Test Redis Connection

```bash
# Using redis-cli
redis-cli ping

# Expected: PONG
```

### 4. Test API Endpoints

```bash
# 1. Get JWT token (requires Phase 1 auth service)
# Assuming you have a user authentication endpoint

# 2. Test BI Service
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3010/api/v1/bi/dashboards

# 3. Test AI Analytics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3012/api/v1/analytics/predictions

# 4. Test Alerts
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3013/api/v1/alerts/rules

# 5. Test CRM
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3014/api/v1/crm/leads

# 6. Test Alumni
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3015/api/v1/alumni/profiles
```

### 5. Check Service Logs

```bash
# Docker Compose
docker-compose -f docker-compose-phase3.yml logs -f service-name

# PM2
pm2 logs service-name

# Manual
# Check terminal output
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find process using port
lsof -i :3010  # Replace with your port
kill -9 PID    # Replace PID with process ID

# Or change port in .env file
```

#### 2. Database Connection Failed

**Error**: `connect ECONNREFUSED`

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# If not running:
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Docker
docker-compose -f docker-compose-phase3.yml up -d postgres
```

#### 3. Redis Connection Failed

**Error**: `Redis connection failed`

**Solution**:
```bash
# Check Redis is running
redis-cli ping

# If not running:
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker-compose -f docker-compose-phase3.yml up -d redis
```

#### 4. Missing Dependencies

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
cd backend/services/service-name
npm install
```

#### 5. Permission Denied

**Error**: `EACCES: permission denied`

**Solution**:
```bash
# Fix file permissions
chmod -R 755 backend/services

# Or run with sudo (not recommended)
sudo npm start
```

#### 6. Database Tables Not Found

**Error**: `relation "analytics.dashboards" does not exist`

**Solution**:
```bash
# Run migrations
cd backend/database/migrations
psql -U postgres -d educrm -f 008_create_business_intelligence_schema.sql
psql -U postgres -d educrm -f 009_create_ai_analytics_schema.sql
psql -U postgres -d educrm -f 010_create_alerts_crm_alumni_schema.sql
```

### Debug Mode

Enable debug logging:

```bash
# Set in .env
LOG_LEVEL=debug

# Or set environment variable
export LOG_LEVEL=debug
npm start
```

---

## Production Deployment

### Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT secret
- [ ] Configure HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Enable PM2 startup script
- [ ] Configure NGINX as reverse proxy
- [ ] Set NODE_ENV=production

### Security Best Practices

```bash
# 1. Use environment-specific configs
NODE_ENV=production

# 2. Restrict CORS
ALLOWED_ORIGINS=https://yourdomain.com

# 3. Use strong passwords
# - Database password: 20+ characters
# - JWT secret: 64+ characters
# - Redis password: 16+ characters

# 4. Enable HTTPS only
# Configure NGINX SSL (see nginx.conf)

# 5. Set up firewall
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw deny 3010:3015/tcp # Block direct service access
sudo ufw enable
```

### Performance Optimization

```bash
# 1. Enable PM2 cluster mode
# Already configured in ecosystem.config.js
instances: 2  # Or 'max' for all CPUs

# 2. Configure PostgreSQL
# Edit postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB

# 3. Configure Redis
# Edit redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru

# 4. Enable NGINX caching
# Add to nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
```

### Monitoring Setup

```bash
# 1. PM2 Monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M

# 2. PostgreSQL monitoring
# Install pg_stat_statements extension
psql -U postgres -d educrm -c "CREATE EXTENSION pg_stat_statements;"

# 3. Application monitoring (optional)
# Set up Sentry, New Relic, or similar
SENTRY_DSN=your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_license_key
```

### Backup Strategy

```bash
# Database backup script
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump -U postgres educrm > $BACKUP_DIR/educrm_$DATE.sql

# Backup Redis (optional)
redis-cli SAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Compress
tar -czf $BACKUP_DIR/educrm_backup_$DATE.tar.gz \
  $BACKUP_DIR/educrm_$DATE.sql \
  $BACKUP_DIR/redis_$DATE.rdb

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

---

## Additional Resources

### Documentation

- [Phase 3 Complete Summary](PHASE3_FINAL_SUMMARY.md)
- [Architecture Document](AI_EDUCATION_MICROSERVICES_ARCHITECTURE.md)
- [API Documentation](#) (Coming soon - Swagger/OpenAPI)

### Support

- GitHub Issues: https://github.com/your-org/educrm/issues
- Email: support@educrm.com

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-19 | Initial Phase 3 release |

---

## Quick Reference

### Service Ports

| Service | Port | Health Check |
|---------|------|--------------|
| Business Intelligence | 3010 | /api/v1/bi/health |
| AI Analytics | 3012 | /api/v1/analytics/health |
| Automated Alerts | 3013 | /api/v1/alerts/health |
| CRM | 3014 | /api/v1/crm/health |
| Alumni Management | 3015 | /api/v1/alumni/health |
| NGINX Gateway | 80/443 | /health |

### Common Commands

```bash
# Docker Compose
docker-compose -f docker-compose-phase3.yml up -d     # Start all
docker-compose -f docker-compose-phase3.yml down      # Stop all
docker-compose -f docker-compose-phase3.yml ps        # Status
docker-compose -f docker-compose-phase3.yml logs -f   # Logs

# PM2
pm2 start ecosystem.config.js     # Start all
pm2 stop all                      # Stop all
pm2 restart all                   # Restart all
pm2 logs                          # View logs
pm2 monit                         # Monitor

# Database
psql -U postgres -d educrm                                    # Connect
pg_dump -U postgres educrm > backup.sql                       # Backup
psql -U postgres -d educrm < backup.sql                       # Restore

# Redis
redis-cli ping                    # Test connection
redis-cli FLUSHALL                # Clear all data (WARNING!)
redis-cli MONITOR                 # Monitor commands
```

---

**Setup Complete!**

Your Phase 3 AI-Enabled Services are now ready to use.

For questions or issues, refer to the Troubleshooting section or contact support.
