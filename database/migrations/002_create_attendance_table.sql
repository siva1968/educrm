-- =============================================
-- Migration: Create Attendance Tables
-- Version: 002
-- Date: 2025-11-19
-- =============================================

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  section VARCHAR(10),
  subject_id UUID REFERENCES subjects(id),

  -- Attendance Details
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'half_day')),
  check_in_time TIME,
  check_out_time TIME,

  -- Additional Info
  remarks TEXT,
  marked_by UUID REFERENCES users(id),
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Leave Information (if absent/excused)
  leave_type VARCHAR(50),
  leave_reason TEXT,
  leave_approved_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(student_id, attendance_date, subject_id)
);

-- Indexes
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, attendance_date);
CREATE INDEX idx_attendance_student_date_range ON attendance(student_id, attendance_date);
CREATE INDEX idx_attendance_marked_by ON attendance(marked_by);

-- Attendance summary materialized view for performance
CREATE MATERIALIZED VIEW attendance_summary AS
SELECT
  student_id,
  class_id,
  DATE_TRUNC('month', attendance_date) as month,
  COUNT(*) as total_days,
  COUNT(*) FILTER (WHERE status = 'present') as present_days,
  COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
  COUNT(*) FILTER (WHERE status = 'late') as late_days,
  COUNT(*) FILTER (WHERE status = 'excused') as excused_days,
  ROUND((COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / COUNT(*)) * 100, 2) as attendance_percentage
FROM attendance
GROUP BY student_id, class_id, DATE_TRUNC('month', attendance_date);

CREATE UNIQUE INDEX idx_attendance_summary_unique ON attendance_summary(student_id, class_id, month);
CREATE INDEX idx_attendance_summary_percentage ON attendance_summary(attendance_percentage);

COMMENT ON TABLE attendance IS 'Daily attendance records for students';
COMMENT ON MATERIALIZED VIEW attendance_summary IS 'Monthly attendance summary for performance - refresh periodically';
