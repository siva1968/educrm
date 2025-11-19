const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.LEAD_MANAGEMENT_PORT || 4170;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const leads = new Map();
const activities = new Map();
const campaigns = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Lead Management Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Lead capture',
      'Lead scoring',
      'Lead nurturing',
      'Conversion tracking',
      'Campaign management'
    ]
  });
});

// Health check
app.get('/api/v1/leads/health', (req, res) => {
  res.json({ service: 'Lead Management', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create lead
app.post('/api/v1/leads', (req, res) => {
  const { name, email, phone, source, interest, program } = req.body;

  const lead = {
    id: uuidv4(),
    leadId: `LEAD-${Date.now()}`,
    name,
    email,
    phone,
    source, // website, referral, event, advertisement
    interest,
    program,
    score: 0,
    status: 'new',
    assignedTo: null,
    createdAt: new Date().toISOString()
  };

  leads.set(lead.id, lead);

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: lead
  });
});

// Get all leads
app.get('/api/v1/leads', (req, res) => {
  const { status, source, assignedTo } = req.query;
  let leadList = Array.from(leads.values());

  if (status) leadList = leadList.filter(l => l.status === status);
  if (source) leadList = leadList.filter(l => l.source === source);
  if (assignedTo) leadList = leadList.filter(l => l.assignedTo === assignedTo);

  res.json({
    success: true,
    count: leadList.length,
    data: leadList
  });
});

// Get lead by ID
app.get('/api/v1/leads/:id', (req, res) => {
  const lead = leads.get(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  res.json({
    success: true,
    data: lead
  });
});

// Update lead
app.put('/api/v1/leads/:id', (req, res) => {
  const lead = leads.get(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const updatedLead = { ...lead, ...req.body, updatedAt: new Date().toISOString() };
  leads.set(lead.id, updatedLead);

  res.json({
    success: true,
    message: 'Lead updated successfully',
    data: updatedLead
  });
});

// Assign lead
app.post('/api/v1/leads/:id/assign', (req, res) => {
  const lead = leads.get(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  lead.assignedTo = req.body.assignedTo;
  lead.assignedAt = new Date().toISOString();
  lead.status = 'assigned';

  leads.set(lead.id, lead);

  res.json({
    success: true,
    message: 'Lead assigned successfully',
    data: lead
  });
});

// Score lead
app.post('/api/v1/leads/:id/score', (req, res) => {
  const lead = leads.get(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const { score, reason } = req.body;
  lead.score = score;
  lead.scoreReason = reason;
  lead.scoredAt = new Date().toISOString();

  leads.set(lead.id, lead);

  res.json({
    success: true,
    message: 'Lead scored successfully',
    data: lead
  });
});

// Convert lead
app.post('/api/v1/leads/:id/convert', (req, res) => {
  const lead = leads.get(req.params.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  lead.status = 'converted';
  lead.convertedAt = new Date().toISOString();
  lead.studentId = req.body.studentId;

  leads.set(lead.id, lead);

  res.json({
    success: true,
    message: 'Lead converted successfully',
    data: lead
  });
});

// Add activity
app.post('/api/v1/leads/:leadId/activities', (req, res) => {
  const { type, description, performedBy } = req.body;

  const activity = {
    id: uuidv4(),
    leadId: req.params.leadId,
    type, // call, email, meeting, note
    description,
    performedBy,
    timestamp: new Date().toISOString()
  };

  activities.set(activity.id, activity);

  res.status(201).json({
    success: true,
    message: 'Activity added successfully',
    data: activity
  });
});

// Get lead activities
app.get('/api/v1/leads/:leadId/activities', (req, res) => {
  const leadActivities = Array.from(activities.values())
    .filter(a => a.leadId === req.params.leadId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    count: leadActivities.length,
    data: leadActivities
  });
});

// Create campaign
app.post('/api/v1/leads/campaigns', (req, res) => {
  const { name, type, startDate, endDate, target, budget } = req.body;

  const campaign = {
    id: uuidv4(),
    campaignId: `CAMP-${Date.now()}`,
    name,
    type, // email, sms, social-media, event
    startDate,
    endDate,
    target,
    budget,
    leadsGenerated: 0,
    conversions: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  campaigns.set(campaign.id, campaign);

  res.status(201).json({
    success: true,
    message: 'Campaign created successfully',
    data: campaign
  });
});

// Get all campaigns
app.get('/api/v1/leads/campaigns', (req, res) => {
  const { type, status } = req.query;
  let campaignList = Array.from(campaigns.values());

  if (type) campaignList = campaignList.filter(c => c.type === type);
  if (status) campaignList = campaignList.filter(c => c.status === status);

  res.json({
    success: true,
    count: campaignList.length,
    data: campaignList
  });
});

// Get lead statistics
app.get('/api/v1/leads/statistics', (req, res) => {
  const leadList = Array.from(leads.values());

  const statistics = {
    total: leadList.length,
    byStatus: {
      new: leadList.filter(l => l.status === 'new').length,
      assigned: leadList.filter(l => l.status === 'assigned').length,
      contacted: leadList.filter(l => l.status === 'contacted').length,
      qualified: leadList.filter(l => l.status === 'qualified').length,
      converted: leadList.filter(l => l.status === 'converted').length,
      lost: leadList.filter(l => l.status === 'lost').length
    },
    bySource: {},
    conversionRate: leadList.length > 0 ?
      ((leadList.filter(l => l.status === 'converted').length / leadList.length) * 100).toFixed(2) : 0
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎯 Lead Management Service running on port ${PORT}\n`);
  });
}

module.exports = app;
