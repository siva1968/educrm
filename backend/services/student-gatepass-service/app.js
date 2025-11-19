const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const app = express();
const PORT = process.env.GATEPASS_PORT || 4102;

app.use(helmet());
app.use(cors());
app.use(express.json());

const gatepasses = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Student Gate Pass Service',
    version: '1.0.0',
    features: ['Issue gate passes', 'Track entries/exits', 'Parent approval workflow', 'Emergency passes', 'Pass history']
  });
});

app.get('/api/v1/gatepass/health', (req, res) => {
  res.json({ service: 'Gate Pass', status: 'healthy' });
});

app.post('/api/v1/gatepass/issue', (req, res) => {
  const { studentId, reason, duration, approvedBy } = req.body;

  const pass = {
    passId: uuidv4(),
    studentId,
    reason,
    duration,
    issueTime: new Date().toISOString(),
    expiryTime: moment().add(duration, 'minutes').toISOString(),
    approvedBy,
    status: 'active',
    exitTime: null,
    entryTime: null
  };

  gatepasses.set(pass.passId, pass);

  res.status(201).json({
    success: true,
    message: 'Gate pass issued successfully',
    data: pass
  });
});

app.post('/api/v1/gatepass/:passId/exit', (req, res) => {
  const pass = gatepasses.get(req.params.passId);

  if (!pass) {
    return res.status(404).json({ success: false, message: 'Pass not found' });
  }

  pass.exitTime = new Date().toISOString();
  pass.status = 'exited';
  gatepasses.set(req.params.passId, pass);

  res.json({ success: true, message: 'Exit recorded', data: pass });
});

app.post('/api/v1/gatepass/:passId/entry', (req, res) => {
  const pass = gatepasses.get(req.params.passId);

  if (!pass) {
    return res.status(404).json({ success: false, message: 'Pass not found' });
  }

  pass.entryTime = new Date().toISOString();
  pass.status = 'completed';
  gatepasses.set(req.params.passId, pass);

  res.json({ success: true, message: 'Entry recorded', data: pass });
});

app.get('/api/v1/gatepass/student/:studentId', (req, res) => {
  const records = Array.from(gatepasses.values())
    .filter(p => p.studentId === req.params.studentId);

  res.json({ success: true, data: records });
});

app.get('/api/v1/gatepass/active', (req, res) => {
  const activePasses = Array.from(gatepasses.values())
    .filter(p => p.status === 'active' || p.status === 'exited');

  res.json({ success: true, data: activePasses, count: activePasses.length });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚪 Student Gate Pass Service running on port ${PORT}\n`);
  });
}

module.exports = app;
