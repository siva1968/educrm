const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.FEE_MANAGEMENT_PORT || 4140;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const feeStructures = new Map();
const invoices = new Map();
const payments = new Map();
const receipts = new Map();
const reminders = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Fee Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Fee structure management',
      'Invoice generation',
      'Payment tracking',
      'Receipt generation',
      'Payment reminders'
    ]
  });
});

// Health check
app.get('/api/v1/fees/health', (req, res) => {
  res.json({ service: 'Fee Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create fee structure
app.post('/api/v1/fees/structures', (req, res) => {
  const { className, academicYear, tuitionFee, labFee, libraryFee, sportsFee, otherFees } = req.body;

  const feeStructure = {
    id: uuidv4(),
    className,
    academicYear,
    tuitionFee,
    labFee,
    libraryFee,
    sportsFee,
    otherFees: otherFees || {},
    totalAmount: tuitionFee + labFee + libraryFee + sportsFee +
                 Object.values(otherFees || {}).reduce((sum, val) => sum + val, 0),
    status: 'active',
    createdAt: new Date().toISOString()
  };

  feeStructures.set(feeStructure.id, feeStructure);

  res.status(201).json({
    success: true,
    message: 'Fee structure created successfully',
    data: feeStructure
  });
});

// Get all fee structures
app.get('/api/v1/fees/structures', (req, res) => {
  const { className, academicYear, status } = req.query;
  let structureList = Array.from(feeStructures.values());

  if (className) structureList = structureList.filter(s => s.className === className);
  if (academicYear) structureList = structureList.filter(s => s.academicYear === academicYear);
  if (status) structureList = structureList.filter(s => s.status === status);

  res.json({
    success: true,
    count: structureList.length,
    data: structureList
  });
});

// Get fee structure by ID
app.get('/api/v1/fees/structures/:id', (req, res) => {
  const feeStructure = feeStructures.get(req.params.id);

  if (!feeStructure) {
    return res.status(404).json({ success: false, message: 'Fee structure not found' });
  }

  res.json({
    success: true,
    data: feeStructure
  });
});

// Update fee structure
app.put('/api/v1/fees/structures/:id', (req, res) => {
  const feeStructure = feeStructures.get(req.params.id);

  if (!feeStructure) {
    return res.status(404).json({ success: false, message: 'Fee structure not found' });
  }

  const updatedStructure = { ...feeStructure, ...req.body, updatedAt: new Date().toISOString() };
  feeStructures.set(feeStructure.id, updatedStructure);

  res.json({
    success: true,
    message: 'Fee structure updated successfully',
    data: updatedStructure
  });
});

// Generate invoice
app.post('/api/v1/fees/invoices/generate', (req, res) => {
  const { studentId, feeStructureId, term, dueDate, discounts } = req.body;

  const feeStructure = feeStructures.get(feeStructureId);
  if (!feeStructure) {
    return res.status(404).json({ success: false, message: 'Fee structure not found' });
  }

  const discountAmount = discounts || 0;
  const totalAmount = feeStructure.totalAmount - discountAmount;

  const invoice = {
    id: uuidv4(),
    invoiceNumber: `INV-${Date.now()}`,
    studentId,
    feeStructureId,
    term,
    items: {
      tuitionFee: feeStructure.tuitionFee,
      labFee: feeStructure.labFee,
      libraryFee: feeStructure.libraryFee,
      sportsFee: feeStructure.sportsFee,
      ...feeStructure.otherFees
    },
    grossAmount: feeStructure.totalAmount,
    discounts: discountAmount,
    totalAmount,
    paidAmount: 0,
    dueAmount: totalAmount,
    dueDate,
    status: 'pending',
    generatedAt: new Date().toISOString()
  };

  invoices.set(invoice.id, invoice);

  res.status(201).json({
    success: true,
    message: 'Invoice generated successfully',
    data: invoice
  });
});

// Get all invoices
app.get('/api/v1/fees/invoices', (req, res) => {
  const { studentId, status, term } = req.query;
  let invoiceList = Array.from(invoices.values());

  if (studentId) invoiceList = invoiceList.filter(i => i.studentId === studentId);
  if (status) invoiceList = invoiceList.filter(i => i.status === status);
  if (term) invoiceList = invoiceList.filter(i => i.term === term);

  res.json({
    success: true,
    count: invoiceList.length,
    data: invoiceList
  });
});

// Get invoice by ID
app.get('/api/v1/fees/invoices/:id', (req, res) => {
  const invoice = invoices.get(req.params.id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  res.json({
    success: true,
    data: invoice
  });
});

// Record payment
app.post('/api/v1/fees/payments', (req, res) => {
  const { invoiceId, amount, paymentMethod, transactionId, remarks } = req.body;

  const invoice = invoices.get(invoiceId);
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  const payment = {
    id: uuidv4(),
    paymentId: `PAY-${Date.now()}`,
    invoiceId,
    studentId: invoice.studentId,
    amount,
    paymentMethod, // cash, card, online, cheque
    transactionId,
    remarks,
    status: 'completed',
    paidAt: new Date().toISOString()
  };

  payments.set(payment.id, payment);

  // Update invoice
  invoice.paidAmount += amount;
  invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;
  if (invoice.dueAmount <= 0) {
    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();
  } else {
    invoice.status = 'partial';
  }
  invoices.set(invoice.id, invoice);

  // Generate receipt
  const receipt = {
    id: uuidv4(),
    receiptNumber: `REC-${Date.now()}`,
    paymentId: payment.id,
    invoiceId,
    studentId: invoice.studentId,
    amount,
    paymentMethod,
    generatedAt: new Date().toISOString()
  };
  receipts.set(receipt.id, receipt);

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: { payment, receipt, invoice }
  });
});

// Get all payments
app.get('/api/v1/fees/payments', (req, res) => {
  const { studentId, invoiceId, paymentMethod } = req.query;
  let paymentList = Array.from(payments.values());

  if (studentId) paymentList = paymentList.filter(p => p.studentId === studentId);
  if (invoiceId) paymentList = paymentList.filter(p => p.invoiceId === invoiceId);
  if (paymentMethod) paymentList = paymentList.filter(p => p.paymentMethod === paymentMethod);

  res.json({
    success: true,
    count: paymentList.length,
    data: paymentList
  });
});

// Get receipt by ID
app.get('/api/v1/fees/receipts/:id', (req, res) => {
  const receipt = receipts.get(req.params.id);

  if (!receipt) {
    return res.status(404).json({ success: false, message: 'Receipt not found' });
  }

  res.json({
    success: true,
    data: receipt
  });
});

// Get all receipts
app.get('/api/v1/fees/receipts', (req, res) => {
  const { studentId, paymentId } = req.query;
  let receiptList = Array.from(receipts.values());

  if (studentId) receiptList = receiptList.filter(r => r.studentId === studentId);
  if (paymentId) receiptList = receiptList.filter(r => r.paymentId === paymentId);

  res.json({
    success: true,
    count: receiptList.length,
    data: receiptList
  });
});

// Send payment reminder
app.post('/api/v1/fees/reminders/send', (req, res) => {
  const { invoiceId, reminderType, message } = req.body;

  const invoice = invoices.get(invoiceId);
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  const reminder = {
    id: uuidv4(),
    invoiceId,
    studentId: invoice.studentId,
    reminderType, // email, sms, notification
    message,
    dueAmount: invoice.dueAmount,
    dueDate: invoice.dueDate,
    status: 'sent',
    sentAt: new Date().toISOString()
  };

  reminders.set(reminder.id, reminder);

  res.status(201).json({
    success: true,
    message: 'Payment reminder sent successfully',
    data: reminder
  });
});

// Get all reminders
app.get('/api/v1/fees/reminders', (req, res) => {
  const { studentId, invoiceId } = req.query;
  let reminderList = Array.from(reminders.values());

  if (studentId) reminderList = reminderList.filter(r => r.studentId === studentId);
  if (invoiceId) reminderList = reminderList.filter(r => r.invoiceId === invoiceId);

  res.json({
    success: true,
    count: reminderList.length,
    data: reminderList
  });
});

// Get fee defaulters
app.get('/api/v1/fees/defaulters', (req, res) => {
  const { daysOverdue } = req.query;
  const today = new Date();

  let overdueInvoices = Array.from(invoices.values())
    .filter(i => i.status !== 'paid' && new Date(i.dueDate) < today);

  if (daysOverdue) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOverdue));
    overdueInvoices = overdueInvoices.filter(i => new Date(i.dueDate) < cutoffDate);
  }

  res.json({
    success: true,
    count: overdueInvoices.length,
    data: overdueInvoices
  });
});

// Get fee statistics
app.get('/api/v1/fees/statistics', (req, res) => {
  const { term, academicYear } = req.query;
  let invoiceList = Array.from(invoices.values());

  if (term) invoiceList = invoiceList.filter(i => i.term === term);

  const statistics = {
    totalInvoices: invoiceList.length,
    totalAmount: invoiceList.reduce((sum, i) => sum + i.totalAmount, 0),
    paidAmount: invoiceList.reduce((sum, i) => sum + i.paidAmount, 0),
    dueAmount: invoiceList.reduce((sum, i) => sum + i.dueAmount, 0),
    paidInvoices: invoiceList.filter(i => i.status === 'paid').length,
    pendingInvoices: invoiceList.filter(i => i.status === 'pending').length,
    partialInvoices: invoiceList.filter(i => i.status === 'partial').length
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n💳 Fee Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
