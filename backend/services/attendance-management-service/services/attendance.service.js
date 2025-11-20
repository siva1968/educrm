const { Student, Attendance, Class } = require('../../../shared/models/loader');
const { Op } = require('sequelize');
const cache = require('../../../shared/utils/cache-v4');

/**
 * Attendance Service
 * Business logic for attendance management
 */

class AttendanceService {
  /**
   * Mark attendance for a student
   */
  async markAttendance(data) {
    const { studentId, date, status, classId, period, markedBy, remarks } = data;

    // Validate student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Mark attendance (upsert)
    const attendance = await Attendance.markAttendance({
      schoolId: student.schoolId,
      studentId,
      classId: classId || student.currentClassId,
      date,
      status,
      period,
      markedBy,
      remarks,
    });

    // Invalidate cache
    await cache.invalidateResource(`attendance:${studentId}`);
    await cache.invalidateResource(`attendance:class:${classId}`);

    return attendance;
  }

  /**
   * Mark attendance for entire class
   */
  async markClassAttendance(classId, date, attendanceData, markedBy) {
    const classObj = await Class.findByPk(classId, {
      include: [{ model: Student, as: 'students', where: { status: 'active' } }],
    });

    if (!classObj) {
      throw new Error('Class not found');
    }

    const results = [];

    for (const record of attendanceData) {
      const attendance = await this.markAttendance({
        studentId: record.studentId,
        date,
        status: record.status,
        classId,
        period: record.period,
        markedBy,
        remarks: record.remarks,
      });
      results.push(attendance);
    }

    return {
      classId,
      date,
      totalStudents: classObj.students.length,
      markedCount: results.length,
      attendance: results,
    };
  }

  /**
   * Get attendance for a student
   */
  async getStudentAttendance(studentId, startDate, endDate, options = {}) {
    const cacheKey = `attendance:${studentId}:${startDate}:${endDate}`;

    // Try cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const where = {
      studentId,
      date: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (options.status) {
      where.status = options.status;
    }

    const attendance = await Attendance.findAll({
      where,
      include: [
        { model: Class, as: 'class', attributes: ['id', 'name', 'section'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
      ],
      order: [['date', 'DESC']],
    });

    // Calculate statistics
    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      excused: attendance.filter(a => a.status === 'excused').length,
      percentage: 0,
    };

    if (stats.total > 0) {
      stats.percentage = ((stats.present + stats.late) / stats.total) * 100;
    }

    const result = {
      studentId,
      period: { startDate, endDate },
      stats,
      records: attendance,
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get attendance for a class on a specific date
   */
  async getClassAttendance(classId, date) {
    const attendance = await Attendance.findAll({
      where: { classId, date },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'studentNumber', 'firstName', 'lastName', 'rollNumber'],
        },
      ],
      order: [[{ model: Student, as: 'student' }, 'rollNumber', 'ASC']],
    });

    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
    };

    return {
      classId,
      date,
      stats,
      attendance,
    };
  }

  /**
   * Get attendance statistics for school
   */
  async getSchoolAttendanceStats(schoolId, startDate, endDate) {
    return await Attendance.getAttendanceStats(schoolId, startDate, endDate);
  }

  /**
   * Get students with low attendance
   */
  async getStudentsWithLowAttendance(schoolId, threshold = 75, startDate, endDate) {
    const students = await Student.findAll({
      where: { schoolId, status: 'active' },
    });

    const lowAttendance = [];

    for (const student of students) {
      const percentage = await Attendance.getStudentAttendancePercentage(
        student.id,
        startDate,
        endDate
      );

      if (percentage < threshold) {
        lowAttendance.push({
          student: {
            id: student.id,
            studentNumber: student.studentNumber,
            name: student.getFullName(),
          },
          attendancePercentage: percentage.toFixed(2),
        });
      }
    }

    return lowAttendance.sort((a, b) => a.attendancePercentage - b.attendancePercentage);
  }

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(classId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.findAll({
      where: {
        classId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'studentNumber', 'firstName', 'lastName', 'rollNumber'],
        },
      ],
      order: [
        [{ model: Student, as: 'student' }, 'rollNumber', 'ASC'],
        ['date', 'ASC'],
      ],
    });

    // Group by student
    const reportData = {};

    attendance.forEach(record => {
      const studentId = record.studentId;
      if (!reportData[studentId]) {
        reportData[studentId] = {
          student: record.student,
          attendance: [],
          stats: { present: 0, absent: 0, late: 0, excused: 0, total: 0 },
        };
      }

      reportData[studentId].attendance.push({
        date: record.date,
        status: record.status,
      });

      reportData[studentId].stats.total++;
      reportData[studentId].stats[record.status]++;
    });

    // Calculate percentages
    Object.values(reportData).forEach(data => {
      const { present, late, total } = data.stats;
      data.stats.percentage = total > 0 ? ((present + late) / total) * 100 : 0;
    });

    return {
      classId,
      period: { month, year, startDate, endDate },
      students: Object.values(reportData),
    };
  }

  /**
   * Get today's attendance summary
   */
  async getTodayAttendanceSummary(schoolId) {
    const today = new Date().toISOString().split('T')[0];

    const total = await Attendance.count({
      where: { schoolId, date: today },
    });

    const present = await Attendance.count({
      where: { schoolId, date: today, status: 'present' },
    });

    const absent = await Attendance.count({
      where: { schoolId, date: today, status: 'absent' },
    });

    const late = await Attendance.count({
      where: { schoolId, date: today, status: 'late' },
    });

    const totalStudents = await Student.count({
      where: { schoolId, status: 'active' },
    });

    return {
      date: today,
      total,
      present,
      absent,
      late,
      unmarked: totalStudents - total,
      percentage: total > 0 ? (present / total) * 100 : 0,
    };
  }
}

module.exports = new AttendanceService();
