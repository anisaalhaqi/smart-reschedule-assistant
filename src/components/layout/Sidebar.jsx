import { CalendarDays, Inbox, LayoutDashboard, MoreHorizontal, Settings2, ShieldCheck, Sparkles, Users, X } from "lucide-react";

import Logo from "./Logo";

export default function Sidebar({ page, setPage, open, setOpen }) {
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
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${
                page === id ? "bg-gradient-to-r from-sky-50 to-emerald-50 text-ink shadow-sm ring-1 ring-emerald-100" : "text-slate-500 hover:bg-slate-50 hover:text-ink"
              }`}
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
            <Users size={18} className="text-slate-400" />
            Team & members
          </button>

          <button onClick={() => setPage("settings")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${page === "settings" ? "bg-sky-50 text-ink" : "text-slate-500 hover:bg-slate-50"}`}>
            <Settings2 size={18} className="text-slate-400" />
            Settings
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
              <ShieldCheck size={13} />
              Admin stays in control
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
