import { useEffect, useState } from "react";
import { api, slotLabel } from "../data/rescheduleApi";
import SectionHeading from "../components/SectionHeading";

export default function SchedulePage({ token }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([api("/schedules", { token, signal }), api("/available-slots", { token, signal })])
      .then(([schedules, slots]) => setItems({ schedules: schedules.schedules, slots: slots.available_slots }))
      .catch((issue) => {
        if (!signal.aborted) setError(issue.message);
      });
    return () => controller.abort();
  }, [token]);

  const schedules = items?.schedules.filter((item) => !date || item.schedule_date === date);
  const slots = items?.slots.filter((item) => !date || item.slot_date === date);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Jadwal & slot"
        description="Jadwal kelas dan slot tersedia dari sistem booking."
        action={<label className="text-sm">Tanggal <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border bg-white p-2" /></label>}
      />
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {!items && !error && <p role="status">Memuat jadwal…</p>}
      {items && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-3 rounded-xl bg-white p-5 shadow-soft">
            <h2 className="font-bold">Jadwal kelas</h2>
            {schedules.length ? schedules.map((item) => (
              <div key={item.id} className="border-b pb-2 text-sm">
                <p><strong>{item.class_name}</strong> · {item.customer_name}</p>
                <p>{slotLabel({ ...item, date: item.schedule_date })} · {item.status}</p>
              </div>
            )) : <p className="text-sm">Tidak ada jadwal pada tanggal ini.</p>}
          </section>
          <section className="space-y-3 rounded-xl bg-white p-5 shadow-soft">
            <h2 className="font-bold">Slot tersedia</h2>
            {slots.length ? slots.map((item) => (
              <p key={item.id} className="border-b pb-2 text-sm">{slotLabel({ ...item, date: item.slot_date })}</p>
            )) : <p className="text-sm">Tidak ada slot pada tanggal ini.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
