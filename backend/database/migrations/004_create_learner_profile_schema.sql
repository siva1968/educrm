-- ============================================================
-- Migration 004: Create Learner Profile Schema
-- Description: Student behavioral tracking and learning analytics
-- ============================================================

CREATE SCHEMA IF NOT EXISTS learner_profile;

-- Learner Profiles
CREATE TABLE learner_profile.learner_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE,
    school_id UUID NOT NULL,

    -- Learning Characteristics
    learning_style VARCHAR(50),
    learning_pace VARCHAR(50),
    preferred_subjects JSONB DEFAULT '[]',

    -- Behavioral Observations
    discipline_score INTEGER DEFAULT 50,
    cooperation_level VARCHAR(50),
    attention_span VARCHAR(50),
    participation_level VARCHAR(50),

    -- Academic Strengths & Weaknesses
    strength_areas JSONB DEFAULT '[]',
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
    portfolio_documents JSONB DEFAULT '{}',

    -- AI-Generated Insights
    ai_performance_prediction DECIMAL(5,2),
    ai_recommendation TEXT,
    ai_risk_factors JSONB DEFAULT '[]',
    ai_last_updated TIMESTAMP WITH TIME ZONE,

    -- Flags & Alerts
    requires_remedial_support BOOLEAN DEFAULT FALSE,
    requires_counseling BOOLEAN DEFAULT FALSE,
    is_gifted_identified BOOLEAN DEFAULT FALSE,
    requires_special_attention BOOLEAN DEFAULT FALSE,
    has_special_needs BOOLEAN DEFAULT FALSE,

    -- Assessment Summary
    overall_grade VARCHAR(5),
    class_rank INTEGER,
    attendance_percentage DECIMAL(5,2),

    status_last_updated TIMESTAMP WITH TIME ZONE,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_learning_style CHECK (learning_style IN ('Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Mixed', NULL)),
    CONSTRAINT valid_learning_pace CHECK (learning_pace IN ('Fast Learner', 'Average', 'Slow Learner', 'Needs Support', NULL)),
    CONSTRAINT valid_discipline_score CHECK (discipline_score BETWEEN 0 AND 100)
);

-- Behavioral Incidents Log
CREATE TABLE learner_profile.behavioral_incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    incident_date DATE NOT NULL,
    incident_time TIME,
    incident_type VARCHAR(100),

    description TEXT NOT NULL,
    severity_level VARCHAR(20),

    -- Location
    incident_location VARCHAR(255),

    -- Involved Parties
    reported_by_staff_id UUID,
    reported_by_name VARCHAR(255),
    witness_names TEXT,
    other_students_involved JSONB DEFAULT '[]',

    -- Action Taken
    action_taken TEXT,
    action_type VARCHAR(100),

    -- Parent Communication
    parent_informed BOOLEAN DEFAULT FALSE,
    parent_informed_date TIMESTAMP WITH TIME ZONE,
    parent_informed_by UUID,
    parent_response TEXT,

    -- Counseling
    counselor_referral BOOLEAN DEFAULT FALSE,
    counselor_id UUID,
    counselor_notes TEXT,
    counseling_date TIMESTAMP WITH TIME ZONE,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,

    -- Status
    resolution_status VARCHAR(20) DEFAULT 'Open',
    resolved_date TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_incident_type CHECK (incident_type IN ('Misconduct', 'Aggression', 'Bullying', 'Absenteeism', 'Late Arrival', 'Dress Code Violation', 'Academic Dishonesty', 'Other')),
    CONSTRAINT valid_severity CHECK (severity_level IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT valid_action_type CHECK (action_type IN ('Verbal Warning', 'Written Warning', 'Detention', 'Suspension', 'Parent Call', 'Counseling Referral', 'No Action', 'Other')),
    CONSTRAINT valid_resolution_status CHECK (resolution_status IN ('Open', 'In Progress', 'Resolved', 'Escalated', 'Closed'))
);

-- Positive Recognitions
CREATE TABLE learner_profile.positive_recognitions (
    recognition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    recognition_date DATE NOT NULL,
    recognition_type VARCHAR(100),

    description TEXT NOT NULL,
    achievement_category VARCHAR(50),

    -- Recognition Details
    awarded_by_staff_id UUID,
    awarded_by_name VARCHAR(255),

    -- Certificate/Badge
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_url VARCHAR(500),
    badge_name VARCHAR(255),

    -- Points/Rewards
    points_awarded INTEGER DEFAULT 0,

    -- Public Recognition
    announced_in_assembly BOOLEAN DEFAULT FALSE,
    published_on_wall BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_recognition_type CHECK (recognition_type IN ('Academic Excellence', 'Good Behavior', 'Sports Achievement', 'Arts & Culture', 'Community Service', 'Leadership', 'Attendance', 'Other')),
    CONSTRAINT valid_achievement_category CHECK (achievement_category IN ('Gold', 'Silver', 'Bronze', 'Certificate of Merit', 'Appreciation'))
);

-- Staff Observations/Anecdotes
CREATE TABLE learner_profile.staff_observations (
    observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    observation_date DATE NOT NULL,
    observed_by_staff_id UUID NOT NULL,
    observed_by_name VARCHAR(255),

    -- Observation Details
    observation_type VARCHAR(50),
    observation_text TEXT NOT NULL,

    -- Context
    subject VARCHAR(100),
    activity_context VARCHAR(255),

    -- Tags for categorization
    tags JSONB DEFAULT '[]',

    -- Visibility
    visible_to_parents BOOLEAN DEFAULT FALSE,
    visible_to_admins BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_observation_type CHECK (observation_type IN ('Academic', 'Behavioral', 'Social', 'Emotional', 'Physical', 'General'))
);

-- Learning Development Milestones
CREATE TABLE learner_profile.development_milestones (
    milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,

    milestone_date DATE NOT NULL,
    milestone_type VARCHAR(100),
    milestone_description TEXT NOT NULL,

    -- Assessment
    achievement_level VARCHAR(50),
    assessor_staff_id UUID,
    assessor_name VARCHAR(255),

    -- Evidence
    evidence_documents JSONB DEFAULT '[]',
    evidence_photos JSONB DEFAULT '[]',

    -- Standards Alignment
    curriculum_standard VARCHAR(255),
    skill_area VARCHAR(100),

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id),
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_milestone_type CHECK (milestone_type IN ('Cognitive', 'Motor Skills', 'Language', 'Social-Emotional', 'Creative', 'Academic')),
    CONSTRAINT valid_achievement_level CHECK (achievement_level IN ('Emerging', 'Developing', 'Proficient', 'Advanced', 'Mastered'))
);

-- Indexes
CREATE INDEX idx_learner_profiles_student ON learner_profile.learner_profiles(student_id);
CREATE INDEX idx_learner_profiles_school ON learner_profile.learner_profiles(school_id);
CREATE INDEX idx_learner_profiles_flags ON learner_profile.learner_profiles(requires_remedial_support, requires_counseling, requires_special_attention);

CREATE INDEX idx_behavioral_incidents_student ON learner_profile.behavioral_incidents(student_id);
CREATE INDEX idx_behavioral_incidents_school ON learner_profile.behavioral_incidents(school_id);
CREATE INDEX idx_behavioral_incidents_date ON learner_profile.behavioral_incidents(incident_date);
CREATE INDEX idx_behavioral_incidents_severity ON learner_profile.behavioral_incidents(severity_level);
CREATE INDEX idx_behavioral_incidents_status ON learner_profile.behavioral_incidents(resolution_status);

CREATE INDEX idx_positive_recognitions_student ON learner_profile.positive_recognitions(student_id);
CREATE INDEX idx_positive_recognitions_school ON learner_profile.positive_recognitions(school_id);
CREATE INDEX idx_positive_recognitions_date ON learner_profile.positive_recognitions(recognition_date);

CREATE INDEX idx_staff_observations_student ON learner_profile.staff_observations(student_id);
CREATE INDEX idx_staff_observations_school ON learner_profile.staff_observations(school_id);
CREATE INDEX idx_staff_observations_date ON learner_profile.staff_observations(observation_date);
CREATE INDEX idx_staff_observations_staff ON learner_profile.staff_observations(observed_by_staff_id);

CREATE INDEX idx_development_milestones_student ON learner_profile.development_milestones(student_id);
CREATE INDEX idx_development_milestones_school ON learner_profile.development_milestones(school_id);
CREATE INDEX idx_development_milestones_date ON learner_profile.development_milestones(milestone_date);

-- Triggers
CREATE TRIGGER update_learner_profiles_updated_at BEFORE UPDATE ON learner_profile.learner_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavioral_incidents_updated_at BEFORE UPDATE ON learner_profile.behavioral_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
