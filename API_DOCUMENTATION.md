# EduCRM - Complete API Documentation

**Base URL**: `http://localhost:3000/api/v1`

**Authentication**: Bearer JWT Token (Coming Soon)

---

## 📋 Table of Contents

1. [Student Information Service](#student-information-service-sis)
2. [Attendance Management Service](#attendance-management-service)
3. [Gate Pass Service](#gate-pass-service)
4. [Learner Profile Service](#learner-profile-service)
5. [Login Statistics & Analytics Service](#login-statistics--analytics-service)

---

## Student Information Service (SIS)

### Create Student
```http
POST /api/v1/students
Content-Type: application/json

{
  "school_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2010-01-15",
  "class": "10A",
  "curriculum": "CBSE",
  "admission_date": "2024-04-01",
  "email": "john.doe@example.com"
}
```

### Get Student
```http
GET /api/v1/students/:id?include=guardians,medical,documents
```

### List Students
```http
GET /api/v1/students?school_id=uuid&class=10A&status=Active&page=1&page_size=50
```

### Update Student
```http
PUT /api/v1/students/:id
Content-Type: application/json

{
  "class": "11A",
  "email": "updated@example.com"
}
```

### Delete Student
```http
DELETE /api/v1/students/:id
```

### Add Guardian
```http
POST /api/v1/students/:id/guardians
Content-Type: application/json

{
  "guardian_type": "Father",
  "first_name": "Michael",
  "last_name": "Doe",
  "phone_primary": "9876543211",
  "is_primary_contact": true
}
```

### Update Medical Record
```http
PUT /api/v1/students/:id/medical
Content-Type: application/json

{
  "blood_group": "O+",
  "allergies": "Peanuts",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "9876543212"
}
```

### Get Statistics
```http
GET /api/v1/students/statistics?school_id=uuid
```

---

## Attendance Management Service

### Mark Attendance (Single)
```http
POST /api/v1/attendance
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "class": "10A",
  "attendance_date": "2024-11-19",
  "status": "Present",
  "check_in_time": "08:30:00",
  "marked_by_method": "Manual"
}
```

### Mark Bulk Attendance
```http
POST /api/v1/attendance/bulk
Content-Type: application/json

{
  "school_id": "uuid",
  "class": "10A",
  "attendance_date": "2024-11-19",
  "marked_by_method": "Manual",
  "attendance_records": [
    {
      "student_id": "uuid1",
      "status": "Present",
      "check_in_time": "08:30:00"
    },
    {
      "student_id": "uuid2",
      "status": "Absent",
      "absence_reason": "Sick"
    }
  ]
}
```

### Get Attendance Records
```http
GET /api/v1/attendance?school_id=uuid&class=10A&from_date=2024-11-01&to_date=2024-11-19
```

### Get Student Attendance Summary
```http
GET /api/v1/attendance/summary/:student_id?month_year=2024-11-01
```

### Apply for Leave
```http
POST /api/v1/attendance/leave
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "leave_type": "Medical",
  "from_date": "2024-11-20",
  "to_date": "2024-11-22",
  "reason": "Fever and cold"
}
```

### Approve/Reject Leave
```http
PUT /api/v1/attendance/leave/:leave_id
Content-Type: application/json

{
  "status": "Approved",
  "rejection_reason": ""
}
```

### Get Class Attendance Report
```http
GET /api/v1/attendance/report/class?school_id=uuid&class=10A&date=2024-11-19
```

### Get Students with Low Attendance
```http
GET /api/v1/attendance/report/low-attendance?school_id=uuid&threshold=75
```

### Create/Update Attendance Policy
```http
POST /api/v1/attendance/policy
Content-Type: application/json

{
  "school_id": "uuid",
  "policy_name": "Default Policy",
  "min_attendance_percentage": 75,
  "leave_types": {"casual": 10, "medical": 15},
  "alert_absent_days": 5,
  "biometric_enabled": false
}
```

---

## Gate Pass Service

### Create Gate Pass
```http
POST /api/v1/gate-pass
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "pass_type": "Early Departure",
  "valid_from": "2024-11-19T14:00:00Z",
  "reason_category": "Medical",
  "reason_description": "Doctor appointment",
  "authorized_contact_name": "Jane Doe",
  "authorized_contact_phone": "9876543212"
}
```

### Get Gate Pass
```http
GET /api/v1/gate-pass/:id
```

### Get Gate Pass by Number
```http
GET /api/v1/gate-pass/number/:pass_number
```

### List Gate Passes
```http
GET /api/v1/gate-pass?school_id=uuid&approval_status=Pending&page=1
```

### Approve/Reject Gate Pass
```http
PUT /api/v1/gate-pass/:id/approve
Content-Type: application/json

{
  "approval_status": "Approved",
  "admin_notes": "Approved for doctor appointment"
}
```

### Verify Gate Pass (at gate)
```http
POST /api/v1/gate-pass/verify
Content-Type: application/json

{
  "pass_number": "GP2024111900001",
  "gate_id": "main-gate",
  "verification_method": "QR Scan",
  "actual_pickup_person_name": "Jane Doe",
  "actual_pickup_person_id_proof": "DL123456"
}
```

### Log Gate Access
```http
POST /api/v1/gate-pass/access-log
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "access_type": "Exit",
  "gate_id": "main-gate",
  "verification_method": "Manual Check"
}
```

### Get Access Logs
```http
GET /api/v1/gate-pass/access-log?school_id=uuid&student_id=uuid&from_date=2024-11-01
```

### Register Visitor
```http
POST /api/v1/gate-pass/visitors
Content-Type: application/json

{
  "school_id": "uuid",
  "visitor_name": "John Smith",
  "visitor_phone": "9876543213",
  "purpose": "Parent Meeting",
  "meeting_with_student_id": "uuid",
  "expected_checkout_time": "2024-11-19T16:00:00Z"
}
```

### Checkout Visitor
```http
PUT /api/v1/gate-pass/visitors/:id/checkout
```

---

## Learner Profile Service

### Create/Update Learner Profile
```http
POST /api/v1/learner-profile/profile
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "learning_style": "Visual",
  "learning_pace": "Average",
  "discipline_score": 80,
  "strength_areas": ["Mathematics", "Science"],
  "weakness_areas": ["English Writing"],
  "recommended_interventions": ["Reading practice", "Writing workshops"]
}
```

### Get Learner Profile
```http
GET /api/v1/learner-profile/profile/:student_id
```

### Get Comprehensive Profile
```http
GET /api/v1/learner-profile/profile/:student_id/comprehensive
```

### Record Behavioral Incident
```http
POST /api/v1/learner-profile/incidents
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "incident_date": "2024-11-19",
  "incident_time": "10:30:00",
  "incident_type": "Misconduct",
  "description": "Student was talking during class",
  "severity_level": "Low",
  "reported_by_name": "Mr. Johnson",
  "action_type": "Verbal Warning"
}
```

### Get Behavioral Incidents
```http
GET /api/v1/learner-profile/incidents/:student_id?limit=50
```

### Update Incident
```http
PUT /api/v1/learner-profile/incidents/:incident_id
Content-Type: application/json

{
  "parent_informed": true,
  "parent_informed_date": "2024-11-19T15:00:00Z",
  "resolution_status": "Resolved"
}
```

### Record Positive Recognition
```http
POST /api/v1/learner-profile/recognitions
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "recognition_date": "2024-11-19",
  "recognition_type": "Academic Excellence",
  "description": "Scored 100% in Mathematics test",
  "achievement_category": "Gold",
  "points_awarded": 10,
  "announced_in_assembly": true
}
```

### Get Recognitions
```http
GET /api/v1/learner-profile/recognitions/:student_id?limit=50
```

### Add Staff Observation
```http
POST /api/v1/learner-profile/observations
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "observation_date": "2024-11-19",
  "observation_type": "Academic",
  "observation_text": "Student shows great improvement in problem-solving",
  "subject": "Mathematics",
  "visible_to_parents": true
}
```

### Get Staff Observations
```http
GET /api/v1/learner-profile/observations/:student_id?limit=50
```

### Record Development Milestone
```http
POST /api/v1/learner-profile/milestones
Content-Type: application/json

{
  "student_id": "uuid",
  "school_id": "uuid",
  "milestone_date": "2024-11-19",
  "milestone_type": "Academic",
  "milestone_description": "Completed first chapter book independently",
  "achievement_level": "Proficient",
  "skill_area": "Reading Comprehension"
}
```

### Get Development Milestones
```http
GET /api/v1/learner-profile/milestones/:student_id?limit=50
```

---

## Login Statistics & Analytics Service

### Start User Session (Login)
```http
POST /api/v1/analytics/sessions/start
Content-Type: application/json

{
  "school_id": "uuid",
  "user_id": "uuid",
  "user_role": "Teacher",
  "user_name": "Mr. Johnson",
  "ip_address": "192.168.1.1",
  "device_type": "Desktop",
  "browser_name": "Chrome",
  "platform": "Web"
}
```

### End User Session (Logout)
```http
POST /api/v1/analytics/sessions/end
Content-Type: application/json

{
  "session_id": "uuid",
  "logout_type": "Manual"
}
```

### Get Active Sessions
```http
GET /api/v1/analytics/sessions/active?school_id=uuid
```

### Log User Activity
```http
POST /api/v1/analytics/activity
Content-Type: application/json

{
  "school_id": "uuid",
  "user_id": "uuid",
  "session_id": "uuid",
  "user_role": "Teacher",
  "activity_type": "View",
  "activity_module": "Student",
  "activity_description": "Viewed student profile",
  "resource_id": "student-uuid",
  "http_method": "GET",
  "status": "Success"
}
```

### Get Usage Statistics
```http
GET /api/v1/analytics/usage?school_id=uuid&from_date=2024-11-01&to_date=2024-11-19&granularity=daily
```

### Get User Engagement
```http
GET /api/v1/analytics/engagement?school_id=uuid&user_id=uuid&month_year=2024-11-01
```

### Get Feature Usage
```http
GET /api/v1/analytics/features?school_id=uuid&from_date=2024-11-01&to_date=2024-11-19
```

### Get API Performance
```http
GET /api/v1/analytics/api-performance?from_date=2024-11-01&to_date=2024-11-19&limit=50
```

### Get Dashboard Data
```http
GET /api/v1/analytics/dashboard?school_id=uuid&period=today
```
**Periods**: `today`, `week`, `month`

### Aggregate Statistics (Admin)
```http
POST /api/v1/analytics/aggregate
Content-Type: application/json

{
  "school_id": "uuid",
  "date": "2024-11-19",
  "hour": 10
}
```

---

## Common Response Formats

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { }
}
```

### Paginated Response
```json
{
  "status": "success",
  "message": "Data retrieved successfully",
  "data": [],
  "pagination": {
    "total_count": 100,
    "page": 1,
    "page_size": 50,
    "total_pages": 2
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

### Validation Error
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": ["field1 is required", "field2 must be a valid email"]
}
```

---

## Status Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request/validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## Rate Limiting

- Default: 100 requests per 15 minutes per API key
- Configurable per school/user

---

## Notes

1. All dates should be in ISO 8601 format: `YYYY-MM-DD`
2. All timestamps should include timezone: `YYYY-MM-DDTHH:mm:ssZ`
3. UUIDs should be valid UUID v4 format
4. All endpoints support JSON only (`Content-Type: application/json`)
5. Authentication middleware to be added (JWT Bearer Token)

---

**Last Updated**: 2024-11-19
**API Version**: v1
