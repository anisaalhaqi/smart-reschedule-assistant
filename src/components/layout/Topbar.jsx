import { Menu } from "lucide-react";

export default function Topbar({ title, name, onLogout, setOpen }) {
  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b border-slate-100/90 bg-white/90 px-4 backdrop-blur-xl sm:px-7 xl:px-10">
      <div className="flex items-center gap-3">
        {setOpen && (
          <button aria-label="Buka navigasi" onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-500 lg:hidden">
            <Menu size={18} />
          </button>
        )}
        <h1 className="font-display text-[17px] font-extrabold tracking-tight text-ink sm:text-[19px]">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-muted sm:inline">{name}</span>
        <button onClick={onLogout} className="rounded-lg border px-3 py-2 text-sm">Keluar</button>
      </div>
    </header>
  );
}
