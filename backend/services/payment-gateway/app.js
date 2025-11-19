const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const paymentRoutes = require('./routes');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PAYMENT_GATEWAY_PORT || 4004;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Payment Gateway Integration Service',
    status: 'Running',
    version: '1.0.0',
    providers: ['razorpay', 'stripe', 'paypal'],
    timestamp: new Date().toISOString()
  });
});

// Payment routes
app.use('/api/v1/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`💳 Payment Gateway Service running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/v1/payments/health`);
  });
}

module.exports = app;
