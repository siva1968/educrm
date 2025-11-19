const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.LEARNER_PROFILE_PORT || 4103;

app.use(helmet());
app.use(cors());
app.use(express.json());

const profiles = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Learner Profile Service',
    version: '1.0.0',
    features: ['Learning styles', 'Strengths/weaknesses', 'Interests', 'Goals', 'Progress tracking', 'Skills assessment']
  });
});

app.get('/api/v1/profile/health', (req, res) => {
  res.json({ service: 'Learner Profile', status: 'healthy' });
});

app.post('/api/v1/profile/create', (req, res) => {
  const { studentId, learningStyle, interests, goals, strengths, weaknesses } = req.body;

  const profile = {
    profileId: uuidv4(),
    studentId,
    learningStyle, // visual, auditory, kinesthetic, reading/writing
    interests: interests || [],
    goals: goals || [],
    strengths: strengths || [],
    weaknesses: weaknesses || [],
    skills: [],
    assessments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  profiles.set(profile.profileId, profile);

  res.status(201).json({
    success: true,
    message: 'Learner profile created successfully',
    data: profile
  });
});

app.get('/api/v1/profile/student/:studentId', (req, res) => {
  const profile = Array.from(profiles.values())
    .find(p => p.studentId === req.params.studentId);

  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found' });
  }

  res.json({ success: true, data: profile });
});

app.put('/api/v1/profile/:profileId', (req, res) => {
  const profile = profiles.get(req.params.profileId);

  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found' });
  }

  const updated = { ...profile, ...req.body, updatedAt: new Date().toISOString() };
  profiles.set(req.params.profileId, updated);

  res.json({ success: true, message: 'Profile updated', data: updated });
});

app.post('/api/v1/profile/:profileId/skill', (req, res) => {
  const profile = profiles.get(req.params.profileId);

  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found' });
  }

  const skill = {
    skillId: uuidv4(),
    name: req.body.name,
    level: req.body.level, // beginner, intermediate, advanced, expert
    assessedAt: new Date().toISOString()
  };

  profile.skills.push(skill);
  profiles.set(req.params.profileId, profile);

  res.status(201).json({ success: true, message: 'Skill added', data: skill });
});

app.get('/api/v1/profile/:profileId/recommendations', (req, res) => {
  const profile = profiles.get(req.params.profileId);

  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found' });
  }

  const recommendations = {
    learningResources: profile.interests.map(i => `Resources for ${i}`),
    courses: profile.weaknesses.map(w => `Improvement course for ${w}`),
    activities: profile.learningStyle ? [`Activities suited for ${profile.learningStyle} learners`] : []
  };

  res.json({ success: true, data: recommendations });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n👤 Learner Profile Service running on port ${PORT}\n`);
  });
}

module.exports = app;
