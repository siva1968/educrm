# Hr Management Service

Manages staff information, employment records, and HR operations

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
GET    /api/v1/hrManagementService           - Get all records (paginated)
GET    /api/v1/hrManagementService/stats     - Get statistics
GET    /api/v1/hrManagementService/:id       - Get record by ID
POST   /api/v1/hrManagementService           - Create new record
PUT    /api/v1/hrManagementService/:id       - Update record
DELETE /api/v1/hrManagementService/:id       - Delete record (soft delete)
```

## Installation

```bash
npm install
```

## Environment Variables

```bash
HR_MANAGEMENT_SERVICE_PORT=4130
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
docker build -t hr-management-service .
docker run -p 4130:4130 hr-management-service
```

## Production

```bash
npm start
```
