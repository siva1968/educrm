-- Migration 008: Business Intelligence Service Schema
-- Created: 2025-11-19
-- Purpose: Analytics schema for dashboards, reports, and KPI tracking

-- Create analytics schema if not exists
CREATE SCHEMA IF NOT EXISTS analytics;

-- =============================================
-- DASHBOARDS
-- =============================================

CREATE TABLE analytics.dashboards (
    dashboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    dashboard_name VARCHAR(255) NOT NULL,
    dashboard_type VARCHAR(50) NOT NULL, -- 'principal', 'teacher', 'department', 'class', 'custom'
    description TEXT,
    layout JSONB NOT NULL DEFAULT '[]', -- Widget configuration array
    filters JSONB DEFAULT '{}', -- Default filters
    permissions JSONB DEFAULT '{"roles": ["admin"]}', -- Access control
    is_default BOOLEAN DEFAULT FALSE, -- Default dashboard for role
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_dashboard_type CHECK (dashboard_type IN (
        'principal', 'teacher', 'department', 'class', 'student', 'parent', 'custom'
    )),
    CONSTRAINT unique_default_dashboard UNIQUE (school_id, dashboard_type, is_default)
        WHERE is_default = TRUE
);

-- Dashboard widgets (individual components on a dashboard)
CREATE TABLE analytics.dashboard_widgets (
    widget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL,
    widget_type VARCHAR(50) NOT NULL, -- 'kpi_card', 'chart', 'table', 'list', 'calendar'
    widget_title VARCHAR(255) NOT NULL,
    data_source VARCHAR(100) NOT NULL, -- 'attendance', 'grades', 'examinations', 'fees', 'custom_query'
    config JSONB NOT NULL DEFAULT '{}', -- Widget-specific configuration
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 4}', -- Grid position
    refresh_interval INTEGER DEFAULT 300, -- Seconds, null for manual refresh
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dashboard FOREIGN KEY (dashboard_id) REFERENCES analytics.dashboards(dashboard_id) ON DELETE CASCADE,
    CONSTRAINT valid_widget_type CHECK (widget_type IN (
        'kpi_card', 'line_chart', 'bar_chart', 'pie_chart', 'area_chart',
        'table', 'list', 'calendar', 'progress', 'gauge'
    ))
);

-- =============================================
-- REPORTS
-- =============================================

CREATE TABLE analytics.reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    report_category VARCHAR(50) NOT NULL, -- 'academic', 'attendance', 'financial', 'administrative', 'custom'
    description TEXT,
    query_config JSONB NOT NULL, -- Report query, filters, columns, aggregations
    parameters JSONB DEFAULT '[]', -- User-input parameters
    schedule JSONB, -- null for on-demand, {frequency: 'daily', time: '08:00', daysOfWeek: [1,2,3]}
    output_format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv', 'html'
    recipients JSONB DEFAULT '[]', -- Email list for scheduled reports
    is_scheduled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_report_category CHECK (report_category IN (
        'academic', 'attendance', 'examination', 'assignment', 'financial',
        'hr', 'administrative', 'compliance', 'custom'
    )),
    CONSTRAINT valid_output_format CHECK (output_format IN ('pdf', 'excel', 'csv', 'html', 'json'))
);

-- Report execution history
CREATE TABLE analytics.report_executions (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    execution_type VARCHAR(20) NOT NULL, -- 'manual', 'scheduled'
    parameters JSONB, -- Parameter values used
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed', 'cancelled'
    file_url VARCHAR(500), -- S3/local path to generated file
    file_size INTEGER, -- Bytes
    row_count INTEGER, -- Number of records in report
    execution_time INTEGER, -- Milliseconds
    error_message TEXT,
    executed_by UUID, -- NULL for scheduled
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES analytics.reports(report_id) ON DELETE CASCADE,
    CONSTRAINT valid_execution_type CHECK (execution_type IN ('manual', 'scheduled')),
    CONSTRAINT valid_status CHECK (status IN ('running', 'success', 'failed', 'cancelled'))
);

-- =============================================
-- KPIs (Key Performance Indicators)
-- =============================================

CREATE TABLE analytics.kpi_definitions (
    kpi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    kpi_name VARCHAR(255) NOT NULL,
    kpi_category VARCHAR(50) NOT NULL, -- 'academic', 'attendance', 'financial', 'hr', 'operational'
    description TEXT,
    calculation_logic JSONB NOT NULL, -- Query/formula for calculating KPI
    unit VARCHAR(20), -- '%', 'count', 'hours', 'INR', etc.
    target_value DECIMAL(12,2), -- Target/benchmark value
    thresholds JSONB, -- {critical: 50, warning: 70, good: 85, excellent: 95}
    refresh_frequency VARCHAR(20) DEFAULT 'daily', -- 'real_time', 'hourly', 'daily', 'weekly', 'monthly'
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_kpi_category CHECK (kpi_category IN (
        'academic', 'attendance', 'examination', 'financial', 'hr', 'operational', 'compliance'
    )),
    CONSTRAINT valid_refresh_frequency CHECK (refresh_frequency IN (
        'real_time', 'hourly', 'daily', 'weekly', 'monthly'
    )),
    CONSTRAINT unique_kpi_name UNIQUE (school_id, kpi_name)
);

-- KPI values (historical tracking)
CREATE TABLE analytics.kpi_values (
    kpi_value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id UUID NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    previous_value DECIMAL(12,2), -- For trend calculation
    change_percent DECIMAL(5,2), -- Percentage change from previous period
    status VARCHAR(20), -- Based on thresholds: 'critical', 'warning', 'good', 'excellent'
    metadata JSONB, -- Additional context (sample size, filters applied, etc.)
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_kpi FOREIGN KEY (kpi_id) REFERENCES analytics.kpi_definitions(kpi_id) ON DELETE CASCADE,
    CONSTRAINT valid_period_type CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    CONSTRAINT valid_status CHECK (status IN ('critical', 'warning', 'good', 'excellent')),
    CONSTRAINT unique_kpi_period UNIQUE (kpi_id, period_type, period_start, period_end)
);

-- =============================================
-- DATA VISUALIZATIONS
-- =============================================

CREATE TABLE analytics.visualizations (
    visualization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    visualization_name VARCHAR(255) NOT NULL,
    chart_type VARCHAR(50) NOT NULL, -- 'line', 'bar', 'pie', 'area', 'scatter', 'heatmap'
    data_source JSONB NOT NULL, -- Query configuration
    chart_config JSONB NOT NULL, -- Chart.js/D3 configuration
    filters JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE, -- Can be embedded publicly
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_chart_type CHECK (chart_type IN (
        'line', 'bar', 'pie', 'doughnut', 'area', 'scatter',
        'bubble', 'radar', 'polar', 'heatmap', 'treemap'
    ))
);

-- =============================================
-- ANALYTICS CACHE
-- =============================================

-- Cache frequently accessed analytics data
CREATE TABLE analytics.cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL,
    school_id UUID NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB, -- Query info, filters, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT unique_cache_key UNIQUE (cache_key, school_id)
);

-- =============================================
-- INDICES FOR PERFORMANCE
-- =============================================

-- Dashboards
CREATE INDEX idx_dashboards_school ON analytics.dashboards(school_id) WHERE is_active = TRUE;
CREATE INDEX idx_dashboards_type ON analytics.dashboards(dashboard_type) WHERE is_active = TRUE;
CREATE INDEX idx_dashboard_widgets_dashboard ON analytics.dashboard_widgets(dashboard_id) WHERE is_visible = TRUE;

-- Reports
CREATE INDEX idx_reports_school ON analytics.reports(school_id) WHERE is_active = TRUE;
CREATE INDEX idx_reports_category ON analytics.reports(report_category);
CREATE INDEX idx_reports_scheduled ON analytics.reports(school_id) WHERE is_scheduled = TRUE AND is_active = TRUE;
CREATE INDEX idx_report_executions_report ON analytics.report_executions(report_id);
CREATE INDEX idx_report_executions_status ON analytics.report_executions(status);
CREATE INDEX idx_report_executions_date ON analytics.report_executions(executed_at DESC);

-- KPIs
CREATE INDEX idx_kpi_definitions_school ON analytics.kpi_definitions(school_id) WHERE is_active = TRUE;
CREATE INDEX idx_kpi_definitions_category ON analytics.kpi_definitions(kpi_category);
CREATE INDEX idx_kpi_values_kpi ON analytics.kpi_values(kpi_id);
CREATE INDEX idx_kpi_values_period ON analytics.kpi_values(period_type, period_start, period_end);

-- Visualizations
CREATE INDEX idx_visualizations_school ON analytics.visualizations(school_id);
CREATE INDEX idx_visualizations_type ON analytics.visualizations(chart_type);

-- Cache
CREATE INDEX idx_cache_key ON analytics.cache(cache_key, school_id);
CREATE INDEX idx_cache_expiry ON analytics.cache(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION analytics.clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics.cache
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate KPI status based on thresholds
CREATE OR REPLACE FUNCTION analytics.calculate_kpi_status(
    value DECIMAL,
    thresholds JSONB
)
RETURNS VARCHAR AS $$
DECLARE
    status VARCHAR(20);
BEGIN
    IF value >= (thresholds->>'excellent')::DECIMAL THEN
        status := 'excellent';
    ELSIF value >= (thresholds->>'good')::DECIMAL THEN
        status := 'good';
    ELSIF value >= (thresholds->>'warning')::DECIMAL THEN
        status := 'warning';
    ELSE
        status := 'critical';
    END IF;

    RETURN status;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SEED DATA: Default KPIs
-- =============================================

-- NOTE: These INSERT statements should be run after schools table is populated
-- For now, we'll create them without school_id (admin will create per school)

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON SCHEMA analytics IS 'Business Intelligence and Analytics schema for dashboards, reports, and KPIs';

COMMENT ON TABLE analytics.dashboards IS 'Dashboard configurations with widget layouts';
COMMENT ON TABLE analytics.dashboard_widgets IS 'Individual widgets that appear on dashboards';
COMMENT ON TABLE analytics.reports IS 'Report definitions with scheduling and recipients';
COMMENT ON TABLE analytics.report_executions IS 'Historical log of report generation';
COMMENT ON TABLE analytics.kpi_definitions IS 'KPI definitions with calculation logic and thresholds';
COMMENT ON TABLE analytics.kpi_values IS 'Historical KPI values for trend analysis';
COMMENT ON TABLE analytics.visualizations IS 'Reusable data visualizations';
COMMENT ON TABLE analytics.cache IS 'Cache for frequently accessed analytics data';

-- =============================================
-- GRANTS (Adjust based on your user roles)
-- =============================================

-- Grant appropriate permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA analytics TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO app_user;

-- Migration complete
SELECT 'Migration 008: Business Intelligence schema created successfully' AS message;
