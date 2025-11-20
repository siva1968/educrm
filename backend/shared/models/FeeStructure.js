/**
 * FeeStructure Model
 * Defines fee categories and amounts
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FeeStructure = sequelize.define('FeeStructure', {
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
      comment: 'e.g., Tuition Fee, Library Fee',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('tuition', 'library', 'sports', 'transportation', 'exam', 'miscellaneous'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
    },
    frequency: {
      type: DataTypes.ENUM('one-time', 'monthly', 'quarterly', 'semi-annual', 'annual'),
      defaultValue: 'annual',
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'academic_year',
    },
    applicableToGrades: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      field: 'applicable_to_grades',
      comment: 'Array of grade levels',
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'due_date',
    },
    lateFeeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'late_fee_amount',
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
    tableName: 'fee_structures',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['academic_year'] },
      { fields: ['category'] },
      { fields: ['status'] },
    ],
  });

  // Associations
  FeeStructure.associate = (models) => {
    FeeStructure.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });

    FeeStructure.hasMany(models.FeePayment, {
      foreignKey: 'feeStructureId',
      as: 'payments',
    });
  };

  return FeeStructure;
};
