#!/usr/bin/env node

/**
 * Validate Migration 007 Applied Successfully
 * Checks all schema changes are in place
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'educrm_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

const tests = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
    return false;
  }
}

async function checkColumnExists(table, column, type) {
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'academic'
      AND table_name = $1
      AND column_name = $2
  `, [table, column]);

  if (result.rows.length === 0) {
    throw new Error(`Column ${column} does not exist in ${table}`);
  }

  if (type && result.rows[0].data_type !== type) {
    throw new Error(`Column ${column} has type ${result.rows[0].data_type}, expected ${type}`);
  }
}

async function checkColumnNotExists(table, column) {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'academic'
      AND table_name = $1
      AND column_name = $2
  `, [table, column]);

  if (result.rows.length > 0) {
    throw new Error(`Column ${column} should not exist in ${table}`);
  }
}

async function checkConstraintExists(table, constraint) {
  const result = await pool.query(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'academic'
      AND table_name = $1
      AND constraint_name = $2
  `, [table, constraint]);

  if (result.rows.length === 0) {
    throw new Error(`Constraint ${constraint} does not exist on ${table}`);
  }
}

async function runValidation() {
  console.log('\n================================');
  console.log('Migration 007 Validation');
  console.log('================================\n');

  console.log('Testing is_deleted columns...');
  await test('subjects has is_deleted', () =>
    checkColumnExists('subjects', 'is_deleted', 'boolean'));
  await test('subject_syllabus has is_deleted', () =>
    checkColumnExists('subject_syllabus', 'is_deleted', 'boolean'));
  await test('assessments has is_deleted', () =>
    checkColumnExists('assessments', 'is_deleted', 'boolean'));
  await test('student_grades has is_deleted', () =>
    checkColumnExists('student_grades', 'is_deleted', 'boolean'));
  await test('examinations has is_deleted', () =>
    checkColumnExists('examinations', 'is_deleted', 'boolean'));
  await test('assignments has is_deleted', () =>
    checkColumnExists('assignments', 'is_deleted', 'boolean'));
  await test('assignment_submissions has is_deleted', () =>
    checkColumnExists('assignment_submissions', 'is_deleted', 'boolean'));
  await test('timetable has is_deleted', () =>
    checkColumnExists('timetable', 'is_deleted', 'boolean'));

  console.log('\nTesting syllabus table changes...');
  await test('syllabus has class_level (renamed from class)', () =>
    checkColumnExists('subject_syllabus', 'class_level'));
  await test('syllabus.syllabus_content is JSONB', () =>
    checkColumnExists('subject_syllabus', 'syllabus_content', 'jsonb'));
  await test('syllabus has term column', () =>
    checkColumnExists('subject_syllabus', 'term'));
  await test('syllabus has status column', () =>
    checkColumnExists('subject_syllabus', 'status'));
  await test('syllabus has published_date column', () =>
    checkColumnExists('subject_syllabus', 'published_date'));

  console.log('\nTesting assessment table changes...');
  await test('assessments has assessment_type VARCHAR', () =>
    checkColumnExists('assessments', 'assessment_type', 'character varying'));
  await test('assessments does not have assessment_type_id', () =>
    checkColumnNotExists('assessments', 'assessment_type_id'));
  await test('assessments has weightage', () =>
    checkColumnExists('assessments', 'weightage'));
  await test('assessments has grading_scale', () =>
    checkColumnExists('assessments', 'grading_scale'));

  console.log('\nTesting student_grades changes...');
  await test('student_grades has gpa (renamed from grade_points)', () =>
    checkColumnExists('student_grades', 'gpa'));
  await test('student_grades has is_passed', () =>
    checkColumnExists('student_grades', 'is_passed', 'boolean'));
  await test('student_grades does not have grade_points', () =>
    checkColumnNotExists('student_grades', 'grade_points'));

  console.log('\nTesting examinations table restructure...');
  await test('examinations has examination_id', () =>
    checkColumnExists('examinations', 'examination_id'));
  await test('examinations has applicable_classes JSONB', () =>
    checkColumnExists('examinations', 'applicable_classes', 'jsonb'));
  await test('exam_schedule has examination_id FK', () =>
    checkColumnExists('exam_schedule', 'examination_id'));
  await test('exam_schedule has end_time', () =>
    checkColumnExists('exam_schedule', 'end_time'));
  await test('exam_results has exam_schedule_id', () =>
    checkColumnExists('exam_results', 'exam_schedule_id'));
  await test('exam_results has is_expelled', () =>
    checkColumnExists('exam_results', 'is_expelled', 'boolean'));

  console.log('\nTesting assignment changes...');
  await test('assignments has teacher_id (renamed from assigned_by_teacher_id)', () =>
    checkColumnExists('assignments', 'teacher_id'));
  await test('assignments has attachments JSONB', () =>
    checkColumnExists('assignments', 'attachments', 'jsonb'));
  await test('assignments has instructions', () =>
    checkColumnExists('assignments', 'instructions', 'text'));
  await test('assignments does not have assignment_file_url', () =>
    checkColumnNotExists('assignments', 'assignment_file_url'));

  console.log('\nTesting assignment_submissions changes...');
  await test('submissions has submission_content (renamed)', () =>
    checkColumnExists('assignment_submissions', 'submission_content', 'text'));
  await test('submissions has attachments (renamed from submission_files)', () =>
    checkColumnExists('assignment_submissions', 'attachments', 'jsonb'));
  await test('submissions has final_marks', () =>
    checkColumnExists('assignment_submissions', 'final_marks'));
  await test('submissions does not have plagiarism_score', () =>
    checkColumnNotExists('assignment_submissions', 'plagiarism_score'));

  console.log('\nTesting timetable_config changes...');
  await test('timetable_config has period_duration (renamed)', () =>
    checkColumnExists('timetable_config', 'period_duration'));
  await test('timetable_config has break_duration (renamed)', () =>
    checkColumnExists('timetable_config', 'break_duration'));
  await test('timetable_config has lunch_duration (renamed)', () =>
    checkColumnExists('timetable_config', 'lunch_duration'));
  await test('timetable_config has start_time (renamed)', () =>
    checkColumnExists('timetable_config', 'start_time'));
  await test('timetable_config has break_after_period', () =>
    checkColumnExists('timetable_config', 'break_after_period'));
  await test('timetable_config has lunch_after_period', () =>
    checkColumnExists('timetable_config', 'lunch_after_period'));

  console.log('\nTesting timetable changes...');
  await test('timetable has period_type', () =>
    checkColumnExists('timetable', 'period_type'));
  await test('timetable does not have is_break', () =>
    checkColumnNotExists('timetable', 'is_break'));
  await test('timetable does not have is_lunch', () =>
    checkColumnNotExists('timetable', 'is_lunch'));

  console.log('\nTesting constraints...');
  await test('assessments has valid_assessment_type constraint', () =>
    checkConstraintExists('assessments', 'valid_assessment_type'));
  await test('assignments has valid_assignment_status constraint', () =>
    checkConstraintExists('assignments', 'valid_assignment_status'));
  await test('student_grades has valid_marks constraint', () =>
    checkConstraintExists('student_grades', 'valid_marks'));
  await test('student_grades has valid_percentage constraint', () =>
    checkConstraintExists('student_grades', 'valid_percentage'));

  console.log('\n================================');
  console.log('Validation Complete');
  console.log('================================\n');

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}\n`);

  if (failed === 0) {
    console.log('✅ Migration 007 applied successfully!\n');
    console.log('Next steps:');
    console.log('1. Start the application: npm start');
    console.log('2. Test health endpoints');
    console.log('3. Apply authentication (see AUTH_SETUP.md)');
    console.log('4. Test CRUD operations\n');
    process.exit(0);
  } else {
    console.log('❌ Migration 007 not fully applied\n');
    console.log('Actions:');
    console.log('1. Review failed tests above');
    console.log('2. Check migration logs');
    console.log('3. Re-run migration: npm run migrate');
    console.log('4. Contact support if issues persist\n');
    process.exit(1);
  }
}

// Run validation
runValidation()
  .catch(error => {
    console.error('\n❌ Validation failed with error:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
