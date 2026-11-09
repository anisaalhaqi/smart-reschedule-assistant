import { ArrowRight, CalendarDays, Check, CheckCheck, ChevronRight, Clock3, Inbox, ShieldCheck, Sparkles } from "lucide-react";

import SectionHeading from "../components/SectionHeading";
import StatCard from "../components/StatusCard";
import Avatar from "../components/Avatar";

export default function OverviewPage({ requests, selectRequest, setPage }) {
  const pending = requests.filter((request) => request.status === "PENDING");

  const needsReview = pending.filter((request) => request.review);

  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Saturday, 24 October 2026"
        title="Good morning, Admin 👋"
        description="Here's what's happening at Gymnasyum today."
        action={
          <button onClick={() => setPage("requests")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-900">
            View all requests <ArrowRight size={14} />
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" value={requests.length} detail="All time" icon={Inbox} tone="sky" trend="12%" />

        <StatCard label="Waiting for review" value={pending.length} detail="Need attention" icon={Clock3} tone="amber" />

        <StatCard label="Approved requests" value={requests.filter((request) => request.status === "APPROVED").length} detail="This week" icon={CheckCheck} tone="mint" trend="8%" />

        <StatCard label="AI needs review" value={needsReview.length} detail="Low confidence" icon={Sparkles} tone="lilac" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-ink">Requests that need attention</h3>

              <p className="mt-1 text-[10px] text-muted">Start with the newest customer messages.</p>
            </div>

            <button onClick={() => setPage("requests")} className="text-[10px] font-bold text-emerald-800">
              See all <ArrowRight size={12} className="ml-1 inline" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {pending.slice(0, 3).map((request) => (
              <button
                key={request.id}
                onClick={() => {
                  selectRequest(request.id);
                  setPage("requests");
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30"
              >
                <Avatar request={request} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">{request.name}</p>

                  <p className="mt-1 truncate text-[10px] text-muted">
                    {request.intent} · {request.created}
                  </p>
                </div>

                {request.review && <span className="rounded-md bg-orange-50 px-2 py-1 text-[9px] font-bold text-orange-700">Review</span>}

                <ChevronRight size={15} className="text-slate-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-100 via-white to-emerald-100 p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
              <Sparkles size={18} />
            </div>

            <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-emerald-800">Smart assistant</span>
          </div>

          <h3 className="mt-4 max-w-xs font-display text-xl font-extrabold leading-snug text-ink">A smoother schedule starts with a smarter reply.</h3>

          <p className="mt-2 text-xs leading-6 text-slate-600">AI helps classify customer messages, identify time preferences, and prepare a reply draft. You make the final call.</p>

          <div className="mt-5 space-y-3">
            {[
              { icon: Check, label: "Understand customer intent" },
              { icon: CalendarDays, label: "Review available time slots" },
              { icon: ShieldCheck, label: "Approve with confidence" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-[11px] font-semibold text-ink">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/90 text-emerald-700">
                  <Icon size={13} />
                </span>

                {label}
              </div>
            ))}
          </div>

          <button onClick={() => setPage("requests")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-900">
            Review requests <ArrowRight size={14} />
          </button>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Today's schedule</h3>

            <p className="mt-1 text-[10px] text-muted">A quick look at upcoming sessions.</p>
          </div>

          <span className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">Sat, 24 Oct</span>
        </div>

        <div className="mt-4 space-y-0">
          {[
            {
              time: "08:00",
              name: "Personal Training",
              person: "Ibu Ratna Wijaya",
              coach: "Coach Dimas",
              tone: "bg-sky-400",
            },
            {
              time: "10:30",
              name: "Strength Training",
              person: "Bapak Hendra Putra",
              coach: "Coach Raka",
              tone: "bg-emerald-400",
            },
            {
              time: "13:00",
              name: "Yoga Flow",
              person: "Ibu Maya Prameswari",
              coach: "Coach Sarah",
              tone: "bg-violet-400",
            },
          ].map((session) => (
            <div key={session.time} className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
              <div className="w-12 pt-1 text-[10px] font-bold text-muted">{session.time}</div>

              <div className={`w-1 rounded-full ${session.tone}`} />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink">{session.name}</p>

                <p className="mt-1 text-[10px] text-muted">
                  {session.person} · {session.coach}
                </p>
              </div>

              <span className="self-start rounded-md bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-500">1 hour</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
