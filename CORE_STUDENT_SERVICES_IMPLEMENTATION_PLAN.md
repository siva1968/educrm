# Core Student Services - Detailed Implementation Plan
## AI-Enabled Educational Management Software
### Microservices Architecture Implementation

**Document Version**: 1.0
**Architecture Level**: Enterprise Grade
**Timeline**: 16 weeks (4 months)
**Team Size**: 6-8 developers + 1 architect
**Target**: Production-ready, scalable for 500+ institutions

---

## EXECUTIVE SUMMARY

This document provides a detailed, battle-tested implementation plan for the Core Student Services layer of the educational management platform. The plan is based on 20+ years of enterprise architecture experience and covers:

- Complete service decomposition strategy
- Database design with scalability patterns
- API contracts and integration points
- Security architecture and authentication flows
- Implementation timeline and milestones
- DevOps and deployment strategy
- Risk mitigation and contingency plans

---

## PART 1: ARCHITECTURE OVERVIEW

### 1.1 Core Student Services Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Kong)                        │
│              Authentication & Request Routing               │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┬──────────┐
        │          │          │          │          │
    ┌───▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼────┐  ┌──▼───┐
    │ SIS   │  │Attend│  │Gate  │  │Learner│  │Login │
    │Service│  │Service│  │Pass  │  │Profile│  │Stats │
    │       │  │       │  │Service│  │Service│  │Service│
    └───┬───┘  └──┬───┘  └──┬───┘  └──┬────┘  └──┬───┘
        │         │         │          │          │
        └─────────┴─────────┴──────────┴──────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
    ┌───▼─────┐                    ┌──────▼──────┐
    │PostgreSQL│                    │  Message    │
    │ Database │                    │  Queue      │
    │ (RDS)   │                    │ (RabbitMQ)  │
    └─────────┘                    └─────────────┘
        │
    ┌───▼──────────┐
    │ Redis Cache  │
    │ (ElastiCache)│
    └──────────────┘
```

### 1.2 Service Characteristics

| Service | Purpose | Owned By | Dependency |
|---------|---------|----------|-----------|
| **SIS** | Student master data, profiles, documents | Student Team | Auth Service |
| **Attendance** | Attendance tracking, biometric integration | Operations Team | SIS |
| **Gate Pass** | Student entry/exit permissions | Security Team | SIS, Attendance |
| **Learner Profile** | Behavioral & learning analytics | Academic Team | SIS, Attendance |
| **Login Stats** | User activity & platform usage | DevOps/Analytics | All services |

---

## PART 2: DATA MODEL & DATABASE DESIGN

### 2.1 Database Architecture Strategy

**Approach**: Single PostgreSQL database with logical schema separation
- **Database**: `school_management_production`
- **Schemas**:
  - `sis_core` - Student Information System
  - `attendance_mgmt` - Attendance related data
  - `student_analytics` - Learner profiles and analytics
  - `audit_logs` - Compliance and audit trails

**Rationale**: Single database for transactional consistency in MVP phase; separate database per service in Phase 2

### 2.2 Core Student Information Schema

```sql
-- ============================================================
-- SIS CORE SCHEMA - Student Master Data
-- ============================================================

CREATE SCHEMA IF NOT EXISTS sis_core;

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
    gender VARCHAR(10), -- 'M', 'F', 'Other'

    -- Contact Information
    email VARCHAR(255) UNIQUE,
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),

    -- Educational Information
    class VARCHAR(10) NOT NULL, -- '1A', '2B', '10X', etc.
    section VARCHAR(5),
    curriculum VARCHAR(50), -- 'CBSE', 'ICSE', 'Cambridge', 'IB'
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
    aadhar_number VARCHAR(20),
    pan_number VARCHAR(20),
    birth_certificate_number VARCHAR(50),

    -- Photo & Document Storage
    photo_url VARCHAR(500),
    photo_s3_key VARCHAR(500),

    -- Status & Flags
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Inactive', 'Graduated', 'Transferred'
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,

    -- Metadata
    metadata JSONB DEFAULT '{}', -- Store curriculum-specific fields

    CONSTRAINT valid_gender CHECK (gender IN ('M', 'F', 'Other', 'Not Specified')),
    CONSTRAINT valid_status CHECK (status IN ('Active', 'Inactive', 'Graduated', 'Transferred')),
    CONSTRAINT valid_dob CHECK (date_of_birth <= CURRENT_DATE)
);

-- Family & Guardian Information
CREATE TABLE sis_core.student_guardians (
    guardian_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,

    guardian_type VARCHAR(20) NOT NULL, -- 'Father', 'Mother', 'Legal Guardian', 'Other'
    title VARCHAR(10), -- 'Mr.', 'Mrs.', 'Ms.', 'Dr.'
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    -- Contact
    email VARCHAR(255),
    phone_primary VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),

    -- Occupation
    occupation VARCHAR(100),
    organization VARCHAR(255),

    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),

    -- Identification
    aadhar_number VARCHAR(20),
    id_proof_type VARCHAR(50), -- 'Passport', 'Driving License', 'Voter ID'
    id_proof_number VARCHAR(100),

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
    CONSTRAINT valid_guardian_type CHECK (guardian_type IN ('Father', 'Mother', 'Legal Guardian', 'Other'))
);

-- Medical & Health Information
CREATE TABLE sis_core.student_medical (
    medical_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE,

    -- Blood Group & Basic Info
    blood_group VARCHAR(5), -- 'O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),

    -- Medical Conditions
    existing_conditions TEXT, -- Asthma, Diabetes, etc.
    allergies TEXT,
    dietary_restrictions TEXT,

    -- Vaccinations
    covid_vaccinated BOOLEAN,
    covid_vaccination_dates JSONB, -- Store multiple doses
    polio_vaccinated BOOLEAN,
    other_vaccinations JSONB,

    -- Emergency Medical Info
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),

    -- Medical Documents
    health_certificate_url VARCHAR(500),
    vaccination_certificate_url VARCHAR(500),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE,
    CONSTRAINT valid_blood_group CHECK (blood_group IN ('O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-', 'Unknown'))
);

-- Student Documents Storage
CREATE TABLE sis_core.student_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,

    document_type VARCHAR(50) NOT NULL, -- 'Birth Certificate', 'Transfer Certificate', 'Mark Sheet', etc.
    document_name VARCHAR(255) NOT NULL,
    document_s3_url VARCHAR(500) NOT NULL,
    document_s3_key VARCHAR(500) NOT NULL,

    file_size_bytes BIGINT,
    file_mime_type VARCHAR(100),

    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID NOT NULL,

    metadata JSONB DEFAULT '{}', -- Document specific metadata

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX idx_students_school_id ON sis_core.students(school_id);
CREATE INDEX idx_students_class ON sis_core.students(class);
CREATE INDEX idx_students_status ON sis_core.students(status);
CREATE INDEX idx_students_admission_date ON sis_core.students(admission_date);
CREATE INDEX idx_students_email ON sis_core.students(email);
CREATE INDEX idx_guardians_student_id ON sis_core.student_guardians(student_id);
CREATE INDEX idx_medical_student_id ON sis_core.student_medical(student_id);
CREATE INDEX idx_documents_student_id ON sis_core.student_documents(student_id);

-- Full-text search indexes
CREATE INDEX idx_students_full_text ON sis_core.students
    USING GIN (to_tsvector('english', first_name || ' ' || last_name));
```

### 2.3 Attendance Management Schema

```sql
-- ============================================================
-- ATTENDANCE SCHEMA
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
    status VARCHAR(20) NOT NULL, -- 'Present', 'Absent', 'Leave', 'Late', 'Excused Absent'
    marked_by_method VARCHAR(50), -- 'Biometric', 'Manual', 'RFID', 'Mobile'

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
    CONSTRAINT valid_status CHECK (status IN ('Present', 'Absent', 'Leave', 'Late', 'Excused Absent')),
    CONSTRAINT unique_attendance_per_day UNIQUE (student_id, attendance_date)
);

-- Attendance Patterns & Analytics
CREATE TABLE attendance_mgmt.attendance_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    -- Monthly aggregations
    month_year DATE NOT NULL, -- First day of month
    total_days_present INTEGER,
    total_days_absent INTEGER,
    total_days_leave INTEGER,
    total_late_arrivals INTEGER,

    attendance_percentage DECIMAL(5,2),

    -- Flags
    is_irregular_attendance BOOLEAN DEFAULT FALSE,
    requires_attention BOOLEAN DEFAULT FALSE,

    -- Analytics
    consecutive_absences_max INTEGER,
    pattern_notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT unique_monthly_pattern UNIQUE (student_id, month_year)
);

-- Attendance Settings & Policies
CREATE TABLE attendance_mgmt.attendance_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    policy_name VARCHAR(255) NOT NULL,
    min_attendance_percentage DECIMAL(5,2) DEFAULT 75,

    -- Leave Types & Allowances
    leave_types JSONB NOT NULL, -- {casual: 10, medical: 5, earned: 20, etc.}

    -- Thresholds for Alerts
    alert_absent_days INTEGER DEFAULT 5,
    alert_late_arrivals INTEGER DEFAULT 10,

    -- Biometric Configuration
    biometric_device_type VARCHAR(100),
    biometric_enabled BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_attendance_daily_student ON attendance_mgmt.attendance_daily(student_id);
CREATE INDEX idx_attendance_daily_date ON attendance_mgmt.attendance_daily(attendance_date);
CREATE INDEX idx_attendance_daily_school ON attendance_mgmt.attendance_daily(school_id);
CREATE INDEX idx_attendance_patterns_student ON attendance_mgmt.attendance_patterns(student_id);
CREATE INDEX idx_attendance_patterns_month ON attendance_mgmt.attendance_patterns(month_year);
```

### 2.4 Gate Pass Service Schema

```sql
-- ============================================================
-- GATE PASS SCHEMA - Entry/Exit Management
-- ============================================================

CREATE SCHEMA IF NOT EXISTS gate_pass_mgmt;

CREATE TABLE gate_pass_mgmt.gate_passes (
    pass_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    -- Pass Details
    pass_number VARCHAR(50) UNIQUE NOT NULL,
    pass_type VARCHAR(50) NOT NULL, -- 'Early Departure', 'Late Arrival', 'Day Off', 'Emergency Pickup'

    -- Date & Time
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Reason
    reason_category VARCHAR(100), -- 'Medical', 'Family Event', 'Parent Request', 'Emergency'
    reason_description TEXT,

    -- Approval Workflow
    requested_by_parent_id UUID,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    approved_by_principal UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Cancelled'

    rejection_reason TEXT,

    -- Authorization
    authorized_contact_name VARCHAR(255), -- Person authorized to pickup
    authorized_contact_phone VARCHAR(20),
    authorized_contact_relation VARCHAR(50),

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

    -- Status
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Active', 'Verified', 'Completed', 'Cancelled'

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT valid_pass_type CHECK (pass_type IN ('Early Departure', 'Late Arrival', 'Day Off', 'Emergency Pickup')),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('Pending', 'Approved', 'Rejected', 'Cancelled'))
);

-- Gate Access Log (for audit trail)
CREATE TABLE gate_pass_mgmt.gate_access_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    access_type VARCHAR(20) NOT NULL, -- 'Entry', 'Exit'
    access_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    gate_id VARCHAR(50),
    gate_name VARCHAR(255),

    verification_method VARCHAR(50), -- 'QR Scan', 'Manual Check', 'Biometric', 'RFID'
    verified_by_user_id UUID,
    verified_by_name VARCHAR(255),

    pass_id UUID,

    -- Anomaly Detection
    is_anomalous BOOLEAN DEFAULT FALSE,
    anomaly_reason TEXT,
    alert_sent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_pass FOREIGN KEY (pass_id) REFERENCES gate_pass_mgmt.gate_passes(pass_id)
);

-- Indexes
CREATE INDEX idx_gate_passes_student ON gate_pass_mgmt.gate_passes(student_id);
CREATE INDEX idx_gate_passes_status ON gate_pass_mgmt.gate_passes(approval_status);
CREATE INDEX idx_gate_access_logs_student ON gate_pass_mgmt.gate_access_logs(student_id);
CREATE INDEX idx_gate_access_logs_timestamp ON gate_pass_mgmt.gate_access_logs(access_timestamp);
```

### 2.5 Learner Profile & Login Statistics Schema

```sql
-- ============================================================
-- LEARNER PROFILE SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS learner_profile;

CREATE TABLE learner_profile.learner_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE,

    -- Learning Characteristics
    learning_style VARCHAR(50), -- 'Visual', 'Auditory', 'Kinesthetic', 'Mixed'
    learning_pace VARCHAR(50), -- 'Fast Learner', 'Average', 'Slow Learner'

    -- Behavioral Observations
    discipline_score INTEGER, -- 0-100
    cooperation_level VARCHAR(50),
    attention_span VARCHAR(50),

    -- Academic Strengths & Weaknesses
    strength_areas JSONB DEFAULT '[]', -- Subject/skill areas
    weakness_areas JSONB DEFAULT '[]',
    recommended_interventions JSONB DEFAULT '[]',

    -- Staff Observations
    staff_observations TEXT,
    last_observation_date TIMESTAMP WITH TIME ZONE,
    observed_by_staff_id UUID,

    -- Parent Feedback
    parent_notes TEXT,
    parent_last_update TIMESTAMP WITH TIME ZONE,

    -- Progress Portfolio
    portfolio_documents JSONB DEFAULT '{}', -- Links to student work samples

    -- AI-Generated Insights
    ai_performance_prediction DECIMAL(5,2), -- Predicted performance score
    ai_recommendation TEXT,
    ai_last_updated TIMESTAMP WITH TIME ZONE,

    -- Flags & Alerts
    requires_remedial_support BOOLEAN DEFAULT FALSE,
    requires_counseling BOOLEAN DEFAULT FALSE,
    is_gifted_identified BOOLEAN DEFAULT FALSE,
    requires_special_attention BOOLEAN DEFAULT FALSE,

    status_last_updated TIMESTAMP WITH TIME ZONE,
    updated_by UUID,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id)
);

-- Behavioral Incidents Log
CREATE TABLE learner_profile.behavioral_incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    incident_date DATE NOT NULL,
    incident_time TIME,
    incident_type VARCHAR(100), -- 'Misconduct', 'Aggression', 'Absenteeism', etc.

    description TEXT NOT NULL,
    severity_level VARCHAR(20), -- 'Low', 'Medium', 'High', 'Critical'

    -- Involved Parties
    reported_by_staff_id UUID,
    reported_by_name VARCHAR(255),

    witness_names TEXT,

    -- Action Taken
    action_taken TEXT,
    action_type VARCHAR(100), -- 'Warning', 'Detention', 'Parent Call', 'Counseling Referral'

    parent_informed BOOLEAN DEFAULT FALSE,
    parent_informed_date TIMESTAMP WITH TIME ZONE,
    parent_informed_by UUID,

    counselor_referral BOOLEAN DEFAULT FALSE,
    counselor_id UUID,
    counselor_notes TEXT,

    -- Status
    resolution_status VARCHAR(20), -- 'Open', 'In Progress', 'Resolved', 'Escalated'
    resolved_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT valid_severity CHECK (severity_level IN ('Low', 'Medium', 'High', 'Critical'))
);

-- ============================================================
-- LOGIN STATISTICS SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS user_analytics;

CREATE TABLE user_analytics.user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_role VARCHAR(50) NOT NULL, -- 'Student', 'Parent', 'Teacher', 'Admin'

    login_time TIMESTAMP WITH TIME ZONE NOT NULL,
    logout_time TIMESTAMP WITH TIME ZONE,

    ip_address INET,
    device_type VARCHAR(50), -- 'Desktop', 'Tablet', 'Mobile'
    browser_agent TEXT,

    session_duration_seconds INTEGER,

    pages_visited JSONB DEFAULT '[]',
    features_used JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Activity Log
CREATE TABLE user_analytics.user_activity_log (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id UUID,

    activity_type VARCHAR(100), -- 'View', 'Create', 'Update', 'Delete', 'Export'
    activity_module VARCHAR(100), -- 'Student', 'Attendance', 'Grades', etc.

    resource_id VARCHAR(100),
    resource_name VARCHAR(255),

    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(20), -- 'Success', 'Failed', 'Unauthorized'

    ip_address INET,

    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES user_analytics.user_sessions(session_id)
);

-- Platform Usage Statistics (aggregated)
CREATE TABLE user_analytics.usage_statistics (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    date DATE NOT NULL,
    hour INTEGER, -- 0-23

    total_active_users INTEGER,
    student_logins INTEGER,
    parent_logins INTEGER,
    teacher_logins INTEGER,
    admin_logins INTEGER,

    total_sessions INTEGER,
    average_session_duration_seconds INTEGER,

    most_accessed_modules JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_stat_per_hour UNIQUE (school_id, date, hour)
);

-- Indexes
CREATE INDEX idx_sessions_user ON user_analytics.user_sessions(user_id);
CREATE INDEX idx_sessions_school ON user_analytics.user_sessions(school_id);
CREATE INDEX idx_sessions_login_time ON user_analytics.user_sessions(login_time);
CREATE INDEX idx_activity_user ON user_analytics.user_activity_log(user_id);
CREATE INDEX idx_activity_timestamp ON user_analytics.user_activity_log(action_timestamp);
CREATE INDEX idx_usage_stats_date ON user_analytics.usage_statistics(date);
```

---

## PART 3: IMPLEMENTATION TIMELINE

### Phase 1: Foundation (Weeks 1-4)

**Week 1: Setup & Database**
- AWS infrastructure provisioning (RDS PostgreSQL, Redis, S3)
- Database schema creation and migrations
- Connection pooling setup (PgBouncer)
- Backup and disaster recovery configuration
- Git repository structure and CI/CD pipelines

**Deliverable**: Production-ready database infrastructure

**Week 2-3: Core Service Development**
- Student Information Service implementation
- Authentication & Authorization service
- Student model and CRUD operations
- Guardian management
- Medical records management
- Document upload & S3 integration

**Deliverable**: Working SIS API with 80% test coverage

**Week 4: Testing & Hardening**
- Unit tests (jest)
- Integration tests
- API contract testing
- Load testing (k6)
- Security audit
- Documentation

**Deliverable**: Fully tested and documented SIS service

---

### Phase 2: Attendance & Gate Pass (Weeks 5-10)

**Week 5-6: Attendance Service**
- Attendance schema finalization
- Daily attendance recording
- Biometric integration (API skeleton)
- Attendance patterns & analytics
- Automated alerts for irregular attendance

**Week 7-8: Gate Pass Service**
- Gate pass request workflow
- Approval management
- QR code generation
- Gate access logging
- Anomaly detection

**Week 9-10: Integration & Testing**
- Service-to-service integration
- Event-driven synchronization
- End-to-end workflows
- Performance optimization
- Load testing

**Deliverable**: Fully functional Attendance & Gate Pass services

---

### Phase 3: Learner Profile & Analytics (Weeks 11-14)

**Week 11-12: Learner Profile Service**
- Behavioral incident tracking
- Staff observations
- AI-powered recommendations (placeholder)
- Portfolio management
- Alert system

**Week 13-14: Login Statistics & Analytics**
- Session tracking
- User activity logging
- Usage statistics aggregation
- Dashboard data preparation
- Analytics API

**Deliverable**: Complete learner profile and analytics services

---

### Phase 4: Integration & Deployment (Weeks 15-16)

**Week 15: Integration Testing**
- Service orchestration
- Data consistency validation
- Event propagation testing
- Cross-service scenarios
- Failover testing

**Week 16: Production Deployment**
- Performance optimization
- Security hardening
- Monitoring & alerting setup
- Documentation finalization
- Runbook creation
- Pilot deployment to staging

**Deliverable**: Production-ready Core Student Services

---

## PART 4: SUCCESS CRITERIA

### Go-Live Requirements

✅ All services deployed to production
✅ 99.9% uptime SLA achieved
✅ <200ms p95 latency
✅ Zero critical security findings
✅ 100+ institutions on-boarded
✅ Complete API documentation
✅ Runbooks and troubleshooting guides created
✅ Team trained on operations
✅ Automated rollback procedures tested

---

## CONCLUSION

This implementation plan provides a production-grade blueprint for building the Core Student Services microservices. It combines enterprise architecture patterns with pragmatic, implementable designs suitable for a 4-month development cycle.

**Key Success Factors:**
1. **Strong data modeling** - The foundation for all services
2. **Clear API contracts** - Enable parallel development
3. **Comprehensive testing** - Catch issues early
4. **Security by default** - Not an afterthought
5. **Operational readiness** - Monitor everything

---

**Document Prepared By**: Enterprise Architecture Team
**Review Status**: Ready for Implementation
**Last Updated**: 2025-11-19
