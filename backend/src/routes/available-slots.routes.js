
const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// GET /api/available-slots
// Mengambil slot yang belum dipesan.
// Filter tanggal opsional: /api/available-slots?date=2026-10-22
router.get('/', async (req, res) => {
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
    const query = `
      SELECT
        id,
        TO_CHAR(slot_date, 'YYYY-MM-DD') AS slot_date,
        start_time,
        end_time,
        is_booked,
        created_at
      FROM available_slots
      WHERE is_booked = FALSE
        AND ($1::date IS NULL OR slot_date = $1::date)
      ORDER BY slot_date ASC, start_time ASC
    `;

    const result = await pool.query(query, [date ?? null]);

    return res.status(200).json({
      status: 'success',
      data: {
        available_slots: result.rows,
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
