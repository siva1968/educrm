const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const School = sequelize.define('School', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255],
      },
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isUppercase: true,
      },
    },
    type: {
      type: DataTypes.ENUM(
        'primary',
        'secondary',
        'higher_secondary',
        'college',
        'university',
        'preschool'
      ),
      allowNull: false,
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
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'India',
    },
    postalCode: {
      type: DataTypes.STRING(20),
      field: 'postal_code',
    },
    phone: {
      type: DataTypes.STRING(20),
      validate: {
        is: /^[+]?[\d\s-()]+$/i,
      },
    },
    email: {
      type: DataTypes.STRING(255),
      validate: {
        isEmail: true,
      },
    },
    website: {
      type: DataTypes.STRING(255),
      validate: {
        isUrl: true,
      },
    },
    establishedDate: {
      type: DataTypes.DATEONLY,
      field: 'established_date',
    },
    affiliation: {
      type: DataTypes.STRING(255),
    },
    board: {
      type: DataTypes.STRING(100),
    },
    principalName: {
      type: DataTypes.STRING(255),
      field: 'principal_name',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
    },
    subscriptionTier: {
      type: DataTypes.STRING(50),
      defaultValue: 'basic',
      field: 'subscription_tier',
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      field: 'subscription_expires_at',
    },
    settings: {
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
    tableName: 'schools',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      { fields: ['code'] },
      { fields: ['status'], where: { deleted_at: null } },
      { fields: ['type'] },
    ],
  });

  School.associate = (models) => {
    School.hasMany(models.User, {
      foreignKey: 'schoolId',
      as: 'users',
    });
    School.hasMany(models.Student, {
      foreignKey: 'schoolId',
      as: 'students',
    });
    School.hasMany(models.Teacher, {
      foreignKey: 'schoolId',
      as: 'teachers',
    });
    School.hasMany(models.Class, {
      foreignKey: 'schoolId',
      as: 'classes',
    });
  };

  return School;
};
