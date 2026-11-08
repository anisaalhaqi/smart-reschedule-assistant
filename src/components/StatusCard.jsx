import { ArrowUpRight } from "lucide-react";

export default function StatCard({ label, value, detail, icon: Icon, tone, trend }) {
  const tones = {
    sky: "bg-sky-100 text-sky-700",
    mint: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    lilac: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={19} />
        </div>

        {trend && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
            <ArrowUpRight size={12} />
            {trend}
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
