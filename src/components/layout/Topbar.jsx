import { Bell, CircleHelp, Menu } from "lucide-react";

export default function Topbar({ title, subtitle, setOpen }) {
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
