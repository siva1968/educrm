-- ============================================================
-- Migration 007: Fix Phase 2 Schema Mismatches
-- Description: Align database schema with service implementations
-- Critical: This migration fixes blocker issues preventing services from running
-- ============================================================

-- ============================================================
-- 1. ADD is_deleted COLUMN TO ALL TABLES
-- CRITICAL: All services use soft delete pattern
-- ============================================================

-- Subjects
ALTER TABLE academic.subjects
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.subject_syllabus
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Assessments
ALTER TABLE academic.assessment_types
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.assessments
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.student_grades
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.report_cards
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Examinations
ALTER TABLE academic.examinations
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.exam_schedule
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.exam_results
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Assignments
ALTER TABLE academic.assignments
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.assignment_submissions
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Timetable
ALTER TABLE academic.timetable_config
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.timetable
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE academic.teacher_workload
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 2. FIX SUBJECT SYLLABUS TABLE
-- ============================================================

-- Rename class to class_level
ALTER TABLE academic.subject_syllabus
RENAME COLUMN class TO class_level;

-- Change syllabus_content from TEXT to JSONB
ALTER TABLE academic.subject_syllabus
ALTER COLUMN syllabus_content TYPE JSONB USING syllabus_content::jsonb;

-- Add missing columns
ALTER TABLE academic.subject_syllabus
ADD COLUMN IF NOT EXISTS term VARCHAR(50) DEFAULT 'Annual';

ALTER TABLE academic.subject_syllabus
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Draft';

ALTER TABLE academic.subject_syllabus
ADD COLUMN IF NOT EXISTS published_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE academic.subject_syllabus
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Drop old unique constraint and add new one
ALTER TABLE academic.subject_syllabus
DROP CONSTRAINT IF EXISTS unique_syllabus;

ALTER TABLE academic.subject_syllabus
ADD CONSTRAINT unique_syllabus UNIQUE (subject_id, class_level, academic_year, term);

-- Add status check constraint
ALTER TABLE academic.subject_syllabus
ADD CONSTRAINT valid_syllabus_status CHECK (status IN ('Draft', 'Published', 'Archived'));

-- Update trigger for subject_syllabus
DROP TRIGGER IF EXISTS update_subject_syllabus_updated_at ON academic.subject_syllabus;
CREATE TRIGGER update_subject_syllabus_updated_at BEFORE UPDATE ON academic.subject_syllabus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Rename description to match code usage
ALTER TABLE academic.subjects
RENAME COLUMN subject_description TO description;

-- ============================================================
-- 3. FIX ASSESSMENTS - REMOVE FK TO assessment_types
-- ============================================================

-- Drop the FK constraint to assessment_types
ALTER TABLE academic.assessments
DROP CONSTRAINT IF EXISTS fk_assessment_type;

-- Remove assessment_type_id column
ALTER TABLE academic.assessments
DROP COLUMN IF EXISTS assessment_type_id CASCADE;

-- Add assessment_type as VARCHAR
ALTER TABLE academic.assessments
ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50);

-- Add weightage and grading_scale
ALTER TABLE academic.assessments
ADD COLUMN IF NOT EXISTS weightage DECIMAL(5,2) DEFAULT 0;

ALTER TABLE academic.assessments
ADD COLUMN IF NOT EXISTS grading_scale VARCHAR(50) DEFAULT 'Percentage';

-- Update status check constraint
ALTER TABLE academic.assessments
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE academic.assessments
ADD CONSTRAINT valid_status CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled'));

-- Add assessment type check constraint
ALTER TABLE academic.assessments
ADD CONSTRAINT valid_assessment_type CHECK (
    assessment_type IN ('Quiz', 'Test', 'Mid-term', 'Final', 'Project', 'Assignment', 'Practical', 'Oral')
);

-- Add missing columns
ALTER TABLE academic.assessments
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ============================================================
-- 4. FIX STUDENT GRADES TABLE
-- ============================================================

-- Rename grade_points to gpa
ALTER TABLE academic.student_grades
RENAME COLUMN grade_points TO gpa;

-- Add is_passed column
ALTER TABLE academic.student_grades
ADD COLUMN IF NOT EXISTS is_passed BOOLEAN;

-- Add created_by and updated_by
ALTER TABLE academic.student_grades
ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE academic.student_grades
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Remove unused columns
ALTER TABLE academic.student_grades
DROP COLUMN IF EXISTS is_grace_marks;

ALTER TABLE academic.student_grades
DROP COLUMN IF EXISTS grace_marks;

ALTER TABLE academic.student_grades
DROP COLUMN IF EXISTS submitted_date;

-- school_id already exists, just make sure it's there
-- ALTER TABLE academic.student_grades ADD COLUMN IF NOT EXISTS school_id UUID;

-- ============================================================
-- 5. FIX EXAMINATIONS TABLES - COMPLETE RESTRUCTURE
-- ============================================================

-- Drop existing exam tables (preserve data if needed - comment out if data exists)
-- WARNING: This will delete all exam data! Back up first if needed.

DROP TABLE IF EXISTS academic.exam_results CASCADE;
DROP TABLE IF EXISTS academic.exam_schedule CASCADE;
DROP TABLE IF EXISTS academic.examinations CASCADE;

-- Recreate examinations table with new structure
CREATE TABLE academic.examinations (
    examination_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    exam_name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,

    -- Support multiple classes
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
    CONSTRAINT valid_exam_status CHECK (status IN ('Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Postponed')),
    CONSTRAINT valid_exam_type CHECK (exam_type IN ('Unit Test', 'Mid-term', 'Final', 'Board Exam', 'Mock Test', 'Practical Exam'))
);

-- Recreate exam_schedule table
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

-- Recreate exam_results table linked to schedule (not exam)
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

    CONSTRAINT fk_exam_schedule FOREIGN KEY (exam_schedule_id) REFERENCES academic.exam_schedule(schedule_id) ON DELETE CASCADE,
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT unique_schedule_student UNIQUE (exam_schedule_id, student_id)
);

-- ============================================================
-- 6. FIX ASSIGNMENTS TABLE
-- ============================================================

-- Rename assigned_by_teacher_id to teacher_id
ALTER TABLE academic.assignments
RENAME COLUMN assigned_by_teacher_id TO teacher_id;

-- Remove assignment_file_url, add attachments JSONB
ALTER TABLE academic.assignments
DROP COLUMN IF EXISTS assignment_file_url;

ALTER TABLE academic.assignments
ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Add instructions column
ALTER TABLE academic.assignments
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Add updated_by
ALTER TABLE academic.assignments
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Update status check constraint
ALTER TABLE academic.assignments
DROP CONSTRAINT IF EXISTS valid_assignment_status;

ALTER TABLE academic.assignments
ADD CONSTRAINT valid_assignment_status CHECK (status IN ('Draft', 'Published', 'Closed', 'Archived'));

-- Add assignment type check
ALTER TABLE academic.assignments
ADD CONSTRAINT valid_assignment_type CHECK (
    assignment_type IN ('Homework', 'Project', 'Lab Work', 'Research', 'Presentation', 'Essay', 'Problem Set')
);

-- ============================================================
-- 7. FIX ASSIGNMENT SUBMISSIONS TABLE
-- ============================================================

-- Rename submission_text to submission_content
ALTER TABLE academic.assignment_submissions
RENAME COLUMN submission_text TO submission_content;

-- Rename submission_files to attachments
ALTER TABLE academic.assignment_submissions
RENAME COLUMN submission_files TO attachments;

-- Add final_marks column
ALTER TABLE academic.assignment_submissions
ADD COLUMN IF NOT EXISTS final_marks DECIMAL(6,2);

-- Add created_by and updated_by
ALTER TABLE academic.assignment_submissions
ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE academic.assignment_submissions
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add remarks column
ALTER TABLE academic.assignment_submissions
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Remove plagiarism columns (not implemented)
ALTER TABLE academic.assignment_submissions
DROP COLUMN IF EXISTS plagiarism_score;

ALTER TABLE academic.assignment_submissions
DROP COLUMN IF EXISTS plagiarism_report_url;

-- Update status check constraint
ALTER TABLE academic.assignment_submissions
DROP CONSTRAINT IF EXISTS valid_submission_status;

ALTER TABLE academic.assignment_submissions
ADD CONSTRAINT valid_submission_status CHECK (status IN ('Pending', 'Submitted', 'Graded', 'Returned', 'Late'));

-- ============================================================
-- 8. FIX TIMETABLE CONFIG TABLE
-- ============================================================

-- Rename columns to match implementation
ALTER TABLE academic.timetable_config
RENAME COLUMN period_duration_minutes TO period_duration;

ALTER TABLE academic.timetable_config
RENAME COLUMN break_duration_minutes TO break_duration;

ALTER TABLE academic.timetable_config
RENAME COLUMN lunch_break_duration_minutes TO lunch_duration;

ALTER TABLE academic.timetable_config
RENAME COLUMN school_start_time TO start_time;

-- Rename periods_per_day to match (already correct)
-- Add new columns
ALTER TABLE academic.timetable_config
ADD COLUMN IF NOT EXISTS break_after_period INTEGER;

ALTER TABLE academic.timetable_config
ADD COLUMN IF NOT EXISTS lunch_after_period INTEGER;

ALTER TABLE academic.timetable_config
ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE academic.timetable_config
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Remove unused columns
ALTER TABLE academic.timetable_config
DROP COLUMN IF EXISTS config_name;

ALTER TABLE academic.timetable_config
DROP COLUMN IF EXISTS school_end_time;

-- ============================================================
-- 9. FIX TIMETABLE TABLE
-- ============================================================

-- Make config_id nullable (implementation doesn't use it)
ALTER TABLE academic.timetable
ALTER COLUMN config_id DROP NOT NULL;

-- Remove boolean flags, we use period_type instead
ALTER TABLE academic.timetable
DROP COLUMN IF EXISTS is_break;

ALTER TABLE academic.timetable
DROP COLUMN IF EXISTS is_lunch;

ALTER TABLE academic.timetable
DROP COLUMN IF EXISTS is_substitution;

ALTER TABLE academic.timetable
DROP COLUMN IF EXISTS original_teacher_id;

ALTER TABLE academic.timetable
DROP COLUMN IF EXISTS substitution_reason;

-- period_type already exists - ensure it's there
ALTER TABLE academic.timetable
ADD COLUMN IF NOT EXISTS period_type VARCHAR(50) DEFAULT 'Regular';

-- Add constraint for period_type
ALTER TABLE academic.timetable
ADD CONSTRAINT valid_period_type CHECK (
    period_type IN ('Regular', 'Break', 'Lunch', 'Assembly', 'Sports', 'Library')
);

-- Update unique constraint to handle null sections properly
ALTER TABLE academic.timetable
DROP CONSTRAINT IF EXISTS unique_timetable_slot;

-- Create unique constraint that treats null section as distinct value
CREATE UNIQUE INDEX unique_timetable_slot
ON academic.timetable(school_id, class, COALESCE(section, ''), day_of_week, period_number)
WHERE is_deleted = FALSE;

-- ============================================================
-- 10. FIX TEACHER WORKLOAD TABLE
-- ============================================================

-- Complete restructure - drop and recreate
DROP TABLE IF EXISTS academic.teacher_workload CASCADE;

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

-- ============================================================
-- 11. ADD MISSING INDEXES FOR SOFT DELETE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subjects_not_deleted
ON academic.subjects(subject_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_syllabus_not_deleted
ON academic.subject_syllabus(syllabus_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_assessments_not_deleted
ON academic.assessments(assessment_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_grades_not_deleted
ON academic.student_grades(grade_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_exams_not_deleted
ON academic.examinations(examination_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_exam_schedule_not_deleted
ON academic.exam_schedule(schedule_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_exam_results_not_deleted
ON academic.exam_results(result_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_assignments_not_deleted
ON academic.assignments(assignment_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_submissions_not_deleted
ON academic.assignment_submissions(submission_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_timetable_not_deleted
ON academic.timetable(timetable_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_workload_not_deleted
ON academic.teacher_workload(workload_id) WHERE is_deleted = FALSE;

-- ============================================================
-- 12. ADD PERFORMANCE INDEXES
-- ============================================================

-- Frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_assessments_type ON academic.assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON academic.assessments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON academic.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON academic.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_date ON academic.exam_schedule(exam_date);

-- ============================================================
-- 13. UPDATE TRIGGERS FOR NEW TABLES
-- ============================================================

DROP TRIGGER IF EXISTS update_examinations_updated_at ON academic.examinations;
CREATE TRIGGER update_examinations_updated_at BEFORE UPDATE ON academic.examinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_schedule_updated_at ON academic.exam_schedule;
CREATE TRIGGER update_exam_schedule_updated_at BEFORE UPDATE ON academic.exam_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_results_updated_at ON academic.exam_results;
CREATE TRIGGER update_exam_results_updated_at BEFORE UPDATE ON academic.exam_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timetable_config_updated_at ON academic.timetable_config;
CREATE TRIGGER update_timetable_config_updated_at BEFORE UPDATE ON academic.timetable_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 14. ADD DATA VALIDATION CONSTRAINTS
-- ============================================================

-- Marks validation
ALTER TABLE academic.student_grades
ADD CONSTRAINT IF NOT EXISTS valid_marks CHECK (marks_obtained >= 0);

ALTER TABLE academic.student_grades
ADD CONSTRAINT IF NOT EXISTS valid_percentage CHECK (percentage >= 0 AND percentage <= 100);

ALTER TABLE academic.student_grades
ADD CONSTRAINT IF NOT EXISTS valid_gpa CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 10));

-- Assignment dates validation
ALTER TABLE academic.assignments
ADD CONSTRAINT IF NOT EXISTS valid_assignment_dates CHECK (due_date >= assigned_date);

-- Exam dates validation
ALTER TABLE academic.examinations
ADD CONSTRAINT IF NOT EXISTS valid_exam_dates CHECK (end_date >= start_date);

-- Exam results validation
ALTER TABLE academic.exam_results
ADD CONSTRAINT IF NOT EXISTS valid_exam_marks CHECK (marks_obtained IS NULL OR marks_obtained >= 0);

ALTER TABLE academic.exam_results
ADD CONSTRAINT IF NOT EXISTS valid_exam_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100));

-- Assignment submission marks validation
ALTER TABLE academic.assignment_submissions
ADD CONSTRAINT IF NOT EXISTS valid_submission_marks CHECK (marks_obtained IS NULL OR marks_obtained >= 0);

ALTER TABLE academic.assignment_submissions
ADD CONSTRAINT IF NOT EXISTS valid_final_marks CHECK (final_marks IS NULL OR final_marks >= 0);

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 007 completed successfully';
    RAISE NOTICE 'Schema aligned with Phase 2 service implementations';
    RAISE NOTICE 'All blocker issues resolved';
END $$;
