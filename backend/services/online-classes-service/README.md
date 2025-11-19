# Online Classes Service

Manages virtual classrooms and online class sessions

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
GET    /api/v1/onlineClassesService           - Get all records (paginated)
GET    /api/v1/onlineClassesService/stats     - Get statistics
GET    /api/v1/onlineClassesService/:id       - Get record by ID
POST   /api/v1/onlineClassesService           - Create new record
PUT    /api/v1/onlineClassesService/:id       - Update record
DELETE /api/v1/onlineClassesService/:id       - Delete record (soft delete)
```

## Installation

```bash
npm install
```

## Environment Variables

```bash
ONLINE_CLASSES_SERVICE_PORT=4117
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
docker build -t online-classes-service .
docker run -p 4117:4117 online-classes-service
```

## Production

```bash
npm start
```
