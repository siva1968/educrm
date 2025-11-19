const express = require('express');
const router = express.Router();

// TODO: Implement gate pass routes
router.get('/', (req, res) => {
  res.json({
    service: 'Gate Pass Management Service',
    status: 'Coming Soon',
    message: 'This service is under development',
  });
});

module.exports = router;
