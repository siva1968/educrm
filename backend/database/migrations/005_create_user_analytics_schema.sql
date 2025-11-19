-- ============================================================
-- Migration 005: Create User Analytics Schema
-- Description: Login statistics and platform usage analytics
-- ============================================================

CREATE SCHEMA IF NOT EXISTS user_analytics;

-- User Sessions
CREATE TABLE user_analytics.user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),

    -- Session Details
    login_time TIMESTAMP WITH TIME ZONE NOT NULL,
    logout_time TIMESTAMP WITH TIME ZONE,
    session_duration_seconds INTEGER,

    -- Device & Browser Info
    ip_address INET,
    device_type VARCHAR(50),
    device_name VARCHAR(255),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    browser_agent TEXT,
    operating_system VARCHAR(100),

    -- Platform
    platform VARCHAR(50),

    -- Location
    country VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),

    -- Activity Tracking
    pages_visited JSONB DEFAULT '[]',
    features_used JSONB DEFAULT '[]',
    actions_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    logout_type VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_user_role CHECK (user_role IN ('Student', 'Parent', 'Teacher', 'Admin', 'Principal', 'Staff', 'Super Admin')),
    CONSTRAINT valid_device_type CHECK (device_type IN ('Desktop', 'Tablet', 'Mobile', 'Unknown')),
    CONSTRAINT valid_platform CHECK (platform IN ('Web', 'Android', 'iOS', 'Desktop App')),
    CONSTRAINT valid_logout_type CHECK (logout_type IN ('Manual', 'Auto', 'Timeout', 'Force Logout', NULL))
);

-- User Activity Log
CREATE TABLE user_analytics.user_activity_log (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id UUID,
    user_role VARCHAR(50),

    -- Activity Details
    activity_type VARCHAR(100),
    activity_module VARCHAR(100),
    activity_description TEXT,

    -- Resource Information
    resource_id VARCHAR(100),
    resource_type VARCHAR(100),
    resource_name VARCHAR(255),

    -- HTTP Details
    http_method VARCHAR(10),
    endpoint_url TEXT,
    request_params JSONB DEFAULT '{}',

    -- Timing
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,

    -- Status
    status VARCHAR(20),
    status_code INTEGER,
    error_message TEXT,

    -- Location
    ip_address INET,

    -- Additional Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES user_analytics.user_sessions(session_id),
    CONSTRAINT valid_activity_type CHECK (activity_type IN ('View', 'Create', 'Update', 'Delete', 'Export', 'Import', 'Download', 'Upload', 'Login', 'Logout', 'Search', 'Filter', 'Print')),
    CONSTRAINT valid_status CHECK (status IN ('Success', 'Failed', 'Error', 'Unauthorized', 'Forbidden')),
    CONSTRAINT valid_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE'))
);

-- Platform Usage Statistics (aggregated)
CREATE TABLE user_analytics.usage_statistics (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    -- Time Period
    date DATE NOT NULL,
    hour INTEGER,
    period_type VARCHAR(20) DEFAULT 'hourly',

    -- User Counts
    total_active_users INTEGER DEFAULT 0,
    total_unique_users INTEGER DEFAULT 0,
    student_logins INTEGER DEFAULT 0,
    parent_logins INTEGER DEFAULT 0,
    teacher_logins INTEGER DEFAULT 0,
    admin_logins INTEGER DEFAULT 0,
    staff_logins INTEGER DEFAULT 0,

    -- Session Stats
    total_sessions INTEGER DEFAULT 0,
    average_session_duration_seconds INTEGER DEFAULT 0,
    max_session_duration_seconds INTEGER DEFAULT 0,
    min_session_duration_seconds INTEGER DEFAULT 0,

    -- Device Breakdown
    desktop_users INTEGER DEFAULT 0,
    mobile_users INTEGER DEFAULT 0,
    tablet_users INTEGER DEFAULT 0,

    -- Platform Breakdown
    web_users INTEGER DEFAULT 0,
    android_users INTEGER DEFAULT 0,
    ios_users INTEGER DEFAULT 0,

    -- Activity Stats
    total_actions INTEGER DEFAULT 0,
    most_accessed_modules JSONB DEFAULT '[]',
    most_used_features JSONB DEFAULT '[]',

    -- Performance
    average_response_time_ms INTEGER,
    error_rate DECIMAL(5,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_period_type CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
    CONSTRAINT valid_hour CHECK (hour IS NULL OR (hour >= 0 AND hour <= 23)),
    CONSTRAINT unique_stat_per_period UNIQUE (school_id, date, hour, period_type)
);

-- User Engagement Metrics
CREATE TABLE user_analytics.user_engagement (
    engagement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_role VARCHAR(50),

    -- Time Period
    month_year DATE NOT NULL,

    -- Login Stats
    total_logins INTEGER DEFAULT 0,
    total_active_days INTEGER DEFAULT 0,
    average_session_duration_seconds INTEGER DEFAULT 0,

    -- Activity Stats
    total_actions INTEGER DEFAULT 0,
    most_used_features JSONB DEFAULT '[]',
    most_visited_modules JSONB DEFAULT '[]',

    -- Engagement Score
    engagement_score DECIMAL(5,2),
    engagement_level VARCHAR(20),

    -- Last Activity
    last_login_date TIMESTAMP WITH TIME ZONE,
    days_since_last_login INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT valid_engagement_level CHECK (engagement_level IN ('Very High', 'High', 'Medium', 'Low', 'Very Low', 'Inactive')),
    CONSTRAINT unique_user_month UNIQUE (user_id, month_year)
);

-- Feature Usage Tracking
CREATE TABLE user_analytics.feature_usage (
    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,

    feature_name VARCHAR(255) NOT NULL,
    feature_category VARCHAR(100),

    -- Usage Stats
    date DATE NOT NULL,
    total_uses INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    total_time_spent_seconds INTEGER DEFAULT 0,
    average_time_per_use_seconds INTEGER DEFAULT 0,

    -- User Role Breakdown
    student_uses INTEGER DEFAULT 0,
    parent_uses INTEGER DEFAULT 0,
    teacher_uses INTEGER DEFAULT 0,
    admin_uses INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id),
    CONSTRAINT unique_feature_date UNIQUE (school_id, feature_name, date)
);

-- API Performance Metrics
CREATE TABLE user_analytics.api_performance (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID,

    -- Endpoint Details
    endpoint_url VARCHAR(500) NOT NULL,
    http_method VARCHAR(10),

    -- Time Period
    date DATE NOT NULL,
    hour INTEGER,

    -- Performance Stats
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    average_response_time_ms INTEGER DEFAULT 0,
    min_response_time_ms INTEGER DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    p50_response_time_ms INTEGER,
    p95_response_time_ms INTEGER,
    p99_response_time_ms INTEGER,

    -- Error Stats
    total_errors INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2),
    error_types JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_endpoint_hour UNIQUE (endpoint_url, http_method, date, hour)
);

-- Indexes
CREATE INDEX idx_user_sessions_user ON user_analytics.user_sessions(user_id);
CREATE INDEX idx_user_sessions_school ON user_analytics.user_sessions(school_id);
CREATE INDEX idx_user_sessions_login_time ON user_analytics.user_sessions(login_time);
CREATE INDEX idx_user_sessions_role ON user_analytics.user_sessions(user_role);
CREATE INDEX idx_user_sessions_active ON user_analytics.user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_device ON user_analytics.user_sessions(device_type);

CREATE INDEX idx_activity_log_user ON user_analytics.user_activity_log(user_id);
CREATE INDEX idx_activity_log_school ON user_analytics.user_activity_log(school_id);
CREATE INDEX idx_activity_log_session ON user_analytics.user_activity_log(session_id);
CREATE INDEX idx_activity_log_timestamp ON user_analytics.user_activity_log(action_timestamp);
CREATE INDEX idx_activity_log_module ON user_analytics.user_activity_log(activity_module);
CREATE INDEX idx_activity_log_status ON user_analytics.user_activity_log(status);

CREATE INDEX idx_usage_stats_school ON user_analytics.usage_statistics(school_id);
CREATE INDEX idx_usage_stats_date ON user_analytics.usage_statistics(date);
CREATE INDEX idx_usage_stats_hour ON user_analytics.usage_statistics(hour);

CREATE INDEX idx_user_engagement_user ON user_analytics.user_engagement(user_id);
CREATE INDEX idx_user_engagement_school ON user_analytics.user_engagement(school_id);
CREATE INDEX idx_user_engagement_month ON user_analytics.user_engagement(month_year);
CREATE INDEX idx_user_engagement_level ON user_analytics.user_engagement(engagement_level);

CREATE INDEX idx_feature_usage_school ON user_analytics.feature_usage(school_id);
CREATE INDEX idx_feature_usage_feature ON user_analytics.feature_usage(feature_name);
CREATE INDEX idx_feature_usage_date ON user_analytics.feature_usage(date);

CREATE INDEX idx_api_performance_endpoint ON user_analytics.api_performance(endpoint_url);
CREATE INDEX idx_api_performance_date ON user_analytics.api_performance(date);

-- Triggers
CREATE TRIGGER update_usage_statistics_updated_at BEFORE UPDATE ON user_analytics.usage_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_engagement_updated_at BEFORE UPDATE ON user_analytics.user_engagement
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    p_total_logins INTEGER,
    p_total_active_days INTEGER,
    p_avg_session_duration INTEGER,
    p_total_actions INTEGER
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    score DECIMAL(5,2);
BEGIN
    -- Simple engagement score calculation
    -- Login frequency (40%), Active days (30%), Session duration (15%), Actions (15%)
    score := (
        (LEAST(p_total_logins, 30) / 30.0 * 40) +
        (LEAST(p_total_active_days, 30) / 30.0 * 30) +
        (LEAST(p_avg_session_duration, 1800) / 1800.0 * 15) +
        (LEAST(p_total_actions, 500) / 500.0 * 15)
    );

    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to determine engagement level
CREATE OR REPLACE FUNCTION get_engagement_level(score DECIMAL(5,2)) RETURNS VARCHAR(20) AS $$
BEGIN
    IF score >= 80 THEN RETURN 'Very High';
    ELSIF score >= 60 THEN RETURN 'High';
    ELSIF score >= 40 THEN RETURN 'Medium';
    ELSIF score >= 20 THEN RETURN 'Low';
    ELSIF score > 0 THEN RETURN 'Very Low';
    ELSE RETURN 'Inactive';
    END IF;
END;
$$ LANGUAGE plpgsql;
