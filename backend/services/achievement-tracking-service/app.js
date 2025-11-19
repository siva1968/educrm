const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.ACHIEVEMENT_PORT || 4105;

app.use(helmet());
app.use(cors());
app.use(express.json());

const achievements = new Map();
const badges = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Achievement Tracking Service',
    version: '1.0.0',
    features: ['Awards tracking', 'Badges & medals', 'Competition results', 'Certificates', 'Milestone tracking']
  });
});

app.get('/api/v1/achievement/health', (req, res) => {
  res.json({ service: 'Achievement Tracking', status: 'healthy' });
});

app.post('/api/v1/achievement/add', (req, res) => {
  const { studentId, title, category, description, awardedBy, date, level } = req.body;

  const achievement = {
    achievementId: uuidv4(),
    studentId,
    title,
    category, // academic, sports, arts, leadership, community
    description,
    awardedBy,
    date: date || new Date().toISOString(),
    level, // school, district, state, national, international
    verified: false,
    createdAt: new Date().toISOString()
  };

  achievements.set(achievement.achievementId, achievement);

  res.status(201).json({
    success: true,
    message: 'Achievement added successfully',
    data: achievement
  });
});

app.get('/api/v1/achievement/student/:studentId', (req, res) => {
  const { category, level } = req.query;

  let studentAchievements = Array.from(achievements.values())
    .filter(a => a.studentId === req.params.studentId);

  if (category) {
    studentAchievements = studentAchievements.filter(a => a.category === category);
  }
  if (level) {
    studentAchievements = studentAchievements.filter(a => a.level === level);
  }

  res.json({
    success: true,
    data: {
      studentId: req.params.studentId,
      totalAchievements: studentAchievements.length,
      achievements: studentAchievements
    }
  });
});

app.put('/api/v1/achievement/:achievementId/verify', (req, res) => {
  const achievement = achievements.get(req.params.achievementId);

  if (!achievement) {
    return res.status(404).json({ success: false, message: 'Achievement not found' });
  }

  achievement.verified = true;
  achievement.verifiedAt = new Date().toISOString();
  achievement.verifiedBy = req.body.verifiedBy;
  achievements.set(req.params.achievementId, achievement);

  res.json({ success: true, message: 'Achievement verified', data: achievement });
});

app.post('/api/v1/achievement/badge/award', (req, res) => {
  const { studentId, badgeName, badgeType, criteria } = req.body;

  const badge = {
    badgeId: uuidv4(),
    studentId,
    badgeName,
    badgeType, // gold, silver, bronze
    criteria,
    awardedAt: new Date().toISOString()
  };

  badges.set(badge.badgeId, badge);

  res.status(201).json({
    success: true,
    message: 'Badge awarded successfully',
    data: badge
  });
});

app.get('/api/v1/achievement/badge/student/:studentId', (req, res) => {
  const studentBadges = Array.from(badges.values())
    .filter(b => b.studentId === req.params.studentId);

  res.json({
    success: true,
    data: {
      studentId: req.params.studentId,
      totalBadges: studentBadges.length,
      badges: studentBadges
    }
  });
});

app.get('/api/v1/achievement/leaderboard', (req, res) => {
  const { category, limit = 10 } = req.query;

  const studentCounts = new Map();

  let filteredAchievements = Array.from(achievements.values());
  if (category) {
    filteredAchievements = filteredAchievements.filter(a => a.category === category);
  }

  filteredAchievements.forEach(achievement => {
    const count = studentCounts.get(achievement.studentId) || 0;
    studentCounts.set(achievement.studentId, count + 1);
  });

  const leaderboard = Array.from(studentCounts.entries())
    .map(([studentId, count]) => ({ studentId, achievementCount: count }))
    .sort((a, b) => b.achievementCount - a.achievementCount)
    .slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      category: category || 'all',
      leaderboard
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🏆 Achievement Tracking Service running on port ${PORT}\n`);
  });
}

module.exports = app;
