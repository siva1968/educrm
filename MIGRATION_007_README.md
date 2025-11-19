# Migration 007: Phase 2 Schema Fixes

## Overview

This migration fixes critical schema mismatches between the database design (migration 006) and the service implementations. **Without this migration, all Phase 2 services will fail with SQL errors.**

## What This Migration Fixes

### Critical Blockers (Services Won't Run Without These)

1. **✅ Adds `is_deleted` column to ALL tables**
   - All services use soft delete pattern
   - Every query checks `WHERE is_deleted = FALSE`
   - Without this: `ERROR: column "is_deleted" does not exist`

2. **✅ Fixes Assessment Type Structure**
   - Removes FK to `assessment_types` table
   - Changes to direct `VARCHAR` storage
   - Adds grade calculation fields

3. **✅ Restructures Examination Tables**
   - Supports multiple classes per exam
   - Links results to schedule (not exam directly)
   - Adds `examination_id`, `applicable_classes`, `end_time`

4. **✅ Makes Timetable `config_id` Optional**
   - Schema required it, implementation doesn't use it
   - Prevents NOT NULL constraint violations

5. **✅ Fixes Column Name Mismatches**
   - `class` → `class_level` (syllabus)
   - `grade_points` → `gpa` (student_grades)
   - `submission_text` → `submission_content` (assignments)
   - `assigned_by_teacher_id` → `teacher_id` (assignments)

### High Priority Fixes

6. **✅ Adds Missing Columns**
   - Syllabus: `term`, `status`, `published_date`
   - Assessments: `weightage`, `grading_scale`
   - Grades: `is_passed`
   - Results: `is_expelled`, `percentage`
   - Submissions: `final_marks`, `remarks`

7. **✅ Updates Status Check Constraints**
   - Aligns allowed values with implementation
   - Assignments: 'Draft', 'Published', 'Closed', 'Archived'
   - Submissions: 'Pending', 'Submitted', 'Graded', 'Returned', 'Late'

8. **✅ Adds Validation Constraints**
   - Marks must be >= 0
   - Percentage between 0-100
   - GPA between 0-10
   - Due dates >= assigned dates

9. **✅ Restructures Teacher Workload**
   - Changes from year-based to subject-based tracking
   - Matches implementation's workload calculation logic

### Performance Improvements

10. **✅ Adds Indexes for Soft Deletes**
    - Partial indexes on `WHERE is_deleted = FALSE`
    - Significantly improves query performance

11. **✅ Adds Missing Performance Indexes**
    - Assessment type, status
    - Assignment status, teacher
    - Exam schedule date

## Running the Migration

### Prerequisites

1. **Backup your database** (if you have existing data):
   ```bash
   pg_dump educrm_dev > backup_before_migration_007.sql
   ```

2. **Ensure migration 006 is applied**:
   ```bash
   npm run migrate
   ```

### Apply Migration

```bash
# Using the migration script
cd backend
npm run migrate

# Or manually
psql -U postgres -d educrm_dev -f database/migrations/007_fix_phase2_schema.sql
```

### Verify Migration

```bash
# Test database connection
psql -U postgres -d educrm_dev -c "\dt academic.*"

# Verify is_deleted column exists
psql -U postgres -d educrm_dev -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'academic'
    AND table_name = 'subjects'
    AND column_name = 'is_deleted';
"

# Should return: is_deleted | boolean
```

## What Gets Changed

### Tables Modified

- ✅ `academic.subjects` - Add is_deleted, rename description
- ✅ `academic.subject_syllabus` - Rename class, change content type, add columns
- ✅ `academic.assessment_types` - Add is_deleted
- ✅ `academic.assessments` - Remove FK, add type as VARCHAR, add columns
- ✅ `academic.student_grades` - Rename grade_points, add is_passed
- ✅ `academic.report_cards` - Add is_deleted
- ✅ `academic.assignments` - Rename teacher field, change file storage
- ✅ `academic.assignment_submissions` - Rename fields, add final_marks
- ✅ `academic.timetable_config` - Rename columns, add break/lunch settings
- ✅ `academic.timetable` - Make config_id optional, remove boolean flags
- ✅ `academic.teacher_workload` - Complete restructure

### Tables Dropped & Recreated

⚠️ **WARNING**: These tables will be dropped and recreated. **All data will be lost!**

- `academic.examinations`
- `academic.exam_schedule`
- `academic.exam_results`

**If you have exam data**, export it first:
```bash
pg_dump -U postgres -d educrm_dev -t academic.examinations -t academic.exam_schedule -t academic.exam_results > exam_data_backup.sql
```

### Indexes Added

- 14 new indexes for soft delete filtering
- 5 new indexes for common query patterns
- 1 new unique index for timetable (handles null sections)

### Constraints Added

- 12 CHECK constraints for data validation
- 3 UNIQUE constraints (updated for new columns)
- Status value constraints for 5 tables

## Testing After Migration

### 1. Test Database Schema

```bash
# Run this SQL to verify all changes
psql -U postgres -d educrm_dev << EOF
-- Check is_deleted column exists on all tables
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'academic'
  AND column_name = 'is_deleted'
ORDER BY table_name;

-- Should return 15 rows (one per table)

-- Check examinations table structure
\d academic.examinations

-- Should show: examination_id, applicable_classes (JSONB), etc.

-- Check syllabus table
\d academic.subject_syllabus

-- Should show: class_level, syllabus_content (JSONB), term, status

-- Check constraints
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_schema = 'academic'
  AND constraint_type = 'CHECK'
ORDER BY table_name;

EOF
```

### 2. Test Service Endpoints

Create a test script `test-phase2-services.sh`:

```bash
#!/bin/bash

# Set base URL
BASE_URL="http://localhost:3000/api/v1"

# Test health endpoints
echo "Testing health endpoints..."
curl -s ${BASE_URL}/subjects/health | jq
curl -s ${BASE_URL}/gradebook/health | jq
curl -s ${BASE_URL}/examinations/health | jq
curl -s ${BASE_URL}/assignments/health | jq
curl -s ${BASE_URL}/timetable/health | jq

echo "All services responding!"
```

Run with:
```bash
chmod +x test-phase2-services.sh
./test-phase2-services.sh
```

### 3. Test CRUD Operations

```bash
# Create a test subject (replace with real school_id)
curl -X POST http://localhost:3000/api/v1/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "school_id": "YOUR_SCHOOL_UUID",
    "subject_code": "MATH101",
    "subject_name": "Mathematics",
    "curriculum": "CBSE",
    "subject_type": "Core",
    "applicable_classes": ["10", "11", "12"],
    "credits": 4
  }'

# Should return 201 Created with subject data
```

## Rollback Plan

If something goes wrong:

### 1. Restore from Backup

```bash
# Stop application
pm2 stop educrm-backend

# Restore database
psql -U postgres -d educrm_dev < backup_before_migration_007.sql

# Restart application
pm2 restart educrm-backend
```

### 2. Manual Rollback SQL

```sql
-- ONLY IF NEEDED - This undoes migration 007

-- Remove is_deleted from all tables
ALTER TABLE academic.subjects DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE academic.subject_syllabus DROP COLUMN IF EXISTS is_deleted;
-- ... repeat for all tables

-- Restore examination tables to original schema
-- (requires re-running migration 006)
```

## Known Issues & Limitations

### Data Loss

⚠️ **Examination tables are recreated** - all exam data will be lost
- Backup before migrating if you have exam data
- Or comment out the DROP TABLE statements in migration 007

### Incompatible Changes

- Old API requests expecting `assessment_type_id` will fail
- Exam results linked to `exam_id` instead of `exam_schedule_id` won't work
- Timetable entries without `config_id` will now be allowed

### Not Fixed By This Migration

This migration does NOT implement:
- ❌ Report card generation service (feature missing)
- ❌ Assessment types CRUD (not needed with VARCHAR approach)
- ❌ Authentication/authorization (separate task)
- ❌ Plagiarism detection (future feature)
- ❌ Substitution teacher management (future feature)

## Next Steps After Migration

1. **✅ Verify all services start without errors**
   ```bash
   npm start
   # Check logs for SQL errors
   ```

2. **✅ Test one endpoint from each service**
   - Create a subject
   - Create an assessment
   - Create an assignment
   - Create a timetable entry

3. **✅ Implement authentication** (see AUTH_SETUP.md)

4. **✅ Add missing features**
   - Report card generation
   - Business logic validation
   - Performance optimization

5. **✅ Write tests**
   - Unit tests for services
   - Integration tests for APIs
   - Load tests for performance

## Monitoring

After migration, monitor for:

- SQL errors in logs
- Slow queries (check pg_stat_statements)
- Failed API requests (4xx/5xx responses)
- Missing data (joins failing)

## Support

If you encounter issues:

1. Check logs: `tail -f logs/error.log`
2. Verify schema: `\d academic.table_name`
3. Test queries: Run SQL directly in psql
4. Review CRITICAL_ANALYSIS_PHASE2.md for details

## Success Criteria

Migration is successful when:

- ✅ All 15 tables have `is_deleted` column
- ✅ Subject syllabus has `class_level` (not `class`)
- ✅ Assessments have `assessment_type` VARCHAR
- ✅ Examinations table has `examination_id` and `applicable_classes`
- ✅ No SQL errors in application logs
- ✅ All health endpoints return 200 OK
- ✅ Can create records in each service

---

**Migration Status**: Ready to apply
**Estimated Downtime**: 2-5 minutes
**Risk Level**: Medium (drops 3 tables)
**Rollback Available**: Yes (via backup)
