const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.EXAMINATION_PORT || 4112;

app.use(helmet());
app.use(cors());
app.use(express.json());

const exams = new Map();
const examSchedules = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Examination Management Service',
    version: '1.0.0',
    features: ['Exam scheduling', 'Hall ticket generation', 'Seating arrangements', 'Exam results', 'Answer sheet management']
  });
});

app.get('/api/v1/exam/health', (req, res) => {
  res.json({ service: 'Examination Management', status: 'healthy' });
});

app.post('/api/v1/exam/create', (req, res) => {
  const { name, subject, date, duration, totalMarks, examType } = req.body;
  const exam = {
    examId: uuidv4(),
    name,
    subject,
    date,
    duration, // in minutes
    totalMarks,
    examType, // midterm, final, quiz, practical
    createdAt: new Date().toISOString()
  };
  exams.set(exam.examId, exam);
  res.status(201).json({ success: true, data: exam });
});

app.post('/api/v1/exam/schedule', (req, res) => {
  const { examId, studentId, hallTicketNumber, room, seat } = req.body;
  const schedule = {
    scheduleId: uuidv4(),
    examId,
    studentId,
    hallTicketNumber,
    room,
    seat,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };
  examSchedules.set(schedule.scheduleId, schedule);
  res.status(201).json({ success: true, data: schedule });
});

app.get('/api/v1/exam/student/:studentId', (req, res) => {
  const studentExams = Array.from(examSchedules.values()).filter(s => s.studentId === req.params.studentId);
  res.json({ success: true, data: studentExams });
});

app.get('/api/v1/exam/:examId/schedule', (req, res) => {
  const examScheduleList = Array.from(examSchedules.values()).filter(s => s.examId === req.params.examId);
  res.json({ success: true, data: examScheduleList });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`\n📝 Examination Service running on port ${PORT}\n`));
}

module.exports = app;
