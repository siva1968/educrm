const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.COLLECTIONS_PORT || 4141;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const collections = new Map();
const dues = new Map();
const reconciliations = new Map();
const collectionReports = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Collections Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Payment collection tracking',
      'Due management',
      'Receipt generation',
      'Collection reconciliation',
      'Collection reports'
    ]
  });
});

// Health check
app.get('/api/v1/collections/health', (req, res) => {
  res.json({ service: 'Collections Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Record collection
app.post('/api/v1/collections', (req, res) => {
  const { studentId, amount, collectionType, collectedBy, paymentMode, reference } = req.body;

  const collection = {
    id: uuidv4(),
    collectionId: `COL-${Date.now()}`,
    studentId,
    amount,
    collectionType, // fee, fine, donation, other
    collectedBy,
    paymentMode, // cash, card, online, cheque
    reference,
    status: 'collected',
    collectedAt: new Date().toISOString(),
    reconciledStatus: 'pending'
  };

  collections.set(collection.id, collection);

  res.status(201).json({
    success: true,
    message: 'Collection recorded successfully',
    data: collection
  });
});

// Get all collections
app.get('/api/v1/collections', (req, res) => {
  const { studentId, collectionType, collectedBy, status, date } = req.query;
  let collectionList = Array.from(collections.values());

  if (studentId) collectionList = collectionList.filter(c => c.studentId === studentId);
  if (collectionType) collectionList = collectionList.filter(c => c.collectionType === collectionType);
  if (collectedBy) collectionList = collectionList.filter(c => c.collectedBy === collectedBy);
  if (status) collectionList = collectionList.filter(c => c.reconciledStatus === status);
  if (date) collectionList = collectionList.filter(c => c.collectedAt.startsWith(date));

  res.json({
    success: true,
    count: collectionList.length,
    data: collectionList
  });
});

// Get collection by ID
app.get('/api/v1/collections/:id', (req, res) => {
  const collection = collections.get(req.params.id);

  if (!collection) {
    return res.status(404).json({ success: false, message: 'Collection not found' });
  }

  res.json({
    success: true,
    data: collection
  });
});

// Update collection
app.put('/api/v1/collections/:id', (req, res) => {
  const collection = collections.get(req.params.id);

  if (!collection) {
    return res.status(404).json({ success: false, message: 'Collection not found' });
  }

  const updatedCollection = { ...collection, ...req.body, updatedAt: new Date().toISOString() };
  collections.set(collection.id, updatedCollection);

  res.json({
    success: true,
    message: 'Collection updated successfully',
    data: updatedCollection
  });
});

// Create due
app.post('/api/v1/collections/dues', (req, res) => {
  const { studentId, amount, dueType, dueDate, description } = req.body;

  const due = {
    id: uuidv4(),
    dueId: `DUE-${Date.now()}`,
    studentId,
    amount,
    paidAmount: 0,
    pendingAmount: amount,
    dueType, // fee, fine, other
    dueDate,
    description,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  dues.set(due.id, due);

  res.status(201).json({
    success: true,
    message: 'Due created successfully',
    data: due
  });
});

// Get all dues
app.get('/api/v1/collections/dues', (req, res) => {
  const { studentId, status, dueType } = req.query;
  let dueList = Array.from(dues.values());

  if (studentId) dueList = dueList.filter(d => d.studentId === studentId);
  if (status) dueList = dueList.filter(d => d.status === status);
  if (dueType) dueList = dueList.filter(d => d.dueType === dueType);

  res.json({
    success: true,
    count: dueList.length,
    data: dueList
  });
});

// Pay due
app.post('/api/v1/collections/dues/:id/pay', (req, res) => {
  const due = dues.get(req.params.id);

  if (!due) {
    return res.status(404).json({ success: false, message: 'Due not found' });
  }

  const { amount, paymentMode, collectedBy } = req.body;

  if (amount > due.pendingAmount) {
    return res.status(400).json({ success: false, message: 'Payment amount exceeds pending amount' });
  }

  due.paidAmount += amount;
  due.pendingAmount -= amount;

  if (due.pendingAmount <= 0) {
    due.status = 'paid';
    due.paidAt = new Date().toISOString();
  } else {
    due.status = 'partial';
  }

  dues.set(due.id, due);

  // Create collection record
  const collection = {
    id: uuidv4(),
    collectionId: `COL-${Date.now()}`,
    studentId: due.studentId,
    amount,
    collectionType: due.dueType,
    collectedBy,
    paymentMode,
    reference: due.dueId,
    status: 'collected',
    collectedAt: new Date().toISOString(),
    reconciledStatus: 'pending'
  };

  collections.set(collection.id, collection);

  res.json({
    success: true,
    message: 'Due payment recorded successfully',
    data: { due, collection }
  });
});

// Create reconciliation
app.post('/api/v1/collections/reconcile', (req, res) => {
  const { date, collectedBy, expectedAmount, actualAmount, discrepancy, remarks } = req.body;

  const reconciliation = {
    id: uuidv4(),
    reconciliationId: `REC-${Date.now()}`,
    date,
    collectedBy,
    expectedAmount,
    actualAmount,
    discrepancy: discrepancy || (expectedAmount - actualAmount),
    remarks,
    status: discrepancy === 0 ? 'balanced' : 'unbalanced',
    reconciledAt: new Date().toISOString()
  };

  // Update collections as reconciled
  const dayCollections = Array.from(collections.values())
    .filter(c => c.collectedAt.startsWith(date) && c.collectedBy === collectedBy);

  dayCollections.forEach(c => {
    c.reconciledStatus = 'reconciled';
    c.reconciliationId = reconciliation.id;
    collections.set(c.id, c);
  });

  reconciliations.set(reconciliation.id, reconciliation);

  res.status(201).json({
    success: true,
    message: 'Reconciliation completed successfully',
    data: { reconciliation, reconciledCollections: dayCollections.length }
  });
});

// Get all reconciliations
app.get('/api/v1/collections/reconciliations', (req, res) => {
  const { collectedBy, status, date } = req.query;
  let reconciliationList = Array.from(reconciliations.values());

  if (collectedBy) reconciliationList = reconciliationList.filter(r => r.collectedBy === collectedBy);
  if (status) reconciliationList = reconciliationList.filter(r => r.status === status);
  if (date) reconciliationList = reconciliationList.filter(r => r.date === date);

  res.json({
    success: true,
    count: reconciliationList.length,
    data: reconciliationList
  });
});

// Get collection summary
app.get('/api/v1/collections/summary', (req, res) => {
  const { date, collectedBy, collectionType } = req.query;
  let collectionList = Array.from(collections.values());

  if (date) collectionList = collectionList.filter(c => c.collectedAt.startsWith(date));
  if (collectedBy) collectionList = collectionList.filter(c => c.collectedBy === collectedBy);
  if (collectionType) collectionList = collectionList.filter(c => c.collectionType === collectionType);

  const summary = {
    totalCollections: collectionList.length,
    totalAmount: collectionList.reduce((sum, c) => sum + c.amount, 0),
    byPaymentMode: {
      cash: collectionList.filter(c => c.paymentMode === 'cash').reduce((sum, c) => sum + c.amount, 0),
      card: collectionList.filter(c => c.paymentMode === 'card').reduce((sum, c) => sum + c.amount, 0),
      online: collectionList.filter(c => c.paymentMode === 'online').reduce((sum, c) => sum + c.amount, 0),
      cheque: collectionList.filter(c => c.paymentMode === 'cheque').reduce((sum, c) => sum + c.amount, 0)
    },
    byType: {
      fee: collectionList.filter(c => c.collectionType === 'fee').reduce((sum, c) => sum + c.amount, 0),
      fine: collectionList.filter(c => c.collectionType === 'fine').reduce((sum, c) => sum + c.amount, 0),
      donation: collectionList.filter(c => c.collectionType === 'donation').reduce((sum, c) => sum + c.amount, 0)
    }
  };

  res.json({
    success: true,
    data: summary
  });
});

// Get overdue report
app.get('/api/v1/collections/overdue', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const overdueDues = Array.from(dues.values())
    .filter(d => d.status !== 'paid' && d.dueDate < today);

  const report = {
    count: overdueDues.length,
    totalAmount: overdueDues.reduce((sum, d) => sum + d.pendingAmount, 0),
    dues: overdueDues
  };

  res.json({
    success: true,
    data: report
  });
});

// Generate collection report
app.post('/api/v1/collections/reports/generate', (req, res) => {
  const { startDate, endDate, reportType } = req.body;

  const collectionList = Array.from(collections.values())
    .filter(c => c.collectedAt >= startDate && c.collectedAt <= endDate);

  const report = {
    id: uuidv4(),
    reportNumber: `REP-${Date.now()}`,
    reportType,
    startDate,
    endDate,
    totalCollections: collectionList.length,
    totalAmount: collectionList.reduce((sum, c) => sum + c.amount, 0),
    collections: collectionList,
    generatedAt: new Date().toISOString()
  };

  collectionReports.set(report.id, report);

  res.status(201).json({
    success: true,
    message: 'Collection report generated successfully',
    data: report
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n💵 Collections Service running on port ${PORT}\n`);
  });
}

module.exports = app;
