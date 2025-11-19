const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.DYNAMIC_FORMS_PORT || 4161;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const forms = new Map();
const submissions = new Map();
const workflows = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Dynamic Forms Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Dynamic form builder',
      'Form submissions',
      'Field validation',
      'Workflow automation',
      'Form analytics'
    ]
  });
});

// Health check
app.get('/api/v1/forms/health', (req, res) => {
  res.json({ service: 'Dynamic Forms', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create form
app.post('/api/v1/forms', (req, res) => {
  const { title, description, fields, settings } = req.body;

  const form = {
    id: uuidv4(),
    formId: `FORM-${Date.now()}`,
    title,
    description,
    fields, // [{ name, type, label, required, validation }]
    settings: settings || { allowMultipleSubmissions: false },
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  forms.set(form.id, form);

  res.status(201).json({
    success: true,
    message: 'Form created successfully',
    data: form
  });
});

// Get all forms
app.get('/api/v1/forms', (req, res) => {
  const { status } = req.query;
  let formList = Array.from(forms.values());

  if (status) formList = formList.filter(f => f.status === status);

  res.json({
    success: true,
    count: formList.length,
    data: formList
  });
});

// Get form by ID
app.get('/api/v1/forms/:id', (req, res) => {
  const form = forms.get(req.params.id);

  if (!form) {
    return res.status(404).json({ success: false, message: 'Form not found' });
  }

  res.json({
    success: true,
    data: form
  });
});

// Update form
app.put('/api/v1/forms/:id', (req, res) => {
  const form = forms.get(req.params.id);

  if (!form) {
    return res.status(404).json({ success: false, message: 'Form not found' });
  }

  const updatedForm = { ...form, ...req.body, updatedAt: new Date().toISOString() };
  forms.set(form.id, updatedForm);

  res.json({
    success: true,
    message: 'Form updated successfully',
    data: updatedForm
  });
});

// Publish form
app.post('/api/v1/forms/:id/publish', (req, res) => {
  const form = forms.get(req.params.id);

  if (!form) {
    return res.status(404).json({ success: false, message: 'Form not found' });
  }

  form.status = 'published';
  form.publishedAt = new Date().toISOString();

  forms.set(form.id, form);

  res.json({
    success: true,
    message: 'Form published successfully',
    data: form
  });
});

// Submit form
app.post('/api/v1/forms/:formId/submit', (req, res) => {
  const form = forms.get(req.params.formId);

  if (!form) {
    return res.status(404).json({ success: false, message: 'Form not found' });
  }

  if (form.status !== 'published') {
    return res.status(400).json({ success: false, message: 'Form is not published' });
  }

  const { data, submittedBy } = req.body;

  // Basic validation
  const errors = [];
  form.fields.forEach(field => {
    if (field.required && !data[field.name]) {
      errors.push(`${field.label} is required`);
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  const submission = {
    id: uuidv4(),
    submissionId: `SUB-${Date.now()}`,
    formId: form.id,
    data,
    submittedBy,
    status: 'submitted',
    submittedAt: new Date().toISOString()
  };

  submissions.set(submission.id, submission);

  res.status(201).json({
    success: true,
    message: 'Form submitted successfully',
    data: submission
  });
});

// Get form submissions
app.get('/api/v1/forms/:formId/submissions', (req, res) => {
  const { status } = req.query;
  let submissionList = Array.from(submissions.values())
    .filter(s => s.formId === req.params.formId);

  if (status) submissionList = submissionList.filter(s => s.status === status);

  res.json({
    success: true,
    count: submissionList.length,
    data: submissionList
  });
});

// Get submission by ID
app.get('/api/v1/forms/submissions/:id', (req, res) => {
  const submission = submissions.get(req.params.id);

  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }

  res.json({
    success: true,
    data: submission
  });
});

// Update submission status
app.put('/api/v1/forms/submissions/:id/status', (req, res) => {
  const submission = submissions.get(req.params.id);

  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }

  submission.status = req.body.status;
  submission.updatedAt = new Date().toISOString();

  submissions.set(submission.id, submission);

  res.json({
    success: true,
    message: 'Submission status updated successfully',
    data: submission
  });
});

// Create workflow
app.post('/api/v1/forms/workflows', (req, res) => {
  const { formId, name, triggers, actions } = req.body;

  const workflow = {
    id: uuidv4(),
    workflowId: `WF-${Date.now()}`,
    formId,
    name,
    triggers, // [{ event, condition }]
    actions, // [{ type, config }]
    status: 'active',
    createdAt: new Date().toISOString()
  };

  workflows.set(workflow.id, workflow);

  res.status(201).json({
    success: true,
    message: 'Workflow created successfully',
    data: workflow
  });
});

// Get all workflows
app.get('/api/v1/forms/workflows', (req, res) => {
  const { formId, status } = req.query;
  let workflowList = Array.from(workflows.values());

  if (formId) workflowList = workflowList.filter(w => w.formId === formId);
  if (status) workflowList = workflowList.filter(w => w.status === status);

  res.json({
    success: true,
    count: workflowList.length,
    data: workflowList
  });
});

// Get form analytics
app.get('/api/v1/forms/:formId/analytics', (req, res) => {
  const form = forms.get(req.params.formId);

  if (!form) {
    return res.status(404).json({ success: false, message: 'Form not found' });
  }

  const formSubmissions = Array.from(submissions.values())
    .filter(s => s.formId === req.params.formId);

  const analytics = {
    totalSubmissions: formSubmissions.length,
    byStatus: {
      submitted: formSubmissions.filter(s => s.status === 'submitted').length,
      approved: formSubmissions.filter(s => s.status === 'approved').length,
      rejected: formSubmissions.filter(s => s.status === 'rejected').length
    },
    averageSubmissionsPerDay: 0 // Would calculate based on date range
  };

  res.json({
    success: true,
    data: analytics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📝 Dynamic Forms Service running on port ${PORT}\n`);
  });
}

module.exports = app;
