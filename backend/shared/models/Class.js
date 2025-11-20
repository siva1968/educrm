/**
 * Class Model
 * Represents classes/sections in the school
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Class = sequelize.define('Class', {
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
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g., Grade 10-A, Year 5 Blue',
    },
    grade: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'e.g., 10, Year 5, K1',
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'e.g., A, B, Blue, Red',
    },
    classTeacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'class_teacher_id',
      references: {
        model: 'teachers',
        key: 'id',
      },
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'academic_year',
      comment: 'e.g., 2024-2025',
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30,
    },
    currentStrength: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_strength',
    },
    room: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Classroom number/name',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'archived'),
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
    tableName: 'classes',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['school_id', 'name'], unique: true },
      { fields: ['class_teacher_id'] },
      { fields: ['academic_year'] },
      { fields: ['status'] },
    ],
  });

  // Associations
  Class.associate = (models) => {
    Class.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });

    Class.belongsTo(models.Teacher, {
      foreignKey: 'classTeacherId',
      as: 'classTeacher',
    });

    Class.hasMany(models.Student, {
      foreignKey: 'classId',
      as: 'students',
    });

    Class.hasMany(models.Attendance, {
      foreignKey: 'classId',
      as: 'attendanceRecords',
    });

    Class.belongsToMany(models.Subject, {
      through: 'class_subjects',
      foreignKey: 'classId',
      otherKey: 'subjectId',
      as: 'subjects',
    });
  };

  // Instance methods
  Class.prototype.isFull = function() {
    return this.currentStrength >= this.capacity;
  };

  Class.prototype.getAvailableSeats = function() {
    return Math.max(0, this.capacity - this.currentStrength);
  };

  // Class methods
  Class.findBySchool = async function(schoolId, academicYear, options = {}) {
    return await this.findAll({
      where: { 
        schoolId, 
        academicYear,
        ...options.where 
      },
      ...options,
    });
  };

  Class.findActiveClasses = async function(schoolId, academicYear) {
    return await this.findAll({
      where: { 
        schoolId, 
        academicYear,
        status: 'active' 
      },
      order: [['grade', 'ASC'], ['section', 'ASC']],
    });
  };

  return Class;
};
