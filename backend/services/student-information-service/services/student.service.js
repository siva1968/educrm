/**
 * Student Information Service
 * Handles all business logic for student management
 */

class StudentService {
  constructor() {
    // Mock database - in production, this would use PostgreSQL
    this.students = new Map();
    this.enrollments = new Map();
    this.documents = new Map();
    this.guardians = new Map();
  }

  // Create new student
  async createStudent(studentData) {
    this.students.set(studentData.studentId, studentData);
    return studentData;
  }

  // Get all students with filters
  async getAllStudents(filters, page = 1, limit = 50) {
    let students = Array.from(this.students.values());

    // Apply filters
    if (filters.status) {
      students = students.filter(s => s.status === filters.status);
    }
    if (filters.class) {
      students = students.filter(s => s.class === filters.class);
    }
    if (filters.section) {
      students = students.filter(s => s.section === filters.section);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedStudents = students.slice(startIndex, endIndex);

    return {
      students: paginatedStudents,
      total: students.length
    };
  }

  // Get student by ID
  async getStudentById(studentId) {
    return this.students.get(studentId);
  }

  // Update student
  async updateStudent(studentId, updates) {
    const student = this.students.get(studentId);
    if (!student) throw new Error('Student not found');

    const updatedStudent = { ...student, ...updates };
    this.students.set(studentId, updatedStudent);
    return updatedStudent;
  }

  // Delete student
  async deleteStudent(studentId) {
    if (!this.students.has(studentId)) {
      throw new Error('Student not found');
    }
    this.students.delete(studentId);
    return true;
  }

  // Search students
  async searchStudents(query, field = 'all') {
    const students = Array.from(this.students.values());

    if (field === 'all') {
      return students.filter(s =>
        JSON.stringify(s).toLowerCase().includes(query.toLowerCase())
      );
    }

    return students.filter(s =>
      s[field] && s[field].toString().toLowerCase().includes(query.toLowerCase())
    );
  }

  // Bulk import students
  async bulkImportStudents(students) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const student of students) {
      try {
        await this.createStudent(student);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          student: student.name || student.email,
          error: error.message
        });
      }
    }

    return results;
  }

  // Enroll student
  async enrollStudent(enrollmentData) {
    this.enrollments.set(enrollmentData.enrollmentId, enrollmentData);
    return enrollmentData;
  }

  // Get enrollment by student
  async getEnrollmentByStudent(studentId) {
    const enrollments = Array.from(this.enrollments.values());
    return enrollments.filter(e => e.studentId === studentId);
  }

  // Transfer student
  async transferStudent(transferData) {
    const { studentId, fromClass, toClass, effectiveDate, reason } = transferData;

    const student = await this.getStudentById(studentId);
    if (!student) throw new Error('Student not found');

    const updatedStudent = await this.updateStudent(studentId, {
      class: toClass,
      previousClass: fromClass,
      transferDate: effectiveDate,
      transferReason: reason
    });

    return {
      studentId,
      fromClass,
      toClass,
      effectiveDate,
      status: 'transferred'
    };
  }

  // Withdraw student
  async withdrawStudent(withdrawalData) {
    const { studentId, effectiveDate, reason } = withdrawalData;

    const student = await this.getStudentById(studentId);
    if (!student) throw new Error('Student not found');

    const updatedStudent = await this.updateStudent(studentId, {
      status: 'withdrawn',
      withdrawalDate: effectiveDate,
      withdrawalReason: reason
    });

    return {
      studentId,
      effectiveDate,
      status: 'withdrawn'
    };
  }

  // Upload document
  async uploadDocument(documentData) {
    this.documents.set(documentData.documentId, documentData);
    return documentData;
  }

  // Get documents by student
  async getDocumentsByStudent(studentId) {
    const documents = Array.from(this.documents.values());
    return documents.filter(d => d.studentId === studentId);
  }

  // Get document by ID
  async getDocumentById(documentId) {
    return this.documents.get(documentId);
  }

  // Add guardian
  async addGuardian(guardianData) {
    this.guardians.set(guardianData.guardianId, guardianData);
    return guardianData;
  }

  // Get guardians by student
  async getGuardiansByStudent(studentId) {
    const guardians = Array.from(this.guardians.values());
    return guardians.filter(g => g.studentId === studentId);
  }

  // Update guardian
  async updateGuardian(guardianId, updates) {
    const guardian = this.guardians.get(guardianId);
    if (!guardian) throw new Error('Guardian not found');

    const updatedGuardian = { ...guardian, ...updates };
    this.guardians.set(guardianId, updatedGuardian);
    return updatedGuardian;
  }

  // Get student statistics
  async getStudentStatistics() {
    const students = Array.from(this.students.values());

    return {
      total: students.length,
      active: students.filter(s => s.status === 'active').length,
      inactive: students.filter(s => s.status === 'inactive').length,
      graduated: students.filter(s => s.status === 'graduated').length,
      withdrawn: students.filter(s => s.status === 'withdrawn').length,
      byGender: {
        male: students.filter(s => s.gender === 'male').length,
        female: students.filter(s => s.gender === 'female').length,
        other: students.filter(s => s.gender === 'other').length
      }
    };
  }

  // Get demographics
  async getDemographics() {
    const students = Array.from(this.students.values());

    // Group by class
    const byClass = students.reduce((acc, student) => {
      acc[student.class] = (acc[student.class] || 0) + 1;
      return acc;
    }, {});

    // Group by section
    const bySection = students.reduce((acc, student) => {
      acc[student.section] = (acc[student.section] || 0) + 1;
      return acc;
    }, {});

    return {
      byClass,
      bySection,
      totalStudents: students.length
    };
  }
}

module.exports = new StudentService();
