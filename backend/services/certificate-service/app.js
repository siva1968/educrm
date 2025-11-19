const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.CERTIFICATE_PORT || 4122;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const certificates = new Map();
const templates = new Map();
const verifications = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Certificate Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Certificate generation',
      'Template management',
      'Certificate verification',
      'Digital signatures',
      'Bulk certificate generation'
    ]
  });
});

// Health check
app.get('/api/v1/certificates/health', (req, res) => {
  res.json({ service: 'Certificate Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create certificate template
app.post('/api/v1/certificates/templates', (req, res) => {
  const { name, type, layout, fields, design } = req.body;

  const template = {
    id: uuidv4(),
    name,
    type, // completion, achievement, participation
    layout,
    fields,
    design,
    createdAt: new Date().toISOString()
  };

  templates.set(template.id, template);

  res.status(201).json({
    success: true,
    message: 'Certificate template created successfully',
    data: template
  });
});

// Get all templates
app.get('/api/v1/certificates/templates', (req, res) => {
  const { type } = req.query;
  let templateList = Array.from(templates.values());

  if (type) templateList = templateList.filter(t => t.type === type);

  res.json({
    success: true,
    count: templateList.length,
    data: templateList
  });
});

// Generate certificate
app.post('/api/v1/certificates/generate', (req, res) => {
  const { templateId, recipientName, recipientId, courseOrEvent, issueDate, signedBy, customFields } = req.body;

  const template = templates.get(templateId);
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }

  const certificate = {
    id: uuidv4(),
    certificateNumber: `CERT-${Date.now()}`,
    templateId,
    recipientName,
    recipientId,
    courseOrEvent,
    issueDate: issueDate || new Date().toISOString(),
    signedBy,
    customFields: customFields || {},
    verificationCode: uuidv4().substring(0, 8).toUpperCase(),
    status: 'issued',
    createdAt: new Date().toISOString()
  };

  certificates.set(certificate.id, certificate);

  res.status(201).json({
    success: true,
    message: 'Certificate generated successfully',
    data: certificate
  });
});

// Bulk generate certificates
app.post('/api/v1/certificates/generate/bulk', (req, res) => {
  const { templateId, recipients } = req.body;

  const template = templates.get(templateId);
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }

  const generatedCertificates = recipients.map(recipient => {
    const certificate = {
      id: uuidv4(),
      certificateNumber: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      templateId,
      recipientName: recipient.name,
      recipientId: recipient.id,
      courseOrEvent: recipient.courseOrEvent,
      issueDate: recipient.issueDate || new Date().toISOString(),
      signedBy: recipient.signedBy,
      customFields: recipient.customFields || {},
      verificationCode: uuidv4().substring(0, 8).toUpperCase(),
      status: 'issued',
      createdAt: new Date().toISOString()
    };

    certificates.set(certificate.id, certificate);
    return certificate;
  });

  res.status(201).json({
    success: true,
    message: `${generatedCertificates.length} certificates generated successfully`,
    data: generatedCertificates
  });
});

// Get all certificates
app.get('/api/v1/certificates', (req, res) => {
  const { recipientId, status } = req.query;
  let certList = Array.from(certificates.values());

  if (recipientId) certList = certList.filter(c => c.recipientId === recipientId);
  if (status) certList = certList.filter(c => c.status === status);

  res.json({
    success: true,
    count: certList.length,
    data: certList
  });
});

// Get certificate by ID
app.get('/api/v1/certificates/:id', (req, res) => {
  const certificate = certificates.get(req.params.id);

  if (!certificate) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  res.json({
    success: true,
    data: certificate
  });
});

// Verify certificate
app.post('/api/v1/certificates/verify', (req, res) => {
  const { verificationCode, certificateNumber } = req.body;

  const certificate = Array.from(certificates.values()).find(
    c => c.verificationCode === verificationCode || c.certificateNumber === certificateNumber
  );

  if (!certificate) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Certificate not found or invalid'
    });
  }

  const verification = {
    id: uuidv4(),
    certificateId: certificate.id,
    verifiedAt: new Date().toISOString(),
    status: 'verified'
  };

  verifications.set(verification.id, verification);

  res.json({
    success: true,
    verified: true,
    message: 'Certificate verified successfully',
    data: {
      certificate,
      verification
    }
  });
});

// Revoke certificate
app.post('/api/v1/certificates/:id/revoke', (req, res) => {
  const certificate = certificates.get(req.params.id);

  if (!certificate) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  certificate.status = 'revoked';
  certificate.revokedAt = new Date().toISOString();
  certificate.revokeReason = req.body.reason;

  certificates.set(certificate.id, certificate);

  res.json({
    success: true,
    message: 'Certificate revoked successfully',
    data: certificate
  });
});

// Download certificate
app.get('/api/v1/certificates/:id/download', (req, res) => {
  const certificate = certificates.get(req.params.id);

  if (!certificate) {
    return res.status(404).json({ success: false, message: 'Certificate not found' });
  }

  res.json({
    success: true,
    message: 'Certificate download link generated',
    data: {
      certificate,
      downloadUrl: `/downloads/certificates/${certificate.id}.pdf`,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
    }
  });
});

// Get verification history
app.get('/api/v1/certificates/:id/verifications', (req, res) => {
  const certificateVerifications = Array.from(verifications.values())
    .filter(v => v.certificateId === req.params.id);

  res.json({
    success: true,
    count: certificateVerifications.length,
    data: certificateVerifications
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎓 Certificate Service running on port ${PORT}\n`);
  });
}

module.exports = app;
