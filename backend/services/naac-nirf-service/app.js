const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.NAAC_NIRF_PORT || 4185;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const accreditations = new Map();
const criteria = new Map();
const evidences = new Map();
const nirfData = new Map();
const reports = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'NAAC & NIRF Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'NAAC accreditation management',
      'NIRF ranking data collection',
      'Criteria assessment',
      'Evidence management',
      'Compliance reporting'
    ]
  });
});

// Health check
app.get('/api/v1/naac-nirf/health', (req, res) => {
  res.json({ service: 'NAAC & NIRF', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create accreditation cycle
app.post('/api/v1/naac-nirf/accreditations', (req, res) => {
  const { type, cycle, startDate, endDate, status } = req.body;

  const accreditation = {
    id: uuidv4(),
    accreditationId: `ACC-${Date.now()}`,
    type, // NAAC, NBA, other
    cycle,
    startDate,
    endDate,
    status: status || 'in-progress',
    grade: null,
    score: 0,
    createdAt: new Date().toISOString()
  };

  accreditations.set(accreditation.id, accreditation);

  res.status(201).json({
    success: true,
    message: 'Accreditation cycle created successfully',
    data: accreditation
  });
});

// Get all accreditations
app.get('/api/v1/naac-nirf/accreditations', (req, res) => {
  const { type, status } = req.query;
  let accreditationList = Array.from(accreditations.values());

  if (type) accreditationList = accreditationList.filter(a => a.type === type);
  if (status) accreditationList = accreditationList.filter(a => a.status === status);

  res.json({
    success: true,
    count: accreditationList.length,
    data: accreditationList
  });
});

// Update accreditation
app.put('/api/v1/naac-nirf/accreditations/:id', (req, res) => {
  const accreditation = accreditations.get(req.params.id);

  if (!accreditation) {
    return res.status(404).json({ success: false, message: 'Accreditation not found' });
  }

  const updatedAccreditation = { ...accreditation, ...req.body, updatedAt: new Date().toISOString() };
  accreditations.set(accreditation.id, updatedAccreditation);

  res.json({
    success: true,
    message: 'Accreditation updated successfully',
    data: updatedAccreditation
  });
});

// Create criteria assessment
app.post('/api/v1/naac-nirf/criteria', (req, res) => {
  const { accreditationId, criteriaNumber, title, maxScore, assessedScore, description, keyIndicators } = req.body;

  const criteriaAssessment = {
    id: uuidv4(),
    criteriaId: `CRI-${Date.now()}`,
    accreditationId,
    criteriaNumber, // e.g., "1.1.1"
    title,
    maxScore,
    assessedScore,
    description,
    keyIndicators: keyIndicators || [],
    status: 'under-review',
    createdAt: new Date().toISOString()
  };

  criteria.set(criteriaAssessment.id, criteriaAssessment);

  res.status(201).json({
    success: true,
    message: 'Criteria assessment created successfully',
    data: criteriaAssessment
  });
});

// Get all criteria
app.get('/api/v1/naac-nirf/criteria', (req, res) => {
  const { accreditationId, status } = req.query;
  let criteriaList = Array.from(criteria.values());

  if (accreditationId) criteriaList = criteriaList.filter(c => c.accreditationId === accreditationId);
  if (status) criteriaList = criteriaList.filter(c => c.status === status);

  res.json({
    success: true,
    count: criteriaList.length,
    data: criteriaList
  });
});

// Upload evidence
app.post('/api/v1/naac-nirf/evidence', (req, res) => {
  const { criteriaId, title, description, fileUrl, documentType } = req.body;

  const evidence = {
    id: uuidv4(),
    evidenceId: `EVD-${Date.now()}`,
    criteriaId,
    title,
    description,
    fileUrl,
    documentType, // pdf, excel, image, video
    verificationStatus: 'pending',
    uploadedAt: new Date().toISOString()
  };

  evidences.set(evidence.id, evidence);

  res.status(201).json({
    success: true,
    message: 'Evidence uploaded successfully',
    data: evidence
  });
});

// Get evidence
app.get('/api/v1/naac-nirf/evidence', (req, res) => {
  const { criteriaId, verificationStatus } = req.query;
  let evidenceList = Array.from(evidences.values());

  if (criteriaId) evidenceList = evidenceList.filter(e => e.criteriaId === criteriaId);
  if (verificationStatus) evidenceList = evidenceList.filter(e => e.verificationStatus === verificationStatus);

  res.json({
    success: true,
    count: evidenceList.length,
    data: evidenceList
  });
});

// Verify evidence
app.put('/api/v1/naac-nirf/evidence/:id/verify', (req, res) => {
  const evidence = evidences.get(req.params.id);

  if (!evidence) {
    return res.status(404).json({ success: false, message: 'Evidence not found' });
  }

  evidence.verificationStatus = req.body.status; // verified, rejected
  evidence.verificationRemarks = req.body.remarks;
  evidence.verifiedAt = new Date().toISOString();
  evidence.verifiedBy = req.body.verifiedBy;

  evidences.set(evidence.id, evidence);

  res.json({
    success: true,
    message: 'Evidence verification updated successfully',
    data: evidence
  });
});

// Submit NIRF data
app.post('/api/v1/naac-nirf/nirf-data', (req, res) => {
  const { year, category, parameters } = req.body;

  const nirf = {
    id: uuidv4(),
    nirfId: `NIRF-${Date.now()}`,
    year,
    category, // overall, engineering, management, pharmacy
    parameters, // TLR, RPC, GO, OI, Perception
    overallScore: 0,
    rank: null,
    status: 'draft',
    submittedAt: new Date().toISOString()
  };

  nirfData.set(nirf.id, nirf);

  res.status(201).json({
    success: true,
    message: 'NIRF data submitted successfully',
    data: nirf
  });
});

// Get NIRF data
app.get('/api/v1/naac-nirf/nirf-data', (req, res) => {
  const { year, category } = req.query;
  let nirfList = Array.from(nirfData.values());

  if (year) nirfList = nirfList.filter(n => n.year === parseInt(year));
  if (category) nirfList = nirfList.filter(n => n.category === category);

  res.json({
    success: true,
    count: nirfList.length,
    data: nirfList
  });
});

// Update NIRF data
app.put('/api/v1/naac-nirf/nirf-data/:id', (req, res) => {
  const nirf = nirfData.get(req.params.id);

  if (!nirf) {
    return res.status(404).json({ success: false, message: 'NIRF data not found' });
  }

  const updatedNirf = { ...nirf, ...req.body, updatedAt: new Date().toISOString() };
  nirfData.set(nirf.id, updatedNirf);

  res.json({
    success: true,
    message: 'NIRF data updated successfully',
    data: updatedNirf
  });
});

// Generate compliance report
app.post('/api/v1/naac-nirf/reports/generate', (req, res) => {
  const { reportType, accreditationId, year } = req.body;

  const report = {
    id: uuidv4(),
    reportId: `REP-${Date.now()}`,
    reportType, // ssr, aqar, dvv, nirf-submission
    accreditationId,
    year,
    sections: [],
    status: 'draft',
    generatedAt: new Date().toISOString()
  };

  reports.set(report.id, report);

  res.status(201).json({
    success: true,
    message: 'Report generated successfully',
    data: report
  });
});

// Get reports
app.get('/api/v1/naac-nirf/reports', (req, res) => {
  const { reportType, accreditationId, status } = req.query;
  let reportList = Array.from(reports.values());

  if (reportType) reportList = reportList.filter(r => r.reportType === reportType);
  if (accreditationId) reportList = reportList.filter(r => r.accreditationId === accreditationId);
  if (status) reportList = reportList.filter(r => r.status === status);

  res.json({
    success: true,
    count: reportList.length,
    data: reportList
  });
});

// Get dashboard
app.get('/api/v1/naac-nirf/dashboard', (req, res) => {
  const dashboard = {
    activeAccreditations: Array.from(accreditations.values()).filter(a => a.status === 'in-progress').length,
    completedCriteria: Array.from(criteria.values()).filter(c => c.status === 'completed').length,
    pendingEvidence: Array.from(evidences.values()).filter(e => e.verificationStatus === 'pending').length,
    nirfSubmissions: nirfData.size,
    latestGrade: Array.from(accreditations.values())
      .filter(a => a.grade)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]?.grade || 'N/A',
    averageScore: Array.from(criteria.values()).length > 0 ?
      (Array.from(criteria.values()).reduce((sum, c) => sum + c.assessedScore, 0) / criteria.size).toFixed(2) : 0
  };

  res.json({
    success: true,
    data: dashboard
  });
});

// Get criteria progress
app.get('/api/v1/naac-nirf/accreditations/:id/progress', (req, res) => {
  const criteriaList = Array.from(criteria.values())
    .filter(c => c.accreditationId === req.params.id);

  const totalCriteria = criteriaList.length;
  const completedCriteria = criteriaList.filter(c => c.status === 'completed').length;
  const inProgressCriteria = criteriaList.filter(c => c.status === 'in-progress').length;

  const progress = {
    totalCriteria,
    completedCriteria,
    inProgressCriteria,
    pendingCriteria: totalCriteria - completedCriteria - inProgressCriteria,
    completionPercentage: totalCriteria > 0 ? ((completedCriteria / totalCriteria) * 100).toFixed(2) : 0,
    totalScore: criteriaList.reduce((sum, c) => sum + c.assessedScore, 0),
    maxPossibleScore: criteriaList.reduce((sum, c) => sum + c.maxScore, 0)
  };

  res.json({
    success: true,
    data: progress
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🏆 NAAC & NIRF Service running on port ${PORT}\n`);
  });
}

module.exports = app;
