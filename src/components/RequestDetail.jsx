import {
  CalendarDays,
  Check,
  CheckCheck,
  Clock3,
  Inbox,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import Avatar from "../components/Avatar";
import StatusBadge from "../components/StatusBadge";

export default function RequestDetail({
  request,
  onStatusChange,
  processing = false,
}) {
  if (!request) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <Inbox size={24} />
          </div>

          <p className="mt-4 font-bold text-ink">
            Pilih request untuk ditinjau
          </p>

          <p className="mt-1 max-w-xs text-xs leading-5 text-muted">
            Detail pesan customer dan slot yang diminta akan muncul di sini.
          </p>
        </div>
      </div>
    );
  }

  const slots = request.slots || [];
  const pending = request.status === "PENDING";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar request={request} />

            <div>
              <h3 className="text-sm font-extrabold text-ink">
                {request.name}
              </h3>

              <p className="mt-1 text-[10px] text-muted">
                {request.membership}
                <span className="mx-1">·</span>
                {request.id}
              </p>
            </div>
          </div>

          <StatusBadge status={request.status} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Current session
            </p>

            <p className="mt-1.5 text-xs font-bold text-ink">
              {request.currentClass}
            </p>

            <p className="mt-1 text-[10px] text-muted">
              {request.currentDate}
            </p>

            <p className="mt-1 text-[10px] text-muted">
              {request.currentTime}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Requested schedule
            </p>

            <p className="mt-1.5 text-xs font-bold text-ink">
              {request.preferredDay}
            </p>

            <p className="mt-1 text-[10px] text-muted">
              {request.preferredTime}
            </p>

            <p className="mt-1 text-[10px] text-muted">
              Reason: {request.reason}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle size={14} className="text-slate-400" />
            <p className="text-[11px] font-bold text-ink">
              Customer message
            </p>
          </div>

          <div className="rounded-xl rounded-tl-sm border border-sky-100 bg-sky-50/70 p-3.5 text-xs leading-6 text-slate-700">
            {request.message}
          </div>

          <p className="mt-1.5 text-right text-[9px] text-slate-400">
            Received {request.created}
          </p>
        </div>
      </section>

      {/* AI integration status */}
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
              <Sparkles size={17} />
            </div>

            <div>
              <h3 className="text-xs font-extrabold text-ink">
                AI message analysis
              </h3>

              <p className="mt-0.5 text-[10px] text-muted">
                Smart Assistant integration
              </p>
            </div>
          </div>

          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-slate-500 ring-1 ring-slate-200">
            Coming soon
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-3">
              <Sparkles
                size={17}
                className="mt-0.5 shrink-0 text-emerald-700"
              />

              <div>
                <p className="text-xs font-bold text-ink">
                  AI analysis is not connected yet
                </p>

                <p className="mt-1 text-[10px] leading-5 text-muted">
                  Customer message analysis, intent detection, and confidence
                  scores will appear here after the GenAI integration is
                  completed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Requested slot */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-start gap-2">
          <CalendarDays size={15} className="mt-0.5 text-emerald-700" />

          <div>
            <h3 className="text-xs font-extrabold text-ink">
              Requested time slot
            </h3>

            <p className="mt-1 text-[10px] text-muted">
              Schedule selected by the customer
            </p>
          </div>
        </div>

        {slots.length > 0 ? (
          <div className="mt-4 space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                  <Check size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold text-ink">
                    {slot.day}
                    <span className="font-semibold text-muted">
                      {" "}· {slot.time}
                    </span>
                  </p>

                  <p className="mt-1 text-[10px] text-muted">
                    {slot.coach}
                  </p>
                </div>

                <span className="hidden rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-800 sm:inline">
                  Requested
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
            <Clock3
              className="mx-auto text-slate-400"
              size={20}
            />

            <p className="mt-2 text-xs font-bold text-ink">
              No requested slot found
            </p>
          </div>
        )}

        <p className="mt-3 text-[10px] leading-5 text-muted">
          Approval will use the time slot originally selected by the customer.
          Admin cannot change the requested slot during approval.
        </p>
      </section>

      {/* Admin decision */}
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <ShieldCheck size={15} />
          </div>

          <div>
            <h3 className="text-xs font-extrabold text-ink">
              Admin decision
            </h3>

            <p className="mt-0.5 text-[10px] text-muted">
              Review the request before making a decision
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => onStatusChange(request.id, "APPROVED")}
            disabled={!pending || processing || slots.length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck size={14} />
            {processing ? "Processing..." : "Approve request"}
          </button>

          <button
            onClick={() => onStatusChange(request.id, "REJECTED")}
            disabled={!pending || processing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={14} />
            Reject request
          </button>
        </div>

        {!pending && (
          <p className="mt-3 text-[10px] text-muted">
            This request has already been processed.
          </p>
        )}

        {pending && slots.length === 0 && (
          <p className="mt-3 text-[10px] text-rose-600">
            Approval is unavailable because the requested slot could not be
            identified.
          </p>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-4 text-slate-400">
          <ShieldCheck size={12} className="mt-0.5 shrink-0" />
          Admin remains responsible for reviewing the customer message and
          making the final decision.
        </p>
      </section>
    </div>
  );
}

