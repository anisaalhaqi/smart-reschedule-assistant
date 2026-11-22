const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/schedules
// Admin mengambil seluruh jadwal.
// Customer hanya mengambil jadwal miliknya.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        customer_name,
        class_name,
        TO_CHAR(schedule_date, 'YYYY-MM-DD') AS schedule_date,
        start_time,
        end_time,
        status,
        created_at,
        updated_at
      FROM schedules
      ${req.user.role === 'CUSTOMER' ? 'WHERE customer_id = $1' : ''}
      ORDER BY schedule_date ASC, start_time ASC
    `;

    const result =
      req.user.role === 'CUSTOMER'
        ? await pool.query(query, [req.user.id])
        : await pool.query(query);

    return res.status(200).json({
      status: 'success',
      data: {
        schedules: result.rows,
      },
    });
  } catch (error) {
    console.error('Failed to fetch schedules:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve schedules',
    });
  }
});

// GET /api/schedules/:id
// Mengambil detail jadwal.
// Admin dapat mengambil jadwal apa pun.
// Customer hanya dapat mengambil jadwal miliknya.
router.get('/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid schedule ID',
    });
  }

  try {
    const query = `
      SELECT
        id,
        customer_name,
        class_name,
        TO_CHAR(schedule_date, 'YYYY-MM-DD') AS schedule_date,
        start_time,
        end_time,
        status,
        created_at,
        updated_at
      FROM schedules
      WHERE id = $1
      ${
        req.user.role === 'CUSTOMER'
          ? 'AND customer_id = $2'
          : ''
      }
    `;

    const result =
      req.user.role === 'CUSTOMER'
        ? await pool.query(query, [id, req.user.id])
        : await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Schedule not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        schedule: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Failed to fetch schedule:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve schedule',
    });
  }
});

module.exports = router;