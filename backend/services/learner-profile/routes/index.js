const express = require('express');
const router = express.Router();

// TODO: Implement learner profile routes
router.get('/', (req, res) => {
  res.json({
    service: 'Learner Profile Service',
    status: 'Coming Soon',
    message: 'This service is under development',
  });
});

module.exports = router;
