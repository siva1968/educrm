const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.ADMISSIONS_PORT || 4171;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const applications = new Map();
const entranceTests = new Map();
const meritLists = new Map();
const documents = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Admissions Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Application processing',
      'Entrance test management',
      'Merit list generation',
      'Document verification',
      'Admission confirmation'
    ]
  });
});

// Health check
app.get('/api/v1/admissions/health', (req, res) => {
  res.json({ service: 'Admissions Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Submit application
app.post('/api/v1/admissions/applications', (req, res) => {
  const { studentName, email, phone, program, category, guardianInfo, academicHistory } = req.body;

  const application = {
    id: uuidv4(),
    applicationNumber: `APP-${Date.now()}`,
    studentName,
    email,
    phone,
    program,
    category, // general, obc, sc, st
    guardianInfo,
    academicHistory,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  applications.set(application.id, application);

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: application
  });
});

// Get all applications
app.get('/api/v1/admissions/applications', (req, res) => {
  const { status, program, category } = req.query;
  let applicationList = Array.from(applications.values());

  if (status) applicationList = applicationList.filter(a => a.status === status);
  if (program) applicationList = applicationList.filter(a => a.program === program);
  if (category) applicationList = applicationList.filter(a => a.category === category);

  res.json({
    success: true,
    count: applicationList.length,
    data: applicationList
  });
});

// Get application by ID
app.get('/api/v1/admissions/applications/:id', (req, res) => {
  const application = applications.get(req.params.id);

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  res.json({
    success: true,
    data: application
  });
});

// Update application status
app.put('/api/v1/admissions/applications/:id/status', (req, res) => {
  const application = applications.get(req.params.id);

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  application.status = req.body.status;
  application.remarks = req.body.remarks;
  application.updatedAt = new Date().toISOString();

  applications.set(application.id, application);

  res.json({
    success: true,
    message: 'Application status updated successfully',
    data: application
  });
});

// Create entrance test
app.post('/api/v1/admissions/entrance-tests', (req, res) => {
  const { testName, program, date, duration, totalMarks, passingMarks } = req.body;

  const test = {
    id: uuidv4(),
    testId: `TEST-${Date.now()}`,
    testName,
    program,
    date,
    duration,
    totalMarks,
    passingMarks,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  entranceTests.set(test.id, test);

  res.status(201).json({
    success: true,
    message: 'Entrance test created successfully',
    data: test
  });
});

// Get all entrance tests
app.get('/api/v1/admissions/entrance-tests', (req, res) => {
  const { program, status } = req.query;
  let testList = Array.from(entranceTests.values());

  if (program) testList = testList.filter(t => t.program === program);
  if (status) testList = testList.filter(t => t.status === status);

  res.json({
    success: true,
    count: testList.length,
    data: testList
  });
});

// Submit test result
app.post('/api/v1/admissions/applications/:id/test-result', (req, res) => {
  const application = applications.get(req.params.id);

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  const { testId, score, rank } = req.body;

  application.testResult = {
    testId,
    score,
    rank,
    submittedAt: new Date().toISOString()
  };

  const test = entranceTests.get(testId);
  if (test && score >= test.passingMarks) {
    application.status = 'test-cleared';
  } else {
    application.status = 'test-failed';
  }

  applications.set(application.id, application);

  res.json({
    success: true,
    message: 'Test result submitted successfully',
    data: application
  });
});

// Generate merit list
app.post('/api/v1/admissions/merit-lists/generate', (req, res) => {
  const { program, category, cutoffScore } = req.body;

  const eligibleApplications = Array.from(applications.values())
    .filter(a => a.program === program &&
                 (category ? a.category === category : true) &&
                 a.testResult &&
                 a.testResult.score >= cutoffScore &&
                 a.status === 'test-cleared')
    .sort((a, b) => b.testResult.score - a.testResult.score);

  const meritList = {
    id: uuidv4(),
    listId: `MERIT-${Date.now()}`,
    program,
    category: category || 'all',
    cutoffScore,
    candidates: eligibleApplications.map((app, index) => ({
      rank: index + 1,
      applicationNumber: app.applicationNumber,
      studentName: app.studentName,
      score: app.testResult.score
    })),
    generatedAt: new Date().toISOString()
  };

  meritLists.set(meritList.id, meritList);

  res.status(201).json({
    success: true,
    message: 'Merit list generated successfully',
    data: meritList
  });
});

// Get all merit lists
app.get('/api/v1/admissions/merit-lists', (req, res) => {
  const { program, category } = req.query;
  let lists = Array.from(meritLists.values());

  if (program) lists = lists.filter(l => l.program === program);
  if (category) lists = lists.filter(l => l.category === category);

  res.json({
    success: true,
    count: lists.length,
    data: lists
  });
});

// Upload document
app.post('/api/v1/admissions/applications/:id/documents', (req, res) => {
  const { documentType, filename, url } = req.body;

  const document = {
    id: uuidv4(),
    applicationId: req.params.id,
    documentType, // marksheet, certificate, photo, id-proof
    filename,
    url,
    verificationStatus: 'pending',
    uploadedAt: new Date().toISOString()
  };

  documents.set(document.id, document);

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: document
  });
});

// Get application documents
app.get('/api/v1/admissions/applications/:id/documents', (req, res) => {
  const docs = Array.from(documents.values())
    .filter(d => d.applicationId === req.params.id);

  res.json({
    success: true,
    count: docs.length,
    data: docs
  });
});

// Verify document
app.put('/api/v1/admissions/documents/:id/verify', (req, res) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  document.verificationStatus = req.body.status; // approved, rejected
  document.verificationRemarks = req.body.remarks;
  document.verifiedAt = new Date().toISOString();
  document.verifiedBy = req.body.verifiedBy;

  documents.set(document.id, document);

  res.json({
    success: true,
    message: 'Document verified successfully',
    data: document
  });
});

// Confirm admission
app.post('/api/v1/admissions/applications/:id/confirm', (req, res) => {
  const application = applications.get(req.params.id);

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  application.status = 'admitted';
  application.admissionNumber = `ADM-${Date.now()}`;
  application.admittedAt = new Date().toISOString();

  applications.set(application.id, application);

  res.json({
    success: true,
    message: 'Admission confirmed successfully',
    data: application
  });
});

// Get admission statistics
app.get('/api/v1/admissions/statistics', (req, res) => {
  const { program } = req.query;
  let apps = Array.from(applications.values());

  if (program) apps = apps.filter(a => a.program === program);

  const statistics = {
    totalApplications: apps.length,
    byStatus: {
      submitted: apps.filter(a => a.status === 'submitted').length,
      testCleared: apps.filter(a => a.status === 'test-cleared').length,
      testFailed: apps.filter(a => a.status === 'test-failed').length,
      admitted: apps.filter(a => a.status === 'admitted').length,
      rejected: apps.filter(a => a.status === 'rejected').length
    },
    byCategory: {}
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎓 Admissions Service running on port ${PORT}\n`);
  });
}

module.exports = app;
