import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";

export default function RequestRow({ request, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-3.5 text-left transition sm:p-4 ${active ? "border-emerald-200 bg-gradient-to-r from-sky-50/90 to-emerald-50/70 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/70"}`}
    >
      <div className="flex items-start gap-3">
        <Avatar request={request} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[12px] font-bold text-ink sm:text-[13px]">{request.name}</p>

            <span className="shrink-0 text-[9px] font-semibold text-slate-400">{request.id}</span>
          </div>

          <p className="mt-1 truncate text-[10px] text-muted">
            {request.currentClass} · {request.created}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-slate-600">“{request.message}”</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-white px-2 py-1 text-[9px] font-bold text-slate-600 ring-1 ring-slate-100">{request.intent}</span>

          {request.review && <span className="rounded-md bg-orange-50 px-2 py-1 text-[9px] font-bold text-orange-700 ring-1 ring-orange-100">Review needed</span>}
        </div>

        <StatusBadge status={request.status} />
      </div>
    </button>
  );
}
