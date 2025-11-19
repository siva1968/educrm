#!/usr/bin/env node

/**
 * Apply production-ready patterns to existing services
 *
 * This script regenerates services with:
 * - PostgreSQL database integration (replaces Map() storage)
 * - Redis caching
 * - Joi validation
 * - JWT authentication
 * - Rate limiting
 * - Comprehensive testing
 * - Docker support
 */

const { generateService } = require('./service-generator');

// Critical services to upgrade first
const criticalServices = [
  { name: 'attendance-management-service', port: 4101, description: 'Manages student attendance tracking, daily attendance, and attendance reports' },
  { name: 'timetable-management-service', port: 4110, description: 'Manages class schedules, timetables, and period allocations' },
  { name: 'gradebook-service', port: 4111, description: 'Manages student grades, assessments, and academic performance tracking' },
  { name: 'examination-management-service', port: 4112, description: 'Manages examinations, exam schedules, and exam results' },
  { name: 'assignment-management-service', port: 4113, description: 'Manages homework assignments, submissions, and grading' },
  { name: 'lms-service', port: 4115, description: 'Learning Management System for course content and student learning' },
  { name: 'online-classes-service', port: 4117, description: 'Manages virtual classrooms and online class sessions' },
  { name: 'hr-management-service', port: 4130, description: 'Manages staff information, employment records, and HR operations' },
  { name: 'payroll-management-service', port: 4131, description: 'Manages staff payroll, salary processing, and payment records' },
  { name: 'fee-management-service', port: 4140, description: 'Manages fee structures, fee collection, and payment tracking' }
];

console.log('');
console.log('============================================');
console.log('   Production Patterns Application');
console.log('============================================');
console.log('');
console.log(`📦 Applying patterns to ${criticalServices.length} critical services`);
console.log('');

let successCount = 0;
let errorCount = 0;

for (const service of criticalServices) {
  try {
    console.log(`🔄 Processing: ${service.name}`);
    generateService(service.name, service.port, service.description);
    successCount++;
  } catch (error) {
    console.error(`❌ Error processing ${service.name}:`, error.message);
    errorCount++;
  }
}

console.log('');
console.log('============================================');
console.log('   Summary');
console.log('============================================');
console.log(`✅ Successfully upgraded: ${successCount} services`);
if (errorCount > 0) {
  console.log(`❌ Failed: ${errorCount} services`);
}
console.log('');
console.log('Next steps:');
console.log('1. Review generated files for each service');
console.log('2. Customize business logic in service layers');
console.log('3. Create database migrations for each service');
console.log('4. Run tests: npm test');
console.log('5. Build Docker images');
console.log('');
