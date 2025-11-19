# Required Fixes for Phase 2 Implementation

## IMMEDIATE BLOCKERS (Will Cause Runtime Failures)

### 1. Add `is_deleted` Column to All Tables

**Problem**: All service code uses `WHERE is_deleted = false` but schema has no such column.

**Fix**: Update migration `006_create_academic_services_schema.sql` to add:

```sql
-- Add to EVERY table in academic schema:
is_deleted BOOLEAN DEFAULT FALSE,

-- Add indexes:
CREATE INDEX idx_subjects_not_deleted ON academic.subjects(subject_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_assessments_not_deleted ON academic.assessments(assessment_id) WHERE is_deleted = FALSE;
-- ... etc for all tables
```

**Files to update**: `backend/database/migrations/006_create_academic_services_schema.sql`

---

### 2. Fix Subject Syllabus Table Structure

**Problem**: Column mismatch between schema and implementation.

**Fix**: Update schema from:
```sql
class VARCHAR(10) NOT NULL,
syllabus_content TEXT,
```

To:
```sql
class_level VARCHAR(10) NOT NULL,
syllabus_content JSONB,
term VARCHAR(50),
status VARCHAR(20) DEFAULT 'Draft',
published_date TIMESTAMP WITH TIME ZONE,
is_deleted BOOLEAN DEFAULT FALSE,
updated_by UUID NOT NULL,

CONSTRAINT unique_syllabus UNIQUE (subject_id, class_level, academic_year, term),
CONSTRAINT valid_status CHECK (status IN ('Draft', 'Published', 'Archived'))
```

---

### 3. Fix Assessment Table - Remove FK to assessment_types

**Problem**: Schema expects FK to `assessment_types` table, implementation uses VARCHAR.

**Fix Option 1** (Simpler - match implementation):
```sql
-- Remove this line:
assessment_type_id UUID NOT NULL,

-- Add this:
assessment_type VARCHAR(50) NOT NULL,
weightage DECIMAL(5,2) DEFAULT 0,
grading_scale VARCHAR(50) DEFAULT 'Percentage',

-- Remove FK constraint:
-- CONSTRAINT fk_assessment_type FOREIGN KEY (assessment_type_id) ...

-- Add CHECK constraint:
CONSTRAINT valid_assessment_type CHECK (assessment_type IN
    ('Quiz', 'Test', 'Mid-term', 'Final', 'Project', 'Assignment', 'Practical', 'Oral'))
```

**Fix Option 2** (Keep schema, rewrite services):
- Implement Assessment Types CRUD
- Change all services to use FK
- More work, but better normalization

**Recommendation**: Use Fix Option 1

---

### 4. Fix Student Grades Table

**Problem**: Column name and structure mismatch.

**Fix**: Update schema:
```sql
-- Change:
grade_points DECIMAL(4,2),

-- To:
gpa DECIMAL(4,2),
is_passed BOOLEAN,
is_deleted BOOLEAN DEFAULT FALSE,

-- Remove (not used):
is_grace_marks, grace_marks, submitted_date
```

---

### 5. Fix Examination Tables Structure

**Problem**: Examinations table structure completely different.

**Fix**: Replace examinations table:
```sql
DROP TABLE IF EXISTS academic.exam_results CASCADE;
DROP TABLE IF EXISTS academic.exam_schedule CASCADE;
DROP TABLE IF EXISTS academic.examinations CASCADE;

CREATE TABLE academic.examinations (
    examination_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    exam_name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    applicable_classes JSONB DEFAULT '[]',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'Scheduled',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_exam_status CHECK (status IN ('Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Postponed'))
);

CREATE TABLE academic.exam_schedule (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examination_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    total_marks DECIMAL(6,2) NOT NULL,
    passing_marks DECIMAL(6,2),
    room_number VARCHAR(50),
    invigilator_ids JSONB,
    instructions TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_examination FOREIGN KEY (examination_id) REFERENCES academic.examinations(examination_id) ON DELETE CASCADE,
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT unique_exam_subject UNIQUE (examination_id, subject_id)
);

CREATE TABLE academic.exam_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_schedule_id UUID NOT NULL,
    student_id UUID NOT NULL,
    marks_obtained DECIMAL(6,2),
    percentage DECIMAL(5,2),
    grade VARCHAR(5),
    is_passed BOOLEAN,
    is_absent BOOLEAN DEFAULT FALSE,
    is_expelled BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'Draft',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_exam_schedule FOREIGN KEY (exam_schedule_id) REFERENCES academic.exam_schedule(schedule_id),
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT unique_exam_student UNIQUE (exam_schedule_id, student_id)
);
```

---

### 6. Fix Assignment Tables

**Problem**: Column mismatches and status values.

**Fix**: Update assignments table:
```sql
-- Change:
assigned_by_teacher_id UUID,
assignment_file_url VARCHAR(500),
status VARCHAR(20) DEFAULT 'Active',

-- To:
teacher_id UUID,
attachments JSONB,
instructions TEXT,
status VARCHAR(20) DEFAULT 'Draft',
is_deleted BOOLEAN DEFAULT FALSE,
updated_by UUID NOT NULL,

CONSTRAINT valid_assignment_status CHECK (status IN ('Draft', 'Published', 'Closed', 'Archived'))
```

Update assignment_submissions:
```sql
-- Change:
submission_text TEXT,
submission_files JSONB,

-- To:
submission_content TEXT,
attachments JSONB,
final_marks DECIMAL(6,2),
is_deleted BOOLEAN DEFAULT FALSE,
updated_by UUID NOT NULL,

-- Remove (not implemented):
plagiarism_score, plagiarism_report_url
```

---

### 7. Fix Timetable Table - Remove config_id Requirement

**Problem**: Schema requires config_id FK, implementation doesn't use it.

**Fix Option 1** (Match implementation):
```sql
-- Change:
config_id UUID NOT NULL,

-- To:
config_id UUID NULL,  -- Make it optional

-- Or remove entirely if not using
```

**Fix Option 2** (Keep FK, update implementation):
- Always pass config_id when creating timetable entries
- Get active config first, then use its ID

**Recommendation**: Use Fix Option 1 or remove config_id entirely from timetable table.

---

### 8. Fix Timetable Config Table

**Problem**: Missing columns used by implementation.

**Fix**: Update schema:
```sql
-- Add:
break_after_period INTEGER,
lunch_after_period INTEGER,
is_deleted BOOLEAN DEFAULT FALSE,
created_by UUID NOT NULL,
updated_by UUID NOT NULL,

-- Rename:
period_duration_minutes → period_duration,
break_duration_minutes → break_duration,
lunch_break_duration_minutes → lunch_duration,
school_start_time → start_time,

-- Remove:
config_name (not used),
school_end_time (calculated)
```

---

### 9. Fix Teacher Workload Table

**Problem**: Completely different structure and purpose.

**Fix**: Replace with implementation structure:
```sql
DROP TABLE IF EXISTS academic.teacher_workload;

CREATE TABLE academic.teacher_workload (
    workload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    total_periods_per_week INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT unique_teacher_subject UNIQUE (teacher_id, subject_id)
);
```

---

## MISSING FUNCTIONALITY TO IMPLEMENT

### HIGH Priority

#### 1. Report Card Generation Service

Create new service: `backend/services/gradebook/services/reportcard.service.js`

**Required endpoints**:
```javascript
POST   /api/v1/gradebook/report-cards/generate
GET    /api/v1/gradebook/report-cards/:id
PUT    /api/v1/gradebook/report-cards/:id/publish
GET    /api/v1/gradebook/students/:studentId/report-cards
DELETE /api/v1/gradebook/report-cards/:id
```

**Features needed**:
- Aggregate all grades for a student in a term
- Calculate overall percentage and GPA
- Calculate class rank
- Generate subject-wise summary
- Support draft/published workflow
- PDF generation (optional Phase 3)

---

#### 2. Assessment Types Management

Create: `backend/services/gradebook/validators/assessment-type.validator.js`
Create: `backend/services/gradebook/services/assessment-type.service.js`
Create: `backend/services/gradebook/controllers/assessment-type.controller.js`

**Required endpoints**:
```javascript
POST   /api/v1/gradebook/assessment-types
GET    /api/v1/gradebook/assessment-types
GET    /api/v1/gradebook/assessment-types/:id
PUT    /api/v1/gradebook/assessment-types/:id
DELETE /api/v1/gradebook/assessment-types/:id
```

**Only needed if keeping FK approach** (not recommended).

---

#### 3. Add Authentication Middleware

Create: `backend/shared/middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      schoolId: decoded.schoolId
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticate };
```

Add to all routes:
```javascript
const { authenticate } = require('../../shared/middleware/auth');
router.use(authenticate); // Add after router creation
```

---

### MEDIUM Priority

#### 4. Add Validation Helpers

Create: `backend/shared/utils/validators.js`

```javascript
// Validate student belongs to class
async function validateStudentClass(studentId, classLevel, section) {
  // Query student record and verify class matches
}

// Validate subject is applicable to class
async function validateSubjectForClass(subjectId, classLevel) {
  // Query subject and check applicable_classes
}

// Validate teacher owns resource
async function validateTeacherOwnership(teacherId, resourceId, resourceType) {
  // Check teacher_id matches
}

module.exports = {
  validateStudentClass,
  validateSubjectForClass,
  validateTeacherOwnership
};
```

Use in services before operations.

---

#### 5. Add Database Constraints

```sql
-- Marks validation
ALTER TABLE academic.student_grades
ADD CONSTRAINT valid_marks CHECK (marks_obtained >= 0);

ALTER TABLE academic.student_grades
ADD CONSTRAINT valid_percentage CHECK (percentage >= 0 AND percentage <= 100);

-- Date validation
ALTER TABLE academic.assignments
ADD CONSTRAINT valid_dates CHECK (due_date >= assigned_date);

ALTER TABLE academic.examinations
ADD CONSTRAINT valid_exam_dates CHECK (end_date >= start_date);

-- GPA validation
ALTER TABLE academic.student_grades
ADD CONSTRAINT valid_gpa CHECK (gpa >= 0 AND gpa <= 10);
```

---

#### 6. Optimize Batch Operations

Update all batch methods to use single INSERT:

```javascript
// Instead of:
for (const item of items) {
  await client.query(insertQuery, [item.field1, item.field2]);
}

// Use:
const values = items.map((item, i) =>
  `($${i*2+1}, $${i*2+2})`
).join(',');

const params = items.flatMap(item => [item.field1, item.field2]);

await client.query(
  `INSERT INTO table (field1, field2) VALUES ${values}`,
  params
);
```

---

### LOW Priority

#### 7. Add Caching

Install Redis client and add caching layer:

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getCachedOrFetch(key, fetchFn, ttl = 3600) {
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetchFn();
  await client.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Use for:
// - Timetables (rarely change)
// - Subject lists (rarely change)
// - Assessment types (rarely change)
```

---

#### 8. Add Logging

Create: `backend/shared/utils/logger.js` (already exists, verify it's used)

Add to all catch blocks:
```javascript
catch (error) {
  logger.error('Error in createAssignment', {
    error: error.message,
    stack: error.stack,
    userId,
    assignmentData
  });
  throw error;
}
```

---

## VALIDATION IMPROVEMENTS

### Add Business Logic Validations

In each service, add:

```javascript
// Grade Book Service
async validateAssessmentForClass(assessmentId, studentId) {
  // Check student's class matches assessment class
}

// Assignment Service
async validateSubmissionDeadline(assignmentId) {
  // Check if past due date and late submissions not allowed
}

// Timetable Service
async validateNoTeacherConflict(teacherId, day, period) {
  // Check teacher not already assigned
}

async validateNoRoomConflict(roomNumber, day, period) {
  // Check room not already booked
}

// Examination Service
async validateExamDateInPeriod(examDate, examStartDate, examEndDate) {
  // Check schedule dates fall within exam period
}
```

---

## MIGRATION STRATEGY

### Option 1: Update Schema (RECOMMENDED)

1. Create new migration `007_fix_phase2_schema.sql`
2. Add all ALTER TABLE statements for fixes above
3. Run migration before deploying services
4. No code changes needed

**Pros**: Less work, services already implemented
**Cons**: Schema doesn't match original design doc

---

### Option 2: Rewrite Services

1. Keep existing schema
2. Rewrite all services to match schema
3. Implement missing features (report cards, etc.)

**Pros**: Matches design doc
**Cons**: ~40 hours of rework

---

### Option 3: Hybrid

1. Fix critical blockers in schema (is_deleted, etc.)
2. Keep service implementations
3. Add missing features incrementally

**Pros**: Gets system working quickly
**Cons**: Technical debt remains

---

## RECOMMENDED IMMEDIATE ACTIONS

### Phase 1: Critical Fixes (2-3 hours)
1. ✅ Create migration `007_fix_phase2_schema.sql` with all ALTER TABLE fixes
2. ✅ Run migration on development database
3. ✅ Test all existing endpoints
4. ✅ Fix any remaining SQL errors

### Phase 2: Authentication (2 hours)
1. ✅ Implement JWT middleware
2. ✅ Add to all routes
3. ✅ Remove userId defaults
4. ✅ Test with tokens

### Phase 3: Report Cards (4-6 hours)
1. ✅ Implement report card service
2. ✅ Add routes and controllers
3. ✅ Test generation
4. ✅ Document API

### Phase 4: Validation & Security (4 hours)
1. ✅ Add business logic validations
2. ✅ Add database constraints
3. ✅ Add permission checks
4. ✅ Security testing

### Phase 5: Performance (2 hours)
1. ✅ Optimize batch operations
2. ✅ Add indexes
3. ✅ Load testing

---

## FILES TO CREATE

```
backend/database/migrations/007_fix_phase2_schema.sql
backend/shared/middleware/auth.js
backend/shared/utils/validators.js
backend/services/gradebook/services/reportcard.service.js
backend/services/gradebook/controllers/reportcard.controller.js
backend/services/gradebook/validators/reportcard.validator.js
```

## FILES TO UPDATE

```
backend/services/gradebook/routes/index.js (add report card routes)
backend/services/*/routes/index.js (add auth middleware)
backend/services/*/services/*.service.js (add validations)
All route files (add authentication)
```

---

## TESTING CHECKLIST

After fixes:

- [ ] All database migrations run successfully
- [ ] All CRUD endpoints work without errors
- [ ] Soft delete works (is_deleted column)
- [ ] Foreign keys don't violate constraints
- [ ] Batch operations complete successfully
- [ ] Authentication rejects unauthenticated requests
- [ ] Authorization prevents unauthorized access
- [ ] Validation catches invalid data
- [ ] Error messages are user-friendly
- [ ] Performance acceptable under load (>100 concurrent users)

---

## ESTIMATED EFFORT

- **Critical Fixes**: 2-3 hours
- **Authentication**: 2 hours
- **Report Cards**: 4-6 hours
- **Validation**: 4 hours
- **Performance**: 2 hours
- **Testing**: 4 hours

**Total**: 18-21 hours of development work

---

**Current Status**: ❌ NOT PRODUCTION READY

**After Fixes**: ✅ PRODUCTION READY (with monitoring)
