const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.TRANSPORT_SAFETY_PORT || 4151;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const safetyProtocols = new Map();
const incidents = new Map();
const complianceRecords = new Map();
const safetyInspections = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Transport Safety Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Safety protocol management',
      'Incident reporting',
      'Compliance tracking',
      'Safety inspections',
      'Emergency response'
    ]
  });
});

// Health check
app.get('/api/v1/transport-safety/health', (req, res) => {
  res.json({ service: 'Transport Safety', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create safety protocol
app.post('/api/v1/transport-safety/protocols', (req, res) => {
  const { title, description, category, procedures, status } = req.body;

  const protocol = {
    id: uuidv4(),
    protocolId: `PROT-${Date.now()}`,
    title,
    description,
    category,
    procedures,
    status: status || 'active',
    createdAt: new Date().toISOString()
  };

  safetyProtocols.set(protocol.id, protocol);

  res.status(201).json({
    success: true,
    message: 'Safety protocol created successfully',
    data: protocol
  });
});

// Get all protocols
app.get('/api/v1/transport-safety/protocols', (req, res) => {
  const { category, status } = req.query;
  let protocolList = Array.from(safetyProtocols.values());

  if (category) protocolList = protocolList.filter(p => p.category === category);
  if (status) protocolList = protocolList.filter(p => p.status === status);

  res.json({
    success: true,
    count: protocolList.length,
    data: protocolList
  });
});

// Report incident
app.post('/api/v1/transport-safety/incidents', (req, res) => {
  const { vehicleId, driverId, incidentType, severity, description, location, reportedBy } = req.body;

  const incident = {
    id: uuidv4(),
    incidentId: `INC-${Date.now()}`,
    vehicleId,
    driverId,
    incidentType, // accident, breakdown, violation
    severity, // low, medium, high, critical
    description,
    location,
    reportedBy,
    status: 'reported',
    reportedAt: new Date().toISOString()
  };

  incidents.set(incident.id, incident);

  res.status(201).json({
    success: true,
    message: 'Incident reported successfully',
    data: incident
  });
});

// Get all incidents
app.get('/api/v1/transport-safety/incidents', (req, res) => {
  const { vehicleId, driverId, incidentType, severity, status } = req.query;
  let incidentList = Array.from(incidents.values());

  if (vehicleId) incidentList = incidentList.filter(i => i.vehicleId === vehicleId);
  if (driverId) incidentList = incidentList.filter(i => i.driverId === driverId);
  if (incidentType) incidentList = incidentList.filter(i => i.incidentType === incidentType);
  if (severity) incidentList = incidentList.filter(i => i.severity === severity);
  if (status) incidentList = incidentList.filter(i => i.status === status);

  res.json({
    success: true,
    count: incidentList.length,
    data: incidentList
  });
});

// Update incident
app.put('/api/v1/transport-safety/incidents/:id', (req, res) => {
  const incident = incidents.get(req.params.id);

  if (!incident) {
    return res.status(404).json({ success: false, message: 'Incident not found' });
  }

  const updatedIncident = { ...incident, ...req.body, updatedAt: new Date().toISOString() };
  incidents.set(incident.id, updatedIncident);

  res.json({
    success: true,
    message: 'Incident updated successfully',
    data: updatedIncident
  });
});

// Close incident
app.post('/api/v1/transport-safety/incidents/:id/close', (req, res) => {
  const incident = incidents.get(req.params.id);

  if (!incident) {
    return res.status(404).json({ success: false, message: 'Incident not found' });
  }

  incident.status = 'closed';
  incident.resolution = req.body.resolution;
  incident.closedAt = new Date().toISOString();
  incident.closedBy = req.body.closedBy;

  incidents.set(incident.id, incident);

  res.json({
    success: true,
    message: 'Incident closed successfully',
    data: incident
  });
});

// Create compliance record
app.post('/api/v1/transport-safety/compliance', (req, res) => {
  const { vehicleId, complianceType, issuedDate, expiryDate, certificateNumber } = req.body;

  const compliance = {
    id: uuidv4(),
    complianceId: `COMP-${Date.now()}`,
    vehicleId,
    complianceType, // insurance, fitness, pollution, permit
    issuedDate,
    expiryDate,
    certificateNumber,
    status: 'valid',
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
app.get('/api/v1/transport-safety/compliance', (req, res) => {
  const { vehicleId, complianceType, status } = req.query;
  let complianceList = Array.from(complianceRecords.values());

  if (vehicleId) complianceList = complianceList.filter(c => c.vehicleId === vehicleId);
  if (complianceType) complianceList = complianceList.filter(c => c.complianceType === complianceType);
  if (status) complianceList = complianceList.filter(c => c.status === status);

  res.json({
    success: true,
    count: complianceList.length,
    data: complianceList
  });
});

// Get expiring compliance records
app.get('/api/v1/transport-safety/compliance/expiring', (req, res) => {
  const { days = 30 } = req.query;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + parseInt(days));

  const expiringRecords = Array.from(complianceRecords.values())
    .filter(c => {
      const expiryDate = new Date(c.expiryDate);
      return expiryDate <= futureDate && expiryDate >= new Date() && c.status === 'valid';
    });

  res.json({
    success: true,
    count: expiringRecords.length,
    data: expiringRecords
  });
});

// Create safety inspection
app.post('/api/v1/transport-safety/inspections', (req, res) => {
  const { vehicleId, inspectorName, checkpoints, overallStatus, remarks } = req.body;

  const inspection = {
    id: uuidv4(),
    inspectionId: `INS-${Date.now()}`,
    vehicleId,
    inspectorName,
    checkpoints, // [{ item, status, remarks }]
    overallStatus, // passed, failed, conditional
    remarks,
    inspectedAt: new Date().toISOString()
  };

  safetyInspections.set(inspection.id, inspection);

  res.status(201).json({
    success: true,
    message: 'Safety inspection recorded successfully',
    data: inspection
  });
});

// Get all inspections
app.get('/api/v1/transport-safety/inspections', (req, res) => {
  const { vehicleId, overallStatus } = req.query;
  let inspectionList = Array.from(safetyInspections.values());

  if (vehicleId) inspectionList = inspectionList.filter(i => i.vehicleId === vehicleId);
  if (overallStatus) inspectionList = inspectionList.filter(i => i.overallStatus === overallStatus);

  res.json({
    success: true,
    count: inspectionList.length,
    data: inspectionList
  });
});

// Get safety statistics
app.get('/api/v1/transport-safety/statistics', (req, res) => {
  const { vehicleId } = req.query;
  let incidentList = Array.from(incidents.values());

  if (vehicleId) incidentList = incidentList.filter(i => i.vehicleId === vehicleId);

  const statistics = {
    totalIncidents: incidentList.length,
    bySeverity: {
      low: incidentList.filter(i => i.severity === 'low').length,
      medium: incidentList.filter(i => i.severity === 'medium').length,
      high: incidentList.filter(i => i.severity === 'high').length,
      critical: incidentList.filter(i => i.severity === 'critical').length
    },
    byType: {
      accident: incidentList.filter(i => i.incidentType === 'accident').length,
      breakdown: incidentList.filter(i => i.incidentType === 'breakdown').length,
      violation: incidentList.filter(i => i.incidentType === 'violation').length
    },
    byStatus: {
      reported: incidentList.filter(i => i.status === 'reported').length,
      investigating: incidentList.filter(i => i.status === 'investigating').length,
      closed: incidentList.filter(i => i.status === 'closed').length
    }
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚨 Transport Safety Service running on port ${PORT}\n`);
  });
}

module.exports = app;
