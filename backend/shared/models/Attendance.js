const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
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
    classId: {
      type: DataTypes.UUID,
      field: 'class_id',
      references: {
        model: 'classes',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'excused', 'half_day'),
      allowNull: false,
    },
    checkInTime: {
      type: DataTypes.TIME,
      field: 'check_in_time',
    },
    checkOutTime: {
      type: DataTypes.TIME,
      field: 'check_out_time',
    },
    period: {
      type: DataTypes.STRING(50),
    },
    subjectId: {
      type: DataTypes.UUID,
      field: 'subject_id',
      references: {
        model: 'subjects',
        key: 'id',
      },
    },
    remarks: {
      type: DataTypes.TEXT,
    },
    markedBy: {
      type: DataTypes.UUID,
      field: 'marked_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
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
  }, {
    tableName: 'attendance',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['school_id'] },
      { fields: ['student_id'] },
      { fields: ['date'] },
      { fields: ['class_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['student_id', 'date', 'period'] },
    ],
  });

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school',
    });
    Attendance.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student',
    });
    Attendance.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class',
    });
    Attendance.belongsTo(models.Subject, {
      foreignKey: 'subjectId',
      as: 'subject',
    });
  };

  // Class methods
  Attendance.markAttendance = async function(attendanceData) {
    const { studentId, date, period } = attendanceData;

    // Check if attendance already exists
    const existing = await this.findOne({
      where: { studentId, date, period: period || null },
    });

    if (existing) {
      return await existing.update(attendanceData);
    }

    return await this.create(attendanceData);
  };

  Attendance.getAttendanceStats = async function(schoolId, startDate, endDate) {
    const { fn, col, literal } = sequelize;

    return await this.findAll({
      attributes: [
        [fn('DATE', col('date')), 'date'],
        [fn('COUNT', col('id')), 'total'],
        [fn('COUNT', literal("CASE WHEN status = 'present' THEN 1 END")), 'present'],
        [fn('COUNT', literal("CASE WHEN status = 'absent' THEN 1 END")), 'absent'],
        [fn('COUNT', literal("CASE WHEN status = 'late' THEN 1 END")), 'late'],
      ],
      where: {
        schoolId,
        date: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
      group: [fn('DATE', col('date'))],
      raw: true,
    });
  };

  Attendance.getStudentAttendancePercentage = async function(studentId, startDate, endDate) {
    const total = await this.count({
      where: {
        studentId,
        date: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
    });

    const present = await this.count({
      where: {
        studentId,
        status: ['present', 'late'],
        date: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
      },
    });

    return total > 0 ? (present / total) * 100 : 0;
  };

  return Attendance;
};
