-- ============================================================
-- Migration 001: Create SIS Core Schema
-- Description: Student Information System - Core Tables
-- ============================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS sis_core;

-- Create schools table (referenced by students)
CREATE TABLE IF NOT EXISTS public.schools (
    school_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(255) NOT NULL,
    school_code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    principal_name VARCHAR(255),
    affiliation_number VARCHAR(100),
    board VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Primary student records table
CREATE TABLE sis_core.students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    -- Basic Information
    roll_no VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),

    -- Contact Information
    email VARCHAR(255),
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),

    -- Educational Information
    class VARCHAR(10) NOT NULL,
    section VARCHAR(5),
    curriculum VARCHAR(50),
    board_code VARCHAR(20),

    -- Enrollment Details
    admission_date DATE NOT NULL,
    admission_number VARCHAR(50) UNIQUE,
    previous_school VARCHAR(255),
    previous_class VARCHAR(10),

    -- Address Information
    address_current TEXT,
    city_current VARCHAR(100),
    state_current VARCHAR(100),
    pincode_current VARCHAR(10),
    address_permanent TEXT,
    city_permanent VARCHAR(100),
    state_permanent VARCHAR(100),
    pincode_permanent VARCHAR(10),

    -- Identification Documents
    aadhar_number VARCHAR(255),
    pan_number VARCHAR(255),
    birth_certificate_number VARCHAR(50),

    -- Photo & Document Storage
    photo_url VARCHAR(500),
    photo_s3_key VARCHAR(500),

    -- Status & Flags
    status VARCHAR(20) DEFAULT 'Active',
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_gender CHECK (gender IN ('M', 'F', 'Male', 'Female', 'Other', 'Not Specified')),
    CONSTRAINT valid_status CHECK (status IN ('Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended')),
    CONSTRAINT valid_dob CHECK (date_of_birth <= CURRENT_DATE)
);

-- Family & Guardian Information
CREATE TABLE sis_core.student_guardians (
    guardian_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,

    guardian_type VARCHAR(20) NOT NULL,
    title VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    -- Contact
    email VARCHAR(255),
    phone_primary VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),

    -- Occupation
    occupation VARCHAR(100),
    organization VARCHAR(255),
    annual_income VARCHAR(50),

    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),

    -- Identification
    aadhar_number VARCHAR(255),
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(255),

    -- Relationship Details
    relation_to_student VARCHAR(50),
    is_primary_contact BOOLEAN DEFAULT FALSE,
    is_legal_guardian BOOLEAN DEFAULT FALSE,
    can_pickup_student BOOLEAN DEFAULT TRUE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE,
    CONSTRAINT valid_guardian_type CHECK (guardian_type IN ('Father', 'Mother', 'Legal Guardian', 'Grandparent', 'Other'))
);

-- Medical & Health Information
CREATE TABLE sis_core.student_medical (
    medical_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE,

    -- Blood Group & Basic Info
    blood_group VARCHAR(5),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),

    -- Medical Conditions
    existing_conditions TEXT,
    allergies TEXT,
    dietary_restrictions TEXT,
    special_needs TEXT,

    -- Vaccinations
    covid_vaccinated BOOLEAN DEFAULT FALSE,
    covid_vaccination_dates JSONB DEFAULT '[]',
    polio_vaccinated BOOLEAN DEFAULT FALSE,
    other_vaccinations JSONB DEFAULT '[]',

    -- Emergency Medical Info
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    family_doctor_name VARCHAR(255),
    family_doctor_phone VARCHAR(20),

    -- Medical Documents
    health_certificate_url VARCHAR(500),
    vaccination_certificate_url VARCHAR(500),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE,
    CONSTRAINT valid_blood_group CHECK (blood_group IN ('O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-', 'Unknown', NULL))
);

-- Student Documents Storage
CREATE TABLE sis_core.student_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,

    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_s3_url VARCHAR(500) NOT NULL,
    document_s3_key VARCHAR(500) NOT NULL,

    file_size_bytes BIGINT,
    file_mime_type VARCHAR(100),

    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID NOT NULL,

    metadata JSONB DEFAULT '{}',

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX idx_students_school_id ON sis_core.students(school_id);
CREATE INDEX idx_students_class ON sis_core.students(class);
CREATE INDEX idx_students_status ON sis_core.students(status);
CREATE INDEX idx_students_admission_date ON sis_core.students(admission_date);
CREATE INDEX idx_students_email ON sis_core.students(email) WHERE email IS NOT NULL;
CREATE INDEX idx_students_admission_number ON sis_core.students(admission_number) WHERE admission_number IS NOT NULL;

CREATE INDEX idx_guardians_student_id ON sis_core.student_guardians(student_id);
CREATE INDEX idx_guardians_primary_contact ON sis_core.student_guardians(is_primary_contact) WHERE is_primary_contact = TRUE;

CREATE INDEX idx_medical_student_id ON sis_core.student_medical(student_id);

CREATE INDEX idx_documents_student_id ON sis_core.student_documents(student_id);
CREATE INDEX idx_documents_type ON sis_core.student_documents(document_type);

-- Full-text search indexes
CREATE INDEX idx_students_full_text ON sis_core.students
    USING GIN (to_tsvector('english', first_name || ' ' || COALESCE(middle_name, '') || ' ' || last_name));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON sis_core.students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardians_updated_at BEFORE UPDATE ON sis_core.student_guardians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_updated_at BEFORE UPDATE ON sis_core.student_medical
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample school for testing
INSERT INTO public.schools (school_name, school_code, city, state, board, is_active)
VALUES ('Sample High School', 'SHS001', 'Mumbai', 'Maharashtra', 'CBSE', TRUE)
ON CONFLICT DO NOTHING;
