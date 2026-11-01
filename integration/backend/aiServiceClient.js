/**
 * Client AI Service untuk Backend Express (Node.js 18+, memakai fetch bawaan).
 *
 * Salin file ini ke backend (mis. src/services/aiServiceClient.js) dan set env:
 *   AI_SERVICE_URL=http://localhost:8000
 *   AI_SERVICE_API_KEY=            (opsional, harus sama dengan AI_SERVICE_API_KEY di AI Service)
 *   AI_SERVICE_TIMEOUT_MS=10000
 *
 * Semua fungsi TIDAK melempar error. Hasilnya selalu:
 *   { ok: true,  data: {...} }                       -> sukses
 *   { ok: false, error: { code, message } }          -> AI gagal/timeout; alur Web tetap jalan (fallback)
 */

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
const AI_SERVICE_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 10000);

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: json?.error || { code: 'AI_SERVICE_ERROR', message: `HTTP ${res.status}` } };
    }
    return { ok: true, data: json.data };
  } catch (err) {
    const code = err.name === 'AbortError' ? 'AI_SERVICE_TIMEOUT' : 'AI_SERVICE_UNAVAILABLE';
    return { ok: false, error: { code, message: err.message } };
  } finally {
    clearTimeout(timer);
  }
}

/** GET /health */
function checkHealth() {
  return request('GET', '/health');
}

/**
 * POST /api/v1/analyze — panggil saat POST /api/reschedule-requests.
 * @param {{ message_text: string, message_timestamp?: string }} payload
 *   message_timestamp ISO 8601, mis. "2026-10-09T19:00:00+07:00" (tanpa zona = WIB)
 */
function analyzeMessage({ message_text, message_timestamp }) {
  return request('POST', '/api/v1/analyze', { message_text, message_timestamp });
}

/** POST /api/v1/classify — untuk pengujian model. */
function classifyMessage({ message_text }) {
  return request('POST', '/api/v1/classify', { message_text });
}

/**
 * POST /api/v1/draft-response — panggil saat admin membuka/memutuskan request.
 * @param {object} payload
 * @param {'RESCHEDULE'|'CANCELLATION'|'SCHEDULE_INQUIRY'|'CONFIRMATION'|'OTHER'} payload.intent
 * @param {object} [payload.schedule]        objek dari GET /api/schedules/:id ({ id, customer_name, class_name, date, time })
 * @param {string} [payload.customer_name]   default: schedule.customer_name
 * @param {'Kak'|'Bapak'|'Ibu'} [payload.salutation]
 * @param {object} [payload.preference]      dari hasil analyze (ai_preference)
 * @param {object[]} [payload.available_slots] objek dari GET /api/available-slots ({ slot_id, date, start_time, end_time, available })
 * @param {'PENDING'|'APPROVED'|'REJECTED'} [payload.status]
 * @param {string} [payload.approved_date]   wajib jika status APPROVED untuk RESCHEDULE
 * @param {string} [payload.approved_time]
 * @param {string} [payload.message_text]
 */
function draftResponse(payload) {
  return request('POST', '/api/v1/draft-response', payload);
}

/**
 * Filter slot dari database berdasarkan preference hasil analyze.
 * Backend tetap sumber kebenaran ketersediaan slot; fungsi ini hanya menyaring.
 */
function filterSlotsByPreference(slots, preference) {
  if (!preference) return slots.filter((s) => s.available !== false);
  const { date_from, date_to, start_time, end_time } = preference;
  return slots.filter((s) => {
    if (s.available === false) return false;
    if (date_from && s.date < date_from) return false;
    if (date_to && s.date > date_to) return false;
    if (start_time && s.start_time < start_time) return false;
    if (end_time && s.start_time >= end_time) return false;
    return true;
  });
}

module.exports = {
  checkHealth,
  analyzeMessage,
  classifyMessage,
  draftResponse,
  filterSlotsByPreference,
};
