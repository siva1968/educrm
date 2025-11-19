const express = require('express');
const router = express.Router();

// TODO: Implement login statistics routes
router.get('/', (req, res) => {
  res.json({
    service: 'Login Statistics & Analytics Service',
    status: 'Coming Soon',
    message: 'This service is under development',
  });
});

module.exports = router;
