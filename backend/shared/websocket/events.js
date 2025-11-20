/**
 * WebSocket Event Emitters
 * Centralized functions for emitting real-time events
 */

let wsServer = null;

// Set WebSocket server instance
function setWebSocketServer(server) {
  wsServer = server;
}

// Get WebSocket server instance
function getWebSocketServer() {
  return wsServer;
}

/**
 * Notification Events
 */
const NotificationEvents = {
  // Send notification to specific user
  sendToUser(userId, notification) {
    if (!wsServer) return;
    wsServer.emitToUser(userId, 'notification:new', notification);
  },

  // Send notification to all users in a school
  sendToSchool(schoolId, notification) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'notification:new', notification);
  },

  // Broadcast system notification
  sendSystemNotification(notification) {
    if (!wsServer) return;
    wsServer.broadcast('notification:system', notification);
  },
};

/**
 * Attendance Events
 */
const AttendanceEvents = {
  // Attendance marked for student
  attendanceMarked(schoolId, studentId, attendanceData) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'attendance:marked', {
      studentId,
      ...attendanceData,
    });
    // Also notify student's parents
    wsServer.emitToUser(studentId, 'attendance:update', attendanceData);
  },

  // Class attendance completed
  classAttendanceCompleted(schoolId, classId, summary) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'attendance:class-completed', {
      classId,
      summary,
      timestamp: new Date(),
    });
  },

  // Low attendance alert
  lowAttendanceAlert(schoolId, userId, alertData) {
    if (!wsServer) return;
    wsServer.emitToUser(userId, 'attendance:low-alert', alertData);
  },
};

/**
 * Exam & Result Events
 */
const ExamEvents = {
  // Exam result published
  resultPublished(schoolId, studentId, result) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'exam:result-published', {
      studentId,
      result,
    });
    wsServer.emitToUser(studentId, 'exam:your-result', result);
  },

  // Exam scheduled
  examScheduled(schoolId, examData) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'exam:scheduled', examData);
  },

  // Grade updated
  gradeUpdated(userId, gradeData) {
    if (!wsServer) return;
    wsServer.emitToUser(userId, 'grade:updated', gradeData);
  },
};

/**
 * Fee Payment Events
 */
const FeeEvents = {
  // Payment received
  paymentReceived(schoolId, studentId, payment) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'fee:payment-received', payment);
    wsServer.emitToUser(studentId, 'fee:payment-confirmed', payment);
  },

  // Fee due reminder
  feeDueReminder(userId, reminder) {
    if (!wsServer) return;
    wsServer.emitToUser(userId, 'fee:due-reminder', reminder);
  },

  // Receipt generated
  receiptGenerated(userId, receipt) {
    if (!wsServer) return;
    wsServer.emitToUser(userId, 'fee:receipt', receipt);
  },
};

/**
 * Messaging Events
 */
const MessageEvents = {
  // Send message to user
  sendToUser(userId, message) {
    if (!wsServer) return;
    wsServer.emitToUser(userId, 'message:new', message);
  },

  // Send message to room/channel
  sendToRoom(roomId, message) {
    if (!wsServer) return;
    wsServer.emitToRoom(roomId, 'message:new', message);
  },

  // Typing indicator
  userTyping(roomId, userId, isTyping) {
    if (!wsServer) return;
    wsServer.emitToRoom(roomId, 'message:typing', {
      userId,
      isTyping,
      timestamp: new Date(),
    });
  },
};

/**
 * Assignment Events
 */
const AssignmentEvents = {
  // New assignment created
  assignmentCreated(schoolId, classId, assignment) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'assignment:new', assignment);
    wsServer.emitToRoom('class:' + classId, 'assignment:new', assignment);
  },

  // Assignment submitted
  assignmentSubmitted(teacherId, studentId, submission) {
    if (!wsServer) return;
    wsServer.emitToUser(teacherId, 'assignment:submitted', {
      studentId,
      submission,
    });
  },

  // Assignment graded
  assignmentGraded(studentId, grade) {
    if (!wsServer) return;
    wsServer.emitToUser(studentId, 'assignment:graded', grade);
  },
};

/**
 * Online Class Events
 */
const OnlineClassEvents = {
  // Class started
  classStarted(schoolId, classId, classData) {
    if (!wsServer) return;
    wsServer.emitToSchool(schoolId, 'class:started', classData);
    wsServer.emitToRoom('class:' + classId, 'class:started', classData);
  },

  // Class ended
  classEnded(classId, summary) {
    if (!wsServer) return;
    wsServer.emitToRoom('class:' + classId, 'class:ended', summary);
  },

  // Student joined class
  studentJoined(classId, studentData) {
    if (!wsServer) return;
    wsServer.emitToRoom('class:' + classId, 'class:student-joined', studentData);
  },

  // Student left class
  studentLeft(classId, studentData) {
    if (!wsServer) return;
    wsServer.emitToRoom('class:' + classId, 'class:student-left', studentData);
  },
};

/**
 * System Events
 */
const SystemEvents = {
  // System announcement
  announcement(schoolId, announcement) {
    if (!wsServer) return;
    if (schoolId) {
      wsServer.emitToSchool(schoolId, 'system:announcement', announcement);
    } else {
      wsServer.broadcast('system:announcement', announcement);
    }
  },

  // Maintenance notification
  maintenance(maintenanceInfo) {
    if (!wsServer) return;
    wsServer.broadcast('system:maintenance', maintenanceInfo);
  },
};

module.exports = {
  setWebSocketServer,
  getWebSocketServer,
  NotificationEvents,
  AttendanceEvents,
  ExamEvents,
  FeeEvents,
  MessageEvents,
  AssignmentEvents,
  OnlineClassEvents,
  SystemEvents,
};
