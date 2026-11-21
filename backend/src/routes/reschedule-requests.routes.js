const express = require('express');
const {
  createRescheduleRequest,
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
router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  processRescheduleRequest
);

module.exports = router;
