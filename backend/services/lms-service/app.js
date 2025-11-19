const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.LMS_PORT || 4115;

app.use(helmet());
app.use(cors());
app.use(express.json());

const courses = new Map();
const modules = new Map();
const enrollments = new Map();
const progress = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Learning Management System (LMS)',
    version: '1.0.0',
    features: ['Course management', 'Content delivery', 'Progress tracking', 'Quiz/assessment', 'Discussion forums', 'Certificates']
  });
});

app.get('/api/v1/lms/health', (req, res) => {
  res.json({ service: 'LMS', status: 'healthy' });
});

app.post('/api/v1/lms/course/create', (req, res) => {
  const { title, description, instructor, duration, category } = req.body;
  const course = {
    courseId: uuidv4(),
    title,
    description,
    instructor,
    duration,
    category,
    modules: [],
    createdAt: new Date().toISOString()
  };
  courses.set(course.courseId, course);
  res.status(201).json({ success: true, data: course });
});

app.post('/api/v1/lms/module/add', (req, res) => {
  const { courseId, title, content, type, duration } = req.body;
  const module = {
    moduleId: uuidv4(),
    courseId,
    title,
    content,
    type, // video, text, quiz, assignment
    duration,
    createdAt: new Date().toISOString()
  };
  modules.set(module.moduleId, module);
  res.status(201).json({ success: true, data: module });
});

app.post('/api/v1/lms/enroll', (req, res) => {
  const { courseId, studentId } = req.body;
  const enrollment = {
    enrollmentId: uuidv4(),
    courseId,
    studentId,
    enrolledAt: new Date().toISOString(),
    status: 'active',
    progress: 0
  };
  enrollments.set(enrollment.enrollmentId, enrollment);
  res.status(201).json({ success: true, data: enrollment });
});

app.post('/api/v1/lms/progress/update', (req, res) => {
  const { studentId, moduleId, completed } = req.body;
  const progressRecord = {
    progressId: uuidv4(),
    studentId,
    moduleId,
    completed,
    completedAt: completed ? new Date().toISOString() : null
  };
  progress.set(progressRecord.progressId, progressRecord);
  res.json({ success: true, data: progressRecord });
});

app.get('/api/v1/lms/course/:courseId', (req, res) => {
  const course = courses.get(req.params.courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }
  const courseModules = Array.from(modules.values()).filter(m => m.courseId === req.params.courseId);
  res.json({ success: true, data: { ...course, modules: courseModules } });
});

app.get('/api/v1/lms/student/:studentId/courses', (req, res) => {
  const studentEnrollments = Array.from(enrollments.values()).filter(e => e.studentId === req.params.studentId);
  res.json({ success: true, data: studentEnrollments });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`\n🎓 LMS Service running on port ${PORT}\n`));
}

module.exports = app;
