# Assignment Management Service

Manages homework assignments, submissions, and grading

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
GET    /api/v1/assignmentManagementService           - Get all records (paginated)
GET    /api/v1/assignmentManagementService/stats     - Get statistics
GET    /api/v1/assignmentManagementService/:id       - Get record by ID
POST   /api/v1/assignmentManagementService           - Create new record
PUT    /api/v1/assignmentManagementService/:id       - Update record
DELETE /api/v1/assignmentManagementService/:id       - Delete record (soft delete)
```

## Installation

```bash
npm install
```

## Environment Variables

```bash
ASSIGNMENT_MANAGEMENT_SERVICE_PORT=4113
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
docker build -t assignment-management-service .
docker run -p 4113:4113 assignment-management-service
```

## Production

```bash
npm start
```
