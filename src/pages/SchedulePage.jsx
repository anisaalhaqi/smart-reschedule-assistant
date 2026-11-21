import { useState } from "react";

import { CalendarDays, ChevronDown, CircleHelp, Clock3, Inbox } from "lucide-react";

import SectionHeading from "../components/SectionHeading";
import StatCard from "../components/StatusCard";

export default function SchedulePage({ requests }) {
  const [day, setDay] = useState("Saturday");

  const schedule = [
    {
      time: "08:00 – 09:00",
      title: "Personal Training",
      coach: "Coach Dimas",
      member: "Ibu Ratna Wijaya",
      status: "Booked",
      color: "border-l-sky-400",
    },
    {
      time: "09:00 – 10:00",
      title: "Personal Training",
      coach: "Coach Dimas",
      member: "Available slot",
      status: "Available",
      color: "border-l-emerald-400",
    },
    {
      time: "10:00 – 11:00",
      title: "Strength Training",
      coach: "Coach Raka",
      member: "Available slot",
      status: "Available",
      color: "border-l-emerald-400",
    },
    {
      time: "13:00 – 14:00",
      title: "Yoga Flow",
      coach: "Coach Sarah",
      member: "Class · 6 members",
      status: "Booked",
      color: "border-l-violet-400",
    },
    {
      time: "15:00 – 16:00",
      title: "Personal Training",
      coach: "Coach Dimas",
      member: "Bapak Surya Adinata",
      status: "Booked",
      color: "border-l-sky-400",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Availability"
        title="Schedule & slots"
        description="Check existing sessions and possible alternatives before approving a request."
        action={
          <button className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white">
            <CalendarDays size={14} />
            This week
            <ChevronDown size={13} />
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
