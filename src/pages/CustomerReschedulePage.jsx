import { useEffect, useState } from "react";
import { api, slotLabel } from "../data/rescheduleApi";

export default function CustomerReschedulePage({ token, requests, onCreated }) {
  const [options, setOptions] = useState({ schedules: [], slots: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadOptions(signal) {
    const [scheduleData, slotData] = await Promise.all([
      api("/schedules", { token, signal }),
      api("/available-slots", { token, signal }),
    ]);
    setOptions({
      schedules: scheduleData.schedules.filter((item) => item.status === "SCHEDULED"),
      slots: slotData.available_slots,
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadOptions(controller.signal).catch((issue) => {
      if (!controller.signal.aborted) setError(issue.message);
    });
    return () => controller.abort();
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api("/reschedule-requests", {
        token,
        method: "POST",
        body: {
          schedule_id: Number(values.get("schedule_id")),
          available_slot_id: Number(values.get("available_slot_id")),
          reason: values.get("reason"),
        },
      });
      form.reset();
      await Promise.all([onCreated(), loadOptions()]);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = "block w-full rounded-lg border border-slate-200 bg-white p-3";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-6 shadow-soft">
        <h1 className="text-lg font-bold">Ajukan perubahan jadwal</h1>
        <label className="block">Jadwal sekarang
          <select required name="schedule_id" defaultValue="" className={fieldClass}>
            <option value="" disabled>Pilih jadwal</option>
            {options.schedules.map((item) => <option key={item.id} value={item.id}>{item.class_name} · {item.schedule_date} · {item.start_time.slice(0, 5)}</option>)}
          </select>
        </label>
        <label className="block">Slot tujuan
          <select required name="available_slot_id" defaultValue="" className={fieldClass}>
            <option value="" disabled>Pilih slot</option>
            {options.slots.map((item) => <option key={item.id} value={item.id}>{slotLabel({ ...item, date: item.slot_date })}</option>)}
          </select>
        </label>
        <label className="block">Pesan untuk admin
          <textarea required name="reason" maxLength={2000} className={fieldClass} placeholder="Misalnya, besok sore nggak bisa. Bisa pindah ke Sabtu pagi?" />
        </label>
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <button disabled={busy || !options.schedules.length || !options.slots.length} className="rounded-lg bg-ink px-4 py-2 text-white disabled:opacity-40">
          {busy ? "Mengirim…" : "Ajukan perubahan"}
        </button>
      </form>
      <section className="space-y-3 rounded-xl bg-white p-6 shadow-soft">
        <h2 className="font-bold">Riwayat pengajuan</h2>
        {requests.length ? requests.map((item) => (
          <p key={item.id}>#{item.id} · {item.currentClass} · {item.requestedDate} pukul {item.requestedTime} · {item.status}</p>
        )) : <p>Belum ada pengajuan.</p>}
      </section>
    </div>
  );
}
