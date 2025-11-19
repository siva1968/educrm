const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const app = express();
const PORT = process.env.ATTENDANCE_PORT || 4101;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const attendanceRecords = new Map();
const attendanceSummary = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Attendance Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Mark daily attendance',
      'Bulk attendance marking',
      'Attendance reports',
      'Absence tracking',
      'Attendance percentage calculation',
      'Late arrival tracking',
      'Leave management integration'
    ]
  });
});

// Health check
app.get('/api/v1/attendance/health', (req, res) => {
  res.json({ service: 'Attendance Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Mark attendance (single student)
app.post('/api/v1/attendance/mark', (req, res) => {
  const { studentId, date, status, classId, subject, remarks } = req.body;

  const record = {
    recordId: uuidv4(),
    studentId,
    date: date || moment().format('YYYY-MM-DD'),
    status, // present, absent, late, excused
    classId,
    subject,
    remarks,
    markedAt: new Date().toISOString(),
    markedBy: req.body.markedBy || 'system'
  };

  attendanceRecords.set(record.recordId, record);

  res.status(201).json({
    success: true,
    message: 'Attendance marked successfully',
    data: record
  });
});

// Mark bulk attendance
app.post('/api/v1/attendance/mark/bulk', (req, res) => {
  const { attendanceList } = req.body;

  const records = attendanceList.map(item => {
    const record = {
      recordId: uuidv4(),
      ...item,
      date: item.date || moment().format('YYYY-MM-DD'),
      markedAt: new Date().toISOString()
    };
    attendanceRecords.set(record.recordId, record);
    return record;
  });

  res.status(201).json({
    success: true,
    message: `${records.length} attendance records marked successfully`,
    data: { count: records.length, records }
  });
});

// Get attendance by student
app.get('/api/v1/attendance/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const { startDate, endDate } = req.query;

  let records = Array.from(attendanceRecords.values())
    .filter(r => r.studentId === studentId);

  if (startDate) {
    records = records.filter(r => r.date >= startDate);
  }
  if (endDate) {
    records = records.filter(r => r.date <= endDate);
  }

  // Calculate statistics
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const percentage = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      studentId,
      records,
      statistics: {
        total,
        present,
        absent,
        late,
        percentage: `${percentage}%`
      }
    }
  });
});

// Get attendance by class
app.get('/api/v1/attendance/class/:classId', (req, res) => {
  const { classId } = req.params;
  const { date } = req.query;

  let records = Array.from(attendanceRecords.values())
    .filter(r => r.classId === classId);

  if (date) {
    records = records.filter(r => r.date === date);
  }

  res.json({
    success: true,
    data: {
      classId,
      date: date || 'all',
      records,
      summary: {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length
      }
    }
  });
});

// Get attendance report
app.get('/api/v1/attendance/report', (req, res) => {
  const { startDate, endDate, classId } = req.query;

  let records = Array.from(attendanceRecords.values());

  if (startDate) records = records.filter(r => r.date >= startDate);
  if (endDate) records = records.filter(r => r.date <= endDate);
  if (classId) records = records.filter(r => r.classId === classId);

  res.json({
    success: true,
    data: {
      reportType: 'attendance_summary',
      period: { startDate, endDate },
      records,
      summary: {
        totalRecords: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length
      }
    }
  });
});

// Get defaulters (low attendance)
app.get('/api/v1/attendance/defaulters', (req, res) => {
  const { threshold = 75 } = req.query;

  const studentAttendance = new Map();

  Array.from(attendanceRecords.values()).forEach(record => {
    if (!studentAttendance.has(record.studentId)) {
      studentAttendance.set(record.studentId, { total: 0, present: 0 });
    }
    const stats = studentAttendance.get(record.studentId);
    stats.total++;
    if (record.status === 'present' || record.status === 'late') {
      stats.present++;
    }
  });

  const defaulters = [];
  studentAttendance.forEach((stats, studentId) => {
    const percentage = (stats.present / stats.total * 100).toFixed(2);
    if (percentage < threshold) {
      defaulters.push({
        studentId,
        attendancePercentage: `${percentage}%`,
        totalDays: stats.total,
        presentDays: stats.present,
        absentDays: stats.total - stats.present
      });
    }
  });

  res.json({
    success: true,
    data: {
      threshold: `${threshold}%`,
      count: defaulters.length,
      defaulters
    }
  });
});

// Update attendance record
app.put('/api/v1/attendance/:recordId', (req, res) => {
  const { recordId } = req.params;
  const record = attendanceRecords.get(recordId);

  if (!record) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  const updatedRecord = { ...record, ...req.body, updatedAt: new Date().toISOString() };
  attendanceRecords.set(recordId, updatedRecord);

  res.json({
    success: true,
    message: 'Attendance record updated successfully',
    data: updatedRecord
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📊 Attendance Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
