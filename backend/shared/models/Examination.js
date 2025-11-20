/**
 * Examination Model
 * Represents exams and assessments
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Examination = sequelize.define('Examination', {
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
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'e.g., Mid-Term Exam, Final Exam',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    examType: {
      type: DataTypes.ENUM('mid-term', 'final', 'unit-test', 'quiz', 'assignment', 'practical', 'other'),
      defaultValue: 'mid-term',
      field: 'exam_type',
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'academic_year',
    },
    term: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'e.g., Term 1, Semester 1',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'end_date',
    },
    resultPublishDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'result_publish_date',
    },
    totalMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'total_marks',
    },
    passingMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'passing_marks',
    },
    gradingSystem: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'grading_system',
      comment: 'e.g., percentage, GPA, letter-grade',
    },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'draft',
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
    tableName: 'examinations',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['academic_year'] },
      { fields: ['exam_type'] },
      { fields: ['status'] },
      { fields: ['start_date'] },
    ],
  });

  // Associations
  Examination.associate = (models) => {
    Examination.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });

    Examination.hasMany(models.ExamResult, {
      foreignKey: 'examinationId',
      as: 'results',
    });
  };

  // Instance methods
  Examination.prototype.isActive = function() {
    const now = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return now >= start && now <= end;
  };

  Examination.prototype.isCompleted = function() {
    const now = new Date();
    const end = new Date(this.endDate);
    return now > end || this.status === 'completed';
  };

  return Examination;
};
