BEGIN;
INSERT INTO schedules(id,customer_name,class_name,schedule_date,start_time,end_time,status) VALUES
(1,'Budi Santoso','Personal Training',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 1,'09:00','10:00','SCHEDULED'),
(2,'Siti Rahma','Strength Training',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 1,'11:00','12:00','SCHEDULED'),
(3,'Andi Pratama','Fitness Assessment',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 2,'14:00','15:00','RESCHEDULED')
ON CONFLICT(id) DO NOTHING;
INSERT INTO available_slots(id,slot_date,start_time,end_time,is_booked) VALUES
(701,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 3,'09:00','10:00',FALSE),
(702,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 3,'10:00','11:00',TRUE),
(703,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 3,'14:00','15:00',FALSE),
(704,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 4,'09:00','10:00',FALSE),
(705,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 4,'11:00','12:00',TRUE)
ON CONFLICT(id) DO NOTHING;
INSERT INTO reschedule_requests(id,schedule_id,available_slot_id,reason,status) VALUES
(501,1,701,'Ada keperluan keluarga','PENDING'),
(502,2,702,'Perubahan jadwal kerja','APPROVED'),
(503,3,703,'Memerlukan waktu alternatif','REJECTED')
ON CONFLICT(id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('schedules','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM schedules),1),true);
SELECT setval(pg_get_serial_sequence('available_slots','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM available_slots),1),true);
SELECT setval(pg_get_serial_sequence('reschedule_requests','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM reschedule_requests),1),true);
COMMIT;
