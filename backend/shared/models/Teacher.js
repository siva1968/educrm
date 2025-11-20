/**
 * Teacher Model
 * Represents teaching staff in the system
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Teacher = sequelize.define('Teacher', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    employeeId: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: 'employee_id',
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_of_birth',
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'zip_code',
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    qualification: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    specialization: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Years of experience',
    },
    joiningDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'joining_date',
    },
    employmentType: {
      type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'temporary'),
      defaultValue: 'full-time',
      field: 'employment_type',
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'on-leave', 'suspended', 'resigned', 'terminated'),
      defaultValue: 'active',
    },
    profilePicture: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'profile_picture',
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
    tableName: 'teachers',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['employee_id'], unique: true },
      { fields: ['email'], unique: true },
      { fields: ['status'] },
    ],
  });

  // Associations
  Teacher.associate = (models) => {
    Teacher.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });
    
    Teacher.hasMany(models.Class, {
      foreignKey: 'classTeacherId',
      as: 'classes',
    });

    Teacher.belongsToMany(models.Subject, {
      through: 'teacher_subjects',
      foreignKey: 'teacherId',
      otherKey: 'subjectId',
      as: 'subjects',
    });
  };

  // Instance methods
  Teacher.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  Teacher.prototype.getAge = function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Class methods
  Teacher.findBySchool = async function(schoolId, options = {}) {
    return await this.findAll({
      where: { schoolId, ...options.where },
      ...options,
    });
  };

  Teacher.findActiveTeachers = async function(schoolId) {
    return await this.findAll({
      where: { schoolId, status: 'active' },
      order: [['firstName', 'ASC']],
    });
  };

  return Teacher;
};
