import { useState } from "react";

import { CalendarDays, Check, Inbox, MessageCircle, ShieldCheck, Sparkles, X } from "lucide-react";

import Avatar from "./Avatar";
import { slotLabel } from "../data/rescheduleApi";
import StatusBadge from "../components/StatusBadge";

export default function RequestDetail({ request, onStatusChange, onAnalyze }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [review, setReview] = useState(null);
  const [confirmedReschedule, setConfirmedReschedule] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function generateReview() {
    setBusy("ai");
    setError("");
    try {
      const result = await onAnalyze(request.id);
      setReview(result);
      setSelectedSlot(null);
      setConfirmedReschedule(false);
      if (result.manual_review) setDraft("");
      else if (result.draft) setDraft(result.draft.draft_text);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy("");
    }
  }

  async function decide(status) {
    setBusy("decision");
    setError("");
    try {
      await onStatusChange(
        request.id,
        status,
        status === "APPROVED" ? selectedSlot ?? undefined : undefined,
        status === "APPROVED" && confirmedReschedule ? true : undefined,
      );
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy("");
    }
  }

  if (!request) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <Inbox size={24} />
          </div>

          <p className="mt-4 font-bold text-ink">Pilih request untuk ditinjau</p>

          <p className="mt-1 max-w-xs text-xs leading-5 text-muted">Detail pesan customer, analisis AI, dan slot alternatif akan muncul di sini.</p>
        </div>
      </div>
    );
  }

  const slots = review?.slots || [];
  const pending = request.status === "PENDING";
  const manualCancellation = review?.manual_review === "CANCELLATION" || (pending && request.cancellationReview);
  const analysis = review?.analysis;
  const preference = analysis?.preference;

  return (
    <div className="space-y-4">
      {/* Customer information */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar request={request} />

            <div>
              <h3 className="text-sm font-extrabold text-ink">{request.name}</h3>

              <p className="mt-1 text-[10px] text-muted">
                #{request.id}
              </p>
            </div>
          </div>

          <StatusBadge status={request.status} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Jadwal di sistem</p>

            <p className="mt-1.5 text-xs font-bold text-ink">{request.currentClass}</p>

            <p className="mt-1 text-[10px] text-muted">{request.currentDate}</p>

            <p className="mt-1 text-[10px] text-muted">{request.currentTime}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Slot tujuan dari customer</p>

            <p className="mt-1.5 text-xs font-bold text-ink">{request.requestedDate}</p>

            <p className="mt-1 text-[10px] text-muted">{request.requestedTime}</p>

          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle size={14} className="text-slate-400" />
            <p className="text-[11px] font-bold text-ink">Pesan customer</p>
          </div>

          <div className="rounded-xl rounded-tl-sm border border-sky-100 bg-sky-50/70 p-3.5 text-xs leading-6 text-slate-700">{request.message}</div>

          <p className="mt-1.5 text-right text-[9px] text-slate-400">Diajukan {request.created}</p>
        </div>
      </section>

      {/* AI analysis */}
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
              <Sparkles size={17} />
            </div>

            <div>
              <h3 className="text-xs font-extrabold text-ink">Analisis pesan AI</h3>

            </div>
          </div>

          <button onClick={generateReview} disabled={Boolean(busy)} className="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
            {busy === "ai" ? "Memproses…" : "Analisis & buat draft"}
          </button>
        </div>

        <div className="space-y-2 p-4 text-xs sm:p-5">
          {error && <p role="alert" className="text-rose-700">{error}</p>}
          {review?.error && <p role="status" className="text-orange-700">Sebagian hasil AI belum tersedia ({review.error}). Kamu tetap bisa memproses permintaan.</p>}
          {manualCancellation && <p role="status" className="text-orange-700">Pesan ini terdeteksi sebagai pembatalan. Verifikasi ke customer dan tangani pembatalan secara manual.</p>}
          {analysis && (
            <>
              <p><strong>Intent</strong> {analysis.intent} · {Math.round(analysis.confidence * 100)}%</p>
              {analysis.needs_review && <p className="font-semibold text-orange-700">Perlu ditinjau ({analysis.review_reasons.join(", ")})</p>}
              <p><strong>Preferensi</strong> {[
                preference.requested_date || preference.day_name ||
                  (preference.date_from && `${preference.date_from} – ${preference.date_to || preference.date_from}`),
                preference.requested_time || (preference.start_time && preference.end_time
                  ? `${preference.start_time}–${preference.end_time}` : preference.time_of_day),
              ].filter(Boolean).join(" · ") || "Belum ditemukan"}</p>
            </>
          )}
        </div>
      </section>

      {pending && (
        <section className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
          <h3 className="flex items-center gap-2 text-xs font-extrabold"><CalendarDays size={15} /> Pilih slot untuk disetujui</h3>
          <label className="block rounded-lg border p-3 text-xs">
            <input type="radio" name="slot" checked={selectedSlot === null} onChange={() => setSelectedSlot(null)} disabled={Boolean(busy)} className="mr-2" />
            Slot awal yang diajukan · {request.requestedDate} · {request.requestedTime}
          </label>
          {slots.map((slot) => (
            <label key={slot.slot_id} className="block rounded-lg border p-3 text-xs">
              <input type="radio" name="slot" checked={selectedSlot === slot.slot_id} onChange={() => setSelectedSlot(slot.slot_id)} disabled={Boolean(busy)} className="mr-2" />
              {slotLabel(slot)}
            </label>
          ))}
          {analysis && !manualCancellation && !slots.length && <p className="text-xs text-muted">Tidak ada slot alternatif yang cocok.</p>}
        </section>
      )}

      {/* Draft balasan AI */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <MessageCircle size={15} />
            </div>

            <div>
              <h3 className="text-xs font-extrabold text-ink">Draft balasan AI</h3>

              <p className="mt-0.5 text-[10px] text-muted">Tinjau dan edit sebelum menyalin</p>
            </div>
          </div>

          <span className="text-[9px] font-bold text-violet-700">{review?.draft?.source === "LLM" ? "Gemini" : review?.draft ? "Template" : "Editable"}</span>
        </div>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy === "ai"}
          aria-label="Draft balasan"
          rows={5}
          className="mt-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
          placeholder="Buat draft AI atau tulis balasan sendiri…"
        />

        {pending && manualCancellation && (
          <label className="mt-3 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={confirmedReschedule} onChange={(event) => setConfirmedReschedule(event.target.checked)} />
            Saya sudah memastikan customer ingin pindah jadwal.
          </label>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => decide("APPROVED")}
            disabled={!pending || Boolean(busy) || (manualCancellation && !confirmedReschedule)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} />
            Setujui pindah jadwal
          </button>

          <button
            onClick={() => decide("REJECTED")}
            disabled={!pending || Boolean(busy)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={14} />
            Tolak permintaan
          </button>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-4 text-slate-400">
          <ShieldCheck size={12} className="mt-0.5 shrink-0" />
          Tinjau isi draft dan pastikan jadwal sebelum menghubungi customer.
        </p>
      </section>
    </div>
  );
}
