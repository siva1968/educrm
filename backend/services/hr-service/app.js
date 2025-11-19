const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.HR_PORT || 4130;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const employees = new Map();
const recruitments = new Map();
const onboardings = new Map();
const policies = new Map();
const documents = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'HR Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Employee records management',
      'Recruitment tracking',
      'Employee onboarding',
      'Policy management',
      'Document management'
    ]
  });
});

// Health check
app.get('/api/v1/hr/health', (req, res) => {
  res.json({ service: 'HR Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create employee record
app.post('/api/v1/hr/employees', (req, res) => {
  const { firstName, lastName, email, phone, department, designation, joiningDate, employeeType } = req.body;

  const employee = {
    id: uuidv4(),
    employeeId: `EMP-${Date.now()}`,
    firstName,
    lastName,
    email,
    phone,
    department,
    designation,
    joiningDate,
    employeeType, // full-time, part-time, contract
    status: 'active',
    createdAt: new Date().toISOString()
  };

  employees.set(employee.id, employee);

  res.status(201).json({
    success: true,
    message: 'Employee record created successfully',
    data: employee
  });
});

// Get all employees
app.get('/api/v1/hr/employees', (req, res) => {
  const { department, status, employeeType } = req.query;
  let employeeList = Array.from(employees.values());

  if (department) employeeList = employeeList.filter(e => e.department === department);
  if (status) employeeList = employeeList.filter(e => e.status === status);
  if (employeeType) employeeList = employeeList.filter(e => e.employeeType === employeeType);

  res.json({
    success: true,
    count: employeeList.length,
    data: employeeList
  });
});

// Get employee by ID
app.get('/api/v1/hr/employees/:id', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  res.json({
    success: true,
    data: employee
  });
});

// Update employee
app.put('/api/v1/hr/employees/:id', (req, res) => {
  const employee = employees.get(req.params.id);

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  const updatedEmployee = { ...employee, ...req.body, updatedAt: new Date().toISOString() };
  employees.set(employee.id, updatedEmployee);

  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: updatedEmployee
  });
});

// Delete employee
app.delete('/api/v1/hr/employees/:id', (req, res) => {
  if (!employees.has(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }

  employees.delete(req.params.id);

  res.json({
    success: true,
    message: 'Employee deleted successfully'
  });
});

// Create recruitment posting
app.post('/api/v1/hr/recruitments', (req, res) => {
  const { title, department, positions, description, requirements, closingDate } = req.body;

  const recruitment = {
    id: uuidv4(),
    jobId: `JOB-${Date.now()}`,
    title,
    department,
    positions,
    description,
    requirements,
    closingDate,
    status: 'open',
    applicants: [],
    createdAt: new Date().toISOString()
  };

  recruitments.set(recruitment.id, recruitment);

  res.status(201).json({
    success: true,
    message: 'Recruitment posting created successfully',
    data: recruitment
  });
});

// Get all recruitments
app.get('/api/v1/hr/recruitments', (req, res) => {
  const { status, department } = req.query;
  let recruitmentList = Array.from(recruitments.values());

  if (status) recruitmentList = recruitmentList.filter(r => r.status === status);
  if (department) recruitmentList = recruitmentList.filter(r => r.department === department);

  res.json({
    success: true,
    count: recruitmentList.length,
    data: recruitmentList
  });
});

// Apply for job
app.post('/api/v1/hr/recruitments/:id/apply', (req, res) => {
  const recruitment = recruitments.get(req.params.id);

  if (!recruitment) {
    return res.status(404).json({ success: false, message: 'Recruitment not found' });
  }

  const application = {
    id: uuidv4(),
    ...req.body,
    appliedAt: new Date().toISOString(),
    status: 'pending'
  };

  recruitment.applicants.push(application);
  recruitments.set(recruitment.id, recruitment);

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: application
  });
});

// Create onboarding
app.post('/api/v1/hr/onboarding', (req, res) => {
  const { employeeId, startDate, mentor, checklist } = req.body;

  const onboarding = {
    id: uuidv4(),
    employeeId,
    startDate,
    mentor,
    checklist: checklist || [],
    progress: 0,
    status: 'in-progress',
    createdAt: new Date().toISOString()
  };

  onboardings.set(onboarding.id, onboarding);

  res.status(201).json({
    success: true,
    message: 'Onboarding created successfully',
    data: onboarding
  });
});

// Get onboarding records
app.get('/api/v1/hr/onboarding', (req, res) => {
  const { employeeId, status } = req.query;
  let onboardingList = Array.from(onboardings.values());

  if (employeeId) onboardingList = onboardingList.filter(o => o.employeeId === employeeId);
  if (status) onboardingList = onboardingList.filter(o => o.status === status);

  res.json({
    success: true,
    count: onboardingList.length,
    data: onboardingList
  });
});

// Create policy
app.post('/api/v1/hr/policies', (req, res) => {
  const { title, category, description, effectiveDate, document } = req.body;

  const policy = {
    id: uuidv4(),
    title,
    category,
    description,
    effectiveDate,
    document,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  policies.set(policy.id, policy);

  res.status(201).json({
    success: true,
    message: 'Policy created successfully',
    data: policy
  });
});

// Get all policies
app.get('/api/v1/hr/policies', (req, res) => {
  const { category, status } = req.query;
  let policyList = Array.from(policies.values());

  if (category) policyList = policyList.filter(p => p.category === category);
  if (status) policyList = policyList.filter(p => p.status === status);

  res.json({
    success: true,
    count: policyList.length,
    data: policyList
  });
});

// Upload employee document
app.post('/api/v1/hr/documents', (req, res) => {
  const { employeeId, type, filename, url, expiryDate } = req.body;

  const document = {
    id: uuidv4(),
    employeeId,
    type, // contract, certification, id-proof
    filename,
    url,
    expiryDate,
    uploadedAt: new Date().toISOString()
  };

  documents.set(document.id, document);

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: document
  });
});

// Get employee documents
app.get('/api/v1/hr/documents', (req, res) => {
  const { employeeId, type } = req.query;
  let documentList = Array.from(documents.values());

  if (employeeId) documentList = documentList.filter(d => d.employeeId === employeeId);
  if (type) documentList = documentList.filter(d => d.type === type);

  res.json({
    success: true,
    count: documentList.length,
    data: documentList
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n👥 HR Service running on port ${PORT}\n`);
  });
}

module.exports = app;
