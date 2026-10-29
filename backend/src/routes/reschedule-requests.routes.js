const express = require('express');
const pool = require('../config/database');
const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/reschedule-requests
// Membuat permintaan reschedule baru.
router.post(
  '/',
  authenticateToken,
  authorizeRoles('CUSTOMER'),
  async (req, res) => {
    const { schedule_id, available_slot_id, reason } = req.body ?? {};

    // Validasi ID jadwal dan slot.
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

    // Validasi alasan reschedule.
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Reason is required',
      });
    }

    let client;
    let transactionStarted = false;

    try {
      client = await pool.connect();

      await client.query('BEGIN');
      transactionStarted = true;

      // Kunci jadwal dan pastikan jadwal milik Customer yang login.
      const scheduleResult = await client.query(
        `
          SELECT id, status
          FROM schedules
          WHERE id = $1
            AND customer_id = $2
          FOR UPDATE
        `,
        [schedule_id, req.user.id]
      );

      if (scheduleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(404).json({
          status: 'error',
          message: 'Schedule not found',
        });
      }

      if (scheduleResult.rows[0].status !== 'SCHEDULED') {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message: 'Schedule is not available for rescheduling',
        });
      }

      // Pastikan tidak ada permintaan PENDING untuk jadwal yang sama.
      const pendingRequestResult = await client.query(
        `
          SELECT id
          FROM reschedule_requests
          WHERE schedule_id = $1
            AND status = 'PENDING'
          LIMIT 1
        `,
        [schedule_id]
      );

      if (pendingRequestResult.rows.length > 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message:
            'A pending reschedule request already exists for this schedule',
        });
      }

      // Kunci slot untuk mencegah perubahan bersamaan.
      const slotResult = await client.query(
        `
          SELECT id, is_booked
          FROM available_slots
          WHERE id = $1
          FOR UPDATE
        `,
        [available_slot_id]
      );

      if (slotResult.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(404).json({
          status: 'error',
          message: 'Available slot not found',
        });
      }

      if (slotResult.rows[0].is_booked) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message: 'Available slot is already booked',
        });
      }

      // Pastikan slot tidak digunakan permintaan PENDING atau APPROVED lain.
      const activeSlotRequestResult = await client.query(
        `
          SELECT id
          FROM reschedule_requests
          WHERE available_slot_id = $1
            AND status IN ('PENDING', 'APPROVED')
          LIMIT 1
        `,
        [available_slot_id]
      );

      if (activeSlotRequestResult.rows.length > 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message:
            'This slot is already used by an active reschedule request',
        });
      }

      // Buat permintaan baru.
      const insertResult = await client.query(
        `
          INSERT INTO reschedule_requests (
            schedule_id,
            available_slot_id,
            reason
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            schedule_id,
            available_slot_id,
            reason,
            status,
            created_at,
            updated_at
        `,
        [schedule_id, available_slot_id, reason.trim()]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(201).json({
        status: 'success',
        message: 'Reschedule request created successfully',
        data: {
          reschedule_request: insertResult.rows[0],
        },
      });
    } catch (error) {
      if (client && transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError.message);
        }
      }

      console.error('Failed to create reschedule request:', error.message);

      return res.status(500).json({
        status: 'error',
        message: 'Failed to create reschedule request',
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);
// GET /api/reschedule-requests
// Mengambil permintaan reschedule sesuai hak akses pengguna.
router.get('/', authenticateToken, async (req, res) => {
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
        WHERE ($1::varchar = 'ADMIN' OR s.customer_id = $2)
        ORDER BY rr.created_at DESC, rr.id DESC
      `,
      [req.user.role, req.user.id]
    );

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
// Mengambil detail permintaan berdasarkan ID dan hak akses pengguna.
router.get('/:id', authenticateToken, async (req, res) => {
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
          AND ($2::varchar = 'ADMIN' OR s.customer_id = $3)
      `,
      [id, req.user.role, req.user.id]
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
// PATCH /api/reschedule-requests/:id
// Hanya Admin yang dapat menyetujui atau menolak permintaan.
router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req, res) => {
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

    let client;
    let transactionStarted = false;

    try {
      client = await pool.connect();

      await client.query('BEGIN');
      transactionStarted = true;

      // Kunci permintaan dan jadwal untuk mencegah perubahan bersamaan.
      const requestResult = await client.query(
        `
          SELECT
            rr.id,
            rr.schedule_id,
            rr.available_slot_id,
            rr.status AS request_status,
            s.status AS schedule_status
          FROM reschedule_requests AS rr
          JOIN schedules AS s
            ON s.id = rr.schedule_id
          WHERE rr.id = $1
          FOR UPDATE OF rr, s
        `,
        [id]
      );

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(404).json({
          status: 'error',
          message: 'Reschedule request not found',
        });
      }

      const request = requestResult.rows[0];

      if (request.request_status !== 'PENDING') {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message: 'Only pending requests can be processed',
        });
      }

      // Jika Admin menolak permintaan, slot tidak ditandai booked.
      if (status === 'REJECTED') {
        const updateResult = await client.query(
          `
            UPDATE reschedule_requests
            SET
              status = 'REJECTED',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING
              id,
              schedule_id,
              available_slot_id,
              reason,
              status,
              created_at,
              updated_at
          `,
          [id]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return res.status(200).json({
          status: 'success',
          message: 'Reschedule request rejected successfully',
          data: {
            reschedule_request: updateResult.rows[0],
          },
        });
      }

      // Persetujuan hanya boleh dilakukan jika jadwal masih SCHEDULED.
      if (request.schedule_status !== 'SCHEDULED') {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message: 'Schedule is no longer available for rescheduling',
        });
      }

      // Kunci slot yang diminta.
      const slotResult = await client.query(
        `
          SELECT
            id,
            is_booked,
            slot_date,
            start_time,
            end_time
          FROM available_slots
          WHERE id = $1
          FOR UPDATE
        `,
        [request.available_slot_id]
      );

      if (slotResult.rows.length === 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(404).json({
          status: 'error',
          message: 'Available slot not found',
        });
      }

      const slot = slotResult.rows[0];

      if (slot.is_booked) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message: 'Available slot is already booked',
        });
      }

      // Pastikan tidak ada permintaan lain yang sudah menggunakan slot.
      const conflictResult = await client.query(
        `
          SELECT id
          FROM reschedule_requests
          WHERE available_slot_id = $1
            AND status IN ('PENDING', 'APPROVED')
            AND id <> $2
          LIMIT 1
        `,
        [request.available_slot_id, id]
      );

      if (conflictResult.rows.length > 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return res.status(409).json({
          status: 'error',
          message:
            'Available slot is already reserved by another active request',
        });
      }

      // Perbarui jadwal sesuai slot yang disetujui.
      await client.query(
        `
          UPDATE schedules
          SET
            schedule_date = $1,
            start_time = $2,
            end_time = $3,
            status = 'RESCHEDULED',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `,
        [
          slot.slot_date,
          slot.start_time,
          slot.end_time,
          request.schedule_id,
        ]
      );

      // Tandai slot sebagai terpakai.
      await client.query(
        `
          UPDATE available_slots
          SET is_booked = TRUE
          WHERE id = $1
        `,
        [request.available_slot_id]
      );

      // Simpan status persetujuan.
      const updateResult = await client.query(
        `
          UPDATE reschedule_requests
          SET
            status = 'APPROVED',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING
            id,
            schedule_id,
            available_slot_id,
            reason,
            status,
            created_at,
            updated_at
        `,
        [id]
      );

      await client.query('COMMIT');
      transactionStarted = false;

      return res.status(200).json({
        status: 'success',
        message: 'Reschedule request approved successfully',
        data: {
          reschedule_request: updateResult.rows[0],
        },
      });
    } catch (error) {
      if (client && transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError.message);
        }
      }

      console.error('Failed to process reschedule request:', error.message);

      return res.status(500).json({
        status: 'error',
        message: 'Failed to process reschedule request',
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

module.exports = router;