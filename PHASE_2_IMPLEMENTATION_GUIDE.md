# Phase 2: Academic Services - Implementation Guide

## Overview

Phase 2 introduces comprehensive academic management capabilities to the EduCRM platform, including grading, examinations, assignments, subject management, and timetable generation.

## Database Schema

**Migration File**: `006_create_academic_services_schema.sql`

### Tables Created (20 tables)

#### 1. Subject Management
- `academic.subjects` - Subject master data
- `academic.subject_syllabus` - Curriculum and syllabus content

#### 2. Grade Book
- `academic.assessment_types` - Quiz, Test, Mid-term, Final, etc.
- `academic.assessments` - Individual assessments/tests
- `academic.student_grades` - Student marks and grades
- `academic.report_cards` - Consolidated report cards

#### 3. Examinations
- `academic.examinations` - Exam schedules
- `academic.exam_schedule` - Subject-wise exam timetable
- `academic.exam_results` - Exam results and grades

#### 4. Assignments
- `academic.assignments` - Homework and projects
- `academic.assignment_submissions` - Student submissions

#### 5. Timetable
- `academic.timetable_config` - School timing configuration
- `academic.timetable` - Class-wise period schedules
- `academic.teacher_workload` - Teacher workload tracking

## Services Architecture

### 1. Subject Management Service (`/api/v1/subjects`)

**Purpose**: Manage subjects, curriculum, and syllabus

**Key Features**:
- Multi-curriculum support (CBSE, ICSE, Cambridge, IB)
- Subject categorization (Core, Elective, Language)
- Credit system
- Class applicability configuration
- Syllabus management

**Core Endpoints**:
```
POST   /api/v1/subjects           - Create subject
GET    /api/v1/subjects           - List subjects
GET    /api/v1/subjects/:id       - Get subject details
PUT    /api/v1/subjects/:id       - Update subject
DELETE /api/v1/subjects/:id       - Delete subject
POST   /api/v1/subjects/:id/syllabus - Add syllabus
```

**Implementation Structure**:
```
services/subject/
├── validators/subject.validator.js
├── services/subject.service.js
├── controllers/subject.controller.js
└── routes/index.js
```

---

### 2. Grade Book Service (`/api/v1/gradebook`)

**Purpose**: Assessment creation, grade recording, and report card generation

**Key Features**:
- Multiple assessment types (Quiz, Test, Mid-term, Final, Project)
- Automatic grade calculation
- Multi-curriculum grading scales
- Report card generation
- Class rank calculation
- Subject-wise performance tracking

**Core Endpoints**:
```
# Assessment Management
POST   /api/v1/gradebook/assessments          - Create assessment
GET    /api/v1/gradebook/assessments          - List assessments
PUT    /api/v1/gradebook/assessments/:id      - Update assessment

# Grade Management
POST   /api/v1/gradebook/grades               - Record grades
GET    /api/v1/gradebook/grades/student/:id   - Student grades
PUT    /api/v1/gradebook/grades/:id           - Update grade

# Report Cards
POST   /api/v1/gradebook/report-cards         - Generate report card
GET    /api/v1/gradebook/report-cards/:id     - Get report card
POST   /api/v1/gradebook/report-cards/:id/publish - Publish report

# Analytics
GET    /api/v1/gradebook/analytics/class      - Class performance
GET    /api/v1/gradebook/analytics/subject    - Subject analytics
```

**Grading Scales**:
- CBSE: A1 (91-100), A2 (81-90), B1 (71-80), etc.
- ICSE: Percentage-based
- Cambridge/IB: Letter grades with GPA

---

### 3. Examination Management Service (`/api/v1/examinations`)

**Purpose**: Comprehensive exam scheduling and result management

**Key Features**:
- Exam creation and scheduling
- Subject-wise exam timetable
- Exam hall allocation
- Invigilator assignment
- Result processing
- Question paper management
- Result analytics

**Core Endpoints**:
```
# Exam Management
POST   /api/v1/examinations                    - Create exam
GET    /api/v1/examinations                    - List exams
GET    /api/v1/examinations/:id                - Get exam details
PUT    /api/v1/examinations/:id                - Update exam

# Exam Schedule
POST   /api/v1/examinations/:id/schedule       - Add subject schedule
GET    /api/v1/examinations/:id/schedule       - Get exam timetable
PUT    /api/v1/examinations/schedule/:id       - Update schedule

# Results
POST   /api/v1/examinations/results            - Record results
GET    /api/v1/examinations/results/:exam_id   - Get exam results
GET    /api/v1/examinations/results/student/:id - Student results

# Analytics
GET    /api/v1/examinations/:id/analytics      - Exam analytics
GET    /api/v1/examinations/:id/toppers        - Top performers
```

**Exam Types**:
- Unit Test
- Mid-term Examination
- Final Examination
- Board Examination (CBSE/ICSE)

---

### 4. Assignment Management Service (`/api/v1/assignments`)

**Purpose**: Digital assignment workflows and submission tracking

**Key Features**:
- Assignment creation and distribution
- File upload support
- Submission tracking
- Auto-grading capabilities (placeholder)
- Plagiarism detection (placeholder)
- Feedback management
- Late submission handling

**Core Endpoints**:
```
# Assignment Management
POST   /api/v1/assignments                     - Create assignment
GET    /api/v1/assignments                     - List assignments
GET    /api/v1/assignments/:id                 - Get assignment
PUT    /api/v1/assignments/:id                 - Update assignment
DELETE /api/v1/assignments/:id                 - Delete assignment

# Submissions
POST   /api/v1/assignments/:id/submit          - Submit assignment
GET    /api/v1/assignments/:id/submissions     - Get all submissions
GET    /api/v1/assignments/submissions/:id     - Get submission details
PUT    /api/v1/assignments/submissions/:id/grade - Grade submission

# Student View
GET    /api/v1/assignments/my-assignments      - My assignments
GET    /api/v1/assignments/my-submissions      - My submissions
```

**Assignment Types**:
- Homework
- Project
- Lab Work
- Research Assignment
- Presentation

---

### 5. Timetable Management Service (`/api/v1/timetable`)

**Purpose**: AI-optimized class scheduling and timetable generation

**Key Features**:
- Automated timetable generation
- Teacher workload distribution
- Resource allocation
- Conflict resolution
- Substitute teacher management
- Room allocation
- Break and lunch scheduling

**Core Endpoints**:
```
# Configuration
POST   /api/v1/timetable/config                - Create config
GET    /api/v1/timetable/config                - Get configs
PUT    /api/v1/timetable/config/:id            - Update config

# Timetable Management
POST   /api/v1/timetable                       - Create/update timetable
GET    /api/v1/timetable/class/:class          - Get class timetable
GET    /api/v1/timetable/teacher/:id           - Get teacher timetable
POST   /api/v1/timetable/generate              - Auto-generate timetable

# Substitution
POST   /api/v1/timetable/substitute            - Create substitution
GET    /api/v1/timetable/substitutions         - Get substitutions

# Workload
GET    /api/v1/timetable/workload/teacher/:id  - Teacher workload
GET    /api/v1/timetable/workload/summary      - Workload summary
```

**Timetable Features**:
- Automatic conflict detection
- Teacher availability checking
- Room availability checking
- Balanced workload distribution
- Configurable period durations

---

## Implementation Roadmap

### Week 1-2: Subject Management & Grade Book
- ✅ Database schema created
- ✅ Service structure created
- ⏳ Implement Subject Management Service
- ⏳ Implement Grade Book Service
- ⏳ Integration testing

### Week 3-4: Examinations
- ⏳ Implement Examination Service
- ⏳ Result processing logic
- ⏳ Analytics and reporting
- ⏳ Integration testing

### Week 5-6: Assignments
- ⏳ Implement Assignment Service
- ⏳ File upload integration
- ⏳ Submission workflow
- ⏳ Grading system

### Week 7-8: Timetable
- ⏳ Implement Timetable Service
- ⏳ Auto-generation algorithm
- ⏳ Conflict resolution
- ⏳ Teacher workload balancing

---

## Data Models

### Subject
```json
{
  "subject_id": "uuid",
  "subject_code": "MATH101",
  "subject_name": "Mathematics",
  "curriculum": "CBSE",
  "subject_type": "Core",
  "credits": 1.0,
  "applicable_classes": ["9", "10"],
  "is_active": true
}
```

### Assessment
```json
{
  "assessment_id": "uuid",
  "assessment_name": "Mid-term Mathematics",
  "class": "10A",
  "total_marks": 100,
  "scheduled_date": "2024-12-01",
  "status": "Scheduled"
}
```

### Assignment
```json
{
  "assignment_id": "uuid",
  "assignment_title": "Quadratic Equations Worksheet",
  "subject_id": "uuid",
  "class": "10A",
  "assigned_date": "2024-11-20",
  "due_date": "2024-11-27",
  "max_marks": 50
}
```

### Timetable Period
```json
{
  "timetable_id": "uuid",
  "class": "10A",
  "day_of_week": "Monday",
  "period_number": 1,
  "start_time": "08:00",
  "end_time": "08:45",
  "subject_id": "uuid",
  "teacher_id": "uuid",
  "room_number": "101"
}
```

---

## Integration Points

### With Phase 1 Services

**Student Information Service**:
- Student enrollment in subjects
- Class and section information
- Academic year tracking

**Attendance Management**:
- Cross-reference with timetable
- Subject-wise attendance

**Learner Profile**:
- Academic performance tracking
- Strengths and weaknesses identification

**Analytics**:
- Academic performance metrics
- Subject usage statistics

---

## Testing Strategy

### Unit Tests
- Service layer functions
- Validators
- Business logic

### Integration Tests
- API endpoints
- Database operations
- Cross-service interactions

### End-to-End Tests
- Complete workflows (Create Assessment → Record Grades → Generate Report)
- Timetable generation
- Assignment submission flow

---

## API Response Examples

### Create Assessment
```json
// POST /api/v1/gradebook/assessments
{
  "subject_id": "uuid",
  "assessment_name": "Unit Test 1",
  "class": "10A",
  "total_marks": 100,
  "scheduled_date": "2024-12-01"
}

// Response
{
  "status": "success",
  "data": {
    "assessment_id": "uuid",
    "assessment_name": "Unit Test 1",
    "status": "Scheduled",
    "created_at": "2024-11-19T10:00:00Z"
  }
}
```

### Record Grade
```json
// POST /api/v1/gradebook/grades
{
  "assessment_id": "uuid",
  "student_id": "uuid",
  "marks_obtained": 85,
  "remarks": "Excellent performance"
}

// Response
{
  "status": "success",
  "data": {
    "grade_id": "uuid",
    "marks_obtained": 85,
    "percentage": 85,
    "grade": "A",
    "is_passed": true
  }
}
```

---

## Performance Considerations

### Indexing Strategy
- Composite indexes on frequently queried fields
- Class + Academic Year combinations
- Student + Subject combinations

### Caching
- Timetables (rarely change)
- Subject lists
- Assessment configurations

### Optimization
- Batch grade recording
- Async report card generation
- Optimized timetable algorithms

---

## Security

### Access Control
- Teachers can only access their assigned classes/subjects
- Students can only view their own grades
- Admins have full access
- Parents can view their child's academic data

### Data Validation
- Marks validation (0 to max_marks)
- Date validations
- Class/section validations

### Audit Logging
- All grade changes logged
- Report card generation tracked
- Timetable modifications recorded

---

## Future Enhancements

### AI/ML Features
- Predictive analytics for student performance
- Intelligent timetable optimization
- Auto-grading for objective assessments
- Plagiarism detection for assignments

### Advanced Features
- Online examination platform
- Interactive assignments
- Video lectures integration
- Learning path recommendations

---

## Status

**Database Schema**: ✅ Complete
**Service Structure**: ✅ Complete
**API Routes**: ✅ Mounted
**Implementation**: ⏳ Ready for Development

**Next Steps**:
1. Implement each service following Phase 1 patterns
2. Add comprehensive validators (Joi)
3. Implement business logic in service layer
4. Create controllers for request handling
5. Add unit and integration tests
6. Generate API documentation

---

**Last Updated**: 2024-11-19
**Version**: 2.0
**Status**: Ready for Implementation
