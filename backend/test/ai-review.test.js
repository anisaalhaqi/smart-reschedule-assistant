const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

test('review admin menghubungkan Express dengan AI Service', async (t) => {
  let intent = 'RESCHEDULE';
  let preference = { source: 'RULE', start_time: '08:00', end_time: '11:00' };
  let approved = false;
  let cancellationFlag = false;
  const calls = [];
  const ai = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    calls.push({ path: req.url, body });
    const data = req.url.endsWith('/analyze')
      ? { intent, confidence: 0.92, needs_review: false, review_reasons: [], preference }
      : { source: 'TEMPLATE', draft_text: 'Halo, berikut informasi jadwalnya.' };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data }));
  });
  ai.listen(0, '127.0.0.1');
  await once(ai, 'listening');
  t.after(() => ai.listening && new Promise(resolve => ai.close(resolve)));
  process.env.AI_SERVICE_URL = `http://127.0.0.1:${ai.address().port}`;
  process.env.JWT_SECRET = 'test-only-fixture-secret';

  const app = express();
  app.use(express.json());
  app.use('/api/available-slots', require('../src/routes/available-slots.routes'));
  app.use('/api/reschedule-requests', require('../src/routes/reschedule-requests.routes'));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/reschedule-requests/10/ai-review`;
  const review = (role) => fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt.sign({ sub: 1, role }, process.env.JWT_SECRET)}` },
  });

  const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const query = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('SET ai_cancellation_review = TRUE')) {
      cancellationFlag = true;
      return { rows: [] };
    }
    if (sql.includes('FROM reschedule_requests AS rr')) {
      return { rows: [{
        id: 10, schedule_id: 2, available_slot_id: 3, reason: 'Saya ingin mengubah jadwal.',
        created_at: new Date('2026-11-21T05:00:00Z'), customer_name: 'Customer Uji',
        ai_cancellation_review: cancellationFlag, class_name: 'Pilates', status: approved ? 'APPROVED' : 'PENDING',
        current_schedule_date: futureDate, current_start_time: '16:00:00',
        requested_schedule_date: futureDate, requested_start_time: '08:00:00',
      }] };
    }
    assert.match(sql, /FROM available_slots AS s/);
    return { rows: [
      { id: 3, slot_date: futureDate, start_time: '08:00:00', end_time: '09:00:00' },
      { id: 4, slot_date: futureDate, start_time: '09:00:00', end_time: '10:00:00' },
      { id: 5, slot_date: futureDate, start_time: '16:00:00', end_time: '17:00:00' },
    ] };
  });

  assert.equal((await review('CUSTOMER')).status, 403);
  assert.equal((await fetch(new URL('/api/available-slots', url))).status, 401);
  assert.equal(query.mock.callCount(), 0);
  const pending = await review('ADMIN');
  assert.equal(pending.status, 200);
  assert.deepEqual((await pending.json()).data.slots.map(slot => slot.slot_id), [4]);
  assert.equal(calls[0].body.message_timestamp, '2026-11-21T05:00:00.000Z');
  assert.equal(calls[1].body.available_slots[0].start_time, '09:00');

  preference = { source: 'RULE', requested_time: '08:30', start_time: '08:30', end_time: '09:30' };
  const exact = (await (await review('ADMIN')).json()).data;
  assert.deepEqual(exact.slots, []);
  intent = 'CANCELLATION';
  const cancellation = (await (await review('ADMIN')).json()).data;
  assert.equal(cancellation.manual_review, 'CANCELLATION');
  assert.equal(cancellation.draft, null);
  assert.deepEqual(cancellation.slots, []);
  assert.equal(calls.length, 5);

  assert.equal(cancellationFlag, true);
  const transaction = [];
  const release = t.mock.fn(() => transaction.push('release'));
  t.mock.method(pool, 'connect', async () => ({
    release,
    query: async (sql) => {
      if (sql.includes('FOR UPDATE OF rr, s')) return { rows: [{
        id: 10, schedule_id: 2, request_status: 'PENDING',
        schedule_status: 'SCHEDULED', ai_cancellation_review: cancellationFlag,
      }] };
      transaction.push(sql);
      assert.ok(['BEGIN', 'ROLLBACK'].includes(sql));
      return { rows: [] };
    },
  }));
  const approval = await fetch(url.replace('/ai-review', ''), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${jwt.sign({ sub: 1, role: 'ADMIN' }, process.env.JWT_SECRET)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'APPROVED' }),
  });
  assert.equal(approval.status, 409);
  assert.deepEqual(transaction, ['BEGIN', 'ROLLBACK', 'release']);

  approved = true;
  const finalReview = (await (await review('ADMIN')).json()).data;
  assert.equal(finalReview.draft.source, 'TEMPLATE');
  assert.equal(calls[6].body.intent, 'RESCHEDULE');
  assert.equal(calls[6].body.approved_time, '08:00');

  await new Promise(resolve => ai.close(resolve));
  approved = false;
  const offline = await review('ADMIN');
  assert.equal(offline.status, 200);
  const offlineData = (await offline.json()).data;
  assert.equal(offlineData.error, 'AI_SERVICE_UNAVAILABLE');
  assert.equal(offlineData.manual_review, 'CANCELLATION');
});
