-- ==================================================================================================
-- EduCRM Database Schema - Core Tables
-- ==================================================================================================
-- This migration creates the foundational tables for the EduCRM system
-- Author: EduCRM Team
-- Date: 2024-11-19
-- ==================================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================================================
-- SCHOOLS & TENANTS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('primary', 'secondary', 'higher_secondary', 'college', 'university', 'preschool')),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    established_date DATE,
    affiliation VARCHAR(255),
    board VARCHAR(100),
    principal_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_schools_code ON schools(code);
CREATE INDEX idx_schools_status ON schools(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_schools_type ON schools(type);

-- ==================================================================================================
-- USERS & AUTHENTICATION
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'staff', 'accountant')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    avatar_url TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'locked')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_school ON users(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);

-- ==================================================================================================
-- STUDENTS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(5),
    phone VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    admission_date DATE NOT NULL,
    admission_number VARCHAR(50),
    academic_year VARCHAR(20) NOT NULL,
    current_class_id UUID,
    section VARCHAR(10),
    roll_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'withdrawn', 'suspended', 'transferred')),
    photo_url TEXT,
    religion VARCHAR(50),
    caste VARCHAR(50),
    nationality VARCHAR(50) DEFAULT 'Indian',
    mother_tongue VARCHAR(50),
    aadhar_number VARCHAR(12),
    previous_school TEXT,
    medical_conditions TEXT,
    allergies TEXT,
    special_needs TEXT,
    transport_required BOOLEAN DEFAULT FALSE,
    hostel_required BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_students_school ON students(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_number ON students(student_number);
CREATE INDEX idx_students_class ON students(current_class_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_academic_year ON students(academic_year);

-- ==================================================================================================
-- PARENTS/GUARDIANS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    relation VARCHAR(50) NOT NULL CHECK (relation IN ('father', 'mother', 'guardian', 'other')),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    occupation VARCHAR(100),
    annual_income DECIMAL(15, 2),
    education VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    aadhar_number VARCHAR(12),
    photo_url TEXT,
    is_primary_contact BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_parents_school ON parents(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_parents_phone ON parents(phone);

-- ==================================================================================================
-- STUDENT-PARENT RELATIONSHIP
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS student_parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    can_pickup BOOLEAN DEFAULT TRUE,
    receive_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, parent_id)
);

CREATE INDEX idx_student_parents_student ON student_parents(student_id);
CREATE INDEX idx_student_parents_parent ON parent_id);

-- ==================================================================================================
-- CLASSES & SECTIONS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    level INTEGER,
    section VARCHAR(10),
    academic_year VARCHAR(20) NOT NULL,
    class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    room_number VARCHAR(50),
    capacity INTEGER,
    student_count INTEGER DEFAULT 0,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    UNIQUE(school_id, name, section, academic_year)
);

CREATE INDEX idx_classes_school ON classes(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_classes_teacher ON classes(class_teacher_id);
CREATE INDEX idx_classes_academic_year ON classes(academic_year);

-- ==================================================================================================
-- SUBJECTS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('theory', 'practical', 'both')),
    category VARCHAR(50) CHECK (category IN ('core', 'elective', 'language', 'vocational', 'other')),
    description TEXT,
    credits INTEGER,
    max_marks INTEGER,
    pass_marks INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_subjects_school ON subjects(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_code ON subjects(code);

-- ==================================================================================================
-- TEACHERS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    date_of_joining DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    qualification TEXT,
    specialization VARCHAR(255),
    experience_years INTEGER,
    department VARCHAR(100),
    designation VARCHAR(100),
    employment_type VARCHAR(50) CHECK (employment_type IN ('permanent', 'contract', 'part_time', 'guest')),
    salary DECIMAL(15, 2),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_ifsc VARCHAR(20),
    pan_number VARCHAR(20),
    aadhar_number VARCHAR(12),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'resigned', 'terminated')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_teachers_school ON teachers(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teachers_employee_id ON teachers(employee_id);
CREATE INDEX idx_teachers_status ON teachers(status);

-- ==================================================================================================
-- ATTENDANCE
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'half_day')),
    check_in_time TIME,
    check_out_time TIME,
    period VARCHAR(50),
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    remarks TEXT,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date, period)
);

CREATE INDEX idx_attendance_school ON attendance(school_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ==================================================================================================
-- FEE STRUCTURES
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    frequency VARCHAR(20) CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'half_yearly', 'yearly')),
    due_date DATE,
    late_fee_amount DECIMAL(15, 2) DEFAULT 0,
    late_fee_grace_days INTEGER DEFAULT 0,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_fee_structures_school ON fee_structures(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_fee_structures_class ON fee_structures(class_id);
CREATE INDEX idx_fee_structures_academic_year ON fee_structures(academic_year);

-- ==================================================================================================
-- FEE PAYMENTS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    discount DECIMAL(15, 2) DEFAULT 0,
    late_fee DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_mode VARCHAR(50) CHECK (payment_mode IN ('cash', 'cheque', 'online', 'card', 'upi', 'bank_transfer')),
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(255),
    cheque_number VARCHAR(50),
    cheque_date DATE,
    bank_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    remarks TEXT,
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fee_payments_school ON fee_payments(school_id);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX idx_fee_payments_receipt ON fee_payments(receipt_number);
CREATE INDEX idx_fee_payments_status ON fee_payments(status);

-- ==================================================================================================
-- EXAMINATIONS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS examinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('unit_test', 'mid_term', 'final', 'practical', 'project', 'assignment', 'other')),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_marks INTEGER,
    pass_marks INTEGER,
    description TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_examinations_school ON examinations(school_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_examinations_class ON examinations(class_id);
CREATE INDEX idx_examinations_dates ON examinations(start_date, end_date);

-- ==================================================================================================
-- EXAM RESULTS
-- ==================================================================================================

CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    examination_id UUID NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(6, 2) NOT NULL,
    max_marks DECIMAL(6, 2) NOT NULL,
    percentage DECIMAL(5, 2),
    grade VARCHAR(5),
    rank INTEGER,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'withheld')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, examination_id, subject_id)
);

CREATE INDEX idx_exam_results_school ON exam_results(school_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_exam_results_exam ON exam_results(examination_id);
CREATE INDEX idx_exam_results_subject ON exam_results(subject_id);

-- ==================================================================================================
-- TRIGGERS FOR UPDATED_AT
-- ==================================================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at
                       BEFORE UPDATE ON %I
                       FOR EACH ROW
                       EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================================
-- VIEWS FOR COMMON QUERIES
-- ==================================================================================================

CREATE OR REPLACE VIEW student_details AS
SELECT
    s.id,
    s.school_id,
    s.student_number,
    s.first_name,
    s.last_name,
    s.email,
    s.phone,
    s.date_of_birth,
    s.gender,
    s.admission_date,
    s.academic_year,
    s.status,
    c.name as class_name,
    c.section,
    s.roll_number,
    u.email as user_email,
    u.last_login_at
FROM students s
LEFT JOIN classes c ON s.current_class_id = c.id
LEFT JOIN users u ON s.user_id = u.id
WHERE s.deleted_at IS NULL;

-- ==================================================================================================
-- GRANT PERMISSIONS (if needed)
-- ==================================================================================================

-- Grant permissions to application user (uncomment and modify as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO educrm_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO educrm_app;

-- ==================================================================================================
-- END OF MIGRATION
-- ==================================================================================================
