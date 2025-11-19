const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PERFORMANCE_PORT || 4133;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const reviews = new Map();
const kpis = new Map();
const feedbacks = new Map();
const appraisals = new Map();
const goals = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Performance Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Performance reviews',
      'KPI tracking',
      '360-degree feedback',
      'Appraisal management',
      'Goal setting and tracking'
    ]
  });
});

// Health check
app.get('/api/v1/performance/health', (req, res) => {
  res.json({ service: 'Performance Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create performance review
app.post('/api/v1/performance/reviews', (req, res) => {
  const { employeeId, reviewerId, period, ratings, strengths, improvements, comments } = req.body;

  const review = {
    id: uuidv4(),
    reviewNumber: `REV-${Date.now()}`,
    employeeId,
    reviewerId,
    period,
    ratings, // { technical: 4, communication: 5, teamwork: 4, ... }
    strengths,
    improvements,
    comments,
    overallRating: Object.values(ratings).reduce((sum, val) => sum + val, 0) / Object.keys(ratings).length,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  reviews.set(review.id, review);

  res.status(201).json({
    success: true,
    message: 'Performance review created successfully',
    data: review
  });
});

// Get all reviews
app.get('/api/v1/performance/reviews', (req, res) => {
  const { employeeId, reviewerId, status } = req.query;
  let reviewList = Array.from(reviews.values());

  if (employeeId) reviewList = reviewList.filter(r => r.employeeId === employeeId);
  if (reviewerId) reviewList = reviewList.filter(r => r.reviewerId === reviewerId);
  if (status) reviewList = reviewList.filter(r => r.status === status);

  res.json({
    success: true,
    count: reviewList.length,
    data: reviewList
  });
});

// Get review by ID
app.get('/api/v1/performance/reviews/:id', (req, res) => {
  const review = reviews.get(req.params.id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  res.json({
    success: true,
    data: review
  });
});

// Update review
app.put('/api/v1/performance/reviews/:id', (req, res) => {
  const review = reviews.get(req.params.id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  const updatedReview = { ...review, ...req.body, updatedAt: new Date().toISOString() };
  reviews.set(review.id, updatedReview);

  res.json({
    success: true,
    message: 'Review updated successfully',
    data: updatedReview
  });
});

// Create KPI
app.post('/api/v1/performance/kpis', (req, res) => {
  const { employeeId, title, description, target, metric, weight, period } = req.body;

  const kpi = {
    id: uuidv4(),
    employeeId,
    title,
    description,
    target,
    actual: 0,
    metric,
    weight,
    period,
    status: 'active',
    progress: 0,
    createdAt: new Date().toISOString()
  };

  kpis.set(kpi.id, kpi);

  res.status(201).json({
    success: true,
    message: 'KPI created successfully',
    data: kpi
  });
});

// Get all KPIs
app.get('/api/v1/performance/kpis', (req, res) => {
  const { employeeId, status, period } = req.query;
  let kpiList = Array.from(kpis.values());

  if (employeeId) kpiList = kpiList.filter(k => k.employeeId === employeeId);
  if (status) kpiList = kpiList.filter(k => k.status === status);
  if (period) kpiList = kpiList.filter(k => k.period === period);

  res.json({
    success: true,
    count: kpiList.length,
    data: kpiList
  });
});

// Update KPI progress
app.put('/api/v1/performance/kpis/:id/progress', (req, res) => {
  const kpi = kpis.get(req.params.id);

  if (!kpi) {
    return res.status(404).json({ success: false, message: 'KPI not found' });
  }

  const { actual } = req.body;
  kpi.actual = actual;
  kpi.progress = Math.min((actual / kpi.target) * 100, 100);
  kpi.updatedAt = new Date().toISOString();

  kpis.set(kpi.id, kpi);

  res.json({
    success: true,
    message: 'KPI progress updated successfully',
    data: kpi
  });
});

// Submit 360 feedback
app.post('/api/v1/performance/feedback', (req, res) => {
  const { employeeId, feedbackFrom, feedbackType, ratings, comments } = req.body;

  const feedback = {
    id: uuidv4(),
    employeeId,
    feedbackFrom,
    feedbackType, // peer, manager, subordinate, self
    ratings,
    comments,
    anonymous: req.body.anonymous || false,
    submittedAt: new Date().toISOString()
  };

  feedbacks.set(feedback.id, feedback);

  res.status(201).json({
    success: true,
    message: '360 feedback submitted successfully',
    data: feedback
  });
});

// Get feedback
app.get('/api/v1/performance/feedback', (req, res) => {
  const { employeeId, feedbackType } = req.query;
  let feedbackList = Array.from(feedbacks.values());

  if (employeeId) feedbackList = feedbackList.filter(f => f.employeeId === employeeId);
  if (feedbackType) feedbackList = feedbackList.filter(f => f.feedbackType === feedbackType);

  res.json({
    success: true,
    count: feedbackList.length,
    data: feedbackList
  });
});

// Create appraisal
app.post('/api/v1/performance/appraisals', (req, res) => {
  const { employeeId, period, performanceScore, salaryIncrement, promotion, bonus, effectiveDate } = req.body;

  const appraisal = {
    id: uuidv4(),
    appraisalNumber: `APR-${Date.now()}`,
    employeeId,
    period,
    performanceScore,
    salaryIncrement,
    promotion,
    bonus,
    effectiveDate,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  appraisals.set(appraisal.id, appraisal);

  res.status(201).json({
    success: true,
    message: 'Appraisal created successfully',
    data: appraisal
  });
});

// Get all appraisals
app.get('/api/v1/performance/appraisals', (req, res) => {
  const { employeeId, status, period } = req.query;
  let appraisalList = Array.from(appraisals.values());

  if (employeeId) appraisalList = appraisalList.filter(a => a.employeeId === employeeId);
  if (status) appraisalList = appraisalList.filter(a => a.status === status);
  if (period) appraisalList = appraisalList.filter(a => a.period === period);

  res.json({
    success: true,
    count: appraisalList.length,
    data: appraisalList
  });
});

// Approve appraisal
app.put('/api/v1/performance/appraisals/:id/approve', (req, res) => {
  const appraisal = appraisals.get(req.params.id);

  if (!appraisal) {
    return res.status(404).json({ success: false, message: 'Appraisal not found' });
  }

  appraisal.status = 'approved';
  appraisal.approvedAt = new Date().toISOString();
  appraisal.approvedBy = req.body.approvedBy;

  appraisals.set(appraisal.id, appraisal);

  res.json({
    success: true,
    message: 'Appraisal approved successfully',
    data: appraisal
  });
});

// Set goal
app.post('/api/v1/performance/goals', (req, res) => {
  const { employeeId, title, description, dueDate, priority } = req.body;

  const goal = {
    id: uuidv4(),
    employeeId,
    title,
    description,
    dueDate,
    priority,
    progress: 0,
    status: 'in-progress',
    createdAt: new Date().toISOString()
  };

  goals.set(goal.id, goal);

  res.status(201).json({
    success: true,
    message: 'Goal set successfully',
    data: goal
  });
});

// Get goals
app.get('/api/v1/performance/goals', (req, res) => {
  const { employeeId, status } = req.query;
  let goalList = Array.from(goals.values());

  if (employeeId) goalList = goalList.filter(g => g.employeeId === employeeId);
  if (status) goalList = goalList.filter(g => g.status === status);

  res.json({
    success: true,
    count: goalList.length,
    data: goalList
  });
});

// Update goal progress
app.put('/api/v1/performance/goals/:id/progress', (req, res) => {
  const goal = goals.get(req.params.id);

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  goal.progress = req.body.progress;
  if (goal.progress >= 100) {
    goal.status = 'completed';
    goal.completedAt = new Date().toISOString();
  }
  goal.updatedAt = new Date().toISOString();

  goals.set(goal.id, goal);

  res.json({
    success: true,
    message: 'Goal progress updated successfully',
    data: goal
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📈 Performance Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
