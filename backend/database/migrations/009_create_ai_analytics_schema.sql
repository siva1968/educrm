-- Migration 009: AI Analytics Service Schema
-- Created: 2025-11-19
-- Purpose: ML predictions, forecasts, and anomaly detection

-- Ensure analytics schema exists
CREATE SCHEMA IF NOT EXISTS analytics;

-- =============================================
-- STUDENT PREDICTIONS
-- =============================================

CREATE TABLE analytics.student_predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    school_id UUID NOT NULL,
    prediction_type VARCHAR(50) NOT NULL, -- 'final_grade', 'dropout_risk', 'performance_trend'
    subject_id UUID, -- NULL for overall predictions
    academic_year VARCHAR(10),
    term VARCHAR(50),
    predicted_value JSONB NOT NULL, -- {value, grade, percentage, etc.}
    confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
    features_used JSONB, -- Features that went into the prediction
    model_version VARCHAR(50),
    model_type VARCHAR(50), -- 'linear_regression', 'random_forest', 'neural_network'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- Predictions may expire

    CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES sis_core.students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_prediction_type CHECK (prediction_type IN (
        'final_grade', 'dropout_risk', 'performance_trend', 'subject_strength', 'improvement_areas'
    )),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- =============================================
-- ENROLLMENT FORECASTS
-- =============================================

CREATE TABLE analytics.enrollment_forecasts (
    forecast_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    class_level VARCHAR(10), -- NULL for school-wide forecast
    forecast_period VARCHAR(20) NOT NULL, -- 'annual', 'monthly', 'quarterly'
    forecasted_enrollment INTEGER NOT NULL,
    confidence_interval JSONB, -- {lower: 45, upper: 55, confidence_level: 0.95}
    trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
    factors JSONB, -- Contributing factors to the forecast
    model_accuracy DECIMAL(5,2), -- Historical accuracy percentage
    model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_forecast_period CHECK (forecast_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
    CONSTRAINT valid_trend CHECK (trend IN ('increasing', 'decreasing', 'stable', 'volatile'))
);

-- =============================================
-- ANOMALY DETECTION
-- =============================================

CREATE TABLE analytics.anomalies (
    anomaly_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'student', 'class', 'teacher', 'subject', 'attendance'
    entity_id UUID NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL, -- 'performance_drop', 'attendance_spike', 'grade_inconsistency'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,
    details JSONB NOT NULL, -- Specific anomaly data
    expected_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    deviation_score DECIMAL(10,4), -- How many standard deviations away
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'acknowledged', 'investigating', 'resolved', 'false_positive'
    assigned_to UUID,
    resolution_notes TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'student', 'class', 'teacher', 'subject', 'attendance', 'fees', 'examination'
    )),
    CONSTRAINT valid_anomaly_type CHECK (anomaly_type IN (
        'performance_drop', 'attendance_spike', 'grade_inconsistency',
        'submission_delay', 'behavior_change', 'fee_default', 'exam_outlier'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_status CHECK (status IN (
        'open', 'acknowledged', 'investigating', 'resolved', 'false_positive'
    ))
);

-- =============================================
-- MODEL METADATA
-- =============================================

CREATE TABLE analytics.ml_models (
    model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'linear_regression', 'random_forest', 'neural_network', 'clustering'
    model_category VARCHAR(50) NOT NULL, -- 'prediction', 'classification', 'clustering', 'anomaly_detection'
    version VARCHAR(50) NOT NULL,
    description TEXT,
    features JSONB NOT NULL, -- List of features used
    hyperparameters JSONB, -- Model configuration
    training_data_size INTEGER,
    accuracy_metrics JSONB, -- {accuracy, precision, recall, f1_score, rmse, mae}
    trained_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_model_type CHECK (model_type IN (
        'linear_regression', 'logistic_regression', 'decision_tree',
        'random_forest', 'gradient_boosting', 'neural_network',
        'k_means', 'dbscan', 'isolation_forest'
    )),
    CONSTRAINT valid_model_category CHECK (model_category IN (
        'prediction', 'classification', 'clustering', 'anomaly_detection', 'recommendation'
    )),
    CONSTRAINT unique_model_version UNIQUE (model_name, version)
);

-- =============================================
-- TRAINING HISTORY
-- =============================================

CREATE TABLE analytics.model_training_history (
    training_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL,
    training_start TIMESTAMP WITH TIME ZONE NOT NULL,
    training_end TIMESTAMP WITH TIME ZONE,
    data_snapshot JSONB, -- Summary of training data
    validation_metrics JSONB, -- Metrics on validation set
    test_metrics JSONB, -- Metrics on test set
    status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
    error_message TEXT,
    trained_by UUID,

    CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES analytics.ml_models(model_id) ON DELETE CASCADE,
    CONSTRAINT valid_training_status CHECK (status IN ('running', 'completed', 'failed'))
);

-- =============================================
-- RECOMMENDATIONS
-- =============================================

CREATE TABLE analytics.recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- 'student', 'teacher', 'admin'
    target_id UUID NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL, -- 'intervention', 'resource', 'action', 'alert'
    priority VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'urgent'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reasoning JSONB, -- Why this recommendation was made
    suggested_actions JSONB, -- List of actionable steps
    expected_impact TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'implemented'
    implemented_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE,
    CONSTRAINT valid_target_type CHECK (target_type IN ('student', 'teacher', 'admin', 'parent', 'class')),
    CONSTRAINT valid_recommendation_type CHECK (recommendation_type IN (
        'intervention', 'resource', 'action', 'alert', 'opportunity', 'warning'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT valid_rec_status CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented', 'expired'))
);

-- =============================================
-- INDICES FOR PERFORMANCE
-- =============================================

-- Student Predictions
CREATE INDEX idx_student_predictions_student ON analytics.student_predictions(student_id, prediction_type);
CREATE INDEX idx_student_predictions_school ON analytics.student_predictions(school_id, academic_year);
CREATE INDEX idx_student_predictions_type ON analytics.student_predictions(prediction_type);
CREATE INDEX idx_student_predictions_expires ON analytics.student_predictions(expires_at) WHERE expires_at IS NOT NULL;

-- Enrollment Forecasts
CREATE INDEX idx_enrollment_forecasts_school ON analytics.enrollment_forecasts(school_id, academic_year);
CREATE INDEX idx_enrollment_forecasts_class ON analytics.enrollment_forecasts(class_level) WHERE class_level IS NOT NULL;

-- Anomalies
CREATE INDEX idx_anomalies_school ON analytics.anomalies(school_id, status);
CREATE INDEX idx_anomalies_entity ON analytics.anomalies(entity_type, entity_id);
CREATE INDEX idx_anomalies_severity ON analytics.anomalies(severity, status) WHERE status = 'open';
CREATE INDEX idx_anomalies_detected ON analytics.anomalies(detected_at DESC);

-- ML Models
CREATE INDEX idx_ml_models_active ON analytics.ml_models(model_category, model_type) WHERE is_active = TRUE;
CREATE INDEX idx_ml_models_name ON analytics.ml_models(model_name, version);

-- Recommendations
CREATE INDEX idx_recommendations_target ON analytics.recommendations(target_type, target_id, status);
CREATE INDEX idx_recommendations_school ON analytics.recommendations(school_id, status);
CREATE INDEX idx_recommendations_priority ON analytics.recommendations(priority, status) WHERE status = 'pending';
CREATE INDEX idx_recommendations_expires ON analytics.recommendations(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to clean expired predictions
CREATE OR REPLACE FUNCTION analytics.clean_expired_predictions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics.student_predictions
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired recommendations
CREATE OR REPLACE FUNCTION analytics.clean_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE analytics.recommendations
    SET status = 'expired'
    WHERE expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP
      AND status = 'pending';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get student risk level
CREATE OR REPLACE FUNCTION analytics.get_student_risk_level(
    p_student_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
    dropout_risk DECIMAL;
    performance_trend VARCHAR;
    risk_level VARCHAR;
BEGIN
    -- Get latest dropout risk prediction
    SELECT (predicted_value->>'probability')::DECIMAL INTO dropout_risk
    FROM analytics.student_predictions
    WHERE student_id = p_student_id
      AND prediction_type = 'dropout_risk'
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get performance trend
    SELECT predicted_value->>'trend' INTO performance_trend
    FROM analytics.student_predictions
    WHERE student_id = p_student_id
      AND prediction_type = 'performance_trend'
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Determine risk level
    IF dropout_risk IS NULL THEN
        risk_level := 'unknown';
    ELSIF dropout_risk >= 0.7 THEN
        risk_level := 'critical';
    ELSIF dropout_risk >= 0.5 THEN
        risk_level := 'high';
    ELSIF dropout_risk >= 0.3 THEN
        risk_level := 'medium';
    ELSE
        risk_level := 'low';
    END IF;

    RETURN risk_level;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON SCHEMA analytics IS 'AI Analytics schema for ML predictions, forecasts, and anomaly detection';

COMMENT ON TABLE analytics.student_predictions IS 'ML predictions for student performance, dropout risk, etc.';
COMMENT ON TABLE analytics.enrollment_forecasts IS 'Enrollment forecasting using time series analysis';
COMMENT ON TABLE analytics.anomalies IS 'Detected anomalies in student performance, attendance, etc.';
COMMENT ON TABLE analytics.ml_models IS 'Metadata for trained ML models';
COMMENT ON TABLE analytics.model_training_history IS 'Training history and metrics for ML models';
COMMENT ON TABLE analytics.recommendations IS 'AI-generated recommendations for interventions and actions';

-- Migration complete
SELECT 'Migration 009: AI Analytics schema created successfully' AS message;
