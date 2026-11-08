import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import SectionHeading from "../components/ui/SectionHeading";
import RequestRow from "../components/requests/RequestRow";
import RequestDetail from "../components/requests/RequestDetail";

export default function RequestsPage({ requests, selectedId, selectRequest, onStatusChange, onDraftChange, onApproveSlot }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");

  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        const matchesQuery = `${request.name} ${request.id} ${request.intent} ${request.message}`.toLowerCase().includes(query.toLowerCase());

        const matchesFilter = filter === "ALL" || request.status === filter;

        return matchesQuery && matchesFilter;
      }),
    [requests, query, filter],
  );

  const selected = requests.find((request) => request.id === selectedId) || filtered[0] || null;

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Customer care"
        title="Reschedule requests"
        description="Review each message, check the AI suggestion, then decide on the next step."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {requests.filter((request) => request.status === "PENDING").length} pending requests
          </div>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(300px,0.78fr)_minmax(420px,1.22fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-soft sm:p-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={15} className="shrink-0 text-slate-400" />

            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, or message..." className="h-10 min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-400" />

            <span className="hidden rounded bg-slate-100 px-1.5 py-1 text-[9px] font-bold text-slate-400 sm:inline">⌘ K</span>
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {[
              { id: "ALL", label: "All" },
              { id: "PENDING", label: "Pending" },
              { id: "APPROVED", label: "Approved" },
              { id: "REJECTED", label: "Rejected" },
            ].map((item) => (
              <button key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition ${filter === item.id ? "bg-ink text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                {item.label}

                {item.id === "PENDING" && <span className="ml-1.5 opacity-70">{requests.filter((request) => request.status === "PENDING").length}</span>}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2.5">
            {filtered.map((request) => (
              <RequestRow key={request.id} request={request} active={selected?.id === request.id} onClick={() => selectRequest(request.id)} />
            ))}

            {filtered.length === 0 && (
              <div className="py-10 text-center">
                <Search size={20} className="mx-auto text-slate-300" />

                <p className="mt-2 text-xs font-bold text-ink">No requests found</p>

                <p className="mt-1 text-[10px] text-muted">Try another keyword or filter.</p>
              </div>
            )}
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] text-muted">
            Showing {filtered.length} of {requests.length} requests
          </p>
        </section>

        <div className="min-w-0">{selected ? <RequestDetail key={selected.id} request={selected} onStatusChange={onStatusChange} onDraftChange={onDraftChange} onApproveSlot={onApproveSlot} /> : <RequestDetail request={null} />}</div>
      </div>
    </div>
  );
}
