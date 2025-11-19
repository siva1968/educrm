-- ============================================================
-- Migration 003: Create Gate Pass Management Schema
-- Description: Student entry/exit tracking and gate pass management
-- ============================================================

CREATE SCHEMA IF NOT EXISTS gate_pass_mgmt;

-- Gate Passes
CREATE TABLE gate_pass_mgmt.gate_passes (
    pass_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    -- Pass Details
    pass_number VARCHAR(50) UNIQUE NOT NULL,
    pass_type VARCHAR(50) NOT NULL,

    -- Date & Time
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Reason
    reason_category VARCHAR(100),
    reason_description TEXT,

    -- Approval Workflow
    requested_by_parent_id UUID,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    approved_by_principal UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'Pending',

    rejection_reason TEXT,

    -- Authorization
    authorized_contact_name VARCHAR(255),
    authorized_contact_phone VARCHAR(20),
    authorized_contact_relation VARCHAR(50),
    authorized_contact_id_proof VARCHAR(100),

    -- Digital Signature/QR Code
    qr_code_url VARCHAR(500),
    qr_code_data TEXT,

    -- Gate Entry/Exit Tracking
    gate_entry_time TIMESTAMP WITH TIME ZONE,
    gate_entry_verified_by UUID,
    gate_exit_time TIMESTAMP WITH TIME ZONE,
    gate_exit_verified_by UUID,

    actual_pickup_person_name VARCHAR(255),
    actual_pickup_person_id_proof VARCHAR(100),
    actual_pickup_person_photo_url VARCHAR(500),

    -- Status
    status VARCHAR(20) DEFAULT 'Pending',

    -- Notes
    admin_notes TEXT,
    security_notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_pass_type CHECK (pass_type IN ('Early Departure', 'Late Arrival', 'Day Off', 'Emergency Pickup', 'Medical Leave')),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    CONSTRAINT valid_status CHECK (status IN ('Pending', 'Active', 'Verified', 'Completed', 'Cancelled', 'Expired'))
);

-- Gate Access Log (for audit trail)
CREATE TABLE gate_pass_mgmt.gate_access_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    access_type VARCHAR(20) NOT NULL,
    access_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    gate_id VARCHAR(50),
    gate_name VARCHAR(255),

    verification_method VARCHAR(50),
    verified_by_user_id UUID,
    verified_by_name VARCHAR(255),

    pass_id UUID,

    -- Student Details at Time of Access
    student_class VARCHAR(10),
    student_section VARCHAR(5),

    -- Anomaly Detection
    is_anomalous BOOLEAN DEFAULT FALSE,
    anomaly_reason TEXT,
    anomaly_type VARCHAR(50),
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_to JSONB DEFAULT '[]',

    -- Additional Info
    temperature_recorded DECIMAL(4,1),
    photo_captured_url VARCHAR(500),
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT fk_pass FOREIGN KEY (pass_id) REFERENCES gate_pass_mgmt.gate_passes(pass_id),
    CONSTRAINT valid_access_type CHECK (access_type IN ('Entry', 'Exit'))
);

-- Gate Configuration
CREATE TABLE gate_pass_mgmt.gate_configuration (
    gate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    gate_name VARCHAR(255) NOT NULL,
    gate_code VARCHAR(50) UNIQUE NOT NULL,
    gate_type VARCHAR(50),

    -- Location
    location_description TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Operating Hours
    operating_hours JSONB DEFAULT '{"weekdays": {"start": "07:00", "end": "17:00"}}',

    -- Security Personnel
    assigned_personnel JSONB DEFAULT '[]',

    -- Device Configuration
    has_rfid_scanner BOOLEAN DEFAULT FALSE,
    has_biometric_scanner BOOLEAN DEFAULT FALSE,
    has_qr_scanner BOOLEAN DEFAULT TRUE,
    has_camera BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_gate_type CHECK (gate_type IN ('Main Gate', 'Side Gate', 'Emergency Exit', 'Staff Gate'))
);

-- Visitor Management (integrated with gate pass)
CREATE TABLE gate_pass_mgmt.visitors (
    visitor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    -- Visitor Details
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    visitor_email VARCHAR(255),
    visitor_id_proof_type VARCHAR(50),
    visitor_id_proof_number VARCHAR(100),

    -- Visit Purpose
    purpose VARCHAR(100) NOT NULL,
    purpose_description TEXT,

    -- Meeting Details
    meeting_with_student_id UUID,
    meeting_with_staff_id UUID,
    meeting_with_name VARCHAR(255),

    -- Visit Timing
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_checkout_time TIMESTAMP WITH TIME ZONE,
    actual_checkout_time TIMESTAMP WITH TIME ZONE,

    -- Authorization
    approved_by UUID,
    approval_status VARCHAR(20) DEFAULT 'Pending',

    -- Security
    visitor_photo_url VARCHAR(500),
    visitor_badge_number VARCHAR(50),
    belongings_checked BOOLEAN DEFAULT FALSE,

    -- Gate Info
    entry_gate_id UUID,
    exit_gate_id UUID,

    -- Status
    status VARCHAR(20) DEFAULT 'Pending',

    -- Notes
    security_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT fk_meeting_student FOREIGN KEY (meeting_with_student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT valid_purpose CHECK (purpose IN ('Parent Meeting', 'Vendor', 'Interview', 'Maintenance', 'Guest Lecture', 'Other')),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT valid_status CHECK (status IN ('Pending', 'Checked In', 'Checked Out', 'Cancelled'))
);

-- Indexes
CREATE INDEX idx_gate_passes_student ON gate_pass_mgmt.gate_passes(student_id);
CREATE INDEX idx_gate_passes_school ON gate_pass_mgmt.gate_passes(school_id);
CREATE INDEX idx_gate_passes_status ON gate_pass_mgmt.gate_passes(approval_status);
CREATE INDEX idx_gate_passes_pass_number ON gate_pass_mgmt.gate_passes(pass_number);
CREATE INDEX idx_gate_passes_valid_from ON gate_pass_mgmt.gate_passes(valid_from);

CREATE INDEX idx_gate_access_logs_student ON gate_pass_mgmt.gate_access_logs(student_id);
CREATE INDEX idx_gate_access_logs_school ON gate_pass_mgmt.gate_access_logs(school_id);
CREATE INDEX idx_gate_access_logs_timestamp ON gate_pass_mgmt.gate_access_logs(access_timestamp);
CREATE INDEX idx_gate_access_logs_anomalous ON gate_pass_mgmt.gate_access_logs(is_anomalous) WHERE is_anomalous = TRUE;

CREATE INDEX idx_visitors_school ON gate_pass_mgmt.visitors(school_id);
CREATE INDEX idx_visitors_status ON gate_pass_mgmt.visitors(status);
CREATE INDEX idx_visitors_check_in ON gate_pass_mgmt.visitors(check_in_time);

-- Triggers
CREATE TRIGGER update_gate_passes_updated_at BEFORE UPDATE ON gate_pass_mgmt.gate_passes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_configuration_updated_at BEFORE UPDATE ON gate_pass_mgmt.gate_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON gate_pass_mgmt.visitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique pass number
CREATE OR REPLACE FUNCTION generate_pass_number()
RETURNS TEXT AS $$
DECLARE
    new_pass_number TEXT;
    pass_exists BOOLEAN;
BEGIN
    LOOP
        new_pass_number := 'GP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

        SELECT EXISTS(SELECT 1 FROM gate_pass_mgmt.gate_passes WHERE pass_number = new_pass_number) INTO pass_exists;

        EXIT WHEN NOT pass_exists;
    END LOOP;

    RETURN new_pass_number;
END;
$$ LANGUAGE plpgsql;
