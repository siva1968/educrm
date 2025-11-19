import { z } from 'zod'

// Student validation schema
export const studentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  studentNumber: z.string().min(1, 'Student number is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  classId: z.string().optional(),
  parentEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  parentPhone: z.string().optional(),
  admissionDate: z.string().min(1, 'Admission date is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
})

export type StudentFormData = z.infer<typeof studentSchema>

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Teacher validation schema
export const teacherSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  phoneNumber: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  qualifications: z.string().optional(),
  experience: z.number().optional(),
})

export type TeacherFormData = z.infer<typeof teacherSchema>

// Class validation schema
export const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  section: z.string().optional(),
  academicYear: z.string().min(1, 'Academic year is required'),
  classTeacherId: z.string().optional(),
  roomNumber: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').optional(),
})

export type ClassFormData = z.infer<typeof classSchema>

// Fee structure validation schema
export const feeStructureSchema = z.object({
  name: z.string().min(1, 'Fee structure name is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  dueDate: z.string().min(1, 'Due date is required'),
  description: z.string().optional(),
})

export type FeeStructureFormData = z.infer<typeof feeStructureSchema>
