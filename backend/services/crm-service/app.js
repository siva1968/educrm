const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.CRM_PORT || 4172;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const contacts = new Map();
const interactions = new Map();
const campaigns = new Map();
const pipelines = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'CRM Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Contact management',
      'Interaction history',
      'Campaign management',
      'Sales pipeline',
      'Relationship tracking'
    ]
  });
});

// Health check
app.get('/api/v1/crm/health', (req, res) => {
  res.json({ service: 'CRM Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create contact
app.post('/api/v1/crm/contacts', (req, res) => {
  const { name, email, phone, company, designation, tags, customFields } = req.body;

  const contact = {
    id: uuidv4(),
    contactId: `CON-${Date.now()}`,
    name,
    email,
    phone,
    company,
    designation,
    tags: tags || [],
    customFields: customFields || {},
    status: 'active',
    createdAt: new Date().toISOString()
  };

  contacts.set(contact.id, contact);

  res.status(201).json({
    success: true,
    message: 'Contact created successfully',
    data: contact
  });
});

// Get all contacts
app.get('/api/v1/crm/contacts', (req, res) => {
  const { status, tag } = req.query;
  let contactList = Array.from(contacts.values());

  if (status) contactList = contactList.filter(c => c.status === status);
  if (tag) contactList = contactList.filter(c => c.tags.includes(tag));

  res.json({
    success: true,
    count: contactList.length,
    data: contactList
  });
});

// Get contact by ID
app.get('/api/v1/crm/contacts/:id', (req, res) => {
  const contact = contacts.get(req.params.id);

  if (!contact) {
    return res.status(404).json({ success: false, message: 'Contact not found' });
  }

  res.json({
    success: true,
    data: contact
  });
});

// Update contact
app.put('/api/v1/crm/contacts/:id', (req, res) => {
  const contact = contacts.get(req.params.id);

  if (!contact) {
    return res.status(404).json({ success: false, message: 'Contact not found' });
  }

  const updatedContact = { ...contact, ...req.body, updatedAt: new Date().toISOString() };
  contacts.set(contact.id, updatedContact);

  res.json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedContact
  });
});

// Add interaction
app.post('/api/v1/crm/interactions', (req, res) => {
  const { contactId, type, subject, description, performedBy } = req.body;

  const interaction = {
    id: uuidv4(),
    contactId,
    type, // call, email, meeting, note
    subject,
    description,
    performedBy,
    timestamp: new Date().toISOString()
  };

  interactions.set(interaction.id, interaction);

  res.status(201).json({
    success: true,
    message: 'Interaction recorded successfully',
    data: interaction
  });
});

// Get contact interactions
app.get('/api/v1/crm/contacts/:contactId/interactions', (req, res) => {
  const { type } = req.query;
  let interactionList = Array.from(interactions.values())
    .filter(i => i.contactId === req.params.contactId);

  if (type) interactionList = interactionList.filter(i => i.type === type);

  interactionList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    count: interactionList.length,
    data: interactionList
  });
});

// Create campaign
app.post('/api/v1/crm/campaigns', (req, res) => {
  const { name, type, targetAudience, startDate, endDate, budget, goals } = req.body;

  const campaign = {
    id: uuidv4(),
    campaignId: `CAMP-${Date.now()}`,
    name,
    type, // email, sms, social, event
    targetAudience,
    startDate,
    endDate,
    budget,
    goals,
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    status: 'draft',
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
app.get('/api/v1/crm/campaigns', (req, res) => {
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

// Launch campaign
app.post('/api/v1/crm/campaigns/:id/launch', (req, res) => {
  const campaign = campaigns.get(req.params.id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  campaign.status = 'active';
  campaign.launchedAt = new Date().toISOString();

  campaigns.set(campaign.id, campaign);

  res.json({
    success: true,
    message: 'Campaign launched successfully',
    data: campaign
  });
});

// Create pipeline
app.post('/api/v1/crm/pipelines', (req, res) => {
  const { contactId, stage, value, expectedCloseDate, probability } = req.body;

  const pipeline = {
    id: uuidv4(),
    pipelineId: `PIPE-${Date.now()}`,
    contactId,
    stage, // lead, qualified, proposal, negotiation, closed-won, closed-lost
    value,
    expectedCloseDate,
    probability,
    createdAt: new Date().toISOString()
  };

  pipelines.set(pipeline.id, pipeline);

  res.status(201).json({
    success: true,
    message: 'Pipeline entry created successfully',
    data: pipeline
  });
});

// Get all pipelines
app.get('/api/v1/crm/pipelines', (req, res) => {
  const { stage, contactId } = req.query;
  let pipelineList = Array.from(pipelines.values());

  if (stage) pipelineList = pipelineList.filter(p => p.stage === stage);
  if (contactId) pipelineList = pipelineList.filter(p => p.contactId === contactId);

  res.json({
    success: true,
    count: pipelineList.length,
    data: pipelineList
  });
});

// Update pipeline stage
app.put('/api/v1/crm/pipelines/:id/stage', (req, res) => {
  const pipeline = pipelines.get(req.params.id);

  if (!pipeline) {
    return res.status(404).json({ success: false, message: 'Pipeline not found' });
  }

  pipeline.stage = req.body.stage;
  pipeline.updatedAt = new Date().toISOString();

  if (req.body.stage === 'closed-won' || req.body.stage === 'closed-lost') {
    pipeline.closedAt = new Date().toISOString();
  }

  pipelines.set(pipeline.id, pipeline);

  res.json({
    success: true,
    message: 'Pipeline stage updated successfully',
    data: pipeline
  });
});

// Get CRM statistics
app.get('/api/v1/crm/statistics', (req, res) => {
  const statistics = {
    totalContacts: contacts.size,
    activeContacts: Array.from(contacts.values()).filter(c => c.status === 'active').length,
    totalInteractions: interactions.size,
    totalCampaigns: campaigns.size,
    activeCampaigns: Array.from(campaigns.values()).filter(c => c.status === 'active').length,
    pipelineValue: Array.from(pipelines.values())
      .filter(p => p.stage !== 'closed-lost')
      .reduce((sum, p) => sum + p.value, 0)
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🤝 CRM Service running on port ${PORT}\n`);
  });
}

module.exports = app;
