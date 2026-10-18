
const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// GET /api/schedules
// Mengambil seluruh jadwal, diurutkan dari tanggal dan waktu paling awal.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
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
      ORDER BY schedule_date ASC, start_time ASC
    `);

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
// Mengambil detail satu jadwal berdasarkan ID.
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid schedule ID',
    });
  }

  try {
    const result = await pool.query(
      `
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
      `,
      [id]
    );

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
