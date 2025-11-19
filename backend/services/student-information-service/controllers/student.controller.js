const studentService = require('../services/student.service');
const { v4: uuidv4 } = require('uuid');

class StudentController {
  // Create new student
  async createStudent(req, res) {
    try {
      const studentData = {
        studentId: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const student = await studentService.createStudent(studentData);
      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: student
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all students
  async getAllStudents(req, res) {
    try {
      const { page = 1, limit = 50, status, class: className, section } = req.query;
      const filters = { status, class: className, section };

      const result = await studentService.getAllStudents(filters, page, limit);
      res.json({
        success: true,
        data: result.students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get student by ID
  async getStudentById(req, res) {
    try {
      const student = await studentService.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      res.json({ success: true, data: student });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update student
  async updateStudent(req, res) {
    try {
      const updates = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      const student = await studentService.updateStudent(req.params.id, updates);
      res.json({
        success: true,
        message: 'Student updated successfully',
        data: student
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Delete student
  async deleteStudent(req, res) {
    try {
      await studentService.deleteStudent(req.params.id);
      res.json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Search students
  async searchStudents(req, res) {
    try {
      const { query, field } = req.query;
      const results = await studentService.searchStudents(query, field);
      res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Bulk import students
  async bulkImportStudents(req, res) {
    try {
      const { students } = req.body;
      const result = await studentService.bulkImportStudents(students);
      res.status(201).json({
        success: true,
        message: `${result.success} students imported successfully`,
        data: {
          total: students.length,
          success: result.success,
          failed: result.failed,
          errors: result.errors
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Enroll student
  async enrollStudent(req, res) {
    try {
      const enrollmentData = {
        enrollmentId: uuidv4(),
        ...req.body,
        enrollmentDate: new Date().toISOString()
      };

      const enrollment = await studentService.enrollStudent(enrollmentData);
      res.status(201).json({
        success: true,
        message: 'Student enrolled successfully',
        data: enrollment
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get enrollment by student
  async getEnrollmentByStudent(req, res) {
    try {
      const enrollment = await studentService.getEnrollmentByStudent(req.params.id);
      res.json({ success: true, data: enrollment });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Transfer student
  async transferStudent(req, res) {
    try {
      const result = await studentService.transferStudent(req.body);
      res.json({
        success: true,
        message: 'Student transferred successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Withdraw student
  async withdrawStudent(req, res) {
    try {
      const result = await studentService.withdrawStudent(req.body);
      res.json({
        success: true,
        message: 'Student withdrawn successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Upload document
  async uploadDocument(req, res) {
    try {
      const documentData = {
        documentId: uuidv4(),
        ...req.body,
        uploadedAt: new Date().toISOString()
      };

      const document = await studentService.uploadDocument(documentData);
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get documents by student
  async getDocumentsByStudent(req, res) {
    try {
      const documents = await studentService.getDocumentsByStudent(req.params.id);
      res.json({ success: true, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Download document
  async downloadDocument(req, res) {
    try {
      const document = await studentService.getDocumentById(req.params.id);
      res.json({ success: true, data: document });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Add guardian
  async addGuardian(req, res) {
    try {
      const guardianData = {
        guardianId: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
      };

      const guardian = await studentService.addGuardian(guardianData);
      res.status(201).json({
        success: true,
        message: 'Guardian added successfully',
        data: guardian
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get guardians by student
  async getGuardiansByStudent(req, res) {
    try {
      const guardians = await studentService.getGuardiansByStudent(req.params.id);
      res.json({ success: true, data: guardians });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update guardian
  async updateGuardian(req, res) {
    try {
      const guardian = await studentService.updateGuardian(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Guardian updated successfully',
        data: guardian
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get student statistics
  async getStudentStatistics(req, res) {
    try {
      const stats = await studentService.getStudentStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get demographics
  async getDemographics(req, res) {
    try {
      const demographics = await studentService.getDemographics();
      res.json({ success: true, data: demographics });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new StudentController();
