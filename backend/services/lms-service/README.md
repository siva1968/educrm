# Lms Service

Learning Management System for course content and student learning

## Overview

Production-ready microservice with:
- ✅ PostgreSQL database integration
- ✅ Redis caching
- ✅ Joi validation
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Comprehensive testing
- ✅ Docker support
- ✅ Health checks
- ✅ Graceful shutdown

## Endpoints

### Health Check
```
GET /health
```

### API Endpoints (Authenticated)

```
GET    /api/v1/lmsService           - Get all records (paginated)
GET    /api/v1/lmsService/stats     - Get statistics
GET    /api/v1/lmsService/:id       - Get record by ID
POST   /api/v1/lmsService           - Create new record
PUT    /api/v1/lmsService/:id       - Update record
DELETE /api/v1/lmsService/:id       - Delete record (soft delete)
```

## Installation

```bash
npm install
```

## Environment Variables

```bash
LMS_SERVICE_PORT=4115
DB_HOST=localhost
DB_PORT=5432
DB_NAME=educrm
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_key
```

## Development

```bash
npm run dev
```

## Testing

```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Docker

```bash
docker build -t lms-service .
docker run -p 4115:4115 lms-service
```

## Production

```bash
npm start
```
