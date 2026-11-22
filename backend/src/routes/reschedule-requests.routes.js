const express = require('express');
const {
  createRescheduleRequest,
  generateAiReview,
  getRescheduleRequests,
  getRescheduleRequestById,
  processRescheduleRequest,
} = require('../controllers/reschedule-requests.controller');
const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/auth.middleware');

const router = express.Router();

router.post(
  '/',
  authenticateToken,
  authorizeRoles('CUSTOMER'),
  createRescheduleRequest
);
router.get('/', authenticateToken, getRescheduleRequests);
router.get('/:id', authenticateToken, getRescheduleRequestById);
router.post('/:id/ai-review', authenticateToken, authorizeRoles('ADMIN'), generateAiReview);
router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  processRescheduleRequest
);

module.exports = router;
