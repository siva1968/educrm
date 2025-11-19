const nlpService = require('../services/nlp.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  gradeEssaySchema,
  plagiarismCheckSchema,
  generateQuestionsSchema,
  summarizeTextSchema,
  sentimentAnalysisSchema
} = require('../validators/nlp.validator');

/**
 * NLP Controller
 * Handles HTTP requests for NLP operations
 */

class NLPController {
  /**
   * Grade an essay
   * POST /api/v1/nlp/essay/grade
   */
  async gradeEssay(req, res, next) {
    try {
      const { error, value } = gradeEssaySchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await nlpService.gradeEssay(value);

      return ApiResponse.success(res, result, 'Essay graded successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check for plagiarism
   * POST /api/v1/nlp/plagiarism/check
   */
  async checkPlagiarism(req, res, next) {
    try {
      const { error, value } = plagiarismCheckSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await nlpService.detectPlagiarism(value.text, value.sources || []);

      return ApiResponse.success(res, result, 'Plagiarism check completed', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate questions from text
   * POST /api/v1/nlp/questions/generate
   */
  async generateQuestions(req, res, next) {
    try {
      const { error, value } = generateQuestionsSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const questions = await nlpService.generateQuestions(value.text, value.count);

      return ApiResponse.success(res, { questions }, 'Questions generated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Summarize text
   * POST /api/v1/nlp/text/summarize
   */
  async summarizeText(req, res, next) {
    try {
      const { error, value } = summarizeTextSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = await nlpService.summarizeText(value.text, value.maxSentences);

      return ApiResponse.success(res, result, 'Text summarized successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyze sentiment
   * POST /api/v1/nlp/sentiment/analyze
   */
  async analyzeSentiment(req, res, next) {
    try {
      const { error, value } = sentimentAnalysisSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details);
      }

      const result = value.detailed
        ? await nlpService.analyzeSentimentDetailed(value.text)
        : nlpService.analyzeSentiment(value.text);

      return ApiResponse.success(res, result, 'Sentiment analysis completed', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get NLP capabilities
   * GET /api/v1/nlp/capabilities
   */
  async getCapabilities(req, res) {
    const capabilities = {
      essayGrading: {
        available: true,
        features: ['content analysis', 'grammar check', 'vocabulary assessment', 'structure analysis', 'coherence scoring'],
        maxWordCount: 10000
      },
      plagiarismDetection: {
        available: true,
        features: ['text similarity', 'source matching', 'sentence-level detection'],
        accuracy: '85%'
      },
      questionGeneration: {
        available: true,
        questionTypes: ['who', 'what', 'when', 'where', 'why', 'how'],
        maxQuestions: 20
      },
      textSummarization: {
        available: true,
        compressionRatio: '0.1-0.5',
        maxInputLength: 50000
      },
      sentimentAnalysis: {
        available: true,
        granularity: ['sentence-level', 'document-level'],
        categories: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
      }
    };

    return ApiResponse.success(res, capabilities);
  }
}

module.exports = new NLPController();
