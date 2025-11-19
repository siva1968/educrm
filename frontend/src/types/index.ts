// Common types
export interface User {
  id: string
  email: string
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'staff'
  firstName: string
  lastName: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface Student {
  id: string
  studentNumber: string
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  gender?: 'male' | 'female' | 'other'
  classId?: string
  status: 'active' | 'inactive' | 'graduated' | 'withdrawn'
  academicYear: string
  admissionDate: string
  phoneNumber?: string
  address?: string
  parentEmail?: string
  parentPhone?: string
  createdAt: string
  updatedAt: string
}

export interface Attendance {
  id: string
  studentId: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  classId?: string
  periodId?: string
  remarks?: string
  markedBy: string
  createdAt: string
  updatedAt: string
}

export interface Fee {
  id: string
  studentId: string
  academicYear: string
  feeStructureId: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  dueDate: string
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  createdAt: string
  updatedAt: string
}

export interface Grade {
  id: string
  studentId: string
  subjectId: string
  examId: string
  score: number
  maxScore: number
  percentage: number
  grade: string
  remarks?: string
  createdAt: string
  updatedAt: string
}

export interface Class {
  id: string
  name: string
  section?: string
  academicYear: string
  classTeacherId?: string
  roomNumber?: string
  capacity?: number
  studentCount?: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalTeachers: number
  totalClasses: number
  attendanceToday: {
    present: number
    absent: number
    late: number
    percentage: number
  }
  feeCollection: {
    collected: number
    pending: number
    overdue: number
    percentage: number
  }
  recentActivities: Activity[]
}

export interface Activity {
  id: string
  type: 'student' | 'attendance' | 'fee' | 'grade' | 'other'
  description: string
  timestamp: string
  userId: string
  userName: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: any
}

export interface ApiError {
  message: string
  errors?: { field: string; message: string }[]
}
