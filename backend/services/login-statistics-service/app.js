const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const app = express();
const PORT = process.env.LOGIN_STATS_PORT || 4104;

app.use(helmet());
app.use(cors());
app.use(express.json());

const loginRecords = new Map();
const sessionData = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Login Statistics Service',
    version: '1.0.0',
    features: ['Login tracking', 'Session monitoring', 'Usage analytics', 'Peak hours analysis', 'Device tracking']
  });
});

app.get('/api/v1/login-stats/health', (req, res) => {
  res.json({ service: 'Login Statistics', status: 'healthy' });
});

app.post('/api/v1/login-stats/log', (req, res) => {
  const { userId, userType, ipAddress, device, browser, location } = req.body;

  const record = {
    recordId: uuidv4(),
    userId,
    userType, // student, teacher, admin, parent
    ipAddress,
    device, // mobile, tablet, desktop
    browser,
    location,
    loginTime: new Date().toISOString(),
    timestamp: Date.now()
  };

  loginRecords.set(record.recordId, record);

  res.status(201).json({
    success: true,
    message: 'Login recorded',
    data: record
  });
});

app.get('/api/v1/login-stats/user/:userId', (req, res) => {
  const { startDate, endDate } = req.query;

  let records = Array.from(loginRecords.values())
    .filter(r => r.userId === req.params.userId);

  if (startDate) records = records.filter(r => r.loginTime >= startDate);
  if (endDate) records = records.filter(r => r.loginTime <= endDate);

  res.json({
    success: true,
    data: {
      userId: req.params.userId,
      totalLogins: records.length,
      records: records.slice(0, 50),
      firstLogin: records.length > 0 ? records[0].loginTime : null,
      lastLogin: records.length > 0 ? records[records.length - 1].loginTime : null
    }
  });
});

app.get('/api/v1/login-stats/analytics', (req, res) => {
  const { period = 'today' } = req.query;

  let startTime;
  if (period === 'today') {
    startTime = moment().startOf('day').toISOString();
  } else if (period === 'week') {
    startTime = moment().subtract(7, 'days').toISOString();
  } else if (period === 'month') {
    startTime = moment().subtract(30, 'days').toISOString();
  }

  const records = Array.from(loginRecords.values())
    .filter(r => !startTime || r.loginTime >= startTime);

  const byUserType = records.reduce((acc, r) => {
    acc[r.userType] = (acc[r.userType] || 0) + 1;
    return acc;
  }, {});

  const byDevice = records.reduce((acc, r) => {
    acc[r.device] = (acc[r.device] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      period,
      totalLogins: records.length,
      uniqueUsers: new Set(records.map(r => r.userId)).size,
      byUserType,
      byDevice
    }
  });
});

app.get('/api/v1/login-stats/peak-hours', (req, res) => {
  const records = Array.from(loginRecords.values());

  const byHour = records.reduce((acc, record) => {
    const hour = moment(record.loginTime).hour();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const peakHour = Object.entries(byHour)
    .sort((a, b) => b[1] - a[1])[0];

  res.json({
    success: true,
    data: {
      loginsByHour: byHour,
      peakHour: peakHour ? { hour: peakHour[0], logins: peakHour[1] } : null
    }
  });
});

app.get('/api/v1/login-stats/active-users', (req, res) => {
  const { minutes = 30 } = req.query;
  const cutoffTime = moment().subtract(minutes, 'minutes').toISOString();

  const activeUsers = Array.from(loginRecords.values())
    .filter(r => r.loginTime >= cutoffTime)
    .map(r => ({ userId: r.userId, userType: r.userType, lastActive: r.loginTime }));

  res.json({
    success: true,
    data: {
      timeWindow: `${minutes} minutes`,
      count: activeUsers.length,
      users: activeUsers
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📊 Login Statistics Service running on port ${PORT}\n`);
  });
}

module.exports = app;
