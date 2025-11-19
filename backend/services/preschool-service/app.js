const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PRESCHOOL_PORT || 4181;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const dailyActivities = new Map();
const mealRecords = new Map();
const napRecords = new Map();
const communications = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Pre-School Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Daily activity tracking',
      'Meal monitoring',
      'Nap time recording',
      'Parent communication',
      'Child development tracking'
    ]
  });
});

// Health check
app.get('/api/v1/preschool/health', (req, res) => {
  res.json({ service: 'Pre-School', status: 'healthy', timestamp: new Date().toISOString() });
});

// Record daily activity
app.post('/api/v1/preschool/activities', (req, res) => {
  const { childId, activityType, description, duration, mood, notes } = req.body;

  const activity = {
    id: uuidv4(),
    activityId: `ACT-${Date.now()}`,
    childId,
    activityType, // play, learning, outdoor, art
    description,
    duration,
    mood, // happy, calm, upset, tired
    notes,
    recordedAt: new Date().toISOString()
  };

  dailyActivities.set(activity.id, activity);

  res.status(201).json({
    success: true,
    message: 'Activity recorded successfully',
    data: activity
  });
});

// Get daily activities
app.get('/api/v1/preschool/activities', (req, res) => {
  const { childId, date } = req.query;
  let activityList = Array.from(dailyActivities.values());

  if (childId) activityList = activityList.filter(a => a.childId === childId);
  if (date) activityList = activityList.filter(a => a.recordedAt.startsWith(date));

  res.json({
    success: true,
    count: activityList.length,
    data: activityList
  });
});

// Record meal
app.post('/api/v1/preschool/meals', (req, res) => {
  const { childId, mealType, items, amountConsumed, allergies } = req.body;

  const meal = {
    id: uuidv4(),
    mealId: `MEAL-${Date.now()}`,
    childId,
    mealType, // breakfast, lunch, snack
    items,
    amountConsumed, // all, most, some, little, none
    allergies,
    recordedAt: new Date().toISOString()
  };

  mealRecords.set(meal.id, meal);

  res.status(201).json({
    success: true,
    message: 'Meal recorded successfully',
    data: meal
  });
});

// Get meal records
app.get('/api/v1/preschool/meals', (req, res) => {
  const { childId, date } = req.query;
  let mealList = Array.from(mealRecords.values());

  if (childId) mealList = mealList.filter(m => m.childId === childId);
  if (date) mealList = mealList.filter(m => m.recordedAt.startsWith(date));

  res.json({
    success: true,
    count: mealList.length,
    data: mealList
  });
});

// Record nap time
app.post('/api/v1/preschool/naps', (req, res) => {
  const { childId, startTime, endTime, duration, quality } = req.body;

  const nap = {
    id: uuidv4(),
    napId: `NAP-${Date.now()}`,
    childId,
    startTime,
    endTime,
    duration,
    quality, // good, fair, poor
    recordedAt: new Date().toISOString()
  };

  napRecords.set(nap.id, nap);

  res.status(201).json({
    success: true,
    message: 'Nap time recorded successfully',
    data: nap
  });
});

// Get nap records
app.get('/api/v1/preschool/naps', (req, res) => {
  const { childId, date } = req.query;
  let napList = Array.from(napRecords.values());

  if (childId) napList = napList.filter(n => n.childId === childId);
  if (date) napList = napList.filter(n => n.recordedAt.startsWith(date));

  res.json({
    success: true,
    count: napList.length,
    data: napList
  });
});

// Send communication to parents
app.post('/api/v1/preschool/communications', (req, res) => {
  const { childId, parentId, type, subject, message, attachments } = req.body;

  const communication = {
    id: uuidv4(),
    communicationId: `COMM-${Date.now()}`,
    childId,
    parentId,
    type, // message, alert, photo, video
    subject,
    message,
    attachments: attachments || [],
    read: false,
    sentAt: new Date().toISOString()
  };

  communications.set(communication.id, communication);

  res.status(201).json({
    success: true,
    message: 'Communication sent successfully',
    data: communication
  });
});

// Get communications
app.get('/api/v1/preschool/communications', (req, res) => {
  const { childId, parentId, type, read } = req.query;
  let commList = Array.from(communications.values());

  if (childId) commList = commList.filter(c => c.childId === childId);
  if (parentId) commList = commList.filter(c => c.parentId === parentId);
  if (type) commList = commList.filter(c => c.type === type);
  if (read !== undefined) commList = commList.filter(c => c.read === (read === 'true'));

  res.json({
    success: true,
    count: commList.length,
    data: commList
  });
});

// Mark communication as read
app.put('/api/v1/preschool/communications/:id/read', (req, res) => {
  const communication = communications.get(req.params.id);

  if (!communication) {
    return res.status(404).json({ success: false, message: 'Communication not found' });
  }

  communication.read = true;
  communication.readAt = new Date().toISOString();

  communications.set(communication.id, communication);

  res.json({
    success: true,
    message: 'Communication marked as read',
    data: communication
  });
});

// Get daily report
app.get('/api/v1/preschool/daily-report/:childId', (req, res) => {
  const { date } = req.query;
  const today = date || new Date().toISOString().split('T')[0];

  const activities = Array.from(dailyActivities.values())
    .filter(a => a.childId === req.params.childId && a.recordedAt.startsWith(today));

  const meals = Array.from(mealRecords.values())
    .filter(m => m.childId === req.params.childId && m.recordedAt.startsWith(today));

  const naps = Array.from(napRecords.values())
    .filter(n => n.childId === req.params.childId && n.recordedAt.startsWith(today));

  const report = {
    childId: req.params.childId,
    date: today,
    activities,
    meals,
    naps,
    summary: {
      totalActivities: activities.length,
      mealsConsumed: meals.length,
      napDuration: naps.reduce((sum, n) => sum + n.duration, 0),
      overallMood: activities.length > 0 ? activities[activities.length - 1].mood : 'unknown'
    }
  };

  res.json({
    success: true,
    data: report
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n👶 Pre-School Service running on port ${PORT}\n`);
  });
}

module.exports = app;
