const Joi = require('joi');

/**
 * NLP Service Validators
 */

const gradeEssaySchema = Joi.object({
  text: Joi.string().min(50).required(),
  title: Joi.string().max(255),
  wordCountRequirement: Joi.number().integer().min(0),
  rubric: Joi.object({
    keywords: Joi.array().items(Joi.string())
  }),
  studentId: Joi.string().uuid(),
  assignmentId: Joi.string().uuid()
});

const plagiarismCheckSchema = Joi.object({
  text: Joi.string().min(50).required(),
  sources: Joi.array().items(Joi.string()),
  checkInternet: Joi.boolean().default(false),
  studentId: Joi.string().uuid(),
  assignmentId: Joi.string().uuid()
});

const generateQuestionsSchema = Joi.object({
  text: Joi.string().min(100).required(),
  count: Joi.number().integer().min(1).max(20).default(5),
  difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').default('mixed')
});

const summarizeTextSchema = Joi.object({
  text: Joi.string().min(100).required(),
  maxSentences: Joi.number().integer().min(1).max(10).default(3),
  format: Joi.string().valid('sentences', 'bullet_points').default('sentences')
});

const sentimentAnalysisSchema = Joi.object({
  text: Joi.string().min(10).required(),
  detailed: Joi.boolean().default(false)
});

module.exports = {
  gradeEssaySchema,
  plagiarismCheckSchema,
  generateQuestionsSchema,
  summarizeTextSchema,
  sentimentAnalysisSchema
};
