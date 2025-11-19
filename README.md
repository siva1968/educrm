# EduCRM - AI-Enabled Educational Management System

A comprehensive, production-ready educational management platform built with microservices architecture, designed to revolutionize school administration and educational delivery.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

EduCRM is a next-generation educational management software platform that seamlessly manages every aspect of school operations while leveraging artificial intelligence to enhance decision-making, automate processes, and improve educational outcomes.

### Target Scale
- **Production-ready**: Scalable for 500+ institutions
- **Timeline**: 16 weeks (4 months)
- **Architecture**: Microservices-based
- **Enterprise Grade**: Battle-tested patterns and best practices

## 🏗️ Architecture

### Core Student Services (Phase 1)

1. **Student Information Service (SIS)** - Student master data, profiles, documents
2. **Attendance Management Service** - Attendance tracking, biometric integration
3. **Gate Pass Service** - Student entry/exit permissions
4. **Learner Profile Service** - Behavioral & learning analytics
5. **Login Statistics Service** - User activity & platform usage

### Technology Stack

**Backend:**
- Node.js 18+
- Express.js 4.x
- PostgreSQL 14+
- Redis (caching)
- RabbitMQ (message queue)

**Frontend (Coming Soon):**
- React.js 18+
- Tailwind CSS
- Redux Toolkit

## ✨ Features

### Student Information System (SIS)
- ✅ Complete student profile management
- ✅ Guardian/parent information tracking
- ✅ Medical records management
- ✅ Document storage and management
- ✅ Multi-curriculum support (CBSE, ICSE, Cambridge, IB)
- ✅ Advanced search and filtering
- ✅ Bulk import/export capabilities

### Attendance Management
- 🚧 Daily attendance tracking
- 🚧 Biometric integration support
- 🚧 Leave management
- 🚧 Attendance analytics and patterns
- 🚧 Automated alerts for irregular attendance

### Gate Pass Management
- 🚧 Digital gate pass generation
- 🚧 QR code-based verification
- 🚧 Visitor management
- 🚧 Entry/exit tracking
- 🚧 Anomaly detection

### Learner Profile
- 🚧 Behavioral incident tracking
- 🚧 Staff observations and anecdotes
- 🚧 Positive recognitions
- 🚧 Development milestones
- 🚧 AI-powered recommendations

### Analytics & Reporting
- 🚧 User session tracking
- 🚧 Platform usage statistics
- 🚧 Feature usage analytics
- 🚧 API performance monitoring
- 🚧 Engagement metrics

**Legend:** ✅ Implemented | 🚧 Coming Soon

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- Redis 6.x or higher (optional, for caching)
- npm 9.x or higher

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/educrm.git
cd educrm
```

2. **Install backend dependencies**

```bash
cd backend
npm install
```

3. **Environment Configuration**

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=educrm_dev
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_here
```

4. **Database Setup**

Create the PostgreSQL database:

```bash
createdb educrm_dev
```

Run migrations:

```bash
npm run migrate
```

5. **Start the server**

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:3000`

## 🗄️ Database Setup

### Database Architecture

The system uses a single PostgreSQL database with logical schema separation:

- `sis_core` - Student Information System
- `attendance_mgmt` - Attendance tracking
- `gate_pass_mgmt` - Gate pass management
- `learner_profile` - Student analytics
- `user_analytics` - Usage statistics

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

### Migration Files

Located in `backend/database/migrations/`:

1. `001_create_sis_core_schema.sql` - Student information tables
2. `002_create_attendance_schema.sql` - Attendance tracking tables
3. `003_create_gate_pass_schema.sql` - Gate pass management tables
4. `004_create_learner_profile_schema.sql` - Learner profile tables
5. `005_create_user_analytics_schema.sql` - Analytics tables

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Student Information Service

#### Create Student

```http
POST /api/v1/students
Content-Type: application/json

{
  "school_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2010-01-15",
  "class": "10A",
  "curriculum": "CBSE",
  "admission_date": "2024-04-01",
  "email": "john.doe@example.com",
  "phone_primary": "9876543210"
}
```

#### Get Student

```http
GET /api/v1/students/:id?include=guardians,medical,documents
```

#### List Students

```http
GET /api/v1/students?school_id=uuid&class=10A&page=1&page_size=50
```

#### Update Student

```http
PUT /api/v1/students/:id
Content-Type: application/json

{
  "class": "11A",
  "email": "new.email@example.com"
}
```

#### Delete Student

```http
DELETE /api/v1/students/:id
```

#### Add Guardian

```http
POST /api/v1/students/:id/guardians
Content-Type: application/json

{
  "guardian_type": "Father",
  "first_name": "Michael",
  "last_name": "Doe",
  "phone_primary": "9876543211",
  "email": "michael.doe@example.com",
  "is_primary_contact": true
}
```

#### Update Medical Record

```http
PUT /api/v1/students/:id/medical
Content-Type: application/json

{
  "blood_group": "O+",
  "allergies": "Peanuts",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "9876543212"
}
```

### Health Check

```http
GET /health
```

Returns server health status and database connectivity.

## 📁 Project Structure

```
educrm/
├── backend/
│   ├── database/
│   │   └── migrations/           # Database migration files
│   ├── services/
│   │   ├── sis/                  # Student Information Service
│   │   │   ├── controllers/      # Request handlers
│   │   │   ├── services/         # Business logic
│   │   │   ├── validators/       # Input validation
│   │   │   └── routes/           # API routes
│   │   ├── attendance/           # Attendance Service
│   │   ├── gate-pass/            # Gate Pass Service
│   │   ├── learner-profile/      # Learner Profile Service
│   │   └── login-stats/          # Analytics Service
│   ├── shared/
│   │   ├── config/               # Database & app config
│   │   ├── middleware/           # Express middleware
│   │   ├── utils/                # Utilities & helpers
│   │   └── models/               # Shared data models
│   ├── server.js                 # Application entry point
│   ├── package.json              # Dependencies
│   └── .env.example              # Environment template
├── frontend/                     # (Coming Soon)
├── docs/                         # Documentation
│   ├── AI_EDUCATION_MICROSERVICES_ARCHITECTURE.md
│   └── CORE_STUDENT_SERVICES_IMPLEMENTATION_PLAN.md
└── README.md                     # This file
```

## 🛠️ Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run migrations
npm run migrate

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

### Code Style

- ESLint for linting
- Prettier for formatting
- Follow Airbnb JavaScript style guide

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🐳 Docker Deployment

### Using Docker Compose (Coming Soon)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📈 Performance

- Response time: <200ms (p95)
- Throughput: 1000+ requests/sec
- Database connection pooling
- Redis caching for frequently accessed data
- Optimized database queries with indexes

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Data encryption at rest and in transit
- SQL injection prevention
- XSS protection
- Rate limiting
- Helmet.js security headers
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Architecture Team** - Enterprise architecture and design
- **Development Team** - Implementation and testing
- **DevOps Team** - Deployment and monitoring

## 📞 Support

For support and queries:
- Email: support@educrm.com
- Documentation: https://docs.educrm.com
- Issue Tracker: https://github.com/your-org/educrm/issues

## 🗺️ Roadmap

### Phase 1: Core Services ✅ (Current)
- [x] Student Information Service
- [ ] Attendance Management
- [ ] Gate Pass Service
- [ ] Learner Profile
- [ ] Login Statistics

### Phase 2: Academic Services (Months 7-12)
- [ ] Learning Management System (LMS)
- [ ] Examination Management
- [ ] Assignment Management
- [ ] Grade Book Service

### Phase 3: Advanced Features (Months 13-18)
- [ ] AI Analytics
- [ ] Advanced Financial Management
- [ ] E-commerce Integration
- [ ] Quality Assurance Tools

### Phase 4: Optimization (Months 19-24)
- [ ] Advanced AI Features
- [ ] External System Integrations
- [ ] Performance Optimization
- [ ] Mobile Apps

## 📊 Success Metrics

**Operational Efficiency:**
- 70% reduction in manual administrative tasks
- 50% faster processing of routine operations

**User Adoption:**
- 95% user adoption rate
- 80% mobile app usage
- 4.5+ user satisfaction rating

**Financial Benefits:**
- 60% reduction in operational costs
- 35% improvement in fee collection
- ROI within 18 months

---

**Built with ❤️ by the EduCRM Team**
