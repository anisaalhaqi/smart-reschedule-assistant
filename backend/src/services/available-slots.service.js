const pool = require('../config/database');

async function getAvailableSlots(date = null) {
  const query = `
      SELECT
        s.id,
        TO_CHAR(s.slot_date, 'YYYY-MM-DD') AS slot_date,
        s.start_time,
        s.end_time,
        s.is_booked,
        s.created_at
      FROM available_slots AS s
      WHERE s.is_booked = FALSE
        AND ($1::date IS NULL OR s.slot_date = $1::date)
        AND s.slot_date + s.start_time > (clock_timestamp() AT TIME ZONE 'Asia/Jakarta')
        AND NOT EXISTS (
          SELECT 1
          FROM reschedule_requests AS r
          WHERE r.available_slot_id = s.id
            AND r.status IN ('PENDING', 'APPROVED')
        )
      ORDER BY s.slot_date ASC, s.start_time ASC
    `;
  const result = await pool.query(query, [date]);
  return result.rows;
}

module.exports = { getAvailableSlots };
