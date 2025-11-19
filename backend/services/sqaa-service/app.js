const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.SQAA_PORT || 4184;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const audits = new Map();
const standards = new Map();
const complianceRecords = new Map();
const qualityReports = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'SQAA Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Quality assurance audits',
      'Audit management',
      'Compliance tracking',
      'Standards management',
      'Quality reporting'
    ]
  });
});

// Health check
app.get('/api/v1/sqaa/health', (req, res) => {
  res.json({ service: 'SQAA', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create audit
app.post('/api/v1/sqaa/audits', (req, res) => {
  const { title, type, scope, scheduledDate, auditTeam, criteria } = req.body;

  const audit = {
    id: uuidv4(),
    auditId: `AUD-${Date.now()}`,
    title,
    type, // internal, external, compliance, academic
    scope,
    scheduledDate,
    auditTeam,
    criteria,
    status: 'scheduled',
    findings: [],
    createdAt: new Date().toISOString()
  };

  audits.set(audit.id, audit);

  res.status(201).json({
    success: true,
    message: 'Audit created successfully',
    data: audit
  });
});

// Get all audits
app.get('/api/v1/sqaa/audits', (req, res) => {
  const { type, status } = req.query;
  let auditList = Array.from(audits.values());

  if (type) auditList = auditList.filter(a => a.type === type);
  if (status) auditList = auditList.filter(a => a.status === status);

  res.json({
    success: true,
    count: auditList.length,
    data: auditList
  });
});

// Get audit by ID
app.get('/api/v1/sqaa/audits/:id', (req, res) => {
  const audit = audits.get(req.params.id);

  if (!audit) {
    return res.status(404).json({ success: false, message: 'Audit not found' });
  }

  res.json({
    success: true,
    data: audit
  });
});

// Update audit status
app.put('/api/v1/sqaa/audits/:id/status', (req, res) => {
  const audit = audits.get(req.params.id);

  if (!audit) {
    return res.status(404).json({ success: false, message: 'Audit not found' });
  }

  audit.status = req.body.status; // scheduled, in-progress, completed, cancelled
  audit.statusUpdatedAt = new Date().toISOString();

  if (req.body.status === 'completed') {
    audit.completedAt = new Date().toISOString();
  }

  audits.set(audit.id, audit);

  res.json({
    success: true,
    message: 'Audit status updated successfully',
    data: audit
  });
});

// Add audit finding
app.post('/api/v1/sqaa/audits/:auditId/findings', (req, res) => {
  const audit = audits.get(req.params.auditId);

  if (!audit) {
    return res.status(404).json({ success: false, message: 'Audit not found' });
  }

  const { area, finding, severity, recommendation } = req.body;

  const findingEntry = {
    id: uuidv4(),
    area,
    finding,
    severity, // low, medium, high, critical
    recommendation,
    status: 'open',
    identifiedAt: new Date().toISOString()
  };

  audit.findings.push(findingEntry);
  audits.set(audit.id, audit);

  res.status(201).json({
    success: true,
    message: 'Audit finding added successfully',
    data: findingEntry
  });
});

// Create standard
app.post('/api/v1/sqaa/standards', (req, res) => {
  const { name, code, category, description, requirements } = req.body;

  const standard = {
    id: uuidv4(),
    standardId: `STD-${Date.now()}`,
    name,
    code,
    category, // academic, infrastructure, safety, governance
    description,
    requirements, // Array of requirement objects
    status: 'active',
    createdAt: new Date().toISOString()
  };

  standards.set(standard.id, standard);

  res.status(201).json({
    success: true,
    message: 'Standard created successfully',
    data: standard
  });
});

// Get all standards
app.get('/api/v1/sqaa/standards', (req, res) => {
  const { category, status } = req.query;
  let standardList = Array.from(standards.values());

  if (category) standardList = standardList.filter(s => s.category === category);
  if (status) standardList = standardList.filter(s => s.status === status);

  res.json({
    success: true,
    count: standardList.length,
    data: standardList
  });
});

// Create compliance record
app.post('/api/v1/sqaa/compliance', (req, res) => {
  const { standardId, department, assessmentDate, complianceLevel, evidence, gaps } = req.body;

  const compliance = {
    id: uuidv4(),
    complianceId: `COMP-${Date.now()}`,
    standardId,
    department,
    assessmentDate,
    complianceLevel, // fully-compliant, partially-compliant, non-compliant
    evidence: evidence || [],
    gaps: gaps || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  complianceRecords.set(compliance.id, compliance);

  res.status(201).json({
    success: true,
    message: 'Compliance record created successfully',
    data: compliance
  });
});

// Get all compliance records
app.get('/api/v1/sqaa/compliance', (req, res) => {
  const { standardId, department, complianceLevel } = req.query;
  let complianceList = Array.from(complianceRecords.values());

  if (standardId) complianceList = complianceList.filter(c => c.standardId === standardId);
  if (department) complianceList = complianceList.filter(c => c.department === department);
  if (complianceLevel) complianceList = complianceList.filter(c => c.complianceLevel === complianceLevel);

  res.json({
    success: true,
    count: complianceList.length,
    data: complianceList
  });
});

// Update compliance status
app.put('/api/v1/sqaa/compliance/:id', (req, res) => {
  const compliance = complianceRecords.get(req.params.id);

  if (!compliance) {
    return res.status(404).json({ success: false, message: 'Compliance record not found' });
  }

  const updatedCompliance = { ...compliance, ...req.body, updatedAt: new Date().toISOString() };
  complianceRecords.set(compliance.id, updatedCompliance);

  res.json({
    success: true,
    message: 'Compliance record updated successfully',
    data: updatedCompliance
  });
});

// Generate quality report
app.post('/api/v1/sqaa/reports/generate', (req, res) => {
  const { reportType, startDate, endDate, department } = req.body;

  const report = {
    id: uuidv4(),
    reportId: `REP-${Date.now()}`,
    reportType, // audit-summary, compliance-status, quality-metrics
    startDate,
    endDate,
    department,
    data: {},
    generatedAt: new Date().toISOString()
  };

  // Generate report data based on type
  if (reportType === 'audit-summary') {
    const auditList = Array.from(audits.values())
      .filter(a => a.scheduledDate >= startDate && a.scheduledDate <= endDate);

    report.data = {
      totalAudits: auditList.length,
      completed: auditList.filter(a => a.status === 'completed').length,
      inProgress: auditList.filter(a => a.status === 'in-progress').length,
      scheduled: auditList.filter(a => a.status === 'scheduled').length,
      findings: auditList.reduce((sum, a) => sum + a.findings.length, 0)
    };
  }

  qualityReports.set(report.id, report);

  res.status(201).json({
    success: true,
    message: 'Quality report generated successfully',
    data: report
  });
});

// Get all quality reports
app.get('/api/v1/sqaa/reports', (req, res) => {
  const { reportType, department } = req.query;
  let reportList = Array.from(qualityReports.values());

  if (reportType) reportList = reportList.filter(r => r.reportType === reportType);
  if (department) reportList = reportList.filter(r => r.department === department);

  res.json({
    success: true,
    count: reportList.length,
    data: reportList
  });
});

// Get SQAA dashboard
app.get('/api/v1/sqaa/dashboard', (req, res) => {
  const dashboard = {
    totalAudits: audits.size,
    activeAudits: Array.from(audits.values()).filter(a => a.status === 'in-progress').length,
    completedAudits: Array.from(audits.values()).filter(a => a.status === 'completed').length,
    totalStandards: standards.size,
    complianceRate: complianceRecords.size > 0 ?
      ((Array.from(complianceRecords.values()).filter(c => c.complianceLevel === 'fully-compliant').length / complianceRecords.size) * 100).toFixed(2) : 0,
    criticalFindings: Array.from(audits.values())
      .reduce((sum, a) => sum + a.findings.filter(f => f.severity === 'critical').length, 0)
  };

  res.json({
    success: true,
    data: dashboard
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n✅ SQAA Service running on port ${PORT}\n`);
  });
}

module.exports = app;
