/**
 * Test Utilities
 * Shared test helpers and mocks for all services
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Create mock Express request
 */
function mockRequest(options = {}) {
  const req = {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    id: options.id || uuidv4(),
    get: jest.fn((header) => req.headers[header.toLowerCase()]),
    ...options,
  };
  return req;
}

/**
 * Create mock Express response
 */
function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn(),
    statusCode: 200,
  };
  return res;
}

/**
 * Create mock next function
 */
function mockNext() {
  return jest.fn();
}

/**
 * Create mock Sequelize model
 */
function mockSequelizeModel(modelName) {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
    modelName,
  };
}

/**
 * Create mock Redis client
 */
function mockRedisClient() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushAll: jest.fn(),
    quit: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    isOpen: true,
  };
}

/**
 * Generate test data
 */
const testData = {
  school: (overrides = {}) => ({
    id: uuidv4(),
    name: 'Test School',
    code: 'TEST001',
    type: 'secondary',
    email: 'test@school.com',
    phone: '+1234567890',
    status: 'active',
    subscriptionTier: 'basic',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  student: (overrides = {}) => ({
    id: uuidv4(),
    schoolId: uuidv4(),
    studentNumber: 'STU-2024-0001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@student.com',
    dateOfBirth: '2010-01-01',
    gender: 'male',
    admissionDate: '2024-01-01',
    academicYear: '2024-2025',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: uuidv4(),
    schoolId: uuidv4(),
    email: 'user@test.com',
    password: 'hashedpassword123',
    firstName: 'Test',
    lastName: 'User',
    role: 'teacher',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  attendance: (overrides = {}) => ({
    id: uuidv4(),
    schoolId: uuidv4(),
    studentId: uuidv4(),
    classId: uuidv4(),
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    markedBy: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  feePayment: (overrides = {}) => ({
    id: uuidv4(),
    schoolId: uuidv4(),
    studentId: uuidv4(),
    amount: 1000,
    currency: 'USD',
    status: 'completed',
    paymentMethod: 'card',
    transactionId: 'TXN-' + Date.now(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Wait for async operations
 */
async function wait(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create JWT token for testing
 */
function createTestToken(payload = {}) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: uuidv4(),
      email: 'test@example.com',
      role: 'admin',
      ...payload,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

/**
 * Clean up database after tests
 */
async function cleanupDatabase(models) {
  if (!models) return;

  const modelNames = Object.keys(models);
  for (const modelName of modelNames) {
    if (models[modelName].destroy) {
      await models[modelName].destroy({ where: {}, force: true });
    }
  }
}

module.exports = {
  mockRequest,
  mockResponse,
  mockNext,
  mockSequelizeModel,
  mockRedisClient,
  testData,
  wait,
  createTestToken,
  cleanupDatabase,
};
