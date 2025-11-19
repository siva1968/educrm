#!/usr/bin/env node

/**
 * Generate Test JWT Token
 * Usage: node backend/utils/generate-test-token.js [role] [schoolId]
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Get command line arguments
const role = process.argv[2] || 'admin';
const schoolId = process.argv[3] || 'test-school-123';

// Predefined test users
const testUsers = {
  admin: {
    userId: 'admin-user-001',
    email: 'admin@school.com',
    role: 'admin',
    schoolId: schoolId,
    name: 'Test Admin'
  },
  teacher: {
    userId: 'teacher-user-001',
    email: 'teacher@school.com',
    role: 'teacher',
    schoolId: schoolId,
    name: 'Test Teacher'
  },
  student: {
    userId: 'student-user-001',
    email: 'student@school.com',
    role: 'student',
    schoolId: schoolId,
    name: 'Test Student'
  },
  super_admin: {
    userId: 'superadmin-001',
    email: 'superadmin@educrm.com',
    role: 'super_admin',
    schoolId: null, // Can access all schools
    name: 'Super Administrator'
  }
};

// Get user payload
const userPayload = testUsers[role] || testUsers.admin;

// Generate token
const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const token = jwt.sign(userPayload, secret, {
  expiresIn: '24h'
});

// Display token info
console.log('================================');
console.log('JWT Test Token Generated');
console.log('================================\n');

console.log('User Info:');
console.log(JSON.stringify(userPayload, null, 2));

console.log('\n================================');
console.log('Token (expires in 24h):');
console.log('================================\n');
console.log(token);

console.log('\n================================');
console.log('Usage in cURL:');
console.log('================================\n');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/subjects`);

console.log('\n================================');
console.log('Usage in Postman/Insomnia:');
console.log('================================\n');
console.log('Header Name:  Authorization');
console.log(`Header Value: Bearer ${token}`);

console.log('\n================================');
console.log('Available Roles:');
console.log('================================\n');
console.log('- admin       : School administrator (full access to their school)');
console.log('- teacher     : Teacher (create/grade/view)');
console.log('- student     : Student (view/submit only)');
console.log('- super_admin : System administrator (access all schools)');

console.log('\n================================');
console.log('Generate Different Roles:');
console.log('================================\n');
console.log('node backend/utils/generate-test-token.js teacher');
console.log('node backend/utils/generate-test-token.js student');
console.log('node backend/utils/generate-test-token.js super_admin');
console.log('node backend/utils/generate-test-token.js admin school-uuid-456\n');

// Verify token works
try {
  const decoded = jwt.verify(token, secret);
  console.log('✅ Token verified successfully\n');
} catch (error) {
  console.log('❌ Token verification failed:', error.message, '\n');
}
