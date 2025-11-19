# Authentication Setup Guide

## Overview

This guide explains how to implement JWT-based authentication for all Phase 2 services.

## What's Already Done ✅

- ✅ JWT middleware created (`backend/shared/middleware/auth.js`)
- ✅ `jsonwebtoken` package already in dependencies
- ✅ JWT_SECRET in `.env.example`
- ✅ Error handling and response formatting

## What You Need to Do

### 1. Add Authentication to Routes (REQUIRED)

Each service needs authentication middleware added to protect routes.

#### Option A: Protect All Routes (Recommended)

Add authentication to the entire router:

```javascript
// backend/services/subject/routes/index.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../shared/middleware/auth');
const subjectController = require('../controllers/subject.controller');

// Apply authentication to ALL routes
router.use(authenticate);

// Now all routes require authentication
router.post('/', subjectController.createSubject.bind(subjectController));
router.get('/', subjectController.listSubjects.bind(subjectController));
// ... rest of routes

module.exports = router;
```

#### Option B: Selective Protection

Protect only specific routes:

```javascript
const { authenticate } = require('../../../shared/middleware/auth');

// Public route - no auth required
router.get('/health', (req, res) => { ... });

// Protected routes - auth required
router.post('/', authenticate, subjectController.createSubject);
router.put('/:id', authenticate, subjectController.updateSubject);
router.delete('/:id', authenticate, subjectController.deleteSubject);
```

### 2. Add Role-Based Authorization (Optional but Recommended)

Restrict routes by user role:

```javascript
const { authenticate, authorize } = require('../../../shared/middleware/auth');

// Only admins and teachers can create subjects
router.post('/',
  authenticate,
  authorize('admin', 'teacher'),
  subjectController.createSubject
);

// Only admins can delete
router.delete('/:id',
  authenticate,
  authorize('admin'),
  subjectController.deleteSubject
);

// Students can only read
router.get('/',
  authenticate,
  authorize('admin', 'teacher', 'student'),
  subjectController.listSubjects
);
```

### 3. Add School Isolation (CRITICAL for Multi-Tenancy)

Ensure users can only access their school's data:

```javascript
const { authenticate, enforceSchoolIsolation } = require('../../../shared/middleware/auth');

// Enforce school isolation on all routes
router.use(authenticate);
router.use(enforceSchoolIsolation('school_id'));

// Now school_id is automatically validated/injected
router.post('/', subjectController.createSubject);
```

This middleware:
- Validates `school_id` in request matches user's school
- Auto-injects `school_id` if missing
- Allows system admins to bypass (cross-school access)

### 4. Update Services to Use req.user.userId

Remove the default 'system' user:

**BEFORE**:
```javascript
const userId = req.user?.userId || 'system';
```

**AFTER**:
```javascript
// Authentication middleware ensures req.user exists
const userId = req.user.userId;
```

Or with validation:
```javascript
if (!req.user || !req.user.userId) {
  throw new Error('Authentication required');
}
const userId = req.user.userId;
```

## Implementation Checklist

Apply these changes to all 5 Phase 2 services:

### Subject Management Service

- [ ] Add auth middleware to `backend/services/subject/routes/index.js`
- [ ] Add school isolation
- [ ] Remove userId default in controllers
- [ ] Test with valid token
- [ ] Test without token (should fail with 401)

### Grade Book Service

- [ ] Add auth middleware to `backend/services/gradebook/routes/index.js`
- [ ] Add school isolation
- [ ] Add role-based auth (only teachers can grade)
- [ ] Remove userId default in controllers
- [ ] Test grading workflow

### Examination Service

- [ ] Add auth middleware to `backend/services/examination/routes/index.js`
- [ ] Add school isolation
- [ ] Add role-based auth (only admins can create exams)
- [ ] Remove userId default in controllers
- [ ] Test exam creation and results

### Assignment Service

- [ ] Add auth middleware to `backend/services/assignment/routes/index.js`
- [ ] Add school isolation
- [ ] Add role-based auth (teachers create, students submit)
- [ ] Remove userId default in controllers
- [ ] Test assignment submission

### Timetable Service

- [ ] Add auth middleware to `backend/services/timetable/routes/index.js`
- [ ] Add school isolation
- [ ] Add role-based auth (only admins modify timetables)
- [ ] Remove userId default in controllers
- [ ] Test timetable operations

## Testing Authentication

### 1. Generate a Test Token

Create `backend/utils/generate-test-token.js`:

```javascript
const jwt = require('jsonwebtoken');

// Generate test token
const payload = {
  userId: 'test-user-123',
  email: 'admin@school.com',
  role: 'admin',
  schoolId: 'test-school-456',
  name: 'Test Admin'
};

const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
  expiresIn: '24h'
});

console.log('Test Token:');
console.log(token);
console.log('\nUse in requests:');
console.log(`Authorization: Bearer ${token}`);
```

Run:
```bash
node backend/utils/generate-test-token.js
```

### 2. Test with cURL

```bash
# Get token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test authenticated request
curl -X GET http://localhost:3000/api/v1/subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Should return 200 OK

# Test without token
curl -X GET http://localhost:3000/api/v1/subjects

# Should return 401 Unauthorized
```

### 3. Test School Isolation

```bash
# Token for School A
TOKEN_SCHOOL_A="..."

# Try to access School B's data
curl -X GET "http://localhost:3000/api/v1/subjects?school_id=school-b-uuid" \
  -H "Authorization: Bearer $TOKEN_SCHOOL_A"

# Should return 403 Forbidden
```

### 4. Test Role-Based Auth

```bash
# Student token
TOKEN_STUDENT="..."

# Try to create subject (only admins/teachers allowed)
curl -X POST http://localhost:3000/api/v1/subjects \
  -H "Authorization: Bearer $TOKEN_STUDENT" \
  -H "Content-Type: application/json" \
  -d '{"subject_name": "Test"}'

# Should return 403 Forbidden
```

## Error Responses

### No Token

```json
{
  "success": false,
  "message": "Authentication required. Please provide a valid token.",
  "error": "NO_TOKEN"
}
```

### Invalid Token

```json
{
  "success": false,
  "message": "Invalid token. Authentication failed.",
  "error": "INVALID_TOKEN"
}
```

### Expired Token

```json
{
  "success": false,
  "message": "Token has expired. Please login again.",
  "error": "TOKEN_EXPIRED"
}
```

### Insufficient Permissions

```json
{
  "success": false,
  "message": "Access forbidden. Required roles: admin, teacher",
  "error": "INSUFFICIENT_PERMISSIONS"
}
```

### School Isolation Violation

```json
{
  "success": false,
  "message": "Access forbidden. You can only access data from your school.",
  "error": "SCHOOL_ISOLATION_VIOLATION"
}
```

## Environment Configuration

Update `.env`:

```bash
# Generate a secure secret (32+ characters)
JWT_SECRET=your-super-secret-key-minimum-32-characters-long-change-in-production

# Token expiration
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

Generate secure secret:
```bash
# On Linux/Mac
openssl rand -base64 32

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Integration with Login Service

When you implement login, generate tokens like this:

```javascript
const { generateToken } = require('../shared/middleware/auth');

// After validating credentials
const token = generateToken({
  userId: user.id,
  email: user.email,
  role: user.role,
  schoolId: user.school_id,
  name: user.name
}, '24h');

res.json({
  success: true,
  token,
  user: {
    id: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.school_id
  }
});
```

## Best Practices

### 1. Token Storage (Frontend)

```javascript
// Store in localStorage or sessionStorage
localStorage.setItem('auth_token', token);

// Include in all API requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json'
};

fetch('/api/v1/subjects', { headers });
```

### 2. Token Refresh

Implement refresh token endpoint:

```javascript
router.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

  const newToken = generateToken({
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    schoolId: decoded.schoolId
  }, '24h');

  res.json({ token: newToken });
});
```

### 3. Logout

Clear token on client side:

```javascript
localStorage.removeItem('auth_token');
```

Optional: Maintain token blacklist in Redis for server-side logout.

### 4. Rate Limiting

Add rate limiting to prevent brute force:

```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
});

router.post('/auth/login', authLimiter, loginController);
```

## Security Checklist

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] JWT_SECRET is different in prod vs dev
- [ ] Tokens expire (not permanent)
- [ ] HTTPS used in production
- [ ] Tokens not logged
- [ ] Tokens not in URL parameters
- [ ] School isolation enforced
- [ ] Role-based auth implemented
- [ ] Rate limiting on auth endpoints
- [ ] Password hashing (bcrypt)
- [ ] Input validation on auth endpoints

## Common Issues

### "Invalid token" even with valid token

- Check JWT_SECRET matches between token generation and verification
- Verify token hasn't expired
- Ensure no extra whitespace in token

### "Authentication required" with token in header

- Verify header format: `Authorization: Bearer <token>`
- Check for typos in header name
- Ensure middleware is applied before routes

### School isolation failing

- Verify user.schoolId exists in token payload
- Check school_id parameter name matches
- Ensure school_id is UUID format

## Performance Optimization

### 1. Cache Decoded Tokens

```javascript
const cache = new Map();

const authenticateWithCache = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (cache.has(token)) {
    req.user = cache.get(token);
    return next();
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  cache.set(token, decoded);

  // Clear cache after token expiration
  setTimeout(() => cache.delete(token), 24 * 60 * 60 * 1000);

  req.user = decoded;
  next();
};
```

### 2. Use Redis for Token Storage

For distributed systems, use Redis instead of in-memory cache.

## Migration to Auth

### Phased Rollout

1. **Phase 1**: Add middleware but make it optional
   ```javascript
   const { optionalAuth } = require('../../../shared/middleware/auth');
   router.use(optionalAuth); // Doesn't reject if no token
   ```

2. **Phase 2**: Add authentication but keep userId default
   ```javascript
   router.use(authenticate);
   const userId = req.user?.userId || 'system'; // Fallback
   ```

3. **Phase 3**: Enforce authentication (remove default)
   ```javascript
   router.use(authenticate);
   const userId = req.user.userId; // No fallback
   ```

This allows gradual migration without breaking existing integrations.

## Support

For issues:
- Check `backend/shared/middleware/auth.js` for middleware code
- Review CRITICAL_ANALYSIS_PHASE2.md for context
- Test with Postman/Insomnia for debugging
- Enable debug logging: `DEBUG=auth:* npm start`

---

**Status**: Authentication middleware ready
**Next Step**: Apply to all routes (see checklist)
**Estimated Time**: 2-3 hours to apply to all services
