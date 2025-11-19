-- =============================================
-- Migration: Create Students Table
-- Version: 001
-- Date: 2025-11-19
-- =============================================

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  blood_group VARCHAR(5),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',

  -- Academic Information
  class_id UUID REFERENCES classes(id),
  section VARCHAR(10),
  roll_number VARCHAR(20),
  academic_year VARCHAR(20) NOT NULL,
  admission_date DATE NOT NULL,
  admission_number VARCHAR(50) UNIQUE,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'withdrawn', 'suspended')),
  withdrawal_date DATE,
  withdrawal_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP,

  -- Additional fields
  profile_picture_url VARCHAR(500),
  notes TEXT
);

-- Create indexes
CREATE INDEX idx_students_student_number ON students(student_number);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_class_section ON students(class_id, section);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_academic_year ON students(academic_year);
CREATE INDEX idx_students_admission_date ON students(admission_date);
CREATE INDEX idx_students_created_at ON students(created_at);
CREATE INDEX idx_students_deleted_at ON students(deleted_at) WHERE deleted_at IS NULL;

-- Full text search index
CREATE INDEX idx_students_fulltext ON students USING gin(
  to_tsvector('english',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(student_number, '')
  )
);

-- Comments
COMMENT ON TABLE students IS 'Student information and profile data';
COMMENT ON COLUMN students.status IS 'Student enrollment status: active, inactive, graduated, withdrawn, suspended';
COMMENT ON COLUMN students.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
