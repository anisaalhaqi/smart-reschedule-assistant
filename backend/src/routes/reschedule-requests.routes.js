
const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// GET /api/reschedule-requests
// Mengambil seluruh permintaan reschedule beserta detail jadwal dan slot.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        rr.id,
        rr.schedule_id,
        s.customer_name,
        s.class_name,
        TO_CHAR(s.schedule_date, 'YYYY-MM-DD') AS current_schedule_date,
        s.start_time AS current_start_time,
        s.end_time AS current_end_time,
        rr.available_slot_id,
        TO_CHAR(slot.slot_date, 'YYYY-MM-DD') AS requested_schedule_date,
        slot.start_time AS requested_start_time,
        slot.end_time AS requested_end_time,
        rr.reason,
        rr.status,
        rr.created_at,
        rr.updated_at
      FROM reschedule_requests AS rr
      JOIN schedules AS s
        ON s.id = rr.schedule_id
      JOIN available_slots AS slot
        ON slot.id = rr.available_slot_id
      ORDER BY rr.created_at DESC, rr.id DESC
    `);

    return res.status(200).json({
      status: 'success',
      data: {
        reschedule_requests: result.rows,
      },
    });
  } catch (error) {
    console.error('Failed to fetch reschedule requests:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve reschedule requests',
    });
  }
});

// GET /api/reschedule-requests/:id
// Mengambil detail satu permintaan berdasarkan ID.
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid reschedule request ID',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          rr.id,
          rr.schedule_id,
          s.customer_name,
          s.class_name,
          TO_CHAR(s.schedule_date, 'YYYY-MM-DD') AS current_schedule_date,
          s.start_time AS current_start_time,
          s.end_time AS current_end_time,
          rr.available_slot_id,
          TO_CHAR(slot.slot_date, 'YYYY-MM-DD') AS requested_schedule_date,
          slot.start_time AS requested_start_time,
          slot.end_time AS requested_end_time,
          rr.reason,
          rr.status,
          rr.created_at,
          rr.updated_at
        FROM reschedule_requests AS rr
        JOIN schedules AS s
          ON s.id = rr.schedule_id
        JOIN available_slots AS slot
          ON slot.id = rr.available_slot_id
        WHERE rr.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Reschedule request not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        reschedule_request: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Failed to fetch reschedule request:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve reschedule request',
    });
  }
});

module.exports = router;
