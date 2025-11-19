const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.CONCERN_MANAGEMENT_PORT || 4183;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const concerns = new Map();
const resolutions = new Map();
const escalations = new Map();
const feedback = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Concern Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Issue tracking',
      'Complaint handling',
      'Resolution workflow',
      'Escalation management',
      'Feedback collection'
    ]
  });
});

// Health check
app.get('/api/v1/concerns/health', (req, res) => {
  res.json({ service: 'Concern Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Submit concern
app.post('/api/v1/concerns', (req, res) => {
  const { title, description, category, priority, submittedBy, attachments } = req.body;

  const concern = {
    id: uuidv4(),
    concernId: `CONC-${Date.now()}`,
    title,
    description,
    category, // academic, infrastructure, behavior, safety, other
    priority, // low, medium, high, urgent
    submittedBy,
    attachments: attachments || [],
    status: 'submitted',
    assignedTo: null,
    submittedAt: new Date().toISOString()
  };

  concerns.set(concern.id, concern);

  res.status(201).json({
    success: true,
    message: 'Concern submitted successfully',
    data: concern
  });
});

// Get all concerns
app.get('/api/v1/concerns', (req, res) => {
  const { status, category, priority, submittedBy, assignedTo } = req.query;
  let concernList = Array.from(concerns.values());

  if (status) concernList = concernList.filter(c => c.status === status);
  if (category) concernList = concernList.filter(c => c.category === category);
  if (priority) concernList = concernList.filter(c => c.priority === priority);
  if (submittedBy) concernList = concernList.filter(c => c.submittedBy === submittedBy);
  if (assignedTo) concernList = concernList.filter(c => c.assignedTo === assignedTo);

  res.json({
    success: true,
    count: concernList.length,
    data: concernList
  });
});

// Get concern by ID
app.get('/api/v1/concerns/:id', (req, res) => {
  const concern = concerns.get(req.params.id);

  if (!concern) {
    return res.status(404).json({ success: false, message: 'Concern not found' });
  }

  res.json({
    success: true,
    data: concern
  });
});

// Assign concern
app.post('/api/v1/concerns/:id/assign', (req, res) => {
  const concern = concerns.get(req.params.id);

  if (!concern) {
    return res.status(404).json({ success: false, message: 'Concern not found' });
  }

  concern.assignedTo = req.body.assignedTo;
  concern.assignedAt = new Date().toISOString();
  concern.status = 'assigned';

  concerns.set(concern.id, concern);

  res.json({
    success: true,
    message: 'Concern assigned successfully',
    data: concern
  });
});

// Update concern status
app.put('/api/v1/concerns/:id/status', (req, res) => {
  const concern = concerns.get(req.params.id);

  if (!concern) {
    return res.status(404).json({ success: false, message: 'Concern not found' });
  }

  concern.status = req.body.status; // submitted, assigned, in-progress, resolved, closed
  concern.statusUpdatedAt = new Date().toISOString();

  concerns.set(concern.id, concern);

  res.json({
    success: true,
    message: 'Concern status updated successfully',
    data: concern
  });
});

// Add resolution
app.post('/api/v1/concerns/:concernId/resolution', (req, res) => {
  const concern = concerns.get(req.params.concernId);

  if (!concern) {
    return res.status(404).json({ success: false, message: 'Concern not found' });
  }

  const { description, resolvedBy, actionTaken } = req.body;

  const resolution = {
    id: uuidv4(),
    resolutionId: `RES-${Date.now()}`,
    concernId: req.params.concernId,
    description,
    resolvedBy,
    actionTaken,
    resolvedAt: new Date().toISOString()
  };

  resolutions.set(resolution.id, resolution);

  concern.status = 'resolved';
  concern.resolvedAt = new Date().toISOString();
  concern.resolutionId = resolution.id;

  concerns.set(concern.id, concern);

  res.status(201).json({
    success: true,
    message: 'Resolution added successfully',
    data: { concern, resolution }
  });
});

// Get resolutions
app.get('/api/v1/concerns/resolutions', (req, res) => {
  const { concernId, resolvedBy } = req.query;
  let resolutionList = Array.from(resolutions.values());

  if (concernId) resolutionList = resolutionList.filter(r => r.concernId === concernId);
  if (resolvedBy) resolutionList = resolutionList.filter(r => r.resolvedBy === resolvedBy);

  res.json({
    success: true,
    count: resolutionList.length,
    data: resolutionList
  });
});

// Escalate concern
app.post('/api/v1/concerns/:id/escalate', (req, res) => {
  const concern = concerns.get(req.params.id);

  if (!concern) {
    return res.status(404).json({ success: false, message: 'Concern not found' });
  }

  const { escalatedTo, reason, level } = req.body;

  const escalation = {
    id: uuidv4(),
    escalationId: `ESC-${Date.now()}`,
    concernId: concern.id,
    escalatedFrom: concern.assignedTo,
    escalatedTo,
    reason,
    level, // level-1, level-2, level-3
    escalatedAt: new Date().toISOString()
  };

  escalations.set(escalation.id, escalation);

  concern.status = 'escalated';
  concern.assignedTo = escalatedTo;
  concern.escalationLevel = level;

  concerns.set(concern.id, concern);

  res.status(201).json({
    success: true,
    message: 'Concern escalated successfully',
    data: { concern, escalation }
  });
});

// Get escalations
app.get('/api/v1/concerns/escalations', (req, res) => {
  const { concernId, level } = req.query;
  let escalationList = Array.from(escalations.values());

  if (concernId) escalationList = escalationList.filter(e => e.concernId === concernId);
  if (level) escalationList = escalationList.filter(e => e.level === level);

  res.json({
    success: true,
    count: escalationList.length,
    data: escalationList
  });
});

// Add feedback
app.post('/api/v1/concerns/:concernId/feedback', (req, res) => {
  const { rating, comments, submittedBy } = req.body;

  const feedbackEntry = {
    id: uuidv4(),
    concernId: req.params.concernId,
    rating, // 1-5
    comments,
    submittedBy,
    submittedAt: new Date().toISOString()
  };

  feedback.set(feedbackEntry.id, feedbackEntry);

  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: feedbackEntry
  });
});

// Get feedback
app.get('/api/v1/concerns/:concernId/feedback', (req, res) => {
  const feedbackList = Array.from(feedback.values())
    .filter(f => f.concernId === req.params.concernId);

  res.json({
    success: true,
    count: feedbackList.length,
    data: feedbackList
  });
});

// Get statistics
app.get('/api/v1/concerns/statistics', (req, res) => {
  const { category, startDate, endDate } = req.query;
  let concernList = Array.from(concerns.values());

  if (category) concernList = concernList.filter(c => c.category === category);
  if (startDate) concernList = concernList.filter(c => c.submittedAt >= startDate);
  if (endDate) concernList = concernList.filter(c => c.submittedAt <= endDate);

  const statistics = {
    total: concernList.length,
    byStatus: {
      submitted: concernList.filter(c => c.status === 'submitted').length,
      assigned: concernList.filter(c => c.status === 'assigned').length,
      inProgress: concernList.filter(c => c.status === 'in-progress').length,
      resolved: concernList.filter(c => c.status === 'resolved').length,
      escalated: concernList.filter(c => c.status === 'escalated').length,
      closed: concernList.filter(c => c.status === 'closed').length
    },
    byPriority: {
      low: concernList.filter(c => c.priority === 'low').length,
      medium: concernList.filter(c => c.priority === 'medium').length,
      high: concernList.filter(c => c.priority === 'high').length,
      urgent: concernList.filter(c => c.priority === 'urgent').length
    },
    byCategory: {},
    averageResolutionTime: 0 // Would calculate based on resolved concerns
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📋 Concern Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
