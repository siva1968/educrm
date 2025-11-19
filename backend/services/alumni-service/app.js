const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.ALUMNI_PORT || 4173;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const alumni = new Map();
const events = new Map();
const donations = new Map();
const jobs = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Alumni Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Alumni directory',
      'Event management',
      'Networking platform',
      'Donation tracking',
      'Job board'
    ]
  });
});

// Health check
app.get('/api/v1/alumni/health', (req, res) => {
  res.json({ service: 'Alumni Service', status: 'healthy', timestamp: new Date().toISOString() });
});

// Register alumni
app.post('/api/v1/alumni/register', (req, res) => {
  const { name, email, phone, graduationYear, program, currentCompany, designation, location } = req.body;

  const alumnus = {
    id: uuidv4(),
    alumniId: `ALU-${Date.now()}`,
    name,
    email,
    phone,
    graduationYear,
    program,
    currentCompany,
    designation,
    location,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  alumni.set(alumnus.id, alumnus);

  res.status(201).json({
    success: true,
    message: 'Alumni registered successfully',
    data: alumnus
  });
});

// Get all alumni
app.get('/api/v1/alumni', (req, res) => {
  const { graduationYear, program, location } = req.query;
  let alumniList = Array.from(alumni.values());

  if (graduationYear) alumniList = alumniList.filter(a => a.graduationYear === parseInt(graduationYear));
  if (program) alumniList = alumniList.filter(a => a.program === program);
  if (location) alumniList = alumniList.filter(a => a.location === location);

  res.json({
    success: true,
    count: alumniList.length,
    data: alumniList
  });
});

// Get alumni by ID
app.get('/api/v1/alumni/:id', (req, res) => {
  const alumnus = alumni.get(req.params.id);

  if (!alumnus) {
    return res.status(404).json({ success: false, message: 'Alumni not found' });
  }

  res.json({
    success: true,
    data: alumnus
  });
});

// Update alumni profile
app.put('/api/v1/alumni/:id', (req, res) => {
  const alumnus = alumni.get(req.params.id);

  if (!alumnus) {
    return res.status(404).json({ success: false, message: 'Alumni not found' });
  }

  const updatedAlumnus = { ...alumnus, ...req.body, updatedAt: new Date().toISOString() };
  alumni.set(alumnus.id, updatedAlumnus);

  res.json({
    success: true,
    message: 'Alumni profile updated successfully',
    data: updatedAlumnus
  });
});

// Create event
app.post('/api/v1/alumni/events', (req, res) => {
  const { title, description, date, location, type, maxAttendees } = req.body;

  const event = {
    id: uuidv4(),
    eventId: `EVT-${Date.now()}`,
    title,
    description,
    date,
    location,
    type, // reunion, networking, seminar, workshop
    maxAttendees,
    registeredCount: 0,
    attendees: [],
    status: 'upcoming',
    createdAt: new Date().toISOString()
  };

  events.set(event.id, event);

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event
  });
});

// Get all events
app.get('/api/v1/alumni/events', (req, res) => {
  const { type, status } = req.query;
  let eventList = Array.from(events.values());

  if (type) eventList = eventList.filter(e => e.type === type);
  if (status) eventList = eventList.filter(e => e.status === status);

  res.json({
    success: true,
    count: eventList.length,
    data: eventList
  });
});

// Register for event
app.post('/api/v1/alumni/events/:eventId/register', (req, res) => {
  const event = events.get(req.params.eventId);

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (event.registeredCount >= event.maxAttendees) {
    return res.status(400).json({ success: false, message: 'Event is full' });
  }

  const { alumniId } = req.body;

  event.attendees.push({
    alumniId,
    registeredAt: new Date().toISOString(),
    status: 'registered'
  });
  event.registeredCount++;

  events.set(event.id, event);

  res.json({
    success: true,
    message: 'Registered for event successfully',
    data: event
  });
});

// Make donation
app.post('/api/v1/alumni/donations', (req, res) => {
  const { alumniId, amount, purpose, paymentMethod, transactionId } = req.body;

  const donation = {
    id: uuidv4(),
    donationId: `DON-${Date.now()}`,
    alumniId,
    amount,
    purpose, // scholarship, infrastructure, general
    paymentMethod,
    transactionId,
    status: 'completed',
    donatedAt: new Date().toISOString()
  };

  donations.set(donation.id, donation);

  res.status(201).json({
    success: true,
    message: 'Donation recorded successfully',
    data: donation
  });
});

// Get all donations
app.get('/api/v1/alumni/donations', (req, res) => {
  const { alumniId, purpose } = req.query;
  let donationList = Array.from(donations.values());

  if (alumniId) donationList = donationList.filter(d => d.alumniId === alumniId);
  if (purpose) donationList = donationList.filter(d => d.purpose === purpose);

  res.json({
    success: true,
    count: donationList.length,
    totalAmount: donationList.reduce((sum, d) => sum + d.amount, 0),
    data: donationList
  });
});

// Post job
app.post('/api/v1/alumni/jobs', (req, res) => {
  const { title, company, location, description, requirements, postedBy } = req.body;

  const job = {
    id: uuidv4(),
    jobId: `JOB-${Date.now()}`,
    title,
    company,
    location,
    description,
    requirements,
    postedBy,
    applications: [],
    status: 'active',
    postedAt: new Date().toISOString()
  };

  jobs.set(job.id, job);

  res.status(201).json({
    success: true,
    message: 'Job posted successfully',
    data: job
  });
});

// Get all jobs
app.get('/api/v1/alumni/jobs', (req, res) => {
  const { location, status } = req.query;
  let jobList = Array.from(jobs.values());

  if (location) jobList = jobList.filter(j => j.location === location);
  if (status) jobList = jobList.filter(j => j.status === status);

  res.json({
    success: true,
    count: jobList.length,
    data: jobList
  });
});

// Apply for job
app.post('/api/v1/alumni/jobs/:jobId/apply', (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }

  const { alumniId, resume, coverLetter } = req.body;

  job.applications.push({
    alumniId,
    resume,
    coverLetter,
    appliedAt: new Date().toISOString(),
    status: 'submitted'
  });

  jobs.set(job.id, job);

  res.json({
    success: true,
    message: 'Application submitted successfully',
    data: job
  });
});

// Get alumni statistics
app.get('/api/v1/alumni/statistics', (req, res) => {
  const alumniList = Array.from(alumni.values());

  const statistics = {
    totalAlumni: alumniList.length,
    byYear: {},
    byProgram: {},
    upcomingEvents: Array.from(events.values()).filter(e => e.status === 'upcoming').length,
    totalDonations: donations.size,
    totalDonationAmount: Array.from(donations.values()).reduce((sum, d) => sum + d.amount, 0),
    activeJobs: Array.from(jobs.values()).filter(j => j.status === 'active').length
  };

  res.json({
    success: true,
    data: statistics
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎓 Alumni Service running on port ${PORT}\n`);
  });
}

module.exports = app;
