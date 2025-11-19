-- ============================================================
-- Migration 006: Create Academic Services Schema
-- Description: Grade Book, Exams, Assignments, Subjects, Timetable
-- ============================================================

CREATE SCHEMA IF NOT EXISTS academic;

-- ============================================================
-- SUBJECTS & CURRICULUM
-- ============================================================

-- Subjects
CREATE TABLE academic.subjects (
    subject_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    subject_code VARCHAR(20) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    subject_description TEXT,

    -- Curriculum
    curriculum VARCHAR(50), -- CBSE, ICSE, Cambridge, IB
    board_code VARCHAR(20),

    -- Classification
    subject_type VARCHAR(50), -- Core, Elective, Language, Sport, Art
    category VARCHAR(50), -- Science, Math, Language, Social Studies

    -- Credits and importance
    credits DECIMAL(4,2) DEFAULT 1.0,
    is_compulsory BOOLEAN DEFAULT TRUE,

    -- Class/Grade applicability
    applicable_classes JSONB DEFAULT '[]', -- ["1", "2", "3"]

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT unique_subject_code UNIQUE (school_id, subject_code)
);

-- Subject syllabus/curriculum
CREATE TABLE academic.subject_syllabus (
    syllabus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    school_id UUID NOT NULL,
    class VARCHAR(10) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,

    syllabus_content TEXT,
    learning_objectives JSONB DEFAULT '[]',
    topics JSONB DEFAULT '[]',

    -- Files
    syllabus_document_url VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT unique_syllabus UNIQUE (subject_id, class, academic_year)
);

-- ============================================================
-- GRADE BOOK
-- ============================================================

-- Assessment types configuration
CREATE TABLE academic.assessment_types (
    assessment_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    type_name VARCHAR(100) NOT NULL, -- Quiz, Test, Mid-term, Final, Project, Assignment
    type_code VARCHAR(20) NOT NULL,
    description TEXT,

    weightage DECIMAL(5,2), -- Percentage weight in final grade
    max_marks DECIMAL(6,2) DEFAULT 100,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT unique_assessment_type UNIQUE (school_id, type_code)
);

-- Assessments/Tests
CREATE TABLE academic.assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    assessment_type_id UUID NOT NULL,

    assessment_name VARCHAR(255) NOT NULL,
    assessment_code VARCHAR(50),
    description TEXT,

    -- Scheduling
    class VARCHAR(10) NOT NULL,
    section VARCHAR(5),
    academic_year VARCHAR(10) NOT NULL,
    term VARCHAR(50), -- Term 1, Term 2, Semester 1

    scheduled_date DATE,
    duration_minutes INTEGER,

    -- Grading
    total_marks DECIMAL(6,2) NOT NULL,
    passing_marks DECIMAL(6,2),

    -- Status
    status VARCHAR(20) DEFAULT 'Scheduled', -- Scheduled, In Progress, Completed, Cancelled

    -- Teachers
    created_by_teacher_id UUID,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT fk_assessment_type FOREIGN KEY (assessment_type_id) REFERENCES academic.assessment_types(assessment_type_id),
    CONSTRAINT valid_status CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled'))
);

-- Student grades/marks
CREATE TABLE academic.student_grades (
    grade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL,
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    marks_obtained DECIMAL(6,2),
    remarks TEXT,

    -- Grading
    grade VARCHAR(5), -- A+, A, B+, etc.
    grade_points DECIMAL(4,2),
    percentage DECIMAL(5,2),

    -- Status
    is_absent BOOLEAN DEFAULT FALSE,
    is_grace_marks BOOLEAN DEFAULT FALSE,
    grace_marks DECIMAL(5,2) DEFAULT 0,

    -- Submission
    submitted_date TIMESTAMP WITH TIME ZONE,
    graded_date TIMESTAMP WITH TIME ZONE,
    graded_by UUID,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assessment FOREIGN KEY (assessment_id) REFERENCES academic.assessments(assessment_id),
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT unique_student_assessment UNIQUE (assessment_id, student_id)
);

-- Report cards
CREATE TABLE academic.report_cards (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    class VARCHAR(10) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    term VARCHAR(50) NOT NULL,

    -- Overall performance
    total_marks_obtained DECIMAL(8,2),
    total_max_marks DECIMAL(8,2),
    overall_percentage DECIMAL(5,2),
    overall_grade VARCHAR(5),
    overall_gpa DECIMAL(4,2),

    -- Class performance
    class_rank INTEGER,
    total_students INTEGER,

    -- Subject-wise grades
    subject_grades JSONB DEFAULT '[]',

    -- Remarks
    teacher_remarks TEXT,
    principal_remarks TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Published, Sent to Parents
    published_date TIMESTAMP WITH TIME ZONE,

    -- Generated report
    report_pdf_url VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT unique_report UNIQUE (student_id, academic_year, term)
);

-- ============================================================
-- EXAMINATIONS
-- ============================================================

-- Exam schedules
CREATE TABLE academic.examinations (
    exam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    exam_name VARCHAR(255) NOT NULL,
    exam_code VARCHAR(50),
    exam_type VARCHAR(50), -- Mid-term, Final, Unit Test, Board Exam

    class VARCHAR(10) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    term VARCHAR(50),

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Configuration
    total_marks DECIMAL(6,2),
    passing_percentage DECIMAL(5,2) DEFAULT 40,

    -- Status
    status VARCHAR(20) DEFAULT 'Scheduled',

    -- Instructions
    instructions TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_exam_status CHECK (status IN ('Scheduled', 'Ongoing', 'Completed', 'Cancelled'))
);

-- Exam subject schedule
CREATE TABLE academic.exam_schedule (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL,
    subject_id UUID NOT NULL,

    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,

    room_number VARCHAR(50),
    max_marks DECIMAL(6,2) NOT NULL,
    passing_marks DECIMAL(6,2),

    -- Invigilators
    invigilators JSONB DEFAULT '[]',

    -- Question paper
    question_paper_url VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_exam FOREIGN KEY (exam_id) REFERENCES academic.examinations(exam_id) ON DELETE CASCADE,
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT unique_exam_subject UNIQUE (exam_id, subject_id)
);

-- Exam results
CREATE TABLE academic.exam_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL,
    student_id UUID NOT NULL,
    subject_id UUID NOT NULL,

    marks_obtained DECIMAL(6,2),
    max_marks DECIMAL(6,2),
    grade VARCHAR(5),

    is_absent BOOLEAN DEFAULT FALSE,
    is_passed BOOLEAN,

    remarks TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_exam FOREIGN KEY (exam_id) REFERENCES academic.examinations(exam_id),
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT unique_exam_student_subject UNIQUE (exam_id, student_id, subject_id)
);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

-- Assignments/Homework
CREATE TABLE academic.assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    subject_id UUID NOT NULL,

    assignment_title VARCHAR(255) NOT NULL,
    assignment_code VARCHAR(50),
    description TEXT,

    -- Target
    class VARCHAR(10) NOT NULL,
    section VARCHAR(5),

    -- Assignment details
    assignment_type VARCHAR(50), -- Homework, Project, Lab Work, Research
    max_marks DECIMAL(6,2) DEFAULT 100,

    -- Dates
    assigned_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Files
    assignment_file_url VARCHAR(500),
    reference_materials JSONB DEFAULT '[]',

    -- Submission
    allow_late_submission BOOLEAN DEFAULT TRUE,
    late_penalty_percentage DECIMAL(5,2) DEFAULT 10,

    -- Teacher
    assigned_by_teacher_id UUID,

    -- Status
    status VARCHAR(20) DEFAULT 'Active',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT valid_assignment_status CHECK (status IN ('Draft', 'Active', 'Closed', 'Cancelled'))
);

-- Assignment submissions
CREATE TABLE academic.assignment_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    student_id UUID NOT NULL,

    -- Submission
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submission_text TEXT,
    submission_files JSONB DEFAULT '[]',

    -- Status
    is_late BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Submitted',

    -- Grading
    marks_obtained DECIMAL(6,2),
    feedback TEXT,
    graded_date TIMESTAMP WITH TIME ZONE,
    graded_by UUID,

    -- Plagiarism
    plagiarism_score DECIMAL(5,2),
    plagiarism_report_url VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment FOREIGN KEY (assignment_id) REFERENCES academic.assignments(assignment_id) ON DELETE CASCADE,
    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT unique_assignment_submission UNIQUE (assignment_id, student_id),
    CONSTRAINT valid_submission_status CHECK (status IN ('Draft', 'Submitted', 'Graded', 'Returned', 'Resubmit Required'))
);

-- ============================================================
-- TIMETABLE
-- ============================================================

-- Timetable configuration
CREATE TABLE academic.timetable_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    config_name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,

    -- Period configuration
    periods_per_day INTEGER DEFAULT 8,
    period_duration_minutes INTEGER DEFAULT 45,
    break_duration_minutes INTEGER DEFAULT 10,
    lunch_break_duration_minutes INTEGER DEFAULT 30,

    -- Timings
    school_start_time TIME NOT NULL,
    school_end_time TIME NOT NULL,

    -- Working days
    working_days JSONB DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id)
);

-- Class timetable
CREATE TABLE academic.timetable (
    timetable_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    config_id UUID NOT NULL,

    class VARCHAR(10) NOT NULL,
    section VARCHAR(5),

    day_of_week VARCHAR(10) NOT NULL, -- Monday, Tuesday, etc.
    period_number INTEGER NOT NULL,

    -- Period details
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Subject and teacher
    subject_id UUID,
    teacher_id UUID,

    -- Room
    room_number VARCHAR(50),

    -- Special periods
    is_break BOOLEAN DEFAULT FALSE,
    is_lunch BOOLEAN DEFAULT FALSE,
    period_type VARCHAR(50) DEFAULT 'Regular', -- Regular, Lab, Library, Sports, Assembly

    -- Substitution
    is_substitution BOOLEAN DEFAULT FALSE,
    original_teacher_id UUID,
    substitution_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT fk_config FOREIGN KEY (config_id) REFERENCES academic.timetable_config(config_id),
    CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES academic.subjects(subject_id),
    CONSTRAINT valid_day CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    CONSTRAINT unique_timetable_slot UNIQUE (school_id, class, section, day_of_week, period_number)
);

-- Teacher workload
CREATE TABLE academic.teacher_workload (
    workload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    academic_year VARCHAR(10) NOT NULL,

    total_periods_per_week INTEGER DEFAULT 0,
    total_classes INTEGER DEFAULT 0,
    subjects_taught JSONB DEFAULT '[]',

    -- Workload limits
    max_periods_per_day INTEGER DEFAULT 6,
    max_periods_per_week INTEGER DEFAULT 30,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT unique_teacher_year UNIQUE (teacher_id, academic_year)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Subjects
CREATE INDEX idx_subjects_school ON academic.subjects(school_id);
CREATE INDEX idx_subjects_code ON academic.subjects(subject_code);
CREATE INDEX idx_subjects_active ON academic.subjects(is_active) WHERE is_active = TRUE;

-- Assessments
CREATE INDEX idx_assessments_school ON academic.assessments(school_id);
CREATE INDEX idx_assessments_subject ON academic.assessments(subject_id);
CREATE INDEX idx_assessments_class ON academic.assessments(class);
CREATE INDEX idx_assessments_date ON academic.assessments(scheduled_date);

-- Student grades
CREATE INDEX idx_grades_assessment ON academic.student_grades(assessment_id);
CREATE INDEX idx_grades_student ON academic.student_grades(student_id);
CREATE INDEX idx_grades_school ON academic.student_grades(school_id);

-- Examinations
CREATE INDEX idx_exams_school ON academic.examinations(school_id);
CREATE INDEX idx_exams_class ON academic.examinations(class);
CREATE INDEX idx_exams_dates ON academic.examinations(start_date, end_date);

-- Exam schedule
CREATE INDEX idx_exam_schedule_exam ON academic.exam_schedule(exam_id);
CREATE INDEX idx_exam_schedule_subject ON academic.exam_schedule(subject_id);
CREATE INDEX idx_exam_schedule_date ON academic.exam_schedule(exam_date);

-- Exam results
CREATE INDEX idx_exam_results_exam ON academic.exam_results(exam_id);
CREATE INDEX idx_exam_results_student ON academic.exam_results(student_id);
CREATE INDEX idx_exam_results_subject ON academic.exam_results(subject_id);

-- Assignments
CREATE INDEX idx_assignments_school ON academic.assignments(school_id);
CREATE INDEX idx_assignments_subject ON academic.assignments(subject_id);
CREATE INDEX idx_assignments_class ON academic.assignments(class);
CREATE INDEX idx_assignments_due_date ON academic.assignments(due_date);

-- Assignment submissions
CREATE INDEX idx_submissions_assignment ON academic.assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON academic.assignment_submissions(student_id);
CREATE INDEX idx_submissions_status ON academic.assignment_submissions(status);

-- Timetable
CREATE INDEX idx_timetable_school ON academic.timetable(school_id);
CREATE INDEX idx_timetable_class ON academic.timetable(class, section);
CREATE INDEX idx_timetable_subject ON academic.timetable(subject_id);
CREATE INDEX idx_timetable_teacher ON academic.timetable(teacher_id);
CREATE INDEX idx_timetable_day ON academic.timetable(day_of_week);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON academic.subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON academic.assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON academic.student_grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_cards_updated_at BEFORE UPDATE ON academic.report_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_examinations_updated_at BEFORE UPDATE ON academic.examinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_results_updated_at BEFORE UPDATE ON academic.exam_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON academic.assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON academic.assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON academic.timetable
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_workload_updated_at BEFORE UPDATE ON academic.teacher_workload
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
