const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.LEAVE_MANAGEMENT_PORT || 4132;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const leaveRequests = new Map();
const leaveBalances = new Map();
const leaveTypes = new Map();
const leaveCalendar = new Map();

// Initialize default leave types
leaveTypes.set('casual', { id: 'casual', name: 'Casual Leave', defaultBalance: 12 });
leaveTypes.set('sick', { id: 'sick', name: 'Sick Leave', defaultBalance: 10 });
leaveTypes.set('earned', { id: 'earned', name: 'Earned Leave', defaultBalance: 15 });

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Leave Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Leave request submission',
      'Approval workflow',
      'Leave balance tracking',
      'Leave calendar',
      'Multiple leave types'
    ]
  });
});

// Health check
app.get('/api/v1/leave/health', (req, res) => {
  res.json({ service: 'Leave Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create leave request
app.post('/api/v1/leave/requests', (req, res) => {
  const { employeeId, leaveType, startDate, endDate, reason, numberOfDays } = req.body;

  const leaveRequest = {
    id: uuidv4(),
    requestNumber: `LR-${Date.now()}`,
    employeeId,
    leaveType,
    startDate,
    endDate,
    numberOfDays,
    reason,
    status: 'pending',
    appliedAt: new Date().toISOString(),
    approvalHistory: []
  };

  leaveRequests.set(leaveRequest.id, leaveRequest);

  res.status(201).json({
    success: true,
    message: 'Leave request submitted successfully',
    data: leaveRequest
  });
});

// Get all leave requests
app.get('/api/v1/leave/requests', (req, res) => {
  const { employeeId, status, leaveType } = req.query;
  let requestList = Array.from(leaveRequests.values());

  if (employeeId) requestList = requestList.filter(r => r.employeeId === employeeId);
  if (status) requestList = requestList.filter(r => r.status === status);
  if (leaveType) requestList = requestList.filter(r => r.leaveType === leaveType);

  res.json({
    success: true,
    count: requestList.length,
    data: requestList
  });
});

// Get leave request by ID
app.get('/api/v1/leave/requests/:id', (req, res) => {
  const leaveRequest = leaveRequests.get(req.params.id);

  if (!leaveRequest) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  res.json({
    success: true,
    data: leaveRequest
  });
});

// Approve/Reject leave request
app.put('/api/v1/leave/requests/:id/status', (req, res) => {
  const leaveRequest = leaveRequests.get(req.params.id);

  if (!leaveRequest) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  const { status, approvedBy, comments } = req.body;

  leaveRequest.status = status;
  leaveRequest.approvalHistory.push({
    status,
    approvedBy,
    comments,
    timestamp: new Date().toISOString()
  });

  if (status === 'approved') {
    leaveRequest.approvedAt = new Date().toISOString();

    // Deduct from leave balance
    const balanceKey = `${leaveRequest.employeeId}-${leaveRequest.leaveType}`;
    const balance = leaveBalances.get(balanceKey);
    if (balance) {
      balance.used += leaveRequest.numberOfDays;
      balance.available -= leaveRequest.numberOfDays;
      leaveBalances.set(balanceKey, balance);
    }
  } else if (status === 'rejected') {
    leaveRequest.rejectedAt = new Date().toISOString();
  }

  leaveRequests.set(leaveRequest.id, leaveRequest);

  res.json({
    success: true,
    message: `Leave request ${status} successfully`,
    data: leaveRequest
  });
});

// Cancel leave request
app.delete('/api/v1/leave/requests/:id', (req, res) => {
  const leaveRequest = leaveRequests.get(req.params.id);

  if (!leaveRequest) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  if (leaveRequest.status === 'approved') {
    // Add back to leave balance
    const balanceKey = `${leaveRequest.employeeId}-${leaveRequest.leaveType}`;
    const balance = leaveBalances.get(balanceKey);
    if (balance) {
      balance.used -= leaveRequest.numberOfDays;
      balance.available += leaveRequest.numberOfDays;
      leaveBalances.set(balanceKey, balance);
    }
  }

  leaveRequest.status = 'cancelled';
  leaveRequest.cancelledAt = new Date().toISOString();
  leaveRequests.set(leaveRequest.id, leaveRequest);

  res.json({
    success: true,
    message: 'Leave request cancelled successfully',
    data: leaveRequest
  });
});

// Initialize leave balance
app.post('/api/v1/leave/balance/initialize', (req, res) => {
  const { employeeId, year } = req.body;

  const balances = [];
  leaveTypes.forEach((type) => {
    const balance = {
      id: uuidv4(),
      employeeId,
      leaveType: type.id,
      year,
      total: type.defaultBalance,
      used: 0,
      available: type.defaultBalance,
      createdAt: new Date().toISOString()
    };

    const balanceKey = `${employeeId}-${type.id}`;
    leaveBalances.set(balanceKey, balance);
    balances.push(balance);
  });

  res.status(201).json({
    success: true,
    message: 'Leave balances initialized successfully',
    data: balances
  });
});

// Get leave balance
app.get('/api/v1/leave/balance/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const { year } = req.query;

  let balances = Array.from(leaveBalances.values())
    .filter(b => b.employeeId === employeeId);

  if (year) {
    balances = balances.filter(b => b.year === parseInt(year));
  }

  res.json({
    success: true,
    count: balances.length,
    data: balances
  });
});

// Update leave balance
app.put('/api/v1/leave/balance/:employeeId/:leaveType', (req, res) => {
  const { employeeId, leaveType } = req.params;
  const balanceKey = `${employeeId}-${leaveType}`;
  const balance = leaveBalances.get(balanceKey);

  if (!balance) {
    return res.status(404).json({ success: false, message: 'Leave balance not found' });
  }

  const updatedBalance = { ...balance, ...req.body, updatedAt: new Date().toISOString() };
  leaveBalances.set(balanceKey, updatedBalance);

  res.json({
    success: true,
    message: 'Leave balance updated successfully',
    data: updatedBalance
  });
});

// Get leave calendar
app.get('/api/v1/leave/calendar', (req, res) => {
  const { month, year, department } = req.query;

  let requests = Array.from(leaveRequests.values())
    .filter(r => r.status === 'approved');

  if (month && year) {
    requests = requests.filter(r => {
      const startDate = new Date(r.startDate);
      return startDate.getMonth() + 1 === parseInt(month) &&
             startDate.getFullYear() === parseInt(year);
    });
  }

  res.json({
    success: true,
    count: requests.length,
    data: requests
  });
});

// Get leave types
app.get('/api/v1/leave/types', (req, res) => {
  const types = Array.from(leaveTypes.values());

  res.json({
    success: true,
    count: types.length,
    data: types
  });
});

// Create leave type
app.post('/api/v1/leave/types', (req, res) => {
  const { id, name, defaultBalance, description } = req.body;

  const leaveType = {
    id,
    name,
    defaultBalance,
    description,
    createdAt: new Date().toISOString()
  };

  leaveTypes.set(id, leaveType);

  res.status(201).json({
    success: true,
    message: 'Leave type created successfully',
    data: leaveType
  });
});

// Get leave statistics
app.get('/api/v1/leave/statistics', (req, res) => {
  const { employeeId, year } = req.query;

  let requests = Array.from(leaveRequests.values());

  if (employeeId) requests = requests.filter(r => r.employeeId === employeeId);
  if (year) {
    requests = requests.filter(r => {
      const startDate = new Date(r.startDate);
      return startDate.getFullYear() === parseInt(year);
    });
  }

  const statistics = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
    totalDays: requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.numberOfDays, 0)
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🏖️  Leave Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
