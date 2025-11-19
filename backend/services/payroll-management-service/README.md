# Payroll Management Service

Manages staff payroll, salary processing, and payment records

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
GET    /api/v1/payrollManagementService           - Get all records (paginated)
GET    /api/v1/payrollManagementService/stats     - Get statistics
GET    /api/v1/payrollManagementService/:id       - Get record by ID
POST   /api/v1/payrollManagementService           - Create new record
PUT    /api/v1/payrollManagementService/:id       - Update record
DELETE /api/v1/payrollManagementService/:id       - Delete record (soft delete)
```

## Installation

```bash
npm install
```

## Environment Variables

```bash
PAYROLL_MANAGEMENT_SERVICE_PORT=4131
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
docker build -t payroll-management-service .
docker run -p 4131:4131 payroll-management-service
```

## Production

```bash
npm start
```
