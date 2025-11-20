/**
 * FeePayment Model
 * Records fee payments made by students
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FeePayment = sequelize.define('FeePayment', {
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
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'student_id',
      references: {
        model: 'students',
        key: 'id',
      },
    },
    feeStructureId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'fee_structure_id',
      references: {
        model: 'fee_structures',
        key: 'id',
      },
    },
    transactionId: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      field: 'transaction_id',
    },
    receiptNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: true,
      field: 'receipt_number',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'bank-transfer', 'cheque', 'online', 'other'),
      allowNull: false,
      field: 'payment_method',
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'payment_date',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
      defaultValue: 'completed',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    collectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'collected_by',
      comment: 'User ID who collected the payment',
    },
    paymentGateway: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_gateway',
      comment: 'e.g., Stripe, PayPal',
    },
    gatewayTransactionId: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'gateway_transaction_id',
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
    tableName: 'fee_payments',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['student_id'] },
      { fields: ['fee_structure_id'] },
      { fields: ['transaction_id'], unique: true },
      { fields: ['status'] },
      { fields: ['payment_date'] },
    ],
  });

  // Associations
  FeePayment.associate = (models) => {
    FeePayment.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });

    FeePayment.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student',
    });

    FeePayment.belongsTo(models.FeeStructure, {
      foreignKey: 'feeStructureId',
      as: 'feeStructure',
    });
  };

  // Class methods
  FeePayment.getTotalCollected = async function(schoolId, startDate, endDate) {
    const result = await this.findAll({
      where: {
        schoolId,
        status: 'completed',
        paymentDate: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [sequelize.Sequelize.fn('SUM', sequelize.Sequelize.col('amount')), 'total'],
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'count'],
      ],
      raw: true,
    });
    return result[0];
  };

  return FeePayment;
};
