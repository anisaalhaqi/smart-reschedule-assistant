const { analyzeMessage, draftResponse, filterSlotsByPreference } = require('../../../integration/backend/aiServiceClient');
const { markCancellationReview } = require('./reschedule-requests.service');
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
  const manualReview = request.status !== 'APPROVED' && request.ai_cancellation_review
    ? { manual_review: 'CANCELLATION' }
    : {};
  const analyzed = await analyzeMessage({ message_text: message, message_timestamp: timestamp });
  if (!analyzed.ok) return { analysis: null, slots: [], draft: null, error: analyzed.error.code, ...manualReview };

  const analysis = analyzed.data;
  if (!INTENTS.has(analysis.intent) || !Number.isFinite(analysis.confidence) ||
      analysis.confidence < 0 || analysis.confidence > 1 ||
      typeof analysis.needs_review !== 'boolean' || !Array.isArray(analysis.review_reasons) ||
      !analysis.preference || typeof analysis.preference !== 'object') {
    return { analysis: null, slots: [], draft: null, error: 'AI_INVALID_RESPONSE', ...manualReview };
  }

  // A reschedule request has no cancellation decision. Keep cancellation
  // messages in manual review until an admin verifies the customer's intent.
  if (manualReview.manual_review || (analysis.intent === 'CANCELLATION' && request.status !== 'APPROVED')) {
    if (request.status === 'PENDING' && !manualReview.manual_review) {
      await markCancellationReview(request.id);
    }
    return { analysis, slots: [], draft: null, error: null, manual_review: 'CANCELLATION' };
  }

  const canSuggest = ['RESCHEDULE', 'SCHEDULE_INQUIRY'].includes(analysis.intent) &&
    request.status !== 'APPROVED' && !analysis.preference.is_ambiguous &&
    analysis.preference.source !== 'NONE';
  const slots = canSuggest
    ? filterSlotsByPreference((await getAvailableSlots()).map(formatSlot), analysis.preference)
        .filter((slot) => slot.slot_id !== request.available_slot_id)
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
