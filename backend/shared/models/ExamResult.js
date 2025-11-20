/**
 * ExamResult Model
 * Stores student exam results
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExamResult = sequelize.define('ExamResult', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'school_id',
      references: {
        model: 'schools',
        key: 'id',
      },
    },
    examinationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'examination_id',
      references: {
        model: 'examinations',
        key: 'id',
      },
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'student_id',
      references: {
        model: 'students',
        key: 'id',
      },
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'subject_id',
      references: {
        model: 'subjects',
        key: 'id',
      },
    },
    marksObtained: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'marks_obtained',
    },
    totalMarks: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_marks',
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    grade: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'e.g., A+, B, C',
    },
    gpa: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Grade Point Average',
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Rank in class/school',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPassed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_passed',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_published',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
    },
    enteredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entered_by',
      comment: 'User ID who entered the result',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at',
    },
  }, {
    tableName: 'exam_results',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['examination_id'] },
      { fields: ['student_id'] },
      { fields: ['subject_id'] },
      { fields: ['examination_id', 'student_id', 'subject_id'], unique: true },
      { fields: ['is_published'] },
    ],
  });

  // Associations
  ExamResult.associate = (models) => {
    ExamResult.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });

    ExamResult.belongsTo(models.Examination, {
      foreignKey: 'examinationId',
      as: 'examination',
    });

    ExamResult.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student',
    });

    ExamResult.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'subject',
    });
  };

  // Hooks
  ExamResult.beforeSave(async (examResult) => {
    // Calculate percentage
    if (examResult.marksObtained && examResult.totalMarks) {
      examResult.percentage = ((examResult.marksObtained / examResult.totalMarks) * 100).toFixed(2);
    }
  });

  // Instance methods
  ExamResult.prototype.calculateGrade = function(gradingScheme) {
    // Example grading scheme
    const percentage = this.percentage;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Class methods
  ExamResult.getStudentResults = async function(examinationId, studentId) {
    return await this.findAll({
      where: { examinationId, studentId },
      include: [
        { model: sequelize.models.Subject, as: 'subject' },
      ],
      order: [['createdAt', 'ASC']],
    });
  };

  ExamResult.getClassResults = async function(examinationId, classId) {
    return await this.findAll({
      where: { examinationId },
      include: [
        {
          model: sequelize.models.Student,
          as: 'student',
          where: { classId },
        },
        { model: sequelize.models.Subject, as: 'subject' },
      ],
      order: [['percentage', 'DESC']],
    });
  };

  return ExamResult;
};
