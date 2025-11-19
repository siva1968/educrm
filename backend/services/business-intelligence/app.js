const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.BI_SERVICE_PORT || 3010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/bi', routes);

// Error handling
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Business Intelligence Service running on port ${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/api/v1/bi/health`);
  });
}

module.exports = app;
