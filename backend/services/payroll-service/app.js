const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PAYROLL_PORT || 4131;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const salaries = new Map();
const payslips = new Map();
const deductions = new Map();
const bonuses = new Map();
const taxRecords = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Payroll Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Salary processing',
      'Tax calculation',
      'Payslip generation',
      'Deduction management',
      'Bonus processing'
    ]
  });
});

// Health check
app.get('/api/v1/payroll/health', (req, res) => {
  res.json({ service: 'Payroll Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create salary structure
app.post('/api/v1/payroll/salaries', (req, res) => {
  const { employeeId, basicSalary, allowances, ctc, effectiveDate } = req.body;

  const salary = {
    id: uuidv4(),
    employeeId,
    basicSalary,
    allowances: allowances || {},
    ctc,
    effectiveDate,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  salaries.set(salary.id, salary);

  res.status(201).json({
    success: true,
    message: 'Salary structure created successfully',
    data: salary
  });
});

// Get all salaries
app.get('/api/v1/payroll/salaries', (req, res) => {
  const { employeeId, status } = req.query;
  let salaryList = Array.from(salaries.values());

  if (employeeId) salaryList = salaryList.filter(s => s.employeeId === employeeId);
  if (status) salaryList = salaryList.filter(s => s.status === status);

  res.json({
    success: true,
    count: salaryList.length,
    data: salaryList
  });
});

// Update salary
app.put('/api/v1/payroll/salaries/:id', (req, res) => {
  const salary = salaries.get(req.params.id);

  if (!salary) {
    return res.status(404).json({ success: false, message: 'Salary record not found' });
  }

  const updatedSalary = { ...salary, ...req.body, updatedAt: new Date().toISOString() };
  salaries.set(salary.id, updatedSalary);

  res.json({
    success: true,
    message: 'Salary updated successfully',
    data: updatedSalary
  });
});

// Generate payslip
app.post('/api/v1/payroll/payslips/generate', (req, res) => {
  const { employeeId, month, year, workingDays, presentDays } = req.body;

  const salary = Array.from(salaries.values()).find(s => s.employeeId === employeeId && s.status === 'active');

  if (!salary) {
    return res.status(404).json({ success: false, message: 'Active salary record not found' });
  }

  // Calculate gross salary
  const dailySalary = salary.basicSalary / 30;
  const earnedBasic = dailySalary * presentDays;
  const totalAllowances = Object.values(salary.allowances).reduce((sum, val) => sum + val, 0);
  const grossSalary = earnedBasic + totalAllowances;

  // Calculate tax (simplified)
  const taxRate = grossSalary > 50000 ? 0.2 : 0.1;
  const tax = grossSalary * taxRate;

  // Get deductions
  const employeeDeductions = Array.from(deductions.values())
    .filter(d => d.employeeId === employeeId && d.status === 'active');
  const totalDeductions = employeeDeductions.reduce((sum, d) => sum + d.amount, 0);

  // Get bonuses
  const employeeBonuses = Array.from(bonuses.values())
    .filter(b => b.employeeId === employeeId && b.month === month && b.year === year);
  const totalBonuses = employeeBonuses.reduce((sum, b) => sum + b.amount, 0);

  const netSalary = grossSalary - tax - totalDeductions + totalBonuses;

  const payslip = {
    id: uuidv4(),
    payslipNumber: `PAY-${year}-${month}-${Date.now()}`,
    employeeId,
    month,
    year,
    workingDays,
    presentDays,
    basicSalary: earnedBasic,
    allowances: salary.allowances,
    grossSalary,
    tax,
    deductions: totalDeductions,
    bonuses: totalBonuses,
    netSalary,
    status: 'generated',
    generatedAt: new Date().toISOString()
  };

  payslips.set(payslip.id, payslip);

  res.status(201).json({
    success: true,
    message: 'Payslip generated successfully',
    data: payslip
  });
});

// Get all payslips
app.get('/api/v1/payroll/payslips', (req, res) => {
  const { employeeId, month, year, status } = req.query;
  let payslipList = Array.from(payslips.values());

  if (employeeId) payslipList = payslipList.filter(p => p.employeeId === employeeId);
  if (month) payslipList = payslipList.filter(p => p.month === parseInt(month));
  if (year) payslipList = payslipList.filter(p => p.year === parseInt(year));
  if (status) payslipList = payslipList.filter(p => p.status === status);

  res.json({
    success: true,
    count: payslipList.length,
    data: payslipList
  });
});

// Get payslip by ID
app.get('/api/v1/payroll/payslips/:id', (req, res) => {
  const payslip = payslips.get(req.params.id);

  if (!payslip) {
    return res.status(404).json({ success: false, message: 'Payslip not found' });
  }

  res.json({
    success: true,
    data: payslip
  });
});

// Add deduction
app.post('/api/v1/payroll/deductions', (req, res) => {
  const { employeeId, type, amount, description, effectiveDate } = req.body;

  const deduction = {
    id: uuidv4(),
    employeeId,
    type, // loan, advance, fine
    amount,
    description,
    effectiveDate,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  deductions.set(deduction.id, deduction);

  res.status(201).json({
    success: true,
    message: 'Deduction added successfully',
    data: deduction
  });
});

// Get all deductions
app.get('/api/v1/payroll/deductions', (req, res) => {
  const { employeeId, status } = req.query;
  let deductionList = Array.from(deductions.values());

  if (employeeId) deductionList = deductionList.filter(d => d.employeeId === employeeId);
  if (status) deductionList = deductionList.filter(d => d.status === status);

  res.json({
    success: true,
    count: deductionList.length,
    data: deductionList
  });
});

// Add bonus
app.post('/api/v1/payroll/bonuses', (req, res) => {
  const { employeeId, type, amount, month, year, description } = req.body;

  const bonus = {
    id: uuidv4(),
    employeeId,
    type, // performance, festival, annual
    amount,
    month,
    year,
    description,
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  bonuses.set(bonus.id, bonus);

  res.status(201).json({
    success: true,
    message: 'Bonus added successfully',
    data: bonus
  });
});

// Get all bonuses
app.get('/api/v1/payroll/bonuses', (req, res) => {
  const { employeeId, year, month } = req.query;
  let bonusList = Array.from(bonuses.values());

  if (employeeId) bonusList = bonusList.filter(b => b.employeeId === employeeId);
  if (year) bonusList = bonusList.filter(b => b.year === parseInt(year));
  if (month) bonusList = bonusList.filter(b => b.month === parseInt(month));

  res.json({
    success: true,
    count: bonusList.length,
    data: bonusList
  });
});

// Calculate tax
app.post('/api/v1/payroll/tax/calculate', (req, res) => {
  const { employeeId, year, income } = req.body;

  let taxRate = 0;
  let taxAmount = 0;

  if (income <= 250000) {
    taxRate = 0;
  } else if (income <= 500000) {
    taxRate = 0.05;
    taxAmount = (income - 250000) * taxRate;
  } else if (income <= 1000000) {
    taxRate = 0.2;
    taxAmount = 12500 + (income - 500000) * taxRate;
  } else {
    taxRate = 0.3;
    taxAmount = 112500 + (income - 1000000) * taxRate;
  }

  const taxRecord = {
    id: uuidv4(),
    employeeId,
    year,
    income,
    taxRate,
    taxAmount,
    calculatedAt: new Date().toISOString()
  };

  taxRecords.set(taxRecord.id, taxRecord);

  res.status(201).json({
    success: true,
    message: 'Tax calculated successfully',
    data: taxRecord
  });
});

// Get tax records
app.get('/api/v1/payroll/tax', (req, res) => {
  const { employeeId, year } = req.query;
  let taxList = Array.from(taxRecords.values());

  if (employeeId) taxList = taxList.filter(t => t.employeeId === employeeId);
  if (year) taxList = taxList.filter(t => t.year === parseInt(year));

  res.json({
    success: true,
    count: taxList.length,
    data: taxList
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n💰 Payroll Service running on port ${PORT}\n`);
  });
}

module.exports = app;
