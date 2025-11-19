const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.TEACHING_PLAN_PORT || 4116;

app.use(helmet());
app.use(cors());
app.use(express.json());

const teachingPlans = new Map();
const lessonPlans = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Teaching Plan Service',
    version: '1.0.0',
    features: ['Curriculum planning', 'Lesson plans', 'Learning objectives', 'Resource allocation', 'Progress tracking']
  });
});

app.get('/api/v1/teaching-plan/health', (req, res) => {
  res.json({ service: 'Teaching Plan', status: 'healthy' });
});

app.post('/api/v1/teaching-plan/create', (req, res) => {
  const { subject, semester, teacherId, objectives, topics } = req.body;
  const plan = {
    planId: uuidv4(),
    subject,
    semester,
    teacherId,
    objectives: objectives || [],
    topics: topics || [],
    createdAt: new Date().toISOString()
  };
  teachingPlans.set(plan.planId, plan);
  res.status(201).json({ success: true, data: plan });
});

app.post('/api/v1/teaching-plan/lesson/add', (req, res) => {
  const { planId, lessonNumber, topic, objectives, activities, duration, resources } = req.body;
  const lesson = {
    lessonId: uuidv4(),
    planId,
    lessonNumber,
    topic,
    objectives: objectives || [],
    activities: activities || [],
    duration,
    resources: resources || [],
    createdAt: new Date().toISOString()
  };
  lessonPlans.set(lesson.lessonId, lesson);
  res.status(201).json({ success: true, data: lesson });
});

app.get('/api/v1/teaching-plan/teacher/:teacherId', (req, res) => {
  const teacherPlans = Array.from(teachingPlans.values()).filter(p => p.teacherId === req.params.teacherId);
  res.json({ success: true, data: teacherPlans });
});

app.get('/api/v1/teaching-plan/:planId/lessons', (req, res) => {
  const planLessons = Array.from(lessonPlans.values()).filter(l => l.planId === req.params.planId);
  res.json({ success: true, data: planLessons });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`\n📖 Teaching Plan Service running on port ${PORT}\n`));
}

module.exports = app;
