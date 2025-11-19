const brain = require('brain.js');
const { SimpleLinearRegression, PolynomialRegression } = require('ml-regression');
const { Matrix } = require('ml-matrix');
const stats = require('simple-statistics');
const math = require('mathjs');
const _ = require('lodash');

/**
 * Prediction Engine Service
 * Advanced ML-based predictions for student performance, career paths, and recommendations
 */
class PredictionService {
  constructor() {
    this.performanceModel = null;
    this.dropoutModel = null;
    this.initialized = false;
  }

  /**
   * Initialize ML models
   */
  async initializeModels() {
    if (!this.initialized) {
      // Initialize neural network for performance prediction
      this.performanceModel = new brain.NeuralNetwork({
        hiddenLayers: [10, 5],
        activation: 'sigmoid'
      });

      // Initialize neural network for dropout prediction
      this.dropoutModel = new brain.NeuralNetwork({
        hiddenLayers: [8, 4],
        activation: 'sigmoid'
      });

      this.initialized = true;
      console.log('✓ Prediction models initialized');
    }
  }

  // =============================================
  // STUDENT PERFORMANCE PREDICTION
  // =============================================

  /**
   * Predict student performance based on historical data
   * @param {Object} studentData - Student historical performance data
   */
  async predictPerformance(studentData) {
    try {
      await this.initializeModels();

      const {
        historicalGrades = [],
        attendance = [],
        assignmentScores = [],
        testScores = [],
        studyHours = [],
        participationScores = [],
        demographics = {}
      } = studentData;

      // Calculate statistical features
      const features = this.calculatePerformanceFeatures(studentData);

      // Multi-model prediction approach
      const predictions = {
        nextTermGrade: this.predictNextGrade(features),
        finalGrade: this.predictFinalGrade(features),
        improvementTrend: this.calculateTrend(historicalGrades),
        riskLevel: this.assessRiskLevel(features),
        recommendations: this.generatePerformanceRecommendations(features),
        confidenceScore: this.calculateConfidence(features)
      };

      // Calculate prediction intervals
      predictions.predictionInterval = this.calculatePredictionInterval(
        predictions.nextTermGrade,
        features
      );

      return predictions;
    } catch (error) {
      throw new Error(`Performance prediction failed: ${error.message}`);
    }
  }

  /**
   * Calculate performance features for ML model
   */
  calculatePerformanceFeatures(studentData) {
    const {
      historicalGrades = [],
      attendance = [],
      assignmentScores = [],
      testScores = [],
      studyHours = [],
      participationScores = []
    } = studentData;

    return {
      // Grade statistics
      avgGrade: historicalGrades.length > 0 ? stats.mean(historicalGrades) : 0,
      gradeStdDev: historicalGrades.length > 1 ? stats.standardDeviation(historicalGrades) : 0,
      gradeVariance: historicalGrades.length > 1 ? stats.variance(historicalGrades) : 0,
      gradeMedian: historicalGrades.length > 0 ? stats.median(historicalGrades) : 0,
      minGrade: historicalGrades.length > 0 ? Math.min(...historicalGrades) : 0,
      maxGrade: historicalGrades.length > 0 ? Math.max(...historicalGrades) : 0,

      // Attendance statistics
      avgAttendance: attendance.length > 0 ? stats.mean(attendance) : 0,
      attendanceRate: attendance.length > 0 ? stats.mean(attendance) / 100 : 0,

      // Assignment performance
      avgAssignment: assignmentScores.length > 0 ? stats.mean(assignmentScores) : 0,
      assignmentCompletion: assignmentScores.length > 0 ? assignmentScores.filter(s => s > 0).length / assignmentScores.length : 0,

      // Test performance
      avgTest: testScores.length > 0 ? stats.mean(testScores) : 0,
      testConsistency: testScores.length > 1 ? 1 - (stats.standardDeviation(testScores) / stats.mean(testScores)) : 0,

      // Study habits
      avgStudyHours: studyHours.length > 0 ? stats.mean(studyHours) : 0,
      studyConsistency: studyHours.length > 1 ? 1 - (stats.standardDeviation(studyHours) / (stats.mean(studyHours) + 1)) : 0,

      // Participation
      avgParticipation: participationScores.length > 0 ? stats.mean(participationScores) : 0,

      // Trend analysis
      gradeTrend: this.calculateTrendSlope(historicalGrades),
      recentPerformance: historicalGrades.length > 0 ? stats.mean(historicalGrades.slice(-3)) : 0,

      // Counts
      dataPoints: historicalGrades.length
    };
  }

  /**
   * Predict next term grade using multiple regression
   */
  predictNextGrade(features) {
    // Weighted feature combination for prediction
    const weights = {
      avgGrade: 0.35,
      recentPerformance: 0.25,
      gradeTrend: 0.15,
      avgAttendance: 0.10,
      avgAssignment: 0.08,
      avgTest: 0.07
    };

    let prediction = 0;
    for (const [feature, weight] of Object.entries(weights)) {
      prediction += (features[feature] || 0) * weight;
    }

    // Apply bounds
    return Math.max(0, Math.min(100, prediction));
  }

  /**
   * Predict final grade
   */
  predictFinalGrade(features) {
    const nextGrade = this.predictNextGrade(features);
    const trend = features.gradeTrend || 0;

    // Extrapolate with trend
    let finalGrade = nextGrade + (trend * 2);

    // Apply realistic bounds
    finalGrade = Math.max(0, Math.min(100, finalGrade));

    return Math.round(finalGrade * 10) / 10;
  }

  /**
   * Calculate trend slope from data points
   */
  calculateTrendSlope(data) {
    if (data.length < 2) return 0;

    const x = Array.from({ length: data.length }, (_, i) => i);
    const y = data;

    try {
      const regression = new SimpleLinearRegression(x, y);
      return regression.slope;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate improvement trend
   */
  calculateTrend(historicalGrades) {
    if (historicalGrades.length < 2) {
      return { direction: 'stable', strength: 0, description: 'Insufficient data' };
    }

    const slope = this.calculateTrendSlope(historicalGrades);

    let direction, strength, description;

    if (slope > 2) {
      direction = 'improving';
      strength = Math.min(1, slope / 5);
      description = 'Strong improvement trend';
    } else if (slope > 0.5) {
      direction = 'improving';
      strength = slope / 5;
      description = 'Gradual improvement';
    } else if (slope < -2) {
      direction = 'declining';
      strength = Math.min(1, Math.abs(slope) / 5);
      description = 'Declining performance - intervention needed';
    } else if (slope < -0.5) {
      direction = 'declining';
      strength = Math.abs(slope) / 5;
      description = 'Slight decline in performance';
    } else {
      direction = 'stable';
      strength = 0;
      description = 'Consistent performance';
    }

    return {
      direction,
      strength: Math.round(strength * 100) / 100,
      slope: Math.round(slope * 100) / 100,
      description
    };
  }

  /**
   * Assess risk level based on features
   */
  assessRiskLevel(features) {
    let riskScore = 0;

    // Low grades
    if (features.avgGrade < 50) riskScore += 30;
    else if (features.avgGrade < 60) riskScore += 20;
    else if (features.avgGrade < 70) riskScore += 10;

    // Declining trend
    if (features.gradeTrend < -2) riskScore += 25;
    else if (features.gradeTrend < -1) riskScore += 15;

    // Low attendance
    if (features.attendanceRate < 0.7) riskScore += 20;
    else if (features.attendanceRate < 0.8) riskScore += 10;

    // Low assignment completion
    if (features.assignmentCompletion < 0.6) riskScore += 15;
    else if (features.assignmentCompletion < 0.8) riskScore += 8;

    // High variability
    if (features.gradeStdDev > 15) riskScore += 10;

    let level, description;
    if (riskScore >= 60) {
      level = 'high';
      description = 'Student needs immediate intervention';
    } else if (riskScore >= 40) {
      level = 'medium';
      description = 'Student needs additional support';
    } else if (riskScore >= 20) {
      level = 'low';
      description = 'Monitor student progress';
    } else {
      level = 'minimal';
      description = 'Student performing well';
    }

    return {
      level,
      score: Math.min(100, riskScore),
      description,
      factors: this.identifyRiskFactors(features)
    };
  }

  /**
   * Identify specific risk factors
   */
  identifyRiskFactors(features) {
    const factors = [];

    if (features.avgGrade < 60) factors.push('Low average grade');
    if (features.gradeTrend < -1) factors.push('Declining performance trend');
    if (features.attendanceRate < 0.8) factors.push('Low attendance');
    if (features.assignmentCompletion < 0.7) factors.push('Incomplete assignments');
    if (features.gradeStdDev > 15) factors.push('Inconsistent performance');
    if (features.avgStudyHours < 2) factors.push('Insufficient study time');

    return factors;
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(features) {
    const recommendations = [];

    if (features.avgGrade < 70) {
      recommendations.push({
        priority: 'high',
        category: 'academic',
        action: 'Schedule tutoring sessions',
        reason: 'Below target grade average'
      });
    }

    if (features.attendanceRate < 0.85) {
      recommendations.push({
        priority: 'high',
        category: 'attendance',
        action: 'Improve attendance',
        reason: 'Attendance directly impacts learning outcomes'
      });
    }

    if (features.assignmentCompletion < 0.8) {
      recommendations.push({
        priority: 'medium',
        category: 'assignments',
        action: 'Complete all assignments',
        reason: 'Missing assignments affecting overall grade'
      });
    }

    if (features.gradeTrend < -1) {
      recommendations.push({
        priority: 'high',
        category: 'intervention',
        action: 'Meet with counselor',
        reason: 'Declining performance trend detected'
      });
    }

    if (features.avgStudyHours < 3) {
      recommendations.push({
        priority: 'medium',
        category: 'study_habits',
        action: 'Increase study time',
        reason: 'More study hours correlate with better grades'
      });
    }

    if (features.gradeStdDev > 15) {
      recommendations.push({
        priority: 'medium',
        category: 'consistency',
        action: 'Focus on consistent preparation',
        reason: 'High variability in test scores'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'maintenance',
        action: 'Maintain current study habits',
        reason: 'Performing well overall'
      });
    }

    return recommendations;
  }

  /**
   * Calculate prediction confidence
   */
  calculateConfidence(features) {
    let confidence = 100;

    // Reduce confidence based on data availability
    if (features.dataPoints < 3) confidence -= 40;
    else if (features.dataPoints < 5) confidence -= 20;
    else if (features.dataPoints < 10) confidence -= 10;

    // Reduce confidence for high variability
    if (features.gradeStdDev > 20) confidence -= 20;
    else if (features.gradeStdDev > 15) confidence -= 10;

    // Reduce confidence for irregular patterns
    if (features.studyConsistency < 0.5) confidence -= 10;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate prediction interval (confidence bounds)
   */
  calculatePredictionInterval(prediction, features) {
    const stdError = features.gradeStdDev || 10;
    const confidence = 0.95; // 95% confidence interval
    const zScore = 1.96; // For 95% CI

    const margin = zScore * stdError;

    return {
      lower: Math.max(0, prediction - margin),
      upper: Math.min(100, prediction + margin),
      confidence: `${Math.round(confidence * 100)}%`
    };
  }

  // =============================================
  // DROPOUT RISK ANALYSIS
  // =============================================

  /**
   * Predict dropout risk
   * @param {Object} studentData - Comprehensive student data
   */
  async predictDropoutRisk(studentData) {
    try {
      const {
        academicPerformance = {},
        attendance = {},
        behavioral = {},
        socioeconomic = {},
        engagement = {}
      } = studentData;

      const riskScore = this.calculateDropoutRiskScore(studentData);
      const riskFactors = this.identifyDropoutRiskFactors(studentData);
      const interventions = this.recommendDropoutInterventions(riskScore, riskFactors);

      return {
        riskLevel: this.classifyDropoutRisk(riskScore),
        riskScore: Math.round(riskScore),
        riskFactors,
        interventions,
        timeline: this.estimateDropoutTimeline(riskScore, riskFactors),
        confidence: this.calculateDropoutConfidence(studentData)
      };
    } catch (error) {
      throw new Error(`Dropout prediction failed: ${error.message}`);
    }
  }

  /**
   * Calculate dropout risk score
   */
  calculateDropoutRiskScore(studentData) {
    const {
      academicPerformance = {},
      attendance = {},
      behavioral = {},
      socioeconomic = {},
      engagement = {}
    } = studentData;

    let score = 0;

    // Academic factors (40%)
    if (academicPerformance.gpa < 2.0) score += 20;
    else if (academicPerformance.gpa < 2.5) score += 10;
    if (academicPerformance.failedCourses > 2) score += 15;
    else if (academicPerformance.failedCourses > 0) score += 5;
    if (academicPerformance.gradeTrend === 'declining') score += 5;

    // Attendance factors (25%)
    if (attendance.rate < 0.7) score += 15;
    else if (attendance.rate < 0.8) score += 10;
    else if (attendance.rate < 0.9) score += 5;
    if (attendance.absencesThisMonth > 5) score += 10;

    // Behavioral factors (20%)
    if (behavioral.disciplinaryActions > 3) score += 10;
    else if (behavioral.disciplinaryActions > 0) score += 5;
    if (behavioral.suspensions > 0) score += 10;

    // Engagement factors (10%)
    if (engagement.participationScore < 40) score += 5;
    if (engagement.extracurricular === false) score += 5;

    // Socioeconomic factors (5%)
    if (socioeconomic.lowIncome) score += 3;
    if (socioeconomic.singleParentHousehold) score += 2;

    return Math.min(100, score);
  }

  /**
   * Classify dropout risk level
   */
  classifyDropoutRisk(score) {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    if (score >= 15) return 'low';
    return 'minimal';
  }

  /**
   * Identify dropout risk factors
   */
  identifyDropoutRiskFactors(studentData) {
    const factors = [];
    const { academicPerformance = {}, attendance = {}, behavioral = {} } = studentData;

    if (academicPerformance.gpa < 2.5) {
      factors.push({
        factor: 'Low GPA',
        severity: 'high',
        value: academicPerformance.gpa
      });
    }

    if (academicPerformance.failedCourses > 0) {
      factors.push({
        factor: 'Failed Courses',
        severity: 'high',
        value: academicPerformance.failedCourses
      });
    }

    if (attendance.rate < 0.85) {
      factors.push({
        factor: 'Low Attendance',
        severity: 'high',
        value: `${Math.round(attendance.rate * 100)}%`
      });
    }

    if (behavioral.disciplinaryActions > 0) {
      factors.push({
        factor: 'Disciplinary Issues',
        severity: 'medium',
        value: behavioral.disciplinaryActions
      });
    }

    return factors;
  }

  /**
   * Recommend interventions for dropout prevention
   */
  recommendDropoutInterventions(riskScore, riskFactors) {
    const interventions = [];

    if (riskScore >= 70) {
      interventions.push({
        priority: 'urgent',
        type: 'counseling',
        action: 'Immediate meeting with school counselor',
        timeline: 'Within 24 hours'
      });
    }

    if (riskScore >= 50) {
      interventions.push({
        priority: 'high',
        type: 'academic',
        action: 'Enroll in academic support program',
        timeline: 'This week'
      });
    }

    if (riskFactors.some(f => f.factor === 'Low Attendance')) {
      interventions.push({
        priority: 'high',
        type: 'attendance',
        action: 'Attendance intervention plan',
        timeline: 'Immediate'
      });
    }

    if (riskFactors.some(f => f.factor === 'Failed Courses')) {
      interventions.push({
        priority: 'high',
        type: 'tutoring',
        action: 'Assign peer tutor or mentor',
        timeline: 'This week'
      });
    }

    return interventions;
  }

  /**
   * Estimate dropout timeline
   */
  estimateDropoutTimeline(riskScore, riskFactors) {
    if (riskScore >= 80) return 'High risk within current semester';
    if (riskScore >= 60) return 'Risk within current academic year';
    if (riskScore >= 40) return 'Risk within next 12-18 months';
    return 'Low immediate risk';
  }

  /**
   * Calculate confidence in dropout prediction
   */
  calculateDropoutConfidence(studentData) {
    // More data = higher confidence
    const dataCompleteness = Object.keys(studentData).length / 5;
    return Math.round(Math.min(100, dataCompleteness * 100));
  }

  // =============================================
  // CAREER PATH RECOMMENDATIONS
  // =============================================

  /**
   * Recommend career paths based on student profile
   * @param {Object} studentProfile - Student's academic and interest profile
   */
  async recommendCareerPaths(studentProfile) {
    try {
      const {
        academicStrengths = [],
        interests = [],
        skills = [],
        personalityTraits = [],
        grades = {}
      } = studentProfile;

      // Analyze student profile
      const analysis = this.analyzeStudentProfile(studentProfile);

      // Generate career matches
      const careers = this.matchCareers(analysis);

      // Rank careers by fit score
      const rankedCareers = _.orderBy(careers, ['fitScore'], ['desc']).slice(0, 10);

      return {
        topCareers: rankedCareers,
        analysis,
        pathways: this.generateEducationalPathways(rankedCareers),
        recommendations: this.generateCareerRecommendations(rankedCareers, analysis)
      };
    } catch (error) {
      throw new Error(`Career recommendation failed: ${error.message}`);
    }
  }

  /**
   * Analyze student profile for career matching
   */
  analyzeStudentProfile(profile) {
    const { academicStrengths = [], interests = [], grades = {} } = profile;

    return {
      primaryStrength: this.identifyPrimaryStrength(grades),
      interestAreas: this.categorizeInterests(interests),
      skillLevel: this.assessSkillLevel(grades),
      academicProfile: this.classifyAcademicProfile(grades)
    };
  }

  /**
   * Identify primary academic strength
   */
  identifyPrimaryStrength(grades) {
    const subjects = Object.entries(grades);
    if (subjects.length === 0) return 'general';

    const topSubject = _.maxBy(subjects, ([_, grade]) => grade);
    return topSubject ? topSubject[0] : 'general';
  }

  /**
   * Categorize interests into career domains
   */
  categorizeInterests(interests) {
    const domains = {
      stem: ['science', 'technology', 'engineering', 'mathematics', 'coding', 'robotics'],
      arts: ['art', 'music', 'design', 'creative writing', 'drama'],
      business: ['business', 'economics', 'finance', 'entrepreneurship'],
      social: ['psychology', 'sociology', 'social work', 'counseling'],
      health: ['medicine', 'nursing', 'healthcare', 'biology']
    };

    const matchedDomains = {};

    for (const [domain, keywords] of Object.entries(domains)) {
      const matches = interests.filter(interest =>
        keywords.some(keyword => interest.toLowerCase().includes(keyword))
      );
      if (matches.length > 0) {
        matchedDomains[domain] = matches.length;
      }
    }

    return matchedDomains;
  }

  /**
   * Assess overall skill level
   */
  assessSkillLevel(grades) {
    const values = Object.values(grades);
    if (values.length === 0) return 'intermediate';

    const avg = stats.mean(values);

    if (avg >= 90) return 'advanced';
    if (avg >= 80) return 'proficient';
    if (avg >= 70) return 'intermediate';
    return 'developing';
  }

  /**
   * Classify academic profile
   */
  classifyAcademicProfile(grades) {
    const mathScience = (grades.mathematics || 0) + (grades.science || 0);
    const humanities = (grades.english || 0) + (grades.history || 0);

    if (mathScience > humanities + 10) return 'STEM-oriented';
    if (humanities > mathScience + 10) return 'Humanities-oriented';
    return 'Balanced';
  }

  /**
   * Match careers to student profile
   */
  matchCareers(analysis) {
    // Sample career database (in production, this would be from database)
    const careerDatabase = [
      {
        id: 1,
        name: 'Software Engineer',
        category: 'Technology',
        requiredStrengths: ['mathematics', 'computer science'],
        interests: ['stem'],
        skillLevel: 'proficient',
        growthRate: 'high',
        averageSalary: 95000
      },
      {
        id: 2,
        name: 'Data Scientist',
        category: 'Technology',
        requiredStrengths: ['mathematics', 'statistics'],
        interests: ['stem'],
        skillLevel: 'advanced',
        growthRate: 'high',
        averageSalary: 105000
      },
      {
        id: 3,
        name: 'Graphic Designer',
        category: 'Arts',
        requiredStrengths: ['art', 'design'],
        interests: ['arts'],
        skillLevel: 'intermediate',
        growthRate: 'medium',
        averageSalary: 55000
      },
      {
        id: 4,
        name: 'Financial Analyst',
        category: 'Business',
        requiredStrengths: ['mathematics', 'economics'],
        interests: ['business'],
        skillLevel: 'proficient',
        growthRate: 'medium',
        averageSalary: 75000
      },
      {
        id: 5,
        name: 'Nurse Practitioner',
        category: 'Healthcare',
        requiredStrengths: ['biology', 'chemistry'],
        interests: ['health'],
        skillLevel: 'proficient',
        growthRate: 'high',
        averageSalary: 85000
      }
    ];

    return careerDatabase.map(career => ({
      ...career,
      fitScore: this.calculateCareerFitScore(career, analysis),
      matchReasons: this.explainCareerMatch(career, analysis)
    }));
  }

  /**
   * Calculate career fit score
   */
  calculateCareerFitScore(career, analysis) {
    let score = 0;

    // Interest match (40%)
    const interestMatch = Object.keys(analysis.interestAreas).some(area =>
      career.interests.includes(area)
    );
    if (interestMatch) score += 40;

    // Strength match (30%)
    if (career.requiredStrengths.includes(analysis.primaryStrength)) {
      score += 30;
    }

    // Skill level match (20%)
    const skillLevels = ['developing', 'intermediate', 'proficient', 'advanced'];
    const studentLevel = skillLevels.indexOf(analysis.skillLevel);
    const requiredLevel = skillLevels.indexOf(career.skillLevel);

    if (studentLevel >= requiredLevel) score += 20;
    else score += 10; // Partial credit if close

    // Growth potential (10%)
    if (career.growthRate === 'high') score += 10;
    else if (career.growthRate === 'medium') score += 5;

    return Math.round(score);
  }

  /**
   * Explain career match reasons
   */
  explainCareerMatch(career, analysis) {
    const reasons = [];

    if (Object.keys(analysis.interestAreas).some(area => career.interests.includes(area))) {
      reasons.push('Aligns with your interests');
    }

    if (career.requiredStrengths.includes(analysis.primaryStrength)) {
      reasons.push('Matches your academic strengths');
    }

    if (career.growthRate === 'high') {
      reasons.push('High growth field');
    }

    return reasons;
  }

  /**
   * Generate educational pathways for careers
   */
  generateEducationalPathways(careers) {
    return careers.slice(0, 3).map(career => ({
      career: career.name,
      pathways: [
        {
          level: 'Undergraduate',
          degrees: this.getSuggestedDegrees(career.category),
          duration: '4 years'
        },
        {
          level: 'Graduate (Optional)',
          degrees: this.getAdvancedDegrees(career.category),
          duration: '2-3 years'
        }
      ],
      certifications: this.getSuggestedCertifications(career.category)
    }));
  }

  getSuggestedDegrees(category) {
    const degreeMap = {
      Technology: ['Computer Science', 'Software Engineering', 'Information Technology'],
      Arts: ['Fine Arts', 'Graphic Design', 'Visual Arts'],
      Business: ['Business Administration', 'Finance', 'Economics'],
      Healthcare: ['Nursing', 'Biology', 'Pre-Med']
    };
    return degreeMap[category] || ['General Studies'];
  }

  getAdvancedDegrees(category) {
    const degreeMap = {
      Technology: ['MS Computer Science', 'MS Data Science', 'MBA (Tech)'],
      Arts: ['MFA', 'MS Design'],
      Business: ['MBA', 'MS Finance'],
      Healthcare: ['DNP', 'MD', 'MS Nursing']
    };
    return degreeMap[category] || ['MS General'];
  }

  getSuggestedCertifications(category) {
    const certMap = {
      Technology: ['AWS Certified', 'Google Cloud', 'Cisco CCNA'],
      Arts: ['Adobe Certified', 'UI/UX Certification'],
      Business: ['CFA', 'CPA', 'PMP'],
      Healthcare: ['BLS', 'ACLS', 'Specialty Certifications']
    };
    return certMap[category] || [];
  }

  /**
   * Generate career recommendations
   */
  generateCareerRecommendations(careers, analysis) {
    const recommendations = [];

    const topCareer = careers[0];
    if (topCareer) {
      recommendations.push({
        type: 'exploration',
        action: `Research ${topCareer.name} career path`,
        priority: 'high'
      });

      recommendations.push({
        type: 'preparation',
        action: `Take courses in ${topCareer.category.toLowerCase()}`,
        priority: 'high'
      });
    }

    recommendations.push({
      type: 'experience',
      action: 'Seek internships or shadowing opportunities',
      priority: 'medium'
    });

    return recommendations;
  }

  // =============================================
  // COURSE RECOMMENDATIONS
  // =============================================

  /**
   * Recommend courses based on student profile and goals
   */
  async recommendCourses(studentProfile) {
    try {
      const {
        completedCourses = [],
        currentGrade = 9,
        careerGoal = null,
        interests = [],
        academicStrengths = []
      } = studentProfile;

      const prerequisites = this.checkPrerequisites(completedCourses);
      const recommendedCourses = this.generateCourseRecommendations(
        prerequisites,
        careerGoal,
        interests,
        academicStrengths,
        currentGrade
      );

      return {
        recommendedCourses,
        prerequisites,
        timeline: this.generateCourseTimeline(recommendedCourses, currentGrade)
      };
    } catch (error) {
      throw new Error(`Course recommendation failed: ${error.message}`);
    }
  }

  checkPrerequisites(completedCourses) {
    // Check which courses student is eligible for
    const eligible = {
      advanced: completedCourses.includes('Algebra II'),
      apLevel: completedCourses.includes('PreCalculus'),
      science: completedCourses.includes('Biology')
    };

    return eligible;
  }

  generateCourseRecommendations(prerequisites, careerGoal, interests, strengths, grade) {
    const courses = [];

    // Core courses based on grade
    if (grade >= 11 && prerequisites.apLevel) {
      courses.push({
        course: 'AP Calculus',
        priority: 'high',
        reason: 'Prerequisite completed',
        difficulty: 'advanced'
      });
    }

    // Career-aligned courses
    if (careerGoal && careerGoal.includes('Engineer')) {
      courses.push({
        course: 'Physics',
        priority: 'high',
        reason: 'Aligns with engineering career',
        difficulty: 'medium'
      });
    }

    // Interest-based courses
    if (interests.includes('programming')) {
      courses.push({
        course: 'Computer Science',
        priority: 'medium',
        reason: 'Matches interests',
        difficulty: 'medium'
      });
    }

    return courses;
  }

  generateCourseTimeline(courses, currentGrade) {
    const remainingYears = 13 - currentGrade;
    const coursesPerYear = Math.ceil(courses.length / remainingYears);

    return {
      totalCourses: courses.length,
      yearsRemaining: remainingYears,
      recommendedPace: `${coursesPerYear} courses per year`
    };
  }
}

module.exports = new PredictionService();
