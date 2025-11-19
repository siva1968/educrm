const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.ECA_SPORTS_PORT || 4180;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock database
const activities = new Map();
const registrations = new Map();
const tournaments = new Map();
const matches = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'ECA & Sports Service',
    version: '1.0.0',
    status: 'Active',
    features: [
      'Activity management',
      'Sports registration',
      'Tournament organization',
      'Match scorekeeping',
      'Leaderboards'
    ]
  });
});

// Health check
app.get('/api/v1/eca-sports/health', (req, res) => {
  res.json({ service: 'ECA & Sports', status: 'healthy', timestamp: new Date().toISOString() });
});

// Create activity
app.post('/api/v1/eca-sports/activities', (req, res) => {
  const { name, type, description, schedule, instructor, capacity } = req.body;

  const activity = {
    id: uuidv4(),
    activityId: `ACT-${Date.now()}`,
    name,
    type, // sports, arts, music, clubs
    description,
    schedule,
    instructor,
    capacity,
    enrolled: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  activities.set(activity.id, activity);

  res.status(201).json({
    success: true,
    message: 'Activity created successfully',
    data: activity
  });
});

// Get all activities
app.get('/api/v1/eca-sports/activities', (req, res) => {
  const { type, status } = req.query;
  let activityList = Array.from(activities.values());

  if (type) activityList = activityList.filter(a => a.type === type);
  if (status) activityList = activityList.filter(a => a.status === status);

  res.json({
    success: true,
    count: activityList.length,
    data: activityList
  });
});

// Register for activity
app.post('/api/v1/eca-sports/registrations', (req, res) => {
  const { activityId, studentId, studentName } = req.body;

  const activity = activities.get(activityId);
  if (!activity) {
    return res.status(404).json({ success: false, message: 'Activity not found' });
  }

  if (activity.enrolled >= activity.capacity) {
    return res.status(400).json({ success: false, message: 'Activity is full' });
  }

  const registration = {
    id: uuidv4(),
    registrationId: `REG-${Date.now()}`,
    activityId,
    studentId,
    studentName,
    status: 'active',
    registeredAt: new Date().toISOString()
  };

  registrations.set(registration.id, registration);

  activity.enrolled++;
  activities.set(activity.id, activity);

  res.status(201).json({
    success: true,
    message: 'Registered for activity successfully',
    data: registration
  });
});

// Get registrations
app.get('/api/v1/eca-sports/registrations', (req, res) => {
  const { activityId, studentId } = req.query;
  let registrationList = Array.from(registrations.values());

  if (activityId) registrationList = registrationList.filter(r => r.activityId === activityId);
  if (studentId) registrationList = registrationList.filter(r => r.studentId === studentId);

  res.json({
    success: true,
    count: registrationList.length,
    data: registrationList
  });
});

// Create tournament
app.post('/api/v1/eca-sports/tournaments', (req, res) => {
  const { name, sport, startDate, endDate, format, teams } = req.body;

  const tournament = {
    id: uuidv4(),
    tournamentId: `TOUR-${Date.now()}`,
    name,
    sport,
    startDate,
    endDate,
    format, // knockout, league, round-robin
    teams: teams || [],
    status: 'upcoming',
    createdAt: new Date().toISOString()
  };

  tournaments.set(tournament.id, tournament);

  res.status(201).json({
    success: true,
    message: 'Tournament created successfully',
    data: tournament
  });
});

// Get all tournaments
app.get('/api/v1/eca-sports/tournaments', (req, res) => {
  const { sport, status } = req.query;
  let tournamentList = Array.from(tournaments.values());

  if (sport) tournamentList = tournamentList.filter(t => t.sport === sport);
  if (status) tournamentList = tournamentList.filter(t => t.status === status);

  res.json({
    success: true,
    count: tournamentList.length,
    data: tournamentList
  });
});

// Create match
app.post('/api/v1/eca-sports/matches', (req, res) => {
  const { tournamentId, team1, team2, date, venue } = req.body;

  const match = {
    id: uuidv4(),
    matchId: `MATCH-${Date.now()}`,
    tournamentId,
    team1,
    team2,
    date,
    venue,
    score: { team1: 0, team2: 0 },
    winner: null,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  matches.set(match.id, match);

  res.status(201).json({
    success: true,
    message: 'Match created successfully',
    data: match
  });
});

// Get all matches
app.get('/api/v1/eca-sports/matches', (req, res) => {
  const { tournamentId, status } = req.query;
  let matchList = Array.from(matches.values());

  if (tournamentId) matchList = matchList.filter(m => m.tournamentId === tournamentId);
  if (status) matchList = matchList.filter(m => m.status === status);

  res.json({
    success: true,
    count: matchList.length,
    data: matchList
  });
});

// Update match score
app.put('/api/v1/eca-sports/matches/:id/score', (req, res) => {
  const match = matches.get(req.params.id);

  if (!match) {
    return res.status(404).json({ success: false, message: 'Match not found' });
  }

  match.score = req.body.score;
  match.updatedAt = new Date().toISOString();

  matches.set(match.id, match);

  res.json({
    success: true,
    message: 'Match score updated successfully',
    data: match
  });
});

// Complete match
app.post('/api/v1/eca-sports/matches/:id/complete', (req, res) => {
  const match = matches.get(req.params.id);

  if (!match) {
    return res.status(404).json({ success: false, message: 'Match not found' });
  }

  const { winner, finalScore } = req.body;

  match.score = finalScore;
  match.winner = winner;
  match.status = 'completed';
  match.completedAt = new Date().toISOString();

  matches.set(match.id, match);

  res.json({
    success: true,
    message: 'Match completed successfully',
    data: match
  });
});

// Get leaderboard
app.get('/api/v1/eca-sports/tournaments/:tournamentId/leaderboard', (req, res) => {
  const tournament = tournaments.get(req.params.tournamentId);

  if (!tournament) {
    return res.status(404).json({ success: false, message: 'Tournament not found' });
  }

  const tournamentMatches = Array.from(matches.values())
    .filter(m => m.tournamentId === req.params.tournamentId && m.status === 'completed');

  const teamStats = {};

  tournamentMatches.forEach(match => {
    if (!teamStats[match.team1]) teamStats[match.team1] = { wins: 0, losses: 0, points: 0 };
    if (!teamStats[match.team2]) teamStats[match.team2] = { wins: 0, losses: 0, points: 0 };

    if (match.winner === match.team1) {
      teamStats[match.team1].wins++;
      teamStats[match.team1].points += 3;
      teamStats[match.team2].losses++;
    } else if (match.winner === match.team2) {
      teamStats[match.team2].wins++;
      teamStats[match.team2].points += 3;
      teamStats[match.team1].losses++;
    }
  });

  const leaderboard = Object.entries(teamStats)
    .map(([team, stats]) => ({ team, ...stats }))
    .sort((a, b) => b.points - a.points);

  res.json({
    success: true,
    data: leaderboard
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n⚽ ECA & Sports Service running on port ${PORT}\n`);
  });
}

module.exports = app;
