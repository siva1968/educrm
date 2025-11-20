const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Student = sequelize.define('Student', {
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
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    studentNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'student_number',
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
      validate: {
        isEmail: true,
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_of_birth',
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
    },
    bloodGroup: {
      type: DataTypes.STRING(5),
      field: 'blood_group',
    },
    phone: {
      type: DataTypes.STRING(20),
    },
    emergencyContactName: {
      type: DataTypes.STRING(255),
      field: 'emergency_contact_name',
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(20),
      field: 'emergency_contact_phone',
    },
    emergencyContactRelation: {
      type: DataTypes.STRING(50),
      field: 'emergency_contact_relation',
    },
    address: {
      type: DataTypes.TEXT,
    },
    city: {
      type: DataTypes.STRING(100),
    },
    state: {
      type: DataTypes.STRING(100),
    },
    postalCode: {
      type: DataTypes.STRING(20),
      field: 'postal_code',
    },
    admissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'admission_date',
    },
    admissionNumber: {
      type: DataTypes.STRING(50),
      field: 'admission_number',
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'academic_year',
    },
    currentClassId: {
      type: DataTypes.UUID,
      field: 'current_class_id',
      references: {
        model: 'classes',
        key: 'id',
      },
    },
    section: {
      type: DataTypes.STRING(10),
    },
    rollNumber: {
      type: DataTypes.STRING(50),
      field: 'roll_number',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'graduated', 'withdrawn', 'suspended', 'transferred'),
      defaultValue: 'active',
    },
    photoUrl: {
      type: DataTypes.TEXT,
      field: 'photo_url',
    },
    religion: {
      type: DataTypes.STRING(50),
    },
    caste: {
      type: DataTypes.STRING(50),
    },
    nationality: {
      type: DataTypes.STRING(50),
      defaultValue: 'Indian',
    },
    motherTongue: {
      type: DataTypes.STRING(50),
      field: 'mother_tongue',
    },
    aadharNumber: {
      type: DataTypes.STRING(12),
      field: 'aadhar_number',
    },
    previousSchool: {
      type: DataTypes.TEXT,
      field: 'previous_school',
    },
    medicalConditions: {
      type: DataTypes.TEXT,
      field: 'medical_conditions',
    },
    allergies: {
      type: DataTypes.TEXT,
    },
    specialNeeds: {
      type: DataTypes.TEXT,
      field: 'special_needs',
    },
    transportRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'transport_required',
    },
    hostelRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'hostel_required',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at',
    },
  }, {
    tableName: 'students',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      { fields: ['school_id'], where: { deleted_at: null } },
      { fields: ['student_number'] },
      { fields: ['current_class_id'], where: { deleted_at: null } },
      { fields: ['status'] },
      { fields: ['academic_year'] },
    ],
    hooks: {
      beforeValidate: (student) => {
        // Auto-generate student number if not provided
        if (!student.studentNumber && student.schoolId) {
          const year = new Date().getFullYear();
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          student.studentNumber = `STU-${year}-${random}`;
        }
      },
    },
  });

  Student.associate = (models) => {
    Student.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });
    Student.belongsTo(models.Class, {
      foreignKey: 'currentClassId',
      as: 'currentClass',
    });
    Student.hasMany(models.Attendance, {
      foreignKey: 'studentId',
      as: 'attendances',
    });
    Student.hasMany(models.FeePayment, {
      foreignKey: 'studentId',
      as: 'feePayments',
    });
    Student.belongsToMany(models.Parent, {
      through: 'student_parents',
      foreignKey: 'studentId',
      otherKey: 'parentId',
      as: 'parents',
    });
  };

  // Instance methods
  Student.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  Student.prototype.getAge = function() {
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
  Student.findBySchool = function(schoolId, options = {}) {
    return this.findAll({
      where: { schoolId, ...options.where },
      ...options,
    });
  };

  Student.findActiveStudents = function(schoolId) {
    return this.findAll({
      where: { schoolId, status: 'active' },
    });
  };

  return Student;
};
