const natural = require('natural');
const compromise = require('compromise');
const Sentiment = require('sentiment');
const stringSimilarity = require('string-similarity');
const { removeStopwords } = require('stopword');
const pool = require('../../../shared/config/database');

/**
 * Natural Language Processing Service
 * Provides AI-powered text analysis capabilities
 */

class NLPService {
  constructor() {
    // Initialize NLP tools
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.tfidf = new natural.TfIdf();
    this.sentiment = new Sentiment();
    this.classifier = new natural.BayesClassifier();

    // Initialize trained models
    this.initializeModels();
  }

  /**
   * Initialize pre-trained models
   */
  async initializeModels() {
    // Load essay quality classifier training data
    const essayTrainingData = [
      { text: 'excellent well-structured coherent analysis', label: 'A' },
      { text: 'good clear arguments supported evidence', label: 'B' },
      { text: 'adequate basic understanding some errors', label: 'C' },
      { text: 'poor unclear lacking structure grammar issues', label: 'D' },
      { text: 'incomplete minimal effort insufficient', label: 'F' }
    ];

    essayTrainingData.forEach(({ text, label }) => {
      this.classifier.addDocument(text, label);
    });

    this.classifier.train();
  }

  // =============================================
  // ESSAY GRADING
  // =============================================

  /**
   * Grade an essay using multiple NLP criteria
   * @param {Object} essayData - Essay content and metadata
   * @returns {Object} Grading results with detailed feedback
   */
  async gradeEssay(essayData) {
    const { text, title, wordCountRequirement, rubric } = essayData;

    // Analyze essay components
    const wordCount = this.countWords(text);
    const sentenceCount = this.countSentences(text);
    const paragraphCount = this.countParagraphs(text);
    const readability = this.calculateReadability(text);
    const vocabulary = this.analyzeVocabulary(text);
    const grammar = this.analyzeGrammar(text);
    const structure = this.analyzeStructure(text);
    const coherence = this.analyzeCoherence(text);
    const sentiment = this.analyzeSentiment(text);

    // Calculate overall score
    const scores = {
      content: this.scoreContent(text, rubric),
      structure: this.scoreStructure(structure),
      grammar: this.scoreGrammar(grammar),
      vocabulary: this.scoreVocabulary(vocabulary),
      coherence: this.scoreCoherence(coherence),
      wordCount: this.scoreWordCount(wordCount, wordCountRequirement)
    };

    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    const grade = this.convertScoreToGrade(totalScore);

    return {
      grade,
      score: Math.round(totalScore * 100) / 100,
      scores,
      metrics: {
        wordCount,
        sentenceCount,
        paragraphCount,
        averageWordsPerSentence: Math.round(wordCount / sentenceCount),
        readabilityScore: readability,
        vocabularyDiversity: vocabulary.diversity,
        sentimentScore: sentiment.score
      },
      feedback: this.generateFeedback(scores, structure, grammar, vocabulary),
      strengths: this.identifyStrengths(scores),
      improvements: this.identifyImprovements(scores)
    };
  }

  /**
   * Count words in text
   */
  countWords(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    return tokens.length;
  }

  /**
   * Count sentences in text
   */
  countSentences(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.length;
  }

  /**
   * Count paragraphs in text
   */
  countParagraphs(text) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    return paragraphs.length;
  }

  /**
   * Calculate readability score (Flesch Reading Ease)
   */
  calculateReadability(text) {
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in text
   */
  countSyllables(text) {
    const words = this.tokenizer.tokenize(text.toLowerCase());
    let syllableCount = 0;

    words.forEach(word => {
      syllableCount += this.countWordSyllables(word);
    });

    return syllableCount;
  }

  /**
   * Count syllables in a word
   */
  countWordSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  /**
   * Analyze vocabulary usage
   */
  analyzeVocabulary(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const uniqueWords = new Set(tokens);
    const diversity = uniqueWords.size / tokens.length;

    // Identify advanced vocabulary
    const advancedWords = tokens.filter(word => word.length > 8);

    return {
      totalWords: tokens.length,
      uniqueWords: uniqueWords.size,
      diversity: Math.round(diversity * 100) / 100,
      advancedWordCount: advancedWords.length,
      advancedWordRatio: Math.round((advancedWords.length / tokens.length) * 100) / 100
    };
  }

  /**
   * Analyze grammar (basic check)
   */
  analyzeGrammar(text) {
    const doc = compromise(text);

    // Check for common grammar issues
    const sentences = doc.sentences().out('array');
    const issues = [];

    sentences.forEach((sentence, index) => {
      // Check if sentence starts with capital letter
      if (sentence[0] !== sentence[0].toUpperCase()) {
        issues.push({
          type: 'capitalization',
          sentence: index + 1,
          message: 'Sentence should start with a capital letter'
        });
      }

      // Check if sentence ends with punctuation
      if (!/[.!?]$/.test(sentence.trim())) {
        issues.push({
          type: 'punctuation',
          sentence: index + 1,
          message: 'Sentence should end with punctuation'
        });
      }
    });

    return {
      issuesFound: issues.length,
      issues: issues.slice(0, 10), // Limit to first 10 issues
      grammarScore: Math.max(0, 100 - (issues.length * 5))
    };
  }

  /**
   * Analyze essay structure
   */
  analyzeStructure(text) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const doc = compromise(text);

    return {
      hasClearIntroduction: paragraphs.length > 0 && paragraphs[0].length > 50,
      hasBodyParagraphs: paragraphs.length >= 3,
      hasClearConclusion: paragraphs.length > 0 && paragraphs[paragraphs.length - 1].length > 50,
      paragraphCount: paragraphs.length,
      transitions: this.findTransitions(doc),
      structureScore: this.calculateStructureScore(paragraphs)
    };
  }

  /**
   * Find transition words and phrases
   */
  findTransitions(doc) {
    const transitionWords = ['however', 'therefore', 'furthermore', 'moreover', 'additionally',
                             'consequently', 'nevertheless', 'meanwhile', 'similarly', 'likewise'];
    const text = doc.text().toLowerCase();
    const found = transitionWords.filter(word => text.includes(word));
    return {
      count: found.length,
      words: found
    };
  }

  /**
   * Calculate structure score
   */
  calculateStructureScore(paragraphs) {
    let score = 0;

    // Has introduction
    if (paragraphs.length > 0 && paragraphs[0].length > 50) score += 25;

    // Has multiple body paragraphs
    if (paragraphs.length >= 3) score += 25;

    // Has conclusion
    if (paragraphs.length > 0 && paragraphs[paragraphs.length - 1].length > 50) score += 25;

    // Consistent paragraph length
    const avgLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
    const variance = paragraphs.reduce((sum, p) => sum + Math.pow(p.length - avgLength, 2), 0) / paragraphs.length;
    if (variance < avgLength) score += 25;

    return score;
  }

  /**
   * Analyze coherence and flow
   */
  analyzeCoherence(text) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    if (paragraphs.length < 2) {
      return { score: 50, analysis: 'Insufficient paragraphs to analyze coherence' };
    }

    // Check similarity between consecutive paragraphs
    let totalSimilarity = 0;
    for (let i = 0; i < paragraphs.length - 1; i++) {
      const similarity = stringSimilarity.compareTwoStrings(paragraphs[i], paragraphs[i + 1]);
      totalSimilarity += similarity;
    }

    const avgSimilarity = totalSimilarity / (paragraphs.length - 1);
    const score = Math.round(avgSimilarity * 100);

    return {
      score: score,
      analysis: score > 40 ? 'Good flow between paragraphs' : 'Paragraphs could be more connected'
    };
  }

  /**
   * Analyze sentiment
   */
  analyzeSentiment(text) {
    const result = this.sentiment.analyze(text);

    return {
      score: result.score,
      comparative: result.comparative,
      positive: result.positive,
      negative: result.negative,
      tokens: result.tokens.length
    };
  }

  /**
   * Score content based on rubric
   */
  scoreContent(text, rubric) {
    if (!rubric || !rubric.keywords) return 75; // Default score

    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const matchedKeywords = rubric.keywords.filter(keyword =>
      tokens.includes(keyword.toLowerCase())
    );

    const keywordScore = (matchedKeywords.length / rubric.keywords.length) * 100;
    return Math.min(100, keywordScore);
  }

  /**
   * Score structure
   */
  scoreStructure(structure) {
    return structure.structureScore;
  }

  /**
   * Score grammar
   */
  scoreGrammar(grammar) {
    return grammar.grammarScore;
  }

  /**
   * Score vocabulary
   */
  scoreVocabulary(vocabulary) {
    const diversityScore = vocabulary.diversity * 50;
    const advancedScore = Math.min(50, vocabulary.advancedWordRatio * 500);
    return diversityScore + advancedScore;
  }

  /**
   * Score coherence
   */
  scoreCoherence(coherence) {
    return coherence.score;
  }

  /**
   * Score word count
   */
  scoreWordCount(actual, required) {
    if (!required) return 100;

    const ratio = actual / required;
    if (ratio >= 0.9 && ratio <= 1.1) return 100;
    if (ratio >= 0.8 && ratio <= 1.2) return 85;
    if (ratio >= 0.7 && ratio <= 1.3) return 70;
    return 50;
  }

  /**
   * Convert numerical score to letter grade
   */
  convertScoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate detailed feedback
   */
  generateFeedback(scores, structure, grammar, vocabulary) {
    const feedback = [];

    if (scores.content < 70) {
      feedback.push('Consider developing your main ideas more thoroughly and ensuring you address all aspects of the topic.');
    }

    if (scores.structure < 70) {
      feedback.push('Work on organizing your essay with a clear introduction, body paragraphs, and conclusion.');
    }

    if (scores.grammar < 70) {
      feedback.push(`Found ${grammar.issuesFound} grammar/punctuation issues. Please review for capitalization and punctuation.`);
    }

    if (scores.vocabulary < 70) {
      feedback.push('Try to use more varied and sophisticated vocabulary to enhance your writing.');
    }

    if (scores.coherence < 70) {
      feedback.push('Improve the flow between paragraphs using transition words and connecting ideas.');
    }

    return feedback;
  }

  /**
   * Identify strengths
   */
  identifyStrengths(scores) {
    const strengths = [];

    Object.entries(scores).forEach(([category, score]) => {
      if (score >= 85) {
        strengths.push(`Excellent ${category}`);
      } else if (score >= 75) {
        strengths.push(`Good ${category}`);
      }
    });

    return strengths;
  }

  /**
   * Identify areas for improvement
   */
  identifyImprovements(scores) {
    const improvements = [];

    Object.entries(scores).forEach(([category, score]) => {
      if (score < 70) {
        improvements.push({
          category,
          priority: score < 60 ? 'high' : 'medium',
          suggestion: this.getSuggestion(category)
        });
      }
    });

    return improvements;
  }

  /**
   * Get improvement suggestion for category
   */
  getSuggestion(category) {
    const suggestions = {
      content: 'Develop your ideas more fully with specific examples and evidence',
      structure: 'Organize your essay with clear introduction, body, and conclusion',
      grammar: 'Review grammar rules and proofread carefully',
      vocabulary: 'Use more varied and sophisticated vocabulary',
      coherence: 'Use transition words to connect ideas between paragraphs',
      wordCount: 'Ensure your essay meets the required word count'
    };

    return suggestions[category] || 'Continue to practice and refine your writing skills';
  }

  // =============================================
  // PLAGIARISM DETECTION
  // =============================================

  /**
   * Detect potential plagiarism
   * @param {string} text - Text to check
   * @param {Array} sources - Array of source texts to compare against
   * @returns {Object} Plagiarism analysis results
   */
  async detectPlagiarism(text, sources = []) {
    // Chunk the text into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const matches = [];

    // Compare each sentence against sources
    for (const sentence of sentences) {
      for (let i = 0; i < sources.length; i++) {
        const similarity = stringSimilarity.compareTwoStrings(
          sentence.toLowerCase().trim(),
          sources[i].toLowerCase()
        );

        if (similarity > 0.8) {
          matches.push({
            sentence: sentence.trim(),
            source: i,
            similarity: Math.round(similarity * 100),
            type: similarity > 0.95 ? 'exact_match' : 'high_similarity'
          });
        }
      }
    }

    const plagiarismScore = (matches.length / sentences.length) * 100;

    return {
      isPlagiarized: plagiarismScore > 20,
      plagiarismScore: Math.round(plagiarismScore),
      totalSentences: sentences.length,
      matchedSentences: matches.length,
      matches: matches.slice(0, 10), // Return first 10 matches
      severity: this.getPlagiarismSeverity(plagiarismScore)
    };
  }

  /**
   * Get plagiarism severity level
   */
  getPlagiarismSeverity(score) {
    if (score > 50) return 'critical';
    if (score > 20) return 'high';
    if (score > 10) return 'moderate';
    return 'low';
  }

  // =============================================
  // QUESTION GENERATION
  // =============================================

  /**
   * Generate questions from text content
   * @param {string} text - Source text
   * @param {number} count - Number of questions to generate
   * @returns {Array} Generated questions
   */
  async generateQuestions(text, count = 5) {
    const doc = compromise(text);
    const questions = [];

    // Extract key facts
    const people = doc.people().out('array');
    const places = doc.places().out('array');
    const dates = doc.dates().out('array');
    const nouns = doc.nouns().out('array');
    const verbs = doc.verbs().out('array');

    // Generate who questions
    if (people.length > 0) {
      people.slice(0, 2).forEach(person => {
        questions.push({
          question: `Who is ${person}?`,
          type: 'who',
          difficulty: 'easy'
        });
      });
    }

    // Generate where questions
    if (places.length > 0) {
      places.slice(0, 2).forEach(place => {
        questions.push({
          question: `Where is ${place} located?`,
          type: 'where',
          difficulty: 'easy'
        });
      });
    }

    // Generate when questions
    if (dates.length > 0) {
      questions.push({
        question: `When did the events described take place?`,
        type: 'when',
        difficulty: 'medium'
      });
    }

    // Generate what questions
    if (nouns.length > 2) {
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      questions.push({
        question: `What is ${randomNoun}?`,
        type: 'what',
        difficulty: 'easy'
      });
    }

    // Generate how questions
    if (verbs.length > 0) {
      questions.push({
        question: `How does the text describe the main process or action?`,
        type: 'how',
        difficulty: 'hard'
      });
    }

    // Generate why question (always harder)
    questions.push({
      question: `Why is this topic important or significant?`,
      type: 'why',
      difficulty: 'hard'
    });

    return questions.slice(0, count);
  }

  // =============================================
  // TEXT SUMMARIZATION
  // =============================================

  /**
   * Summarize text content
   * @param {string} text - Text to summarize
   * @param {number} maxSentences - Maximum sentences in summary
   * @returns {Object} Summary results
   */
  async summarizeText(text, maxSentences = 3) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length <= maxSentences) {
      return {
        summary: text,
        originalLength: sentences.length,
        summaryLength: sentences.length,
        compressionRatio: 1.0
      };
    }

    // Calculate TF-IDF scores for sentences
    sentences.forEach(sentence => {
      this.tfidf.addDocument(sentence);
    });

    // Score each sentence
    const scoredSentences = sentences.map((sentence, index) => {
      const terms = this.tokenizer.tokenize(sentence.toLowerCase());
      let score = 0;

      terms.forEach(term => {
        score += this.tfidf.tfidf(term, index);
      });

      return {
        sentence,
        score: score / terms.length, // Normalize by sentence length
        index
      };
    });

    // Sort by score and take top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index); // Re-sort by original order

    const summary = topSentences.map(s => s.sentence).join('. ') + '.';

    return {
      summary,
      originalLength: sentences.length,
      summaryLength: maxSentences,
      compressionRatio: Math.round((maxSentences / sentences.length) * 100) / 100,
      keyPoints: topSentences.map(s => s.sentence)
    };
  }

  // =============================================
  // SENTIMENT ANALYSIS (DETAILED)
  // =============================================

  /**
   * Analyze sentiment with detailed breakdown
   * @param {string} text - Text to analyze
   * @returns {Object} Detailed sentiment analysis
   */
  async analyzeSentimentDetailed(text) {
    const result = this.sentiment.analyze(text);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Analyze each sentence
    const sentenceSentiments = sentences.map(sentence => {
      const sentimentResult = this.sentiment.analyze(sentence);
      return {
        sentence: sentence.trim(),
        score: sentimentResult.score,
        sentiment: this.categorizeSentiment(sentimentResult.score)
      };
    });

    // Calculate distribution
    const positive = sentenceSentiments.filter(s => s.sentiment === 'positive').length;
    const negative = sentenceSentiments.filter(s => s.sentiment === 'negative').length;
    const neutral = sentenceSentiments.filter(s => s.sentiment === 'neutral').length;

    return {
      overallScore: result.score,
      overallSentiment: this.categorizeSentiment(result.score),
      comparative: result.comparative,
      distribution: {
        positive,
        negative,
        neutral,
        positivePercentage: Math.round((positive / sentences.length) * 100),
        negativePercentage: Math.round((negative / sentences.length) * 100),
        neutralPercentage: Math.round((neutral / sentences.length) * 100)
      },
      positiveWords: result.positive,
      negativeWords: result.negative,
      sentenceSentiments: sentenceSentiments
    };
  }

  /**
   * Categorize sentiment score
   */
  categorizeSentiment(score) {
    if (score > 2) return 'very_positive';
    if (score > 0) return 'positive';
    if (score < -2) return 'very_negative';
    if (score < 0) return 'negative';
    return 'neutral';
  }
}

module.exports = new NLPService();
