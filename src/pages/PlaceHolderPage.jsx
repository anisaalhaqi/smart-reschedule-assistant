import { Activity } from "lucide-react";

export default function PlaceholderPage({ title }) {
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
