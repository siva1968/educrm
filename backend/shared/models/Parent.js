/**
 * Parent Model
 * Represents parent/guardian information
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Parent = sequelize.define('Parent', {
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
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    alternatePhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'alternate_phone',
    },
    relationship: {
      type: DataTypes.ENUM('father', 'mother', 'guardian', 'other'),
      allowNull: false,
    },
    occupation: {
      type: DataTypes.STRING(100),
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
    emergencyContact: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'emergency_contact',
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
    tableName: 'parents',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['email'] },
      { fields: ['phone'] },
      { fields: ['status'] },
    ],
  });

  // Associations
  Parent.associate = (models) => {
    Parent.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });

    Parent.belongsToMany(models.Student, {
      through: 'student_parents',
      foreignKey: 'parentId',
      otherKey: 'studentId',
      as: 'children',
    });
  };

  // Instance methods
  Parent.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  return Parent;
};
