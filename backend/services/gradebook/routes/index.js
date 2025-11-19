const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    service: 'Grade Book Service',
    status: 'Phase 2 - Ready for Implementation',
    features: [
      'Assessment creation and management',
      'Grade recording and calculation',
      'Report card generation',
      'Subject-wise grading',
      'Class rank calculation'
    ]
  });
});

module.exports = router;
