const { analyzeMessage, draftResponse, filterSlotsByPreference } = require('../../../integration/backend/aiServiceClient');
const { getAvailableSlots } = require('./available-slots.service');

const INTENTS = new Set(['RESCHEDULE', 'CANCELLATION', 'SCHEDULE_INQUIRY', 'CONFIRMATION', 'OTHER']);

function formatSlot(row) {
  return {
    slot_id: row.id,
    date: row.slot_date,
    start_time: row.start_time.slice(0, 5),
    end_time: row.end_time.slice(0, 5),
    available: true,
  };
}

async function buildAiReview(request) {
  // PostgreSQL menyimpan waktu pengajuan. Pakai waktu itu untuk "besok", termasuk saat dibuka ulang.
  const message = Array.from(request.reason.trim()).slice(0, 2000).join('');
  const timestamp = new Date(request.created_at).toISOString();
  const analyzed = await analyzeMessage({ message_text: message, message_timestamp: timestamp });
  if (!analyzed.ok) return { analysis: null, slots: [], draft: null, error: analyzed.error.code };

  const analysis = analyzed.data;
  if (!INTENTS.has(analysis.intent) || !Number.isFinite(analysis.confidence) ||
      analysis.confidence < 0 || analysis.confidence > 1 ||
      typeof analysis.needs_review !== 'boolean' || !Array.isArray(analysis.review_reasons) ||
      !analysis.preference || typeof analysis.preference !== 'object') {
    return { analysis: null, slots: [], draft: null, error: 'AI_INVALID_RESPONSE' };
  }

  const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
  const today = wibNow.slice(0, 10);
  const nowWib = wibNow.slice(11, 16);
  const canSuggest = ['RESCHEDULE', 'SCHEDULE_INQUIRY'].includes(analysis.intent) &&
    request.status !== 'APPROVED' && !analysis.preference.is_ambiguous &&
    analysis.preference.source !== 'NONE';
  const slots = canSuggest
    ? filterSlotsByPreference((await getAvailableSlots(null, today)).map(formatSlot), analysis.preference)
        .filter((slot) => slot.slot_id !== request.available_slot_id && (slot.date > today || slot.start_time > nowWib))
        .slice(0, 20)
    : [];

  const approved = request.status === 'APPROVED';
  const draft = await draftResponse({
    // Status APPROVED dari Web selalu berarti pindah jadwal, apa pun prediksi model.
    intent: approved ? 'RESCHEDULE' : analysis.intent,
    customer_name: request.customer_name,
    schedule: approved ? undefined : {
      id: request.schedule_id,
      class_name: request.class_name,
      date: request.current_schedule_date,
      time: request.current_start_time.slice(0, 5),
    },
    preference: analysis.preference,
    status: request.status,
    available_slots: slots,
    approved_date: approved ? request.requested_schedule_date : undefined,
    approved_time: approved ? request.requested_start_time.slice(0, 5) : undefined,
  });

  return {
    analysis,
    slots,
    draft: draft.ok && typeof draft.data.draft_text === 'string' ? draft.data : null,
    error: draft.ok ? (typeof draft.data.draft_text === 'string' ? null : 'AI_INVALID_RESPONSE') : draft.error.code,
  };
}

module.exports = { buildAiReview };
