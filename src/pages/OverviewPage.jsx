import { ArrowRight, CheckCheck, Clock3, Inbox, X } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import StatCard from "../components/StatusCard";
import Avatar from "../components/Avatar";

export default function OverviewPage({ requests, selectRequest, setPage }) {
  const pending = requests.filter((request) => request.status === "PENDING");

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Ringkasan permintaan"
        action={
          <button onClick={() => setPage("requests")} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white">
            Lihat permintaan <ArrowRight size={14} />
          </button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={requests.length} icon={Inbox} tone="sky" />
        <StatCard label="Menunggu keputusan" value={pending.length} icon={Clock3} tone="amber" />
        <StatCard label="Disetujui" value={requests.filter((request) => request.status === "APPROVED").length} icon={CheckCheck} tone="mint" />
        <StatCard label="Ditolak" value={requests.filter((request) => request.status === "REJECTED").length} icon={X} tone="lilac" />
      </div>
      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-soft">
        <h2 className="font-bold">Permintaan terbaru yang menunggu keputusan</h2>
        {!pending.length && <p className="text-sm">Belum ada permintaan yang menunggu keputusan.</p>}
        {pending.slice(0, 3).map((request) => (
          <button
            key={request.id}
            onClick={() => {
              selectRequest(request.id);
              setPage("requests");
            }}
            className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm"
          >
            <Avatar request={request} size="sm" />
            <span><strong>{request.name}</strong> · {request.created}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
