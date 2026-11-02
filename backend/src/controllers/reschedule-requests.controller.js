const rescheduleRequestsService = require('../services/reschedule-requests.service');

const createRescheduleRequest = async (req, res) => {
  const { schedule_id, available_slot_id, reason } = req.body ?? {};

  if (
    !Number.isSafeInteger(schedule_id) ||
    schedule_id <= 0 ||
    !Number.isSafeInteger(available_slot_id) ||
    available_slot_id <= 0
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid schedule_id or available_slot_id',
    });
  }

  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Reason is required',
    });
  }

  try {
    const result = await rescheduleRequestsService.createRescheduleRequest({
      scheduleId: schedule_id,
      availableSlotId: available_slot_id,
      reason: reason.trim(),
      customerId: req.user.id,
    });

    if (result.error) {
      return res.status(result.error.statusCode).json({
        status: 'error',
        message: result.error.message,
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Reschedule request created successfully',
      data: {
        reschedule_request: result.rescheduleRequest,
      },
    });
  } catch (error) {
    console.error('Failed to create reschedule request:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to create reschedule request',
    });
  }
};

const getRescheduleRequests = async (req, res) => {
  try {
    const rescheduleRequests =
      await rescheduleRequestsService.getRescheduleRequests({
        role: req.user.role,
        userId: req.user.id,
      });

    return res.status(200).json({
      status: 'success',
      data: {
        reschedule_requests: rescheduleRequests,
      },
    });
  } catch (error) {
    console.error('Failed to fetch reschedule requests:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve reschedule requests',
    });
  }
};

const getRescheduleRequestById = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid reschedule request ID',
    });
  }

  try {
    const rescheduleRequest =
      await rescheduleRequestsService.getRescheduleRequestById({
        id,
        role: req.user.role,
        userId: req.user.id,
      });

    if (!rescheduleRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Reschedule request not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        reschedule_request: rescheduleRequest,
      },
    });
  } catch (error) {
    console.error('Failed to fetch reschedule request:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve reschedule request',
    });
  }
};

const processRescheduleRequest = async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid reschedule request ID',
    });
  }

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Status must be APPROVED or REJECTED',
    });
  }

  try {
    const result = await rescheduleRequestsService.processRescheduleRequest({
      id,
      status,
    });

    if (result.error) {
      return res.status(result.error.statusCode).json({
        status: 'error',
        message: result.error.message,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Reschedule request ${status.toLowerCase()} successfully`,
      data: {
        reschedule_request: result.rescheduleRequest,
      },
    });
  } catch (error) {
    console.error('Failed to process reschedule request:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to process reschedule request',
    });
  }
};

module.exports = {
  createRescheduleRequest,
  getRescheduleRequests,
  getRescheduleRequestById,
  processRescheduleRequest,
};
