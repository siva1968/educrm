const pool = require('../../../config/database');
const { NotFoundError, ValidationError } = require('../../../shared/utils/errors');

/**
 * AI Analytics Service
 * Statistical models for predictions, anomaly detection, and forecasting
 */

class AnalyticsService {
  /**
   * Predict student performance using linear regression
   */
  async predictStudentPerformance(predictionData) {
    const {
      student_id, school_id, subject_id, academic_year, term, prediction_type
    } = predictionData;

    // Fetch historical grades
    const gradesQuery = `
      SELECT
        sg.marks_obtained, sg.percentage, sg.gpa,
        a.max_marks, a.weightage, a.assessment_type,
        a.due_date
      FROM academic.student_grades sg
      JOIN academic.assessments a ON sg.assessment_id = a.assessment_id
      WHERE sg.student_id = $1
        AND a.school_id = $2
        ${subject_id ? 'AND a.subject_id = $3' : ''}
        AND sg.is_deleted = FALSE
        AND a.is_deleted = FALSE
      ORDER BY a.due_date ASC
    `;

    const params = subject_id ? [student_id, school_id, subject_id] : [student_id, school_id];
    const gradesResult = await pool.query(gradesQuery, params);

    if (gradesResult.rows.length < 3) {
      throw new ValidationError('Insufficient data for prediction (minimum 3 assessments required)');
    }

    const grades = gradesResult.rows;

    let predicted_value, confidence_score, features_used;

    switch (prediction_type) {
      case 'final_grade':
        ({ predicted_value, confidence_score, features_used } = this.predictFinalGrade(grades));
        break;

      case 'dropout_risk':
        ({ predicted_value, confidence_score, features_used } = this.predictDropoutRisk(grades));
        break;

      case 'performance_trend':
        ({ predicted_value, confidence_score, features_used } = this.analyzePerformanceTrend(grades));
        break;

      default:
        ({ predicted_value, confidence_score, features_used } = this.predictFinalGrade(grades));
    }

    // Save prediction
    const result = await pool.query(
      `INSERT INTO analytics.student_predictions (
        student_id, school_id, prediction_type, subject_id, academic_year, term,
        predicted_value, confidence_score, features_used, model_version, model_type,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP + INTERVAL '30 days')
      RETURNING *`,
      [
        student_id, school_id, prediction_type, subject_id, academic_year, term,
        JSON.stringify(predicted_value), confidence_score, JSON.stringify(features_used),
        '1.0.0', 'statistical_analysis'
      ]
    );

    return result.rows[0];
  }

  /**
   * Predict final grade using weighted average and trend
   */
  predictFinalGrade(grades) {
    const percentages = grades.map(g => parseFloat(g.percentage) || 0);
    const weightedSum = grades.reduce((sum, g, i) => {
      const weight = parseFloat(g.weightage) || 1;
      return sum + (percentages[i] * weight);
    }, 0);
    const totalWeight = grades.reduce((sum, g) => sum + (parseFloat(g.weightage) || 1), 0);

    const weightedAvg = weightedSum / totalWeight;

    // Calculate trend (improvement or decline)
    const recent = percentages.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, percentages.length);
    const older = percentages.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, percentages.length - 3);
    const trend = recent - older;

    // Predict final grade with trend adjustment
    let predictedGrade = weightedAvg + (trend * 0.3); // 30% trend influence
    predictedGrade = Math.max(0, Math.min(100, predictedGrade)); // Clamp to 0-100

    // Calculate confidence based on consistency
    const variance = this.calculateVariance(percentages);
    const confidence = Math.max(0.5, 1 - (variance / 1000)); // Higher variance = lower confidence

    return {
      predicted_value: {
        percentage: Math.round(predictedGrade * 100) / 100,
        grade: this.percentageToGrade(predictedGrade),
        trend: trend > 2 ? 'improving' : trend < -2 ? 'declining' : 'stable'
      },
      confidence_score: Math.round(confidence * 10000) / 10000,
      features_used: {
        num_assessments: grades.length,
        weighted_average: Math.round(weightedAvg * 100) / 100,
        recent_performance: Math.round(recent * 100) / 100,
        trend_direction: trend > 0 ? 'positive' : 'negative',
        variance: Math.round(variance * 100) / 100
      }
    };
  }

  /**
   * Predict dropout risk based on performance patterns
   */
  predictDropoutRisk(grades) {
    const percentages = grades.map(g => parseFloat(g.percentage) || 0);
    const avgPerformance = percentages.reduce((a, b) => a + b, 0) / percentages.length;

    // Risk factors
    const lowPerformance = avgPerformance < 40 ? 0.4 : avgPerformance < 60 ? 0.2 : 0;
    const decliningTrend = this.calculateTrend(percentages) < -5 ? 0.3 : 0;
    const inconsistency = this.calculateVariance(percentages) > 400 ? 0.2 : 0;
    const recentFailures = percentages.slice(-3).filter(p => p < 40).length * 0.1;

    const riskProbability = Math.min(0.95, lowPerformance + decliningTrend + inconsistency + recentFailures);
    const confidence = 0.75; // Statistical model confidence

    return {
      predicted_value: {
        probability: Math.round(riskProbability * 10000) / 10000,
        risk_level: riskProbability > 0.7 ? 'critical' : riskProbability > 0.5 ? 'high' : riskProbability > 0.3 ? 'medium' : 'low',
        factors: {
          low_performance: lowPerformance > 0,
          declining_trend: decliningTrend > 0,
          inconsistent_performance: inconsistency > 0,
          recent_failures: recentFailures > 0
        }
      },
      confidence_score: confidence,
      features_used: {
        average_performance: Math.round(avgPerformance * 100) / 100,
        trend: this.calculateTrend(percentages),
        variance: this.calculateVariance(percentages),
        recent_avg: Math.round((percentages.slice(-3).reduce((a, b) => a + b, 0) / 3) * 100) / 100
      }
    };
  }

  /**
   * Analyze performance trend
   */
  analyzePerformanceTrend(grades) {
    const percentages = grades.map(g => parseFloat(g.percentage) || 0);
    const trend = this.calculateTrend(percentages);

    const trendCategory =
      trend > 5 ? 'strongly_improving' :
      trend > 2 ? 'improving' :
      trend < -5 ? 'strongly_declining' :
      trend < -2 ? 'declining' : 'stable';

    return {
      predicted_value: {
        trend: trendCategory,
        slope: Math.round(trend * 100) / 100,
        direction: trend > 0 ? 'upward' : trend < 0 ? 'downward' : 'flat',
        consistency: this.calculateVariance(percentages) < 200 ? 'high' : 'low'
      },
      confidence_score: 0.85,
      features_used: {
        data_points: percentages.length,
        current_avg: Math.round((percentages.slice(-3).reduce((a, b) => a + b, 0) / 3) * 100) / 100,
        overall_avg: Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100) / 100
      }
    };
  }

  /**
   * Detect anomalies using Z-score method
   */
  async detectAnomalies(detectionData) {
    const { school_id, entity_type, entity_id, start_date, end_date, sensitivity = 2 } = detectionData;

    const anomalies = [];

    switch (entity_type) {
      case 'student':
        await this.detectStudentAnomalies(school_id, entity_id, start_date, end_date, sensitivity, anomalies);
        break;

      case 'attendance':
        await this.detectAttendanceAnomalies(school_id, entity_id, start_date, end_date, sensitivity, anomalies);
        break;

      case 'class':
        await this.detectClassAnomalies(school_id, entity_id, start_date, end_date, sensitivity, anomalies);
        break;
    }

    // Save anomalies to database
    for (const anomaly of anomalies) {
      await pool.query(
        `INSERT INTO analytics.anomalies (
          school_id, entity_type, entity_id, anomaly_type, severity,
          description, details, expected_value, actual_value, deviation_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          school_id, anomaly.entity_type, anomaly.entity_id, anomaly.anomaly_type, anomaly.severity,
          anomaly.description, JSON.stringify(anomaly.details),
          anomaly.expected_value, anomaly.actual_value, anomaly.deviation_score
        ]
      );
    }

    return anomalies;
  }

  /**
   * Detect student performance anomalies
   */
  async detectStudentAnomalies(schoolId, studentId, startDate, endDate, sensitivity, anomalies) {
    const query = `
      SELECT sg.percentage, a.due_date, a.assessment_name
      FROM academic.student_grades sg
      JOIN academic.assessments a ON sg.assessment_id = a.assessment_id
      WHERE sg.student_id = $1 AND a.school_id = $2
        AND sg.is_deleted = FALSE
        ${startDate ? 'AND a.due_date >= $3' : ''}
        ${endDate ? `AND a.due_date <= $${startDate ? 4 : 3}` : ''}
      ORDER BY a.due_date ASC
    `;

    const params = [studentId, schoolId];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);

    const result = await pool.query(query, params);
    const grades = result.rows.map(r => parseFloat(r.percentage));

    if (grades.length < 3) return;

    const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
    const stdDev = Math.sqrt(this.calculateVariance(grades));

    // Check each grade for anomalies
    result.rows.forEach((row, i) => {
      const zScore = Math.abs((grades[i] - mean) / stdDev);

      if (zScore > sensitivity) {
        const severity = zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium';

        anomalies.push({
          entity_type: 'student',
          entity_id: studentId,
          anomaly_type: grades[i] < mean ? 'performance_drop' : 'performance_spike',
          severity,
          description: `Unusual ${grades[i] < mean ? 'low' : 'high'} grade detected in ${row.assessment_name}`,
          details: {
            assessment: row.assessment_name,
            date: row.due_date,
            z_score: Math.round(zScore * 100) / 100
          },
          expected_value: Math.round(mean * 100) / 100,
          actual_value: grades[i],
          deviation_score: Math.round(zScore * 10000) / 10000
        });
      }
    });
  }

  /**
   * Detect attendance anomalies
   */
  async detectAttendanceAnomalies(schoolId, classLevel, startDate, endDate, sensitivity, anomalies) {
    const query = `
      SELECT
        date,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        COUNT(*) as total_count
      FROM attendance_tracking.attendance a
      JOIN sis_core.students s ON a.student_id = s.student_id
      WHERE a.school_id = $1
        ${classLevel ? 'AND s.class = $2' : ''}
        AND a.is_deleted = FALSE
        ${startDate ? `AND a.date >= $${classLevel ? 3 : 2}` : ''}
        ${endDate ? `AND a.date <= $${classLevel ? 4 : (startDate ? 3 : 2)}` : ''}
      GROUP BY date
      ORDER BY date ASC
    `;

    const params = [schoolId];
    if (classLevel) params.push(classLevel);
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);

    const result = await pool.query(query, params);
    const absentRates = result.rows.map(r => (parseInt(r.absent_count) / parseInt(r.total_count)) * 100);

    if (absentRates.length < 5) return;

    const mean = absentRates.reduce((a, b) => a + b, 0) / absentRates.length;
    const stdDev = Math.sqrt(this.calculateVariance(absentRates));

    result.rows.forEach((row, i) => {
      const zScore = Math.abs((absentRates[i] - mean) / stdDev);

      if (zScore > sensitivity) {
        anomalies.push({
          entity_type: 'attendance',
          entity_id: classLevel || schoolId,
          anomaly_type: absentRates[i] > mean ? 'attendance_spike' : 'attendance_drop',
          severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium',
          description: `Unusual absence rate detected on ${row.date}`,
          details: {
            date: row.date,
            absent_count: parseInt(row.absent_count),
            total_count: parseInt(row.total_count),
            z_score: Math.round(zScore * 100) / 100
          },
          expected_value: Math.round(mean * 100) / 100,
          actual_value: Math.round(absentRates[i] * 100) / 100,
          deviation_score: Math.round(zScore * 10000) / 10000
        });
      }
    });
  }

  /**
   * Detect class performance anomalies
   */
  async detectClassAnomalies(schoolId, className, startDate, endDate, sensitivity, anomalies) {
    // Similar implementation for class-level anomalies
    // Check for unusual class average, failure rates, etc.
  }

  /**
   * Forecast enrollment using moving average
   */
  async forecastEnrollment(forecastData) {
    const { school_id, academic_year, class_level, forecast_period } = forecastData;

    // Fetch historical enrollment data
    const query = `
      SELECT
        LEFT(admission_date::TEXT, 7) as month,
        COUNT(*) as enrollment_count
      FROM sis_core.students
      WHERE school_id = $1
        ${class_level ? 'AND class = $2' : ''}
      GROUP BY LEFT(admission_date::TEXT, 7)
      ORDER BY month DESC
      LIMIT 12
    `;

    const params = class_level ? [school_id, class_level] : [school_id];
    const result = await pool.query(query, params);

    const enrollments = result.rows.map(r => parseInt(r.enrollment_count));

    if (enrollments.length < 3) {
      throw new ValidationError('Insufficient historical data for forecasting');
    }

    // Simple moving average forecast
    const windowSize = Math.min(3, enrollments.length);
    const recentAvg = enrollments.slice(0, windowSize).reduce((a, b) => a + b, 0) / windowSize;

    // Calculate trend
    const trend = this.calculateTrend(enrollments.reverse());
    const forecastedEnrollment = Math.round(recentAvg + trend);

    // Confidence interval (±10%)
    const margin = Math.round(forecastedEnrollment * 0.1);

    const forecast = await pool.query(
      `INSERT INTO analytics.enrollment_forecasts (
        school_id, academic_year, class_level, forecast_period,
        forecasted_enrollment, confidence_interval, trend, model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        school_id, academic_year, class_level, forecast_period,
        forecastedEnrollment,
        JSON.stringify({ lower: forecastedEnrollment - margin, upper: forecastedEnrollment + margin, confidence_level: 0.90 }),
        trend > 1 ? 'increasing' : trend < -1 ? 'decreasing' : 'stable',
        '1.0.0'
      ]
    );

    return forecast.rows[0];
  }

  /**
   * Generate AI recommendations based on predictions and anomalies
   */
  async generateRecommendations(recommendationData) {
    const { school_id, target_type, target_id, based_on } = recommendationData;

    const recommendations = [];

    // Get predictions for target
    if (based_on.includes('predictions')) {
      const predictions = await pool.query(
        `SELECT * FROM analytics.student_predictions
         WHERE student_id = $1 AND school_id = $2
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         ORDER BY created_at DESC LIMIT 5`,
        [target_id, school_id]
      );

      for (const pred of predictions.rows) {
        const predValue = typeof pred.predicted_value === 'string'
          ? JSON.parse(pred.predicted_value)
          : pred.predicted_value;

        if (pred.prediction_type === 'dropout_risk' && predValue.probability > 0.5) {
          recommendations.push({
            recommendation_type: 'intervention',
            priority: predValue.probability > 0.7 ? 'urgent' : 'high',
            title: 'Student at Risk of Dropout',
            description: `Student shows ${(predValue.probability * 100).toFixed(0)}% dropout risk. Immediate intervention recommended.`,
            reasoning: pred.features_used,
            suggested_actions: [
              'Schedule one-on-one counseling session',
              'Contact parents/guardians',
              'Arrange additional tutoring support',
              'Review and adjust academic plan'
            ],
            expected_impact: 'Reduce dropout risk by addressing underlying performance issues'
          });
        }

        if (pred.prediction_type === 'final_grade' && predValue.percentage < 40) {
          recommendations.push({
            recommendation_type: 'intervention',
            priority: 'high',
            title: 'Academic Support Needed',
            description: `Student predicted to score ${predValue.percentage.toFixed(0)}% in final assessment. Additional support required.`,
            reasoning: pred.features_used,
            suggested_actions: [
              'Provide extra tutoring sessions',
              'Assign peer mentor',
              'Review learning materials',
              'Adjust teaching approach'
            ],
            expected_impact: 'Improve final grade by 10-15 percentage points'
          });
        }
      }
    }

    // Get anomalies for target
    if (based_on.includes('anomalies')) {
      const anomalies = await pool.query(
        `SELECT * FROM analytics.anomalies
         WHERE entity_id = $1 AND entity_type = $2 AND school_id = $3
         AND status = 'open'
         ORDER BY severity DESC, detected_at DESC LIMIT 5`,
        [target_id, target_type, school_id]
      );

      for (const anomaly of anomalies.rows) {
        recommendations.push({
          recommendation_type: 'alert',
          priority: anomaly.severity === 'critical' ? 'urgent' : 'high',
          title: `${anomaly.anomaly_type.replace(/_/g, ' ').toUpperCase()} Detected`,
          description: anomaly.description,
          reasoning: anomaly.details,
          suggested_actions: [
            'Investigate root cause',
            'Monitor closely for next 2 weeks',
            'Document observations'
          ],
          expected_impact: 'Prevent performance degradation'
        });
      }
    }

    // Save recommendations
    for (const rec of recommendations) {
      await pool.query(
        `INSERT INTO analytics.recommendations (
          school_id, target_type, target_id, recommendation_type, priority,
          title, description, reasoning, suggested_actions, expected_impact,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP + INTERVAL '30 days')`,
        [
          school_id, target_type, target_id, rec.recommendation_type, rec.priority,
          rec.title, rec.description, JSON.stringify(rec.reasoning),
          JSON.stringify(rec.suggested_actions), rec.expected_impact
        ]
      );
    }

    return recommendations;
  }

  /**
   * List predictions with filters
   */
  async listPredictions(filters) {
    const {
      student_id, school_id, prediction_type, subject_id, academic_year, min_confidence,
      page = 1, limit = 20
    } = filters;

    let query = `SELECT * FROM analytics.student_predictions WHERE school_id = $1`;
    const params = [school_id];
    let paramCount = 1;

    if (student_id) {
      paramCount++;
      query += ` AND student_id = $${paramCount}`;
      params.push(student_id);
    }

    if (prediction_type) {
      paramCount++;
      query += ` AND prediction_type = $${paramCount}`;
      params.push(prediction_type);
    }

    if (subject_id) {
      paramCount++;
      query += ` AND subject_id = $${paramCount}`;
      params.push(subject_id);
    }

    if (academic_year) {
      paramCount++;
      query += ` AND academic_year = $${paramCount}`;
      params.push(academic_year);
    }

    if (min_confidence) {
      paramCount++;
      query += ` AND confidence_score >= $${paramCount}`;
      params.push(min_confidence);
    }

    // Only include non-expired predictions
    query += ` AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`;

    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      predictions: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * List anomalies with filters
   */
  async listAnomalies(filters) {
    const {
      school_id, entity_type, severity, status, start_date, end_date,
      page = 1, limit = 20
    } = filters;

    let query = `SELECT * FROM analytics.anomalies WHERE school_id = $1`;
    const params = [school_id];
    let paramCount = 1;

    if (entity_type) {
      paramCount++;
      query += ` AND entity_type = $${paramCount}`;
      params.push(entity_type);
    }

    if (severity) {
      paramCount++;
      query += ` AND severity = $${paramCount}`;
      params.push(severity);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND detected_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND detected_at <= $${paramCount}`;
      params.push(end_date);
    }

    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    query += ` ORDER BY detected_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return {
      anomalies: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update anomaly status
   */
  async updateAnomalyStatus(anomalyId, updateData) {
    const { status, assigned_to, resolution_notes } = updateData;

    const fields = ['status = $1'];
    const values = [status];
    let paramCount = 1;

    if (assigned_to) {
      paramCount++;
      fields.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
    }

    if (resolution_notes) {
      paramCount++;
      fields.push(`resolution_notes = $${paramCount}`);
      values.push(resolution_notes);
    }

    if (status === 'acknowledged') {
      fields.push('acknowledged_at = CURRENT_TIMESTAMP');
    } else if (status === 'resolved' || status === 'false_positive') {
      fields.push('resolved_at = CURRENT_TIMESTAMP');
    }

    paramCount++;
    values.push(anomalyId);

    const result = await pool.query(
      `UPDATE analytics.anomalies
       SET ${fields.join(', ')}
       WHERE anomaly_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Anomaly not found');
    }

    return result.rows[0];
  }

  // Helper methods

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;

    // Simple linear regression slope
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return Math.round(slope * 100) / 100;
  }

  percentageToGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  }
}

module.exports = new AnalyticsService();
