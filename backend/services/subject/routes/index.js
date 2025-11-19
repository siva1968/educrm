const express = require('express');
const router = express.Router();

// Placeholder for Subject Management Service
router.get('/', (req, res) => {
  res.json({
    service: 'Subject Management Service',
    status: 'Phase 2 - Ready for Implementation',
    endpoints: [
      'POST /api/v1/subjects - Create subject',
      'GET /api/v1/subjects - List subjects',
      'GET /api/v1/subjects/:id - Get subject',
      'PUT /api/v1/subjects/:id - Update subject',
      'DELETE /api/v1/subjects/:id - Delete subject'
    ]
  });
});

module.exports = router;
