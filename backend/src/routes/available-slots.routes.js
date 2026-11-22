const express = require('express');
const { getAvailableSlots } = require('../services/available-slots.service');

const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/available-slots
// Mengambil slot mendatang yang belum dipesan dan tidak memiliki permintaan aktif.
// Filter tanggal opsional: /api/available-slots?date=2026-10-22
router.get('/', authenticateToken, async (req, res) => {
  const { date } = req.query;

  // Validasi format tanggal jika filter diberikan.
  if (date !== undefined) {
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date value',
      });
    }
  }

  try {
    const availableSlots = await getAvailableSlots(date);

    return res.status(200).json({
      status: 'success',
      data: {
        available_slots: availableSlots,
      },
    });
  } catch (error) {
    console.error('Failed to fetch available slots:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve available slots',
    });
  }
});

module.exports = router;
