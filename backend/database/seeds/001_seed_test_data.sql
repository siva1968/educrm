-- ==================================================================================================
-- EduCRM - Seed Data for Testing
-- ==================================================================================================
-- This file creates test data for development and testing purposes
-- ==================================================================================================

-- ==================================================================================================
-- SCHOOLS
-- ==================================================================================================

INSERT INTO schools (id, name, code, type, address, city, state, country, phone, email, website, principal_name, status)
VALUES
('00000000-0000-0000-0000-000000000001', 'Green Valley High School', 'GVHS', 'higher_secondary', '123 Main Street', 'Mumbai', 'Maharashtra', 'India', '+91-22-12345678', 'info@greenvalley.edu.in', 'https://greenvalley.edu.in', 'Dr. Rajesh Kumar', 'active'),
('00000000-0000-0000-0000-000000000002', 'Cambridge International School', 'CIS', 'secondary', '456 Park Avenue', 'Delhi', 'Delhi', 'India', '+91-11-87654321', 'contact@cambridge.edu.in', 'https://cambridge.edu.in', 'Ms. Priya Sharma', 'active'),
('00000000-0000-0000-0000-000000000003', 'Little Stars Preschool', 'LSP', 'preschool', '789 Garden Road', 'Bangalore', 'Karnataka', 'India', '+91-80-11223344', 'hello@littlestars.edu.in', 'https://littlestars.edu.in', 'Mrs. Anjali Reddy', 'active')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- USERS (ADMIN & TEACHERS)
-- ==================================================================================================

-- Passwords are hashed using bcrypt (password: 'password123')
INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, phone, gender, status)
VALUES
-- System Admin
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@educrm.com', '$2b$10$rqYqPIuZVZHQGxPE2TXNl.vVGZx5VqL/u6kBOGqT.4Z9q1GxIJXIq', 'super_admin', 'Admin', 'User', '+91-9999999999', 'male', 'active'),

-- Green Valley High School users
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'principal@greenvalley.edu.in', '$2b$10$rqYqPIuZVZHQGxPE2TXNl.vVGZx5VqL/u6kBOGqT.4Z9q1GxIJXIq', 'school_admin', 'Rajesh', 'Kumar', '+91-9876543210', 'male', 'active'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'teacher1@greenvalley.edu.in', '$2b$10$rqYqPIuZVZHQGxPE2TXNl.vVGZx5VqL/u6kBOGqT.4Z9q1GxIJXIq', 'teacher', 'Amit', 'Singh', '+91-9876543211', 'male', 'active'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'teacher2@greenvalley.edu.in', '$2b$10$rqYqPIuZVZHQGxPE2TXNl.vVGZx5VqL/u6kBOGqT.4Z9q1GxIJXIq', 'teacher', 'Sneha', 'Patel', '+91-9876543212', 'female', 'active'),

-- Cambridge International School users
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'admin@cambridge.edu.in', '$2b$10$rqYqPIuZVZHQGxPE2TXNl.vVGZx5VqL/u6kBOGqT.4Z9q1GxIJXIq', 'school_admin', 'Priya', 'Sharma', '+91-9876543213', 'female', 'active'),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'teacher@cambridge.edu.in', '$2b$10$rqYqPIuZVZHQGxPE2TXNl.vVGZx5VqL/u6kBOGqT.4Z9q1GxIJXIq', 'teacher', 'Vikram', 'Gupta', '+91-9876543214', 'male', 'active')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- TEACHERS
-- ==================================================================================================

INSERT INTO teachers (id, school_id, user_id, employee_id, first_name, last_name, email, phone, date_of_joining, qualification, specialization, department, designation, employment_type, status)
VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'GVHS-T-001', 'Amit', 'Singh', 'teacher1@greenvalley.edu.in', '+91-9876543211', '2020-06-01', 'M.Sc. Mathematics, B.Ed.', 'Mathematics', 'Science', 'Senior Teacher', 'permanent', 'active'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'GVHS-T-002', 'Sneha', 'Patel', 'teacher2@greenvalley.edu.in', '+91-9876543212', '2019-04-15', 'M.A. English, B.Ed.', 'English Literature', 'Languages', 'Head of Department', 'permanent', 'active'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'CIS-T-001', 'Vikram', 'Gupta', 'teacher@cambridge.edu.in', '+91-9876543214', '2021-08-01', 'M.Sc. Physics, B.Ed.', 'Physics', 'Science', 'Teacher', 'permanent', 'active')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- CLASSES
-- ==================================================================================================

INSERT INTO classes (id, school_id, name, level, section, academic_year, class_teacher_id, room_number, capacity, student_count, status)
VALUES
-- Green Valley High School
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Class 10', 10, 'A', '2024-2025', '10000000-0000-0000-0000-000000000003', 'R-101', 40, 35, 'active'),
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Class 10', 10, 'B', '2024-2025', '10000000-0000-0000-0000-000000000004', 'R-102', 40, 38, 'active'),
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Class 9', 9, 'A', '2024-2025', '10000000-0000-0000-0000-000000000003', 'R-201', 40, 32, 'active'),

-- Cambridge International School
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Class 8', 8, 'A', '2024-2025', '10000000-0000-0000-0000-000000000006', 'R-101', 35, 30, 'active')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- SUBJECTS
-- ==================================================================================================

INSERT INTO subjects (id, school_id, name, code, type, category, max_marks, pass_marks, status)
VALUES
('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH-10', 'theory', 'core', 100, 35, 'active'),
('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'English', 'ENG-10', 'theory', 'core', 100, 35, 'active'),
('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Science', 'SCI-10', 'both', 'core', 100, 35, 'active'),
('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Social Studies', 'SS-10', 'theory', 'core', 100, 35, 'active'),
('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Hindi', 'HIN-10', 'theory', 'language', 100, 35, 'active'),
('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Mathematics', 'MATH-8', 'theory', 'core', 100, 40, 'active'),
('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'English', 'ENG-8', 'theory', 'core', 100, 40, 'active')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- STUDENTS
-- ==================================================================================================

INSERT INTO students (id, school_id, student_number, first_name, last_name, email, date_of_birth, gender, phone, admission_date, academic_year, current_class_id, section, roll_number, status)
VALUES
-- Green Valley High School - Class 10A
('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'GVHS-2024-001', 'Rahul', 'Sharma', 'rahul.sharma@student.greenvalley.edu.in', '2009-03-15', 'male', '+91-9123456701', '2020-04-01', '2024-2025', '30000000-0000-0000-0000-000000000001', 'A', '1', 'active'),
('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'GVHS-2024-002', 'Priya', 'Verma', 'priya.verma@student.greenvalley.edu.in', '2009-07-22', 'female', '+91-9123456702', '2020-04-01', '2024-2025', '30000000-0000-0000-0000-000000000001', 'A', '2', 'active'),
('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'GVHS-2024-003', 'Amit', 'Kumar', 'amit.kumar@student.greenvalley.edu.in', '2009-11-10', 'male', '+91-9123456703', '2020-04-01', '2024-2025', '30000000-0000-0000-0000-000000000001', 'A', '3', 'active'),

-- Green Valley High School - Class 10B
('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'GVHS-2024-004', 'Sneha', 'Patel', 'sneha.patel@student.greenvalley.edu.in', '2009-05-18', 'female', '+91-9123456704', '2020-04-01', '2024-2025', '30000000-0000-0000-0000-000000000002', 'B', '1', 'active'),
('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'GVHS-2024-005', 'Vikram', 'Singh', 'vikram.singh@student.greenvalley.edu.in', '2009-09-25', 'male', '+91-9123456705', '2020-04-01', '2024-2025', '30000000-0000-0000-0000-000000000002', 'B', '2', 'active'),

-- Cambridge International School - Class 8A
('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'CIS-2024-001', 'Arjun', 'Reddy', 'arjun.reddy@student.cambridge.edu.in', '2011-02-14', 'male', '+91-9123456706', '2021-06-01', '2024-2025', '30000000-0000-0000-0000-000000000004', 'A', '1', 'active'),
('50000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'CIS-2024-002', 'Ananya', 'Iyer', 'ananya.iyer@student.cambridge.edu.in', '2011-08-30', 'female', '+91-9123456707', '2021-06-01', '2024-2025', '30000000-0000-0000-0000-000000000004', 'A', '2', 'active')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- PARENTS
-- ==================================================================================================

INSERT INTO parents (id, school_id, first_name, last_name, relation, email, phone, is_primary_contact)
VALUES
('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Suresh', 'Sharma', 'father', 'suresh.sharma@email.com', '+91-9123450001', TRUE),
('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Rajesh', 'Verma', 'father', 'rajesh.verma@email.com', '+91-9123450002', TRUE),
('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Dinesh', 'Kumar', 'father', 'dinesh.kumar@email.com', '+91-9123450003', TRUE),
('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Ramesh', 'Patel', 'father', 'ramesh.patel@email.com', '+91-9123450004', TRUE),
('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Anil', 'Singh', 'father', 'anil.singh@email.com', '+91-9123450005', TRUE),
('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Krishna', 'Reddy', 'father', 'krishna.reddy@email.com', '+91-9123450006', TRUE),
('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'Venkat', 'Iyer', 'father', 'venkat.iyer@email.com', '+91-9123450007', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- STUDENT-PARENT RELATIONSHIPS
-- ==================================================================================================

INSERT INTO student_parents (student_id, parent_id, is_primary)
VALUES
('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', TRUE),
('50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', TRUE),
('50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', TRUE),
('50000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', TRUE),
('50000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000005', TRUE),
('50000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000006', TRUE),
('50000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000007', TRUE)
ON CONFLICT (student_id, parent_id) DO NOTHING;

-- ==================================================================================================
-- FEE STRUCTURES
-- ==================================================================================================

INSERT INTO fee_structures (id, school_id, name, class_id, academic_year, amount, frequency, due_date, is_mandatory, status)
VALUES
('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Tuition Fee - Term 1', '30000000-0000-0000-0000-000000000001', '2024-2025', 15000.00, 'quarterly', '2024-07-31', TRUE, 'active'),
('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Tuition Fee - Term 1', '30000000-0000-0000-0000-000000000002', '2024-2025', 15000.00, 'quarterly', '2024-07-31', TRUE, 'active'),
('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Annual Fee', '30000000-0000-0000-0000-000000000004', '2024-2025', 50000.00, 'yearly', '2024-06-30', TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

-- ==================================================================================================
-- ATTENDANCE RECORDS (Last 7 days)
-- ==================================================================================================

INSERT INTO attendance (school_id, student_id, class_id, date, status, marked_by)
SELECT
    s.school_id,
    s.id,
    s.current_class_id,
    CURRENT_DATE - i,
    CASE WHEN random() < 0.9 THEN 'present' ELSE 'absent' END,
    '10000000-0000-0000-0000-000000000003'
FROM students s
CROSS JOIN generate_series(0, 6) i
WHERE s.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ==================================================================================================
-- SUMMARY
-- ==================================================================================================

-- Display summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE ' Seed Data Inserted Successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE ' Schools: %', (SELECT COUNT(*) FROM schools WHERE deleted_at IS NULL);
    RAISE NOTICE ' Users: %', (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL);
    RAISE NOTICE ' Teachers: %', (SELECT COUNT(*) FROM teachers WHERE deleted_at IS NULL);
    RAISE NOTICE ' Students: %', (SELECT COUNT(*) FROM students WHERE deleted_at IS NULL);
    RAISE NOTICE ' Parents: %', (SELECT COUNT(*) FROM parents WHERE deleted_at IS NULL);
    RAISE NOTICE ' Classes: %', (SELECT COUNT(*) FROM classes WHERE deleted_at IS NULL);
    RAISE NOTICE ' Subjects: %', (SELECT COUNT(*) FROM subjects WHERE deleted_at IS NULL);
    RAISE NOTICE ' Attendance Records: %', (SELECT COUNT(*) FROM attendance);
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE ' Default Login Credentials:';
    RAISE NOTICE ' Email: admin@educrm.com';
    RAISE NOTICE ' Password: password123';
    RAISE NOTICE '========================================';
END $$;
