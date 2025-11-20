const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Sequelize Database Connection
 * Shared across all microservices
 */

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'educrm_dev',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',

  // Connection pool configuration
  pool: {
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    acquire: 30000,
    idle: 10000,
  },

  // Logging
  logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,

  // Timezone
  timezone: '+00:00',

  // Performance
  benchmark: process.env.NODE_ENV === 'development',

  // SSL for production
  ...(process.env.DB_SSL === 'true' && {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }),
});

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);
    return false;
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('✗ Error closing database connection:', error);
  }
};

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  closeConnection,
};
