const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.VISITOR_PORT || 4134;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const visitors = new Map();
const passes = new Map();
const checkIns = new Map();
const alerts = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Visitor Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Visitor registration',
      'Pass generation',
      'Check-in/Check-out tracking',
      'Security alerts',
      'Visitor history'
    ]
  });
});

// Health check
app.get('/api/v1/visitors/health', (req, res) => {
  res.json({ service: 'Visitor Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Register visitor
app.post('/api/v1/visitors/register', (req, res) => {
  const { name, phone, email, purpose, hostName, hostDepartment, validFrom, validTo } = req.body;

  const visitor = {
    id: uuidv4(),
    visitorId: `VIS-${Date.now()}`,
    name,
    phone,
    email,
    purpose,
    hostName,
    hostDepartment,
    validFrom,
    validTo,
    status: 'registered',
    createdAt: new Date().toISOString()
  };

  visitors.set(visitor.id, visitor);

  res.status(201).json({
    success: true,
    message: 'Visitor registered successfully',
    data: visitor
  });
});

// Get all visitors
app.get('/api/v1/visitors', (req, res) => {
  const { status, hostDepartment, date } = req.query;
  let visitorList = Array.from(visitors.values());

  if (status) visitorList = visitorList.filter(v => v.status === status);
  if (hostDepartment) visitorList = visitorList.filter(v => v.hostDepartment === hostDepartment);
  if (date) {
    visitorList = visitorList.filter(v => v.createdAt.startsWith(date));
  }

  res.json({
    success: true,
    count: visitorList.length,
    data: visitorList
  });
});

// Get visitor by ID
app.get('/api/v1/visitors/:id', (req, res) => {
  const visitor = visitors.get(req.params.id);

  if (!visitor) {
    return res.status(404).json({ success: false, message: 'Visitor not found' });
  }

  res.json({
    success: true,
    data: visitor
  });
});

// Update visitor
app.put('/api/v1/visitors/:id', (req, res) => {
  const visitor = visitors.get(req.params.id);

  if (!visitor) {
    return res.status(404).json({ success: false, message: 'Visitor not found' });
  }

  const updatedVisitor = { ...visitor, ...req.body, updatedAt: new Date().toISOString() };
  visitors.set(visitor.id, updatedVisitor);

  res.json({
    success: true,
    message: 'Visitor updated successfully',
    data: updatedVisitor
  });
});

// Generate visitor pass
app.post('/api/v1/visitors/:id/pass', (req, res) => {
  const visitor = visitors.get(req.params.id);

  if (!visitor) {
    return res.status(404).json({ success: false, message: 'Visitor not found' });
  }

  const pass = {
    id: uuidv4(),
    passNumber: `PASS-${Date.now()}`,
    visitorId: visitor.id,
    validFrom: visitor.validFrom,
    validTo: visitor.validTo,
    accessAreas: req.body.accessAreas || ['lobby', 'reception'],
    status: 'active',
    generatedAt: new Date().toISOString()
  };

  passes.set(pass.id, pass);

  res.status(201).json({
    success: true,
    message: 'Visitor pass generated successfully',
    data: pass
  });
});

// Get all passes
app.get('/api/v1/visitors/passes', (req, res) => {
  const { visitorId, status } = req.query;
  let passList = Array.from(passes.values());

  if (visitorId) passList = passList.filter(p => p.visitorId === visitorId);
  if (status) passList = passList.filter(p => p.status === status);

  res.json({
    success: true,
    count: passList.length,
    data: passList
  });
});

// Check-in visitor
app.post('/api/v1/visitors/:id/checkin', (req, res) => {
  const visitor = visitors.get(req.params.id);

  if (!visitor) {
    return res.status(404).json({ success: false, message: 'Visitor not found' });
  }

  const checkIn = {
    id: uuidv4(),
    visitorId: visitor.id,
    checkInTime: new Date().toISOString(),
    checkOutTime: null,
    purpose: visitor.purpose,
    location: req.body.location || 'Main Gate',
    status: 'checked-in'
  };

  checkIns.set(checkIn.id, checkIn);
  visitor.status = 'checked-in';
  visitors.set(visitor.id, visitor);

  res.status(201).json({
    success: true,
    message: 'Visitor checked-in successfully',
    data: checkIn
  });
});

// Check-out visitor
app.post('/api/v1/visitors/:id/checkout', (req, res) => {
  const visitor = visitors.get(req.params.id);

  if (!visitor) {
    return res.status(404).json({ success: false, message: 'Visitor not found' });
  }

  const activeCheckIn = Array.from(checkIns.values())
    .find(c => c.visitorId === visitor.id && c.status === 'checked-in');

  if (!activeCheckIn) {
    return res.status(404).json({ success: false, message: 'No active check-in found' });
  }

  activeCheckIn.checkOutTime = new Date().toISOString();
  activeCheckIn.status = 'checked-out';
  checkIns.set(activeCheckIn.id, activeCheckIn);

  visitor.status = 'checked-out';
  visitors.set(visitor.id, visitor);

  res.json({
    success: true,
    message: 'Visitor checked-out successfully',
    data: activeCheckIn
  });
});

// Get check-in/out history
app.get('/api/v1/visitors/checkins', (req, res) => {
  const { visitorId, status, date } = req.query;
  let checkInList = Array.from(checkIns.values());

  if (visitorId) checkInList = checkInList.filter(c => c.visitorId === visitorId);
  if (status) checkInList = checkInList.filter(c => c.status === status);
  if (date) {
    checkInList = checkInList.filter(c => c.checkInTime.startsWith(date));
  }

  res.json({
    success: true,
    count: checkInList.length,
    data: checkInList
  });
});

// Create security alert
app.post('/api/v1/visitors/alerts', (req, res) => {
  const { visitorId, type, severity, description, reportedBy } = req.body;

  const alert = {
    id: uuidv4(),
    alertNumber: `ALERT-${Date.now()}`,
    visitorId,
    type, // suspicious, unauthorized-access, overstay
    severity, // low, medium, high, critical
    description,
    reportedBy,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  alerts.set(alert.id, alert);

  res.status(201).json({
    success: true,
    message: 'Security alert created successfully',
    data: alert
  });
});

// Get all alerts
app.get('/api/v1/visitors/alerts', (req, res) => {
  const { visitorId, status, severity } = req.query;
  let alertList = Array.from(alerts.values());

  if (visitorId) alertList = alertList.filter(a => a.visitorId === visitorId);
  if (status) alertList = alertList.filter(a => a.status === status);
  if (severity) alertList = alertList.filter(a => a.severity === severity);

  res.json({
    success: true,
    count: alertList.length,
    data: alertList
  });
});

// Resolve alert
app.put('/api/v1/visitors/alerts/:id/resolve', (req, res) => {
  const alert = alerts.get(req.params.id);

  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }

  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  alert.resolvedBy = req.body.resolvedBy;
  alert.resolution = req.body.resolution;

  alerts.set(alert.id, alert);

  res.json({
    success: true,
    message: 'Alert resolved successfully',
    data: alert
  });
});

// Get visitor statistics
app.get('/api/v1/visitors/statistics', (req, res) => {
  const { date } = req.query;
  let visitorList = Array.from(visitors.values());

  if (date) {
    visitorList = visitorList.filter(v => v.createdAt.startsWith(date));
  }

  const statistics = {
    total: visitorList.length,
    registered: visitorList.filter(v => v.status === 'registered').length,
    checkedIn: visitorList.filter(v => v.status === 'checked-in').length,
    checkedOut: visitorList.filter(v => v.status === 'checked-out').length,
    activeAlerts: Array.from(alerts.values()).filter(a => a.status === 'active').length
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚪 Visitor Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
