import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Inbox,
  CircleHelp,
} from "lucide-react";

import SectionHeading from "../components/SectionHeading";
import StatCard from "../components/StatusCard";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatDate(dateString) {
  if (!dateString) return "-";

  return new Date(`${String(dateString).slice(0, 10)}T00:00:00`)
    .toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
}

function formatTime(time) {
  return time ? String(time).slice(0, 5) : "-";
}

function formatWeekRange(dates) {
  if (!dates.length) return "No schedule data";

  const sorted = [...dates].sort();
  return `${formatDate(sorted[0])} – ${formatDate(sorted[sorted.length - 1])}`;
}

function getStatus(status) {
  if (status === "SCHEDULED") {
    return {
      label: "Scheduled",
      color: "border-l-sky-400",
      badge: "bg-sky-50 text-sky-700",
    };
  }

  if (status === "RESCHEDULED") {
    return {
      label: "Rescheduled",
      color: "border-l-violet-400",
      badge: "bg-violet-50 text-violet-700",
    };
  }

  return {
    label: status || "Unknown",
    color: "border-l-slate-300",
    badge: "bg-slate-100 text-slate-600",
  };
}

export default function SchedulePage({
  schedules = [],
  requests = [],
  availableSlots = [],
  loadingSlots = false,
  slotError = "",
  onRetrySlots,
}) {
  const [day, setDay] = useState("All");

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((item) => {
        if (day === "All") return true;

        const date = new Date(`${item.schedule_date}T00:00:00`);
        return WEEKDAYS[date.getDay()] === day;
      })
      .sort((a, b) => {
        const dateCompare = a.schedule_date.localeCompare(b.schedule_date);
        return dateCompare || a.start_time.localeCompare(b.start_time);
      });
  }, [schedules, day]);

  const filteredSlots = useMemo(() => {
    return availableSlots
      .filter((slot) => !slot.is_booked)
      .filter((slot) => {
        if (day === "All") return true;

        const date = new Date(
          `${String(slot.slot_date).slice(0, 10)}T00:00:00`
        );

        return WEEKDAYS[date.getDay()] === day;
      })
      .sort((a, b) => {
        const dateA = String(a.slot_date).slice(0, 10);
        const dateB = String(b.slot_date).slice(0, 10);
        const dateCompare = dateA.localeCompare(dateB);

        return (
          dateCompare ||
          String(a.start_time).localeCompare(String(b.start_time))
        );
      });
  }, [availableSlots, day]);

  const scheduleDates = schedules.map((item) => item.schedule_date);
  const slotDates = availableSlots.map((item) =>
    String(item.slot_date).slice(0, 10)
  );

  const allDates = [...scheduleDates, ...slotDates];

  const scheduledCount = schedules.filter(
    (item) => item.status === "SCHEDULED"
  ).length;

  const rescheduledCount = schedules.filter(
    (item) => item.status === "RESCHEDULED"
  ).length;

  const pendingCount = requests.filter(
    (item) => item.status === "PENDING"
  ).length;

  const availableCount = availableSlots.filter(
    (item) => !item.is_booked
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title="Weekly availability"
          description="Monitor customer schedules and available training slots."
        />

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-muted">
          <CalendarDays size={15} />
          <span>Database schedules</span>
          <ChevronDown size={14} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Scheduled sessions"
          value={scheduledCount}
          icon={CalendarDays}
          tone="blue"
        />
        <StatCard
          label="Rescheduled sessions"
          value={rescheduledCount}
          icon={Clock3}
          tone="violet"
        />
        <StatCard
          label="Available slots"
          value={availableCount}
          icon={Inbox}
          tone="green"
        />
        <StatCard
          label="Requests pending"
          value={pendingCount}
          icon={CircleHelp}
          tone="amber"
        />
      </div>

      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">
              Schedule overview
            </h3>
            <p className="mt-1 text-xs text-muted">
              {formatWeekRange(allDates)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", ...WEEKDAYS.slice(1), WEEKDAYS[0]].map((item) => (
              <button
                key={item}
                onClick={() => setDay(item)}
                className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                  day === item
                    ? "bg-ink text-white"
                    : "bg-slate-50 text-muted hover:bg-slate-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredSchedules.map((item) => {
            const status = getStatus(item.status);

            return (
              <div
                key={`schedule-${item.id}`}
                className={`flex flex-col gap-3 rounded-xl border border-slate-100 border-l-4 ${status.color} bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-ink">
                    {formatTime(item.start_time)} – {formatTime(item.end_time)}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {item.class_name}
                  </span>
                  <span className="text-xs text-muted">
                    {item.customer_name || "Customer"}
                  </span>
                  <span className="text-[11px] text-muted">
                    {formatDate(item.schedule_date)}
                  </span>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold ${status.badge}`}
                >
                  {status.label}
                </span>
              </div>
            );
          })}

          {filteredSchedules.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-muted">
              No schedules found for this day.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-ink">
            Available training slots
          </h3>
          <p className="mt-1 text-xs text-muted">
            Open time slots retrieved from the backend database.
          </p>
        </div>

        {loadingSlots ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted">
            <Clock3 size={16} className="animate-spin" />
            Loading available slots...
          </div>
        ) : slotError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {slotError}
            {onRetrySlots && (
              <button
                onClick={onRetrySlots}
                className="ml-2 font-bold underline"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSlots.map((slot) => (
              <div
                key={`slot-${slot.id}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 border-l-4 border-l-emerald-400 bg-emerald-50/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-ink">
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    Available training slot
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(String(slot.slot_date).slice(0, 10))}
                  </span>
                </div>

                <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                  Available
                </span>
              </div>
            ))}

            {filteredSlots.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-muted">
                No available slots found for this day.
              </div>
            )}
          </div>
        )}
      </section>

      <p className="text-[11px] leading-5 text-muted">
        Schedule and availability information is loaded from the backend.
        Available slots are displayed separately from customer schedules.
      </p>
    </div>
  );
}

