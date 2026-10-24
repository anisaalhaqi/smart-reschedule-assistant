import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Dumbbell,
  FileText,
  Filter,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { initialRequests } from "./data/mockData";

const statusConfig = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  REJECTED: { label: "Rejected", className: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const avatarColors = {
  rose: "bg-rose-100 text-rose-700",
  blue: "bg-sky-100 text-sky-700",
  purple: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
  teal: "bg-teal-100 text-teal-700",
};

function Logo() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-200 via-white to-emerald-200 text-ink shadow-sm ring-1 ring-white">
        <Dumbbell size={21} strokeWidth={2.3} />
      </div>
      <div>
        <div className="font-display text-[17px] font-extrabold tracking-tight text-ink">
          gymnasyum<span className="text-emerald-500">.</span>
        </div>
        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-muted">Smart Reschedule</div>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, open, setOpen }) {
  const items = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "requests", label: "Reschedule requests", icon: Inbox, count: "3" },
    { id: "schedule", label: "Schedule & slots", icon: CalendarDays },
  ];
  return (
    <>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-ink/25 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-slate-100 bg-white px-5 pb-5 pt-6 transition-transform lg:static lg:z-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Logo />
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 lg:hidden">
            <X size={18} />
          </button>
        </div>
        <div className="mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</div>
        <nav className="mt-3 space-y-1.5">
          {items.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => {
                setPage(id);
                setOpen(false);
              }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${page === id ? "bg-gradient-to-r from-sky-50 to-emerald-50 text-ink shadow-sm ring-1 ring-emerald-100" : "text-slate-500 hover:bg-slate-50 hover:text-ink"}`}
            >
              <Icon size={18} className={page === id ? "text-emerald-700" : "text-slate-400 group-hover:text-ink"} />
              <span className="flex-1">{label}</span>
              {count && <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${page === id ? "bg-white text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{count}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Manage</div>
        <nav className="mt-3 space-y-1.5">
          <button onClick={() => setPage("team")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${page === "team" ? "bg-sky-50 text-ink" : "text-slate-500 hover:bg-slate-50"}`}>
            <Users size={18} className="text-slate-400" /> Team & members
          </button>
          <button onClick={() => setPage("settings")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${page === "settings" ? "bg-sky-50 text-ink" : "text-slate-500 hover:bg-slate-50"}`}>
            <Settings2 size={18} className="text-slate-400" /> Settings
          </button>
        </nav>
        <div className="mt-auto">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 via-white to-emerald-100 p-4 ring-1 ring-sky-100/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
              <Sparkles size={16} />
            </div>
            <p className="mt-3 text-sm font-bold text-ink">A little help from AI</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">Review AI suggestions before confirming any schedule.</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
              <ShieldCheck size={13} /> Admin stays in control
            </div>
          </div>
          <button className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-bold text-white">AD</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">Admin Gymnasyum</p>
              <p className="mt-0.5 text-[10px] text-muted">Administrator</p>
            </div>
            <MoreHorizontal size={17} className="text-slate-400" />
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, subtitle, setOpen }) {
  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-100/90 bg-white/90 px-4 backdrop-blur-xl sm:px-7 xl:px-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-500 lg:hidden">
          <Menu size={18} />
        </button>
        <div>
          <h1 className="font-display text-[17px] font-extrabold tracking-tight text-ink sm:text-[19px]">{title}</h1>
          <p className="mt-0.5 hidden text-[11px] text-muted sm:block">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-semibold text-slate-500">AI service connected</span>
        </div>
        <button aria-label="Help" className="hidden rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 sm:block">
          <CircleHelp size={17} />
        </button>
        <button aria-label="Notifications" className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50">
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-400 ring-2 ring-white" />
        </button>
        <div className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sky-200 to-emerald-200 text-[11px] font-extrabold text-ink">AD</div>
      </div>
    </header>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone, trend }) {
  const tones = { sky: "bg-sky-100 text-sky-700", mint: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", lilac: "bg-violet-100 text-violet-700" };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={19} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight size={12} /> {trend}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-semibold text-muted">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="font-display text-[28px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
        <span className="text-[10px] text-slate-400">{detail}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${config.className}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function Avatar({ request, size = "md" }) {
  const dimensions = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  return <div className={`grid shrink-0 place-items-center rounded-full font-extrabold ${dimensions} ${avatarColors[request.color] || avatarColors.blue}`}>{request.initials}</div>;
}

function RequestRow({ request, active, onClick }) {
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

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>}
        <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-[23px]">{title}</h2>
        {description && <p className="mt-1.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function RequestDetail({ request, onStatusChange, onDraftChange, onApproveSlot }) {
  const [selectedSlot, setSelectedSlot] = useState(request?.slots?.[0]?.id ?? null);
  const [showAllSlots, setShowAllSlots] = useState(false);
  if (!request)
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
  const slots = request.slots || [];
  const chosenSlot = slots.find((slot) => slot.id === selectedSlot);
  const pending = request.status === "PENDING";
  const shownSlots = showAllSlots ? slots : slots.slice(0, 3);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar request={request} />
            <div>
              <h3 className="text-sm font-extrabold text-ink">{request.name}</h3>
              <p className="mt-1 text-[10px] text-muted">
                {request.membership} <span className="mx-1">·</span> {request.id}
              </p>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Current session</p>
            <p className="mt-1.5 text-xs font-bold text-ink">{request.currentClass}</p>
            <p className="mt-1 text-[10px] text-muted">{request.currentDate}</p>
            <p className="mt-1 text-[10px] text-muted">{request.currentTime}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Customer preference</p>
            <p className="mt-1.5 text-xs font-bold text-ink">{request.preferredDay}</p>
            <p className="mt-1 text-[10px] text-muted">{request.preferredTime}</p>
            <p className="mt-1 text-[10px] text-muted">Reason: {request.reason}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle size={14} className="text-slate-400" />
            <p className="text-[11px] font-bold text-ink">Customer message</p>
          </div>
          <div className="rounded-xl rounded-tl-sm border border-sky-100 bg-sky-50/70 p-3.5 text-xs leading-6 text-slate-700">{request.message}</div>
          <p className="mt-1.5 text-right text-[9px] text-slate-400">Received {request.created}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
              <Sparkles size={17} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-ink">AI message analysis</h3>
              <p className="mt-0.5 text-[10px] text-muted">Generated by Smart Assistant</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-emerald-800 ring-1 ring-emerald-100">AI assisted</span>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted">Detected intent</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-extrabold text-sky-800">{request.intent}</span>
                {request.review && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700">
                    <ShieldCheck size={12} /> Needs review
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-[96px] text-right">
              <p className="text-[10px] text-muted">Confidence score</p>
              <p className={`mt-1 font-display text-xl font-extrabold ${request.confidence < 75 ? "text-orange-600" : "text-emerald-700"}`}>{request.confidence}%</p>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${request.confidence < 75 ? "bg-orange-400" : "bg-gradient-to-r from-sky-400 to-emerald-400"}`} style={{ width: `${request.confidence}%` }} />
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-700" />
              <p className="text-[10px] font-bold text-emerald-900">Extracted preference</p>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-ink">
              {request.preferredDay} · {request.preferredTime}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-muted">Gunakan hasil AI sebagai saran awal. Pastikan kembali konteks pesan sebelum menyetujui perubahan.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-emerald-700" />
              <h3 className="text-xs font-extrabold text-ink">Available time slots</h3>
            </div>
            <p className="mt-1 text-[10px] text-muted">Alternatif berdasarkan preferensi customer</p>
          </div>
          <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-50">
            <Filter size={12} /> Filter
          </button>
        </div>
        {slots.length ? (
          <div className="mt-4 space-y-2">
            {shownSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedSlot === slot.id ? "border-emerald-300 bg-emerald-50/70 ring-2 ring-emerald-100" : "border-slate-100 hover:border-sky-200 hover:bg-sky-50/40"}`}
              >
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selectedSlot === slot.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {selectedSlot === slot.id ? <Check size={16} /> : <Clock3 size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold text-ink">
                    {slot.day}, {slot.date} <span className="font-semibold text-muted">· {slot.time}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-muted">{slot.coach}</p>
                </div>
                <span className="hidden rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-800 sm:inline">Available</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
            <CalendarDays className="mx-auto text-slate-400" size={20} />
            <p className="mt-2 text-xs font-bold text-ink">No matching slots yet</p>
            <p className="mt-1 text-[10px] text-muted">Periksa preferensi customer atau cari slot lain.</p>
          </div>
        )}
        {slots.length > 3 && (
          <button onClick={() => setShowAllSlots(!showAllSlots)} className="mt-2 text-[10px] font-bold text-emerald-800">
            {showAllSlots ? "Show less" : "See all slots"}
          </button>
        )}
        {pending && slots.length > 0 && (
          <button
            onClick={() => onApproveSlot(request.id, chosenSlot)}
            disabled={!chosenSlot}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck size={15} /> Approve selected slot
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <MessageCircle size={15} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-ink">AI reply draft</h3>
              <p className="mt-0.5 text-[10px] text-muted">Review and edit before sending</p>
            </div>
          </div>
          <span className="text-[9px] font-bold text-violet-700">Editable</span>
        </div>
        <textarea
          value={request.draft}
          onChange={(event) => onDraftChange(request.id, event.target.value)}
          rows={5}
          className="mt-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
          placeholder="AI reply draft will appear here..."
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => onStatusChange(request.id, "APPROVED")}
            disabled={!pending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} /> Mark as approved
          </button>
          <button
            onClick={() => onStatusChange(request.id, "REJECTED")}
            disabled={!pending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={14} /> Reject request
          </button>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-4 text-slate-400">
          <ShieldCheck size={12} className="mt-0.5 shrink-0" /> AI only prepares suggestions. Admin remains responsible for reviewing the message and final decision.
        </p>
      </section>
    </div>
  );
}

function OverviewPage({ requests, selectRequest, setPage }) {
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
            { time: "08:00", name: "Personal Training", person: "Ibu Ratna Wijaya", coach: "Coach Dimas", tone: "bg-sky-400" },
            { time: "10:30", name: "Strength Training", person: "Bapak Hendra Putra", coach: "Coach Raka", tone: "bg-emerald-400" },
            { time: "13:00", name: "Yoga Flow", person: "Ibu Maya Prameswari", coach: "Coach Sarah", tone: "bg-violet-400" },
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

function RequestsPage({ requests, selectedId, selectRequest, onStatusChange, onDraftChange, onApproveSlot }) {
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
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> {requests.filter((request) => request.status === "PENDING").length} pending requests
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

function SchedulePage({ requests }) {
  const [day, setDay] = useState("Saturday");
  const schedule = [
    { time: "08:00 – 09:00", title: "Personal Training", coach: "Coach Dimas", member: "Ibu Ratna Wijaya", status: "Booked", color: "border-l-sky-400" },
    { time: "09:00 – 10:00", title: "Personal Training", coach: "Coach Dimas", member: "Available slot", status: "Available", color: "border-l-emerald-400" },
    { time: "10:00 – 11:00", title: "Strength Training", coach: "Coach Raka", member: "Available slot", status: "Available", color: "border-l-emerald-400" },
    { time: "13:00 – 14:00", title: "Yoga Flow", coach: "Coach Sarah", member: "Class · 6 members", status: "Booked", color: "border-l-violet-400" },
    { time: "15:00 – 16:00", title: "Personal Training", coach: "Coach Dimas", member: "Bapak Surya Adinata", status: "Booked", color: "border-l-sky-400" },
  ];
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Availability"
        title="Schedule & slots"
        description="Check existing sessions and possible alternatives before approving a request."
        action={
          <button className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white">
            <CalendarDays size={14} /> This week <ChevronDown size={13} />
          </button>
        }
      />
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Weekly availability</h3>
            <p className="mt-1 text-[10px] text-muted">October 20 – 26, 2026 · Demo data</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
              <button key={d} onClick={() => setDay(d)} className={`rounded-lg px-2.5 py-2 text-[10px] font-bold ${day === d ? "bg-ink text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {schedule.map((item) => (
            <div key={item.time} className={`flex flex-col gap-2 rounded-xl border border-slate-100 border-l-[3px] ${item.color} p-3 sm:flex-row sm:items-center sm:gap-4`}>
              <span className="w-28 text-[10px] font-bold text-muted">{item.time}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {item.coach} · {item.member}
                </p>
              </div>
              <span className={`self-start rounded-md px-2 py-1 text-[9px] font-bold sm:self-auto ${item.status === "Available" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-[10px] leading-5 text-sky-900">
          <CircleHelp size={14} className="mt-0.5 shrink-0" />
          <p>Slot yang ditampilkan merupakan contoh untuk desain frontend. Ketersediaan aktual nantinya harus berasal dari backend.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Scheduled sessions" value="18" detail="This week" icon={CalendarDays} tone="sky" />
        <StatCard label="Available slots" value="7" detail="Across all coaches" icon={Clock3} tone="mint" />
        <StatCard label="Requests pending" value={requests.filter((request) => request.status === "PENDING").length} detail="Need approval" icon={Inbox} tone="amber" />
      </div>
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div className="grid min-h-[55vh] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 text-ink">
          <Activity size={24} />
        </div>
        <h2 className="mt-4 font-display text-lg font-extrabold text-ink">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted">gatau isinya apa.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState("RS-0251");
  const [toast, setToast] = useState("");

  const selectedPage = {
    overview: ["Overview", "A quick overview of your reschedule operations."],
    requests: ["Reschedule requests", "Review messages and approve the right schedule."],
    schedule: ["Schedule & slots", "Manage sessions and review availability."],
    team: ["Team & members", "Member management"],
    settings: ["Settings", "Workspace preferences"],
  }[page] || ["Overview", ""];

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }
  function updateStatus(id, status) {
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
    showToast(`Request ${id} marked as ${status.toLowerCase()}. (Demo only)`);
  }
  function updateDraft(id, draft) {
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, draft } : request)));
  }
  function approveSlot(id, slot) {
    if (!slot) return;
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status: "APPROVED", approvedSlot: slot } : request)));
    showToast(`Slot ${slot.day} ${slot.time} selected. Demo state updated.`);
  }
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <Sidebar page={page} setPage={setPage} open={mobileNavOpen} setOpen={setMobileNavOpen} />
        <div className="min-w-0 flex-1">
          <Topbar title={selectedPage[0]} subtitle={selectedPage[1]} setOpen={setMobileNavOpen} />
          <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
            {page === "overview" && <OverviewPage requests={requests} selectRequest={setSelectedId} setPage={setPage} />}
            {page === "requests" && <RequestsPage requests={requests} selectedId={selectedId} selectRequest={setSelectedId} onStatusChange={updateStatus} onDraftChange={updateDraft} onApproveSlot={approveSlot} />}
            {page === "schedule" && <SchedulePage requests={requests} />}
            {["team", "settings"].includes(page) && <PlaceholderPage title={selectedPage[0]} />}
            <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200/70 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center">
              <p>© 2026 Gymnasyum · Smart Reschedule Assistant</p>
              {/* <p className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Prototype UI · Mock data only
              </p> */}
            </footer>
          </main>
        </div>
      </div>
      {toast && (
        <div role="status" className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-xl">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Check size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-ink">Action completed</p>
            <p className="mt-1 text-[10px] leading-4 text-muted">{toast}</p>
          </div>
          <button aria-label="Dismiss" onClick={() => setToast("")} className="ml-1 text-slate-400">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
