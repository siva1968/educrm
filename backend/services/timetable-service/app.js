const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.TIMETABLE_PORT || 4110;

app.use(helmet());
app.use(cors());
app.use(express.json());

const timetables = new Map();
const periods = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Timetable Management Service',
    version: '1.0.0',
    features: ['Class timetables', 'Teacher schedules', 'Period management', 'Substitution handling', 'Conflict detection']
  });
});

app.get('/api/v1/timetable/health', (req, res) => {
  res.json({ service: 'Timetable Management', status: 'healthy' });
});

app.post('/api/v1/timetable/create', (req, res) => {
  const { classId, academicYear, periods: periodsList } = req.body;

  const timetable = {
    timetableId: uuidv4(),
    classId,
    academicYear,
    periods: periodsList || [],
    createdAt: new Date().toISOString()
  };

  timetables.set(timetable.timetableId, timetable);

  res.status(201).json({ success: true, data: timetable });
});

app.post('/api/v1/timetable/period/add', (req, res) => {
  const { timetableId, day, startTime, endTime, subject, teacher, room } = req.body;

  const period = {
    periodId: uuidv4(),
    timetableId,
    day, // monday, tuesday, etc.
    startTime,
    endTime,
    subject,
    teacher,
    room
  };

  periods.set(period.periodId, period);

  res.status(201).json({ success: true, data: period });
});

app.get('/api/v1/timetable/class/:classId', (req, res) => {
  const classTimetables = Array.from(timetables.values())
    .filter(t => t.classId === req.params.classId);

  res.json({ success: true, data: classTimetables });
});

app.get('/api/v1/timetable/teacher/:teacherId', (req, res) => {
  const teacherPeriods = Array.from(periods.values())
    .filter(p => p.teacher === req.params.teacherId);

  res.json({ success: true, data: teacherPeriods });
});

app.post('/api/v1/timetable/substitution', (req, res) => {
  const { periodId, substituteTeacher, reason } = req.body;

  const period = periods.get(periodId);
  if (!period) {
    return res.status(404).json({ success: false, message: 'Period not found' });
  }

  const substitution = {
    ...period,
    originalTeacher: period.teacher,
    teacher: substituteTeacher,
    substitutionReason: reason,
    substitutedAt: new Date().toISOString()
  };

  periods.set(periodId, substitution);

  res.json({ success: true, data: substitution });
});

app.get('/api/v1/timetable/conflicts', (req, res) => {
  const periodsList = Array.from(periods.values());
  const conflicts = [];

  for (let i = 0; i < periodsList.length; i++) {
    for (let j = i + 1; j < periodsList.length; j++) {
      const p1 = periodsList[i];
      const p2 = periodsList[j];

      if (p1.teacher === p2.teacher && p1.day === p2.day &&
          p1.startTime === p2.startTime) {
        conflicts.push({ period1: p1, period2: p2, type: 'teacher_double_booking' });
      }
    }
  }

  res.json({ success: true, data: { count: conflicts.length, conflicts } });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📅 Timetable Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
