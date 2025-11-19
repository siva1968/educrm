const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.GRADEBOOK_PORT || 4111;

app.use(helmet());
app.use(cors());
app.use(express.json());

const grades = new Map();
const gradingSchemes = new Map();

app.get('/', (req, res) => {
  res.json({
    service: 'Grade Book Service',
    version: '1.0.0',
    features: ['Grade entry', 'GPA calculation', 'Report cards', 'Grade analytics', 'Weighted grades', 'Grade distribution']
  });
});

app.get('/api/v1/gradebook/health', (req, res) => {
  res.json({ service: 'Grade Book', status: 'healthy' });
});

app.post('/api/v1/gradebook/grade/add', (req, res) => {
  const { studentId, subject, assessment, score, maxScore, weight, gradedBy } = req.body;

  const grade = {
    gradeId: uuidv4(),
    studentId,
    subject,
    assessment,
    score,
    maxScore,
    percentage: ((score / maxScore) * 100).toFixed(2),
    weight: weight || 1,
    gradedBy,
    gradedAt: new Date().toISOString()
  };

  grades.set(grade.gradeId, grade);

  res.status(201).json({ success: true, data: grade });
});

app.get('/api/v1/gradebook/student/:studentId', (req, res) => {
  const { subject, semester } = req.query;

  let studentGrades = Array.from(grades.values())
    .filter(g => g.studentId === req.params.studentId);

  if (subject) studentGrades = studentGrades.filter(g => g.subject === subject);

  const totalWeightedScore = studentGrades.reduce((sum, g) => sum + (parseFloat(g.percentage) * g.weight), 0);
  const totalWeight = studentGrades.reduce((sum, g) => sum + g.weight, 0);
  const overallPercentage = totalWeight > 0 ? (totalWeightedScore / totalWeight).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      studentId: req.params.studentId,
      grades: studentGrades,
      summary: {
        totalAssessments: studentGrades.length,
        overallPercentage: `${overallPercentage}%`,
        letterGrade: calculateLetterGrade(overallPercentage)
      }
    }
  });
});

app.get('/api/v1/gradebook/subject/:subject', (req, res) => {
  const subjectGrades = Array.from(grades.values())
    .filter(g => g.subject === req.params.subject);

  const averageScore = subjectGrades.length > 0
    ? (subjectGrades.reduce((sum, g) => sum + parseFloat(g.percentage), 0) / subjectGrades.length).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      subject: req.params.subject,
      totalStudents: new Set(subjectGrades.map(g => g.studentId)).size,
      averageScore: `${averageScore}%`,
      grades: subjectGrades
    }
  });
});

app.get('/api/v1/gradebook/report-card/:studentId', (req, res) => {
  const { semester, academicYear } = req.query;

  const studentGrades = Array.from(grades.values())
    .filter(g => g.studentId === req.params.studentId);

  const bySubject = studentGrades.reduce((acc, grade) => {
    if (!acc[grade.subject]) {
      acc[grade.subject] = [];
    }
    acc[grade.subject].push(grade);
    return acc;
  }, {});

  const subjectSummaries = Object.entries(bySubject).map(([subject, subjectGrades]) => {
    const totalWeighted = subjectGrades.reduce((sum, g) => sum + (parseFloat(g.percentage) * g.weight), 0);
    const totalWeight = subjectGrades.reduce((sum, g) => sum + g.weight, 0);
    const average = totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(2) : 0;

    return {
      subject,
      assessments: subjectGrades.length,
      averageScore: `${average}%`,
      letterGrade: calculateLetterGrade(average)
    };
  });

  const overallAverage = subjectSummaries.length > 0
    ? (subjectSummaries.reduce((sum, s) => sum + parseFloat(s.averageScore), 0) / subjectSummaries.length).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      studentId: req.params.studentId,
      semester,
      academicYear,
      subjects: subjectSummaries,
      overallGPA: calculateGPA(overallAverage),
      overallAverage: `${overallAverage}%`
    }
  });
});

app.post('/api/v1/gradebook/scheme/create', (req, res) => {
  const { name, ranges } = req.body;

  const scheme = {
    schemeId: uuidv4(),
    name,
    ranges, // [{grade: 'A', min: 90, max: 100}, ...]
    createdAt: new Date().toISOString()
  };

  gradingSchemes.set(scheme.schemeId, scheme);

  res.status(201).json({ success: true, data: scheme });
});

function calculateLetterGrade(percentage) {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

function calculateGPA(percentage) {
  if (percentage >= 90) return 4.0;
  if (percentage >= 80) return 3.0;
  if (percentage >= 70) return 2.0;
  if (percentage >= 60) return 1.0;
  return 0.0;
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n📚 Grade Book Service running on port ${PORT}\n`);
  });
}

module.exports = app;
