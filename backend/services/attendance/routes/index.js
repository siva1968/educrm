const express = require('express');
const router = express.Router();

// TODO: Implement attendance routes
router.get('/', (req, res) => {
  res.json({
    service: 'Attendance Management Service',
    status: 'Coming Soon',
    message: 'This service is under development',
  });
});

module.exports = router;
