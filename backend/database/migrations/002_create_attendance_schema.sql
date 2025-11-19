-- ============================================================
-- Migration 002: Create Attendance Management Schema
-- Description: Attendance tracking and analytics
-- ============================================================

CREATE SCHEMA IF NOT EXISTS attendance_mgmt;

-- Daily Attendance Records
CREATE TABLE attendance_mgmt.attendance_daily (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,
    class VARCHAR(10) NOT NULL,

    -- Attendance Date & Time
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,

    -- Attendance Status
    status VARCHAR(20) NOT NULL,
    marked_by_method VARCHAR(50),

    -- Biometric Details (if applicable)
    biometric_device_id VARCHAR(100),
    biometric_template_id VARCHAR(100),
    biometric_score DECIMAL(5,2),

    -- Reason for Absence/Leave
    absence_reason VARCHAR(255),
    absence_proof_document_url VARCHAR(500),
    absence_approved_by UUID,
    absence_approved_date TIMESTAMP WITH TIME ZONE,

    -- Late Arrival Details
    late_minutes INTEGER,
    late_reason VARCHAR(255),

    -- Audit
    marked_by UUID NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_status CHECK (status IN ('Present', 'Absent', 'Leave', 'Late', 'Half Day', 'Excused Absent')),
    CONSTRAINT unique_attendance_per_day UNIQUE (student_id, attendance_date)
);

-- Attendance Patterns & Analytics
CREATE TABLE attendance_mgmt.attendance_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    -- Monthly aggregations
    month_year DATE NOT NULL,
    total_days_present INTEGER DEFAULT 0,
    total_days_absent INTEGER DEFAULT 0,
    total_days_leave INTEGER DEFAULT 0,
    total_late_arrivals INTEGER DEFAULT 0,
    total_half_days INTEGER DEFAULT 0,

    attendance_percentage DECIMAL(5,2),

    -- Flags
    is_irregular_attendance BOOLEAN DEFAULT FALSE,
    requires_attention BOOLEAN DEFAULT FALSE,

    -- Analytics
    consecutive_absences_max INTEGER DEFAULT 0,
    consecutive_absences_current INTEGER DEFAULT 0,
    pattern_notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT unique_monthly_pattern UNIQUE (student_id, month_year)
);

-- Attendance Settings & Policies
CREATE TABLE attendance_mgmt.attendance_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    policy_name VARCHAR(255) NOT NULL,
    min_attendance_percentage DECIMAL(5,2) DEFAULT 75.00,

    -- Leave Types & Allowances
    leave_types JSONB NOT NULL DEFAULT '{"casual": 10, "medical": 15, "earned": 20}',

    -- Thresholds for Alerts
    alert_absent_days INTEGER DEFAULT 5,
    alert_late_arrivals INTEGER DEFAULT 10,
    alert_low_attendance_percentage DECIMAL(5,2) DEFAULT 75.00,

    -- Biometric Configuration
    biometric_device_type VARCHAR(100),
    biometric_enabled BOOLEAN DEFAULT FALSE,

    -- Working Days
    working_days JSONB DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id)
);

-- Leave Applications
CREATE TABLE attendance_mgmt.leave_applications (
    leave_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    leave_type VARCHAR(50) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days INTEGER NOT NULL,

    reason TEXT NOT NULL,
    supporting_document_url VARCHAR(500),

    -- Approval Workflow
    applied_by UUID NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'Pending',

    rejection_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_leave_type CHECK (leave_type IN ('Casual', 'Medical', 'Earned', 'Emergency', 'Other')),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT valid_dates CHECK (to_date >= from_date)
);

-- Indexes
CREATE INDEX idx_attendance_daily_student ON attendance_mgmt.attendance_daily(student_id);
CREATE INDEX idx_attendance_daily_date ON attendance_mgmt.attendance_daily(attendance_date);
CREATE INDEX idx_attendance_daily_school ON attendance_mgmt.attendance_daily(school_id);
CREATE INDEX idx_attendance_daily_status ON attendance_mgmt.attendance_daily(status);
CREATE INDEX idx_attendance_daily_school_class_date ON attendance_mgmt.attendance_daily(school_id, class, attendance_date);

CREATE INDEX idx_attendance_patterns_student ON attendance_mgmt.attendance_patterns(student_id);
CREATE INDEX idx_attendance_patterns_month ON attendance_mgmt.attendance_patterns(month_year);
CREATE INDEX idx_attendance_patterns_school ON attendance_mgmt.attendance_patterns(school_id);
CREATE INDEX idx_attendance_patterns_attention ON attendance_mgmt.attendance_patterns(requires_attention) WHERE requires_attention = TRUE;

CREATE INDEX idx_leave_applications_student ON attendance_mgmt.leave_applications(student_id);
CREATE INDEX idx_leave_applications_status ON attendance_mgmt.leave_applications(approval_status);
CREATE INDEX idx_leave_applications_dates ON attendance_mgmt.leave_applications(from_date, to_date);

-- Triggers
CREATE TRIGGER update_attendance_daily_updated_at BEFORE UPDATE ON attendance_mgmt.attendance_daily
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_patterns_updated_at BEFORE UPDATE ON attendance_mgmt.attendance_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_policies_updated_at BEFORE UPDATE ON attendance_mgmt.attendance_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON attendance_mgmt.leave_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
