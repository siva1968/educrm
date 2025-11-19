const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.SUBJECT_PORT || 4114;

app.use(helmet());
app.use(cors());
app.use(express.json());

const subjects = new Map();
const subjectEnrollments = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Subject Management Service',
    version: '1.0.0',
    features: ['Subject catalog', 'Course curriculum', 'Prerequisites', 'Subject enrollment', 'Subject allocation']
  });
});

app.get('/api/v1/subject/health', (req, res) => {
  res.json({ service: 'Subject Management', status: 'healthy' });
});

app.post('/api/v1/subject/create', (req, res) => {
  const { code, name, description, credits, department, prerequisites } = req.body;
  const subject = {
    subjectId: uuidv4(),
    code,
    name,
    description,
    credits,
    department,
    prerequisites: prerequisites || [],
    createdAt: new Date().toISOString()
  };
  subjects.set(subject.subjectId, subject);
  res.status(201).json({ success: true, data: subject });
});

app.get('/api/v1/subject/all', (req, res) => {
  const allSubjects = Array.from(subjects.values());
  res.json({ success: true, data: allSubjects, count: allSubjects.length });
});

app.get('/api/v1/subject/:subjectId', (req, res) => {
  const subject = subjects.get(req.params.subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }
  res.json({ success: true, data: subject });
});

app.post('/api/v1/subject/enroll', (req, res) => {
  const { subjectId, studentId, semester } = req.body;
  const enrollment = {
    enrollmentId: uuidv4(),
    subjectId,
    studentId,
    semester,
    enrolledAt: new Date().toISOString(),
    status: 'active'
  };
  subjectEnrollments.set(enrollment.enrollmentId, enrollment);
  res.status(201).json({ success: true, data: enrollment });
});

app.get('/api/v1/subject/enrollments/student/:studentId', (req, res) => {
  const studentEnrollments = Array.from(subjectEnrollments.values()).filter(e => e.studentId === req.params.studentId);
  res.json({ success: true, data: studentEnrollments });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`\n📚 Subject Management Service running on port ${PORT}\n`));
}

module.exports = app;
