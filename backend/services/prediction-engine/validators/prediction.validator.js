const Joi = require('joi');

/**
 * Prediction Engine Request Validators
 */

/**
 * Performance Prediction Schema
 */
const predictPerformanceSchema = Joi.object({
  studentId: Joi.string().uuid().required(),

  historicalGrades: Joi.array()
    .items(Joi.number().min(0).max(100))
    .min(1)
    .required()
    .description('Array of historical grades'),

  attendance: Joi.array()
    .items(Joi.number().min(0).max(100))
    .default([])
    .description('Attendance percentages'),

  assignmentScores: Joi.array()
    .items(Joi.number().min(0).max(100))
    .default([])
    .description('Assignment scores'),

  testScores: Joi.array()
    .items(Joi.number().min(0).max(100))
    .default([])
    .description('Test scores'),

  studyHours: Joi.array()
    .items(Joi.number().min(0).max(24))
    .default([])
    .description('Daily study hours'),

  participationScores: Joi.array()
    .items(Joi.number().min(0).max(100))
    .default([])
    .description('Class participation scores'),

  demographics: Joi.object({
    age: Joi.number().integer().min(5).max(25),
    grade: Joi.number().integer().min(1).max(12),
    gender: Joi.string().valid('male', 'female', 'other')
  }).optional()
});

/**
 * Dropout Risk Prediction Schema
 */
const predictDropoutRiskSchema = Joi.object({
  studentId: Joi.string().uuid().required(),

  academicPerformance: Joi.object({
    gpa: Joi.number().min(0).max(4.0).required(),
    failedCourses: Joi.number().integer().min(0).default(0),
    gradeTrend: Joi.string().valid('improving', 'stable', 'declining').default('stable')
  }).required(),

  attendance: Joi.object({
    rate: Joi.number().min(0).max(1).required(),
    absencesThisMonth: Joi.number().integer().min(0).default(0),
    tardies: Joi.number().integer().min(0).default(0)
  }).required(),

  behavioral: Joi.object({
    disciplinaryActions: Joi.number().integer().min(0).default(0),
    suspensions: Joi.number().integer().min(0).default(0),
    detentions: Joi.number().integer().min(0).default(0)
  }).optional(),

  socioeconomic: Joi.object({
    lowIncome: Joi.boolean().default(false),
    singleParentHousehold: Joi.boolean().default(false),
    englishLanguageLearner: Joi.boolean().default(false)
  }).optional(),

  engagement: Joi.object({
    participationScore: Joi.number().min(0).max(100).default(50),
    extracurricular: Joi.boolean().default(false),
    parentEngagement: Joi.string().valid('high', 'medium', 'low').default('medium')
  }).optional()
});

/**
 * Career Path Recommendation Schema
 */
const recommendCareerPathsSchema = Joi.object({
  studentId: Joi.string().uuid().required(),

  academicStrengths: Joi.array()
    .items(Joi.string())
    .default([])
    .description('Student academic strengths'),

  interests: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .description('Student interests'),

  skills: Joi.array()
    .items(Joi.string())
    .default([])
    .description('Student skills'),

  personalityTraits: Joi.array()
    .items(Joi.string())
    .default([])
    .description('Personality traits'),

  grades: Joi.object()
    .pattern(
      Joi.string(),
      Joi.number().min(0).max(100)
    )
    .required()
    .description('Subject grades map (e.g., { mathematics: 85, english: 90 })'),

  currentGrade: Joi.number()
    .integer()
    .min(9)
    .max(12)
    .default(9)
    .description('Current grade level'),

  careerGoal: Joi.string()
    .optional()
    .description('Desired career (if known)')
});

/**
 * Course Recommendation Schema
 */
const recommendCoursesSchema = Joi.object({
  studentId: Joi.string().uuid().required(),

  completedCourses: Joi.array()
    .items(Joi.string())
    .default([])
    .description('List of completed courses'),

  currentGrade: Joi.number()
    .integer()
    .min(9)
    .max(12)
    .required()
    .description('Current grade level'),

  careerGoal: Joi.string()
    .optional()
    .description('Career goal for course alignment'),

  interests: Joi.array()
    .items(Joi.string())
    .default([])
    .description('Student interests'),

  academicStrengths: Joi.array()
    .items(Joi.string())
    .default([])
    .description('Academic strengths'),

  schedule: Joi.object({
    maxCoursesPerSemester: Joi.number().integer().min(4).max(8).default(6),
    summerSchool: Joi.boolean().default(false)
  }).optional()
});

/**
 * Study Pattern Analysis Schema
 */
const analyzeStudyPatternsSchema = Joi.object({
  studentId: Joi.string().uuid().required(),

  studySessions: Joi.array()
    .items(
      Joi.object({
        date: Joi.date().required(),
        duration: Joi.number().min(0).max(24).required(),
        subject: Joi.string().required(),
        performance: Joi.number().min(0).max(100).optional()
      })
    )
    .min(5)
    .required()
    .description('Study session data'),

  examScores: Joi.array()
    .items(
      Joi.object({
        date: Joi.date().required(),
        subject: Joi.string().required(),
        score: Joi.number().min(0).max(100).required()
      })
    )
    .default([])
    .description('Exam scores to correlate with study patterns')
});

/**
 * Grade Prediction Schema
 */
const predictGradeSchema = Joi.object({
  studentId: Joi.string().uuid().required(),

  courseId: Joi.string().uuid().required(),

  currentGrade: Joi.number()
    .min(0)
    .max(100)
    .required()
    .description('Current course grade'),

  assignmentsRemaining: Joi.number()
    .integer()
    .min(0)
    .required()
    .description('Number of assignments remaining'),

  testsRemaining: Joi.number()
    .integer()
    .min(0)
    .required()
    .description('Number of tests remaining'),

  weightings: Joi.object({
    assignments: Joi.number().min(0).max(1).default(0.3),
    tests: Joi.number().min(0).max(1).default(0.5),
    final: Joi.number().min(0).max(1).default(0.2)
  }).optional().description('Grade component weightings'),

  historicalPerformance: Joi.object({
    assignmentAverage: Joi.number().min(0).max(100).required(),
    testAverage: Joi.number().min(0).max(100).required()
  }).required()
});

/**
 * Batch Prediction Schema
 */
const batchPredictSchema = Joi.object({
  operation: Joi.string()
    .valid('performance', 'dropout', 'career', 'courses')
    .required()
    .description('Type of prediction to perform'),

  studentIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required()
    .description('Array of student IDs'),

  options: Joi.object().optional().description('Operation-specific options')
});

/**
 * Model Training Schema
 */
const trainModelSchema = Joi.object({
  modelType: Joi.string()
    .valid('performance', 'dropout')
    .required()
    .description('Type of model to train'),

  trainingData: Joi.array()
    .items(Joi.object())
    .min(10)
    .required()
    .description('Training dataset'),

  validationSplit: Joi.number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .description('Validation data percentage'),

  epochs: Joi.number()
    .integer()
    .min(10)
    .max(1000)
    .default(100)
    .description('Training epochs'),

  learningRate: Joi.number()
    .min(0.0001)
    .max(1)
    .default(0.01)
    .description('Learning rate')
});

/**
 * Prediction Feedback Schema
 */
const predictionFeedbackSchema = Joi.object({
  predictionId: Joi.string().uuid().required(),

  actualOutcome: Joi.alternatives()
    .try(
      Joi.number().min(0).max(100),
      Joi.boolean(),
      Joi.string()
    )
    .required()
    .description('Actual outcome for prediction accuracy'),

  predictionType: Joi.string()
    .valid('performance', 'dropout', 'grade')
    .required(),

  comments: Joi.string().max(500).optional(),

  accuracy: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .description('Calculated accuracy')
});

module.exports = {
  predictPerformanceSchema,
  predictDropoutRiskSchema,
  recommendCareerPathsSchema,
  recommendCoursesSchema,
  analyzeStudyPatternsSchema,
  predictGradeSchema,
  batchPredictSchema,
  trainModelSchema,
  predictionFeedbackSchema
};
