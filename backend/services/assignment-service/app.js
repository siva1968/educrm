const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.ASSIGNMENT_PORT || 4113;

app.use(helmet());
app.use(cors());
app.use(express.json());

const assignments = new Map();
const submissions = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Assignment Management Service',
    version: '1.0.0',
    features: ['Assignment creation', 'Submission tracking', 'Grading', 'Due date management', 'Plagiarism detection']
  });
});

app.get('/api/v1/assignment/health', (req, res) => {
  res.json({ service: 'Assignment Management', status: 'healthy' });
});

app.post('/api/v1/assignment/create', (req, res) => {
  const { title, description, subject, classId, dueDate, maxScore, attachments } = req.body;
  const assignment = {
    assignmentId: uuidv4(),
    title,
    description,
    subject,
    classId,
    dueDate,
    maxScore,
    attachments: attachments || [],
    createdAt: new Date().toISOString()
  };
  assignments.set(assignment.assignmentId, assignment);
  res.status(201).json({ success: true, data: assignment });
});

app.post('/api/v1/assignment/submit', (req, res) => {
  const { assignmentId, studentId, content, attachments } = req.body;
  const submission = {
    submissionId: uuidv4(),
    assignmentId,
    studentId,
    content,
    attachments: attachments || [],
    submittedAt: new Date().toISOString(),
    status: 'submitted',
    score: null
  };
  submissions.set(submission.submissionId, submission);
  res.status(201).json({ success: true, data: submission });
});

app.post('/api/v1/assignment/grade/:submissionId', (req, res) => {
  const submission = submissions.get(req.params.submissionId);
  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }
  submission.score = req.body.score;
  submission.feedback = req.body.feedback;
  submission.gradedAt = new Date().toISOString();
  submission.gradedBy = req.body.gradedBy;
  submission.status = 'graded';
  submissions.set(req.params.submissionId, submission);
  res.json({ success: true, data: submission });
});

app.get('/api/v1/assignment/class/:classId', (req, res) => {
  const classAssignments = Array.from(assignments.values()).filter(a => a.classId === req.params.classId);
  res.json({ success: true, data: classAssignments });
});

app.get('/api/v1/assignment/:assignmentId/submissions', (req, res) => {
  const assignmentSubmissions = Array.from(submissions.values()).filter(s => s.assignmentId === req.params.assignmentId);
  const totalSubmissions = assignmentSubmissions.length;
  const gradedSubmissions = assignmentSubmissions.filter(s => s.status === 'graded').length;
  res.json({
    success: true,
    data: {
      total: totalSubmissions,
      graded: gradedSubmissions,
      pending: totalSubmissions - gradedSubmissions,
      submissions: assignmentSubmissions
    }
  });
});

app.get('/api/v1/assignment/student/:studentId', (req, res) => {
  const studentSubmissions = Array.from(submissions.values()).filter(s => s.studentId === req.params.studentId);
  res.json({ success: true, data: studentSubmissions });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`\n📝 Assignment Service running on port ${PORT}\n`));
}

module.exports = app;
