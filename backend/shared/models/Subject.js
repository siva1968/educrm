/**
 * Subject Model
 * Represents academic subjects
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subject = sequelize.define('Subject', {
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
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'e.g., MATH101, ENG102',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('core', 'elective', 'optional', 'extra-curricular'),
      defaultValue: 'core',
    },
    credits: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
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
    tableName: 'subjects',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['code'], unique: true },
      { fields: ['status'] },
    ],
  });

  // Associations
  Subject.associate = (models) => {
    Subject.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });

    Subject.belongsToMany(models.Teacher, {
      through: 'teacher_subjects',
      foreignKey: 'subjectId',
      otherKey: 'teacherId',
      as: 'teachers',
    });

    Subject.belongsToMany(models.Class, {
      through: 'class_subjects',
      foreignKey: 'subjectId',
      otherKey: 'classId',
      as: 'classes',
    });
  };

  return Subject;
};
