-- =============================================
-- Migration: Create Core System Tables
-- Version: 004
-- Date: 2025-11-19
-- =============================================

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'parent', 'staff', 'super_admin')),
  school_id UUID,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),

  -- Authentication
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,

  -- Password reset
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  grade_level INTEGER,
  academic_year VARCHAR(20) NOT NULL,
  section VARCHAR(10),
  capacity INTEGER,

  -- Teacher assignment
  class_teacher_id UUID REFERENCES users(id),

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 0,
  department VARCHAR(100),

  -- Prerequisites
  prerequisites JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timetable table
CREATE TABLE IF NOT EXISTS timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),

  -- Schedule
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50),

  -- Academic period
  academic_year VARCHAR(20) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,

  -- Substitution
  is_substitution BOOLEAN DEFAULT false,
  original_teacher_id UUID REFERENCES users(id),
  substitution_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: no overlapping periods for same teacher
  CONSTRAINT no_teacher_overlap EXCLUDE USING gist (
    teacher_id WITH =,
    day_of_week WITH =,
    tsrange(start_time::text::time, end_time::text::time) WITH &&
  ) WHERE (effective_to IS NULL OR effective_to >= CURRENT_DATE)
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),

  -- Assessment details
  assessment_name VARCHAR(200) NOT NULL,
  assessment_type VARCHAR(50) CHECK (assessment_type IN ('quiz', 'test', 'exam', 'assignment', 'project', 'practical')),
  max_score DECIMAL(10,2) NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (ROUND((score / max_score * 100)::numeric, 2)) STORED,

  -- Weighting
  weight DECIMAL(5,2) DEFAULT 1.0,

  -- Grading
  letter_grade VARCHAR(5),
  grade_points DECIMAL(3,2),
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Feedback
  feedback TEXT,
  remarks TEXT,

  -- Academic period
  academic_year VARCHAR(20) NOT NULL,
  term VARCHAR(50),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  instructions TEXT,

  -- Assignment details
  subject_id UUID NOT NULL REFERENCES subjects(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  teacher_id UUID NOT NULL REFERENCES users(id),

  -- Scoring
  max_score DECIMAL(10,2) NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.0,

  -- Dates
  assigned_date DATE DEFAULT CURRENT_DATE,
  due_date TIMESTAMP NOT NULL,
  late_submission_allowed BOOLEAN DEFAULT false,
  late_penalty_percentage DECIMAL(5,2) DEFAULT 0,

  -- Attachments
  attachments JSONB DEFAULT '[]',

  -- Academic period
  academic_year VARCHAR(20) NOT NULL,
  term VARCHAR(50),

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'archived')),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Submission details
  content TEXT,
  attachments JSONB DEFAULT '[]',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_late BOOLEAN DEFAULT false,

  -- Grading
  score DECIMAL(10,2),
  feedback TEXT,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(assignment_id, student_id)
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_classes_academic_year ON classes(academic_year);
CREATE INDEX idx_classes_teacher ON classes(class_teacher_id);
CREATE INDEX idx_classes_code ON classes(code);

CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_status ON subjects(status);

CREATE INDEX idx_timetable_class ON timetable_periods(class_id);
CREATE INDEX idx_timetable_teacher ON timetable_periods(teacher_id);
CREATE INDEX idx_timetable_subject ON timetable_periods(subject_id);
CREATE INDEX idx_timetable_day ON timetable_periods(day_of_week);
CREATE INDEX idx_timetable_academic_year ON timetable_periods(academic_year);

CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_subject ON grades(subject_id);
CREATE INDEX idx_grades_class ON grades(class_id);
CREATE INDEX idx_grades_academic_year ON grades(academic_year);
CREATE INDEX idx_grades_graded_by ON grades(graded_by);

CREATE INDEX idx_assignments_subject ON assignments(subject_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_status ON assignments(status);

CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_submissions_status ON assignment_submissions(status);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON timetable_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE users IS 'System users including students, teachers, admin, parents';
COMMENT ON TABLE classes IS 'Class/section definitions';
COMMENT ON TABLE subjects IS 'Subject/course catalog';
COMMENT ON TABLE timetable_periods IS 'Class timetable periods';
COMMENT ON TABLE grades IS 'Student grades and assessments';
COMMENT ON TABLE assignments IS 'Homework and assignments';
COMMENT ON TABLE assignment_submissions IS 'Student submissions for assignments';
