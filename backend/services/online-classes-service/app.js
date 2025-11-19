const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.ONLINE_CLASSES_PORT || 4117;

app.use(helmet());
app.use(cors());
app.use(express.json());

const classes = new Map();
const recordings = new Map();
const attendance = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Online Classes Service',
    version: '1.0.0',
    features: ['Virtual classroom', 'Video conferencing integration', 'Screen sharing', 'Recording', 'Attendance tracking', 'Chat/Q&A']
  });
});

app.get('/api/v1/online-class/health', (req, res) => {
  res.json({ service: 'Online Classes', status: 'healthy' });
});

app.post('/api/v1/online-class/schedule', (req, res) => {
  const { title, subject, teacherId, startTime, duration, meetingLink, platform } = req.body;
  const onlineClass = {
    classId: uuidv4(),
    title,
    subject,
    teacherId,
    startTime,
    duration,
    meetingLink,
    platform, // zoom, teams, meet, webex
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };
  classes.set(onlineClass.classId, onlineClass);
  res.status(201).json({ success: true, data: onlineClass });
});

app.post('/api/v1/online-class/:classId/start', (req, res) => {
  const onlineClass = classes.get(req.params.classId);
  if (!onlineClass) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  onlineClass.status = 'live';
  onlineClass.startedAt = new Date().toISOString();
  classes.set(req.params.classId, onlineClass);
  res.json({ success: true, data: onlineClass });
});

app.post('/api/v1/online-class/:classId/end', (req, res) => {
  const onlineClass = classes.get(req.params.classId);
  if (!onlineClass) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  onlineClass.status = 'completed';
  onlineClass.endedAt = new Date().toISOString();
  classes.set(req.params.classId, onlineClass);
  res.json({ success: true, data: onlineClass });
});

app.post('/api/v1/online-class/:classId/recording', (req, res) => {
  const { recordingUrl, duration } = req.body;
  const recording = {
    recordingId: uuidv4(),
    classId: req.params.classId,
    recordingUrl,
    duration,
    createdAt: new Date().toISOString()
  };
  recordings.set(recording.recordingId, recording);
  res.status(201).json({ success: true, data: recording });
});

app.post('/api/v1/online-class/:classId/attendance', (req, res) => {
  const { studentId, joinTime, leaveTime } = req.body;
  const attendanceRecord = {
    attendanceId: uuidv4(),
    classId: req.params.classId,
    studentId,
    joinTime,
    leaveTime,
    duration: leaveTime ? (new Date(leaveTime) - new Date(joinTime)) / 1000 / 60 : null
  };
  attendance.set(attendanceRecord.attendanceId, attendanceRecord);
  res.status(201).json({ success: true, data: attendanceRecord });
});

app.get('/api/v1/online-class/teacher/:teacherId', (req, res) => {
  const teacherClasses = Array.from(classes.values()).filter(c => c.teacherId === req.params.teacherId);
  res.json({ success: true, data: teacherClasses });
});

app.get('/api/v1/online-class/:classId/recordings', (req, res) => {
  const classRecordings = Array.from(recordings.values()).filter(r => r.classId === req.params.classId);
  res.json({ success: true, data: classRecordings });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`\n💻 Online Classes Service running on port ${PORT}\n`));
}

module.exports = app;
