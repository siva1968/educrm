const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    service: 'Assignment Management Service',
    status: 'Phase 2 - Ready for Implementation',
    features: [
      'Assignment creation and distribution',
      'Submission tracking',
      'Auto-grading capabilities',
      'Plagiarism detection',
      'Feedback management'
    ]
  });
});

module.exports = router;
