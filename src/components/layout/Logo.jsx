import { Dumbbell } from "lucide-react";

export default function Logo() {
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
