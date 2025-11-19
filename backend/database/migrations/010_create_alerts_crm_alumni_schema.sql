-- Migration 010: Automated Alerts, CRM, and Alumni Management Schema
-- Created: 2025-11-19
-- Purpose: Alert rules, triggers, CRM pipeline, and alumni management

-- =============================================
-- AUTOMATED ALERTS SCHEMA
-- =============================================

CREATE SCHEMA IF NOT EXISTS alerts;

-- Alert Rules
CREATE TABLE alerts.alert_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50) NOT NULL, -- 'student', 'teacher', 'class', 'attendance', 'fees', 'grades'
    condition_type VARCHAR(50) NOT NULL, -- 'threshold', 'pattern', 'anomaly', 'schedule'
    conditions JSONB NOT NULL, -- Rule conditions and thresholds
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    notification_channels JSONB, -- ['email', 'sms', 'push', 'in_app']
    recipients JSONB, -- {roles: ['admin'], specific_users: [uuid]}
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'student', 'teacher', 'class', 'attendance', 'fees', 'grades', 'behavior', 'enrollment'
    )),
    CONSTRAINT valid_condition_type CHECK (condition_type IN (
        'threshold', 'pattern', 'anomaly', 'schedule', 'trend', 'composite'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Alert Instances (triggered alerts)
CREATE TABLE alerts.alert_instances (
    instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL,
    school_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    details JSONB, -- Additional context about the alert
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES alerts.alert_rules(rule_id) ON DELETE CASCADE,
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'student', 'teacher', 'class', 'attendance', 'fees', 'grades', 'behavior', 'enrollment'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed'))
);

-- Notification Log
CREATE TABLE alerts.notification_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    recipient_type VARCHAR(20) NOT NULL, -- 'user', 'role'
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'read'
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB, -- Channel-specific metadata

    CONSTRAINT fk_instance FOREIGN KEY (instance_id) REFERENCES alerts.alert_instances(instance_id) ON DELETE CASCADE,
    CONSTRAINT valid_recipient_type CHECK (recipient_type IN ('user', 'role')),
    CONSTRAINT valid_channel CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'read'))
);

-- Alert Subscriptions (user preferences)
CREATE TABLE alerts.user_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    school_id UUID NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    alert_severity JSONB, -- ['info', 'warning', 'critical']
    channels JSONB, -- ['email', 'sms', 'push', 'in_app']
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_entity UNIQUE (user_id, school_id, entity_type, entity_id)
);

-- =============================================
-- CRM SCHEMA
-- =============================================

CREATE SCHEMA IF NOT EXISTS crm;

-- Leads (prospective students/parents)
CREATE TABLE crm.leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    parent_name VARCHAR(200),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(20),
    student_grade_level VARCHAR(10),
    source VARCHAR(50), -- 'website', 'referral', 'event', 'advertisement'
    status VARCHAR(20) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'application', 'enrolled', 'lost'
    lead_score INTEGER DEFAULT 0, -- 0-100 scoring based on engagement
    assigned_to UUID,
    notes TEXT,
    metadata JSONB, -- Additional custom fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_status CHECK (status IN (
        'new', 'contacted', 'qualified', 'application', 'enrolled', 'lost', 'nurturing'
    )),
    CONSTRAINT valid_score CHECK (lead_score >= 0 AND lead_score <= 100)
);

-- Lead Activities (interactions and touchpoints)
CREATE TABLE crm.lead_activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'status_change'
    subject VARCHAR(255),
    description TEXT,
    activity_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    metadata JSONB,

    CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES crm.leads(lead_id) ON DELETE CASCADE,
    CONSTRAINT valid_activity_type CHECK (activity_type IN (
        'call', 'email', 'meeting', 'note', 'status_change', 'tour', 'application_submitted'
    ))
);

-- CRM Pipeline Stages
CREATE TABLE crm.pipeline_stages (
    stage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    conversion_probability DECIMAL(5,2), -- Expected conversion percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT unique_school_stage UNIQUE (school_id, stage_name)
);

-- Campaigns (marketing and recruitment)
CREATE TABLE crm.campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50), -- 'email', 'sms', 'event', 'advertisement'
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'active', 'paused', 'completed'
    metrics JSONB, -- {leads_generated, conversions, cost_per_lead}
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_campaign_status CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled'))
);

-- =============================================
-- ALUMNI MANAGEMENT SCHEMA
-- =============================================

CREATE SCHEMA IF NOT EXISTS alumni;

-- Alumni Profiles
CREATE TABLE alumni.profiles (
    alumni_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL, -- Reference to sis_core.students
    school_id UUID NOT NULL,
    graduation_year INTEGER NOT NULL,
    current_occupation VARCHAR(255),
    current_employer VARCHAR(255),
    industry VARCHAR(100),
    job_title VARCHAR(255),
    linkedin_url VARCHAR(500),
    current_city VARCHAR(100),
    current_country VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_willing_to_mentor BOOLEAN DEFAULT FALSE,
    is_willing_to_recruit BOOLEAN DEFAULT FALSE,
    privacy_settings JSONB, -- {show_contact: false, show_employer: true}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT unique_alumni_student UNIQUE (student_id)
);

-- Alumni Events
CREATE TABLE alumni.events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50), -- 'reunion', 'networking', 'fundraising', 'career_fair'
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(500),
    is_virtual BOOLEAN DEFAULT FALSE,
    max_attendees INTEGER,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'open', 'closed', 'completed', 'cancelled'
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'reunion', 'networking', 'fundraising', 'career_fair', 'lecture', 'social'
    )),
    CONSTRAINT valid_event_status CHECK (status IN (
        'planned', 'open', 'closed', 'completed', 'cancelled'
    ))
);

-- Event Registrations
CREATE TABLE alumni.event_registrations (
    registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    alumni_id UUID NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attendance_status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'attended', 'no_show', 'cancelled'
    plus_one INTEGER DEFAULT 0,
    dietary_restrictions TEXT,
    notes TEXT,

    CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES alumni.events(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_alumni FOREIGN KEY (alumni_id) REFERENCES alumni.profiles(alumni_id) ON DELETE CASCADE,
    CONSTRAINT unique_event_alumni UNIQUE (event_id, alumni_id),
    CONSTRAINT valid_attendance_status CHECK (attendance_status IN (
        'registered', 'attended', 'no_show', 'cancelled'
    ))
);

-- Donations
CREATE TABLE alumni.donations (
    donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    alumni_id UUID,
    donor_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    donation_type VARCHAR(50), -- 'one_time', 'recurring', 'pledge'
    purpose VARCHAR(255), -- 'general', 'scholarship', 'infrastructure', 'sports'
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    transaction_id VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT FALSE,
    tax_receipt_sent BOOLEAN DEFAULT FALSE,
    donation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT fk_alumni FOREIGN KEY (alumni_id) REFERENCES alumni.profiles(alumni_id) ON DELETE SET NULL,
    CONSTRAINT valid_donation_type CHECK (donation_type IN ('one_time', 'recurring', 'pledge')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN (
        'pending', 'completed', 'failed', 'refunded', 'cancelled'
    )),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Mentorship Programs
CREATE TABLE alumni.mentorship_programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_program_status CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Mentorship Matches
CREATE TABLE alumni.mentorship_matches (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL,
    mentor_id UUID NOT NULL, -- alumni_id
    mentee_id UUID NOT NULL, -- student_id
    match_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'on_hold', 'terminated'
    completion_date TIMESTAMP WITH TIME ZONE,
    feedback TEXT,

    CONSTRAINT fk_program FOREIGN KEY (program_id) REFERENCES alumni.mentorship_programs(program_id) ON DELETE CASCADE,
    CONSTRAINT fk_mentor FOREIGN KEY (mentor_id) REFERENCES alumni.profiles(alumni_id) ON DELETE CASCADE,
    CONSTRAINT fk_mentee FOREIGN KEY (mentee_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE,
    CONSTRAINT valid_match_status CHECK (status IN ('active', 'completed', 'on_hold', 'terminated'))
);

-- =============================================
-- INDICES FOR PERFORMANCE
-- =============================================

-- Alerts Indices
CREATE INDEX idx_alert_rules_school ON alerts.alert_rules(school_id, is_active);
CREATE INDEX idx_alert_rules_entity ON alerts.alert_rules(entity_type);
CREATE INDEX idx_alert_instances_rule ON alerts.alert_instances(rule_id, status);
CREATE INDEX idx_alert_instances_school ON alerts.alert_instances(school_id, status);
CREATE INDEX idx_alert_instances_entity ON alerts.alert_instances(entity_type, entity_id);
CREATE INDEX idx_alert_instances_triggered ON alerts.alert_instances(triggered_at DESC);
CREATE INDEX idx_notification_log_instance ON alerts.notification_log(instance_id);
CREATE INDEX idx_notification_log_recipient ON alerts.notification_log(recipient_id, status);

-- CRM Indices
CREATE INDEX idx_leads_school ON crm.leads(school_id, status);
CREATE INDEX idx_leads_assigned ON crm.leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_leads_score ON crm.leads(lead_score DESC);
CREATE INDEX idx_lead_activities_lead ON crm.lead_activities(lead_id, activity_date DESC);
CREATE INDEX idx_campaigns_school ON crm.campaigns(school_id, status);

-- Alumni Indices
CREATE INDEX idx_alumni_school ON alumni.profiles(school_id, graduation_year);
CREATE INDEX idx_alumni_student ON alumni.profiles(student_id);
CREATE INDEX idx_alumni_events_school ON alumni.events(school_id, event_date DESC);
CREATE INDEX idx_event_registrations_event ON alumni.event_registrations(event_id);
CREATE INDEX idx_event_registrations_alumni ON alumni.event_registrations(alumni_id);
CREATE INDEX idx_donations_school ON alumni.donations(school_id, donation_date DESC);
CREATE INDEX idx_donations_alumni ON alumni.donations(alumni_id) WHERE alumni_id IS NOT NULL;
CREATE INDEX idx_mentorship_matches_mentor ON alumni.mentorship_matches(mentor_id, status);
CREATE INDEX idx_mentorship_matches_mentee ON alumni.mentorship_matches(mentee_id, status);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION crm.calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    activity_count INTEGER;
    days_since_created INTEGER;
BEGIN
    -- Get activity count
    SELECT COUNT(*) INTO activity_count
    FROM crm.lead_activities
    WHERE lead_id = p_lead_id;

    -- Base score from activities (up to 40 points)
    score := score + LEAST(activity_count * 5, 40);

    -- Engagement recency bonus (up to 30 points)
    SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(activity_date))) / 86400 INTO days_since_created
    FROM crm.lead_activities
    WHERE lead_id = p_lead_id;

    IF days_since_created IS NOT NULL THEN
        IF days_since_created <= 7 THEN
            score := score + 30;
        ELSIF days_since_created <= 30 THEN
            score := score + 20;
        ELSIF days_since_created <= 90 THEN
            score := score + 10;
        END IF;
    END IF;

    -- Contact information completeness (up to 30 points)
    SELECT
        CASE WHEN email IS NOT NULL THEN 10 ELSE 0 END +
        CASE WHEN phone IS NOT NULL THEN 10 ELSE 0 END +
        CASE WHEN parent_email IS NOT NULL THEN 10 ELSE 0 END
    INTO score
    FROM crm.leads
    WHERE lead_id = p_lead_id;

    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to update lead score
CREATE OR REPLACE FUNCTION crm.update_lead_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE crm.leads
    SET lead_score = crm.calculate_lead_score(NEW.lead_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE lead_id = NEW.lead_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update lead score on activity
CREATE TRIGGER update_lead_score_on_activity
AFTER INSERT OR UPDATE ON crm.lead_activities
FOR EACH ROW
EXECUTE FUNCTION crm.update_lead_score_trigger();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON SCHEMA alerts IS 'Automated alerts and notification system';
COMMENT ON SCHEMA crm IS 'Customer Relationship Management for lead tracking and admissions';
COMMENT ON SCHEMA alumni IS 'Alumni management, engagement, and fundraising';

COMMENT ON TABLE alerts.alert_rules IS 'Configurable alert rules and conditions';
COMMENT ON TABLE alerts.alert_instances IS 'Triggered alert instances requiring attention';
COMMENT ON TABLE crm.leads IS 'Prospective student leads and admissions pipeline';
COMMENT ON TABLE alumni.profiles IS 'Alumni profiles with career and contact information';
COMMENT ON TABLE alumni.donations IS 'Alumni and supporter donations and pledges';

-- Migration complete
SELECT 'Migration 010: Alerts, CRM, and Alumni schemas created successfully' AS message;
