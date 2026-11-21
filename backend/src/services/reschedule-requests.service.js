const pool = require('../config/database');

const serviceError = (statusCode, message) => ({
  error: { statusCode, message },
});

const rollbackAndReturn = async (client, error) => {
  await client.query('ROLLBACK');
  return error;
};

const createRescheduleRequest = async ({
  scheduleId,
  availableSlotId,
  reason,
  customerId,
}) => {
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const scheduleResult = await client.query(
      `
        SELECT id, status
        FROM schedules
        WHERE id = $1
          AND customer_id = $2
        FOR UPDATE
      `,
      [scheduleId, customerId]
    );

    if (scheduleResult.rows.length === 0) {
      return rollbackAndReturn(client, serviceError(404, 'Schedule not found'));
    }

    if (scheduleResult.rows[0].status !== 'SCHEDULED') {
      return rollbackAndReturn(
        client,
        serviceError(409, 'Schedule is not available for rescheduling')
      );
    }

    const pendingRequestResult = await client.query(
      `
        SELECT id
        FROM reschedule_requests
        WHERE schedule_id = $1
          AND status = 'PENDING'
        LIMIT 1
      `,
      [scheduleId]
    );

    if (pendingRequestResult.rows.length > 0) {
      return rollbackAndReturn(
        client,
        serviceError(
          409,
          'A pending reschedule request already exists for this schedule'
        )
      );
    }

    const slotResult = await client.query(
      `
        SELECT id, is_booked
        FROM available_slots
        WHERE id = $1
        FOR UPDATE
      `,
      [availableSlotId]
    );

    if (slotResult.rows.length === 0) {
      return rollbackAndReturn(
        client,
        serviceError(404, 'Available slot not found')
      );
    }

    if (slotResult.rows[0].is_booked) {
      return rollbackAndReturn(
        client,
        serviceError(409, 'Available slot is already booked')
      );
    }

    const activeSlotRequestResult = await client.query(
      `
        SELECT id
        FROM reschedule_requests
        WHERE available_slot_id = $1
          AND status IN ('PENDING', 'APPROVED')
        LIMIT 1
      `,
      [availableSlotId]
    );

    if (activeSlotRequestResult.rows.length > 0) {
      return rollbackAndReturn(
        client,
        serviceError(
          409,
          'This slot is already used by an active reschedule request'
        )
      );
    }

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
      [scheduleId, availableSlotId, reason]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return { rescheduleRequest: insertResult.rows[0] };
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError.message);
      }
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getRescheduleRequests = async ({ role, userId }) => {
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
    [role, userId]
  );

  return result.rows;
};

const getRescheduleRequestById = async ({ id, role, userId }) => {
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
    [id, role, userId]
  );

  return result.rows[0];
};

const processRescheduleRequest = async ({ id, status }) => {
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

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
      return rollbackAndReturn(
        client,
        serviceError(404, 'Reschedule request not found')
      );
    }

    const request = requestResult.rows[0];

    if (request.request_status !== 'PENDING') {
      return rollbackAndReturn(
        client,
        serviceError(409, 'Only pending requests can be processed')
      );
    }

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

      return { rescheduleRequest: updateResult.rows[0] };
    }

    if (request.schedule_status !== 'SCHEDULED') {
      return rollbackAndReturn(
        client,
        serviceError(409, 'Schedule is no longer available for rescheduling')
      );
    }

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
      return rollbackAndReturn(
        client,
        serviceError(404, 'Available slot not found')
      );
    }

    const slot = slotResult.rows[0];

    if (slot.is_booked) {
      return rollbackAndReturn(
        client,
        serviceError(409, 'Available slot is already booked')
      );
    }

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
      return rollbackAndReturn(
        client,
        serviceError(
          409,
          'Available slot is already reserved by another active request'
        )
      );
    }

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

    await client.query(
      `
        UPDATE available_slots
        SET is_booked = TRUE
        WHERE id = $1
      `,
      [request.available_slot_id]
    );

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

    return { rescheduleRequest: updateResult.rows[0] };
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError.message);
      }
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  createRescheduleRequest,
  getRescheduleRequests,
  getRescheduleRequestById,
  processRescheduleRequest,
};
