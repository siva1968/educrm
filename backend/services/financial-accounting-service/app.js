const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.FINANCIAL_ACCOUNTING_PORT || 4142;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const ledgerEntries = new Map();
const accountsPayable = new Map();
const accountsReceivable = new Map();
const budgets = new Map();
const financialReports = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Financial Accounting Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'General ledger management',
      'Accounts payable tracking',
      'Accounts receivable management',
      'Budget planning and monitoring',
      'Financial reporting'
    ]
  });
});

// Health check
app.get('/api/v1/accounting/health', (req, res) => {
  res.json({ service: 'Financial Accounting', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create ledger entry
app.post('/api/v1/accounting/ledger', (req, res) => {
  const { accountCode, accountName, transactionType, amount, description, reference } = req.body;

  const entry = {
    id: uuidv4(),
    entryNumber: `LED-${Date.now()}`,
    accountCode,
    accountName,
    transactionType, // debit, credit
    amount,
    description,
    reference,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  ledgerEntries.set(entry.id, entry);

  res.status(201).json({
    success: true,
    message: 'Ledger entry created successfully',
    data: entry
  });
});

// Get all ledger entries
app.get('/api/v1/accounting/ledger', (req, res) => {
  const { accountCode, transactionType, startDate, endDate } = req.query;
  let entries = Array.from(ledgerEntries.values());

  if (accountCode) entries = entries.filter(e => e.accountCode === accountCode);
  if (transactionType) entries = entries.filter(e => e.transactionType === transactionType);
  if (startDate) entries = entries.filter(e => e.date >= startDate);
  if (endDate) entries = entries.filter(e => e.date <= endDate);

  res.json({
    success: true,
    count: entries.length,
    data: entries
  });
});

// Get ledger entry by ID
app.get('/api/v1/accounting/ledger/:id', (req, res) => {
  const entry = ledgerEntries.get(req.params.id);

  if (!entry) {
    return res.status(404).json({ success: false, message: 'Ledger entry not found' });
  }

  res.json({
    success: true,
    data: entry
  });
});

// Create accounts payable
app.post('/api/v1/accounting/payables', (req, res) => {
  const { vendorId, vendorName, invoiceNumber, amount, dueDate, description } = req.body;

  const payable = {
    id: uuidv4(),
    payableId: `AP-${Date.now()}`,
    vendorId,
    vendorName,
    invoiceNumber,
    amount,
    paidAmount: 0,
    pendingAmount: amount,
    dueDate,
    description,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  accountsPayable.set(payable.id, payable);

  res.status(201).json({
    success: true,
    message: 'Accounts payable created successfully',
    data: payable
  });
});

// Get all accounts payable
app.get('/api/v1/accounting/payables', (req, res) => {
  const { vendorId, status } = req.query;
  let payables = Array.from(accountsPayable.values());

  if (vendorId) payables = payables.filter(p => p.vendorId === vendorId);
  if (status) payables = payables.filter(p => p.status === status);

  res.json({
    success: true,
    count: payables.length,
    data: payables
  });
});

// Pay accounts payable
app.post('/api/v1/accounting/payables/:id/pay', (req, res) => {
  const payable = accountsPayable.get(req.params.id);

  if (!payable) {
    return res.status(404).json({ success: false, message: 'Payable not found' });
  }

  const { amount, paymentMethod, reference } = req.body;

  payable.paidAmount += amount;
  payable.pendingAmount -= amount;

  if (payable.pendingAmount <= 0) {
    payable.status = 'paid';
    payable.paidAt = new Date().toISOString();
  } else {
    payable.status = 'partial';
  }

  payable.lastPayment = {
    amount,
    paymentMethod,
    reference,
    paidAt: new Date().toISOString()
  };

  accountsPayable.set(payable.id, payable);

  res.json({
    success: true,
    message: 'Payment recorded successfully',
    data: payable
  });
});

// Create accounts receivable
app.post('/api/v1/accounting/receivables', (req, res) => {
  const { customerId, customerName, invoiceNumber, amount, dueDate, description } = req.body;

  const receivable = {
    id: uuidv4(),
    receivableId: `AR-${Date.now()}`,
    customerId,
    customerName,
    invoiceNumber,
    amount,
    receivedAmount: 0,
    pendingAmount: amount,
    dueDate,
    description,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  accountsReceivable.set(receivable.id, receivable);

  res.status(201).json({
    success: true,
    message: 'Accounts receivable created successfully',
    data: receivable
  });
});

// Get all accounts receivable
app.get('/api/v1/accounting/receivables', (req, res) => {
  const { customerId, status } = req.query;
  let receivables = Array.from(accountsReceivable.values());

  if (customerId) receivables = receivables.filter(r => r.customerId === customerId);
  if (status) receivables = receivables.filter(r => r.status === status);

  res.json({
    success: true,
    count: receivables.length,
    data: receivables
  });
});

// Record receivable payment
app.post('/api/v1/accounting/receivables/:id/receive', (req, res) => {
  const receivable = accountsReceivable.get(req.params.id);

  if (!receivable) {
    return res.status(404).json({ success: false, message: 'Receivable not found' });
  }

  const { amount, paymentMethod, reference } = req.body;

  receivable.receivedAmount += amount;
  receivable.pendingAmount -= amount;

  if (receivable.pendingAmount <= 0) {
    receivable.status = 'received';
    receivable.receivedAt = new Date().toISOString();
  } else {
    receivable.status = 'partial';
  }

  receivable.lastReceipt = {
    amount,
    paymentMethod,
    reference,
    receivedAt: new Date().toISOString()
  };

  accountsReceivable.set(receivable.id, receivable);

  res.json({
    success: true,
    message: 'Receipt recorded successfully',
    data: receivable
  });
});

// Create budget
app.post('/api/v1/accounting/budgets', (req, res) => {
  const { department, fiscalYear, categories, totalBudget } = req.body;

  const budget = {
    id: uuidv4(),
    budgetId: `BUD-${Date.now()}`,
    department,
    fiscalYear,
    categories, // { salaries: 100000, operations: 50000, ... }
    totalBudget,
    spent: 0,
    remaining: totalBudget,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  budgets.set(budget.id, budget);

  res.status(201).json({
    success: true,
    message: 'Budget created successfully',
    data: budget
  });
});

// Get all budgets
app.get('/api/v1/accounting/budgets', (req, res) => {
  const { department, fiscalYear, status } = req.query;
  let budgetList = Array.from(budgets.values());

  if (department) budgetList = budgetList.filter(b => b.department === department);
  if (fiscalYear) budgetList = budgetList.filter(b => b.fiscalYear === fiscalYear);
  if (status) budgetList = budgetList.filter(b => b.status === status);

  res.json({
    success: true,
    count: budgetList.length,
    data: budgetList
  });
});

// Update budget utilization
app.put('/api/v1/accounting/budgets/:id/utilize', (req, res) => {
  const budget = budgets.get(req.params.id);

  if (!budget) {
    return res.status(404).json({ success: false, message: 'Budget not found' });
  }

  const { amount, category, description } = req.body;

  budget.spent += amount;
  budget.remaining -= amount;

  if (!budget.utilization) budget.utilization = [];
  budget.utilization.push({
    amount,
    category,
    description,
    date: new Date().toISOString()
  });

  budgets.set(budget.id, budget);

  res.json({
    success: true,
    message: 'Budget utilization updated successfully',
    data: budget
  });
});

// Generate financial report
app.post('/api/v1/accounting/reports/generate', (req, res) => {
  const { reportType, startDate, endDate, department } = req.body;

  let data = {};

  if (reportType === 'profit-loss') {
    const debits = Array.from(ledgerEntries.values())
      .filter(e => e.transactionType === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);

    const credits = Array.from(ledgerEntries.values())
      .filter(e => e.transactionType === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);

    data = { totalDebits: debits, totalCredits: credits, netProfit: credits - debits };
  }

  const report = {
    id: uuidv4(),
    reportNumber: `FIN-${Date.now()}`,
    reportType,
    startDate,
    endDate,
    department,
    data,
    generatedAt: new Date().toISOString()
  };

  financialReports.set(report.id, report);

  res.status(201).json({
    success: true,
    message: 'Financial report generated successfully',
    data: report
  });
});

// Get all reports
app.get('/api/v1/accounting/reports', (req, res) => {
  const { reportType, department } = req.query;
  let reports = Array.from(financialReports.values());

  if (reportType) reports = reports.filter(r => r.reportType === reportType);
  if (department) reports = reports.filter(r => r.department === department);

  res.json({
    success: true,
    count: reports.length,
    data: reports
  });
});

// Get financial summary
app.get('/api/v1/accounting/summary', (req, res) => {
  const summary = {
    totalPayables: Array.from(accountsPayable.values()).reduce((sum, p) => sum + p.pendingAmount, 0),
    totalReceivables: Array.from(accountsReceivable.values()).reduce((sum, r) => sum + r.pendingAmount, 0),
    totalBudget: Array.from(budgets.values())
      .filter(b => b.status === 'active')
      .reduce((sum, b) => sum + b.totalBudget, 0),
    totalSpent: Array.from(budgets.values())
      .filter(b => b.status === 'active')
      .reduce((sum, b) => sum + b.spent, 0)
  };

  res.json({
    success: true,
    data: summary
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n💼 Financial Accounting Service running on port ${PORT}\n`);
  });
}

module.exports = app;
