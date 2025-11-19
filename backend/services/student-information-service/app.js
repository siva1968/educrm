const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();
const PORT = process.env.SIS_PORT || 4100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Routes
app.use('/api/v1/sis', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Student Information Service (SIS)',
    version: '1.0.0',
    status: 'Active',
    description: 'Complete student data management system',
    features: [
      'Student registration & enrollment',
      'Student profile management',
      'Academic records',
      'Document management',
      'Parent/Guardian management',
      'Student search & filtering',
      'Bulk operations',
      'Transfer & withdrawal management'
    ],
    endpoints: {
      health: 'GET /api/v1/sis/health',
      students: {
        create: 'POST /api/v1/sis/students',
        getAll: 'GET /api/v1/sis/students',
        getById: 'GET /api/v1/sis/students/:id',
        update: 'PUT /api/v1/sis/students/:id',
        delete: 'DELETE /api/v1/sis/students/:id',
        search: 'GET /api/v1/sis/students/search',
        bulkImport: 'POST /api/v1/sis/students/bulk'
      },
      enrollment: {
        enroll: 'POST /api/v1/sis/enrollment',
        getByStudent: 'GET /api/v1/sis/enrollment/student/:id',
        transfer: 'POST /api/v1/sis/enrollment/transfer',
        withdraw: 'POST /api/v1/sis/enrollment/withdraw'
      },
      documents: {
        upload: 'POST /api/v1/sis/documents',
        getByStudent: 'GET /api/v1/sis/documents/student/:id',
        download: 'GET /api/v1/sis/documents/:id'
      },
      guardians: {
        add: 'POST /api/v1/sis/guardians',
        getByStudent: 'GET /api/v1/sis/guardians/student/:id',
        update: 'PUT /api/v1/sis/guardians/:id'
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'Student Information Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎓 Student Information Service running on port ${PORT}\n`);
  });
}

module.exports = app;
