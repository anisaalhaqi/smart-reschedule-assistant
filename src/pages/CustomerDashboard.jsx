import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  LogOut,
  UserRound,
  RefreshCw,
  Plus,
  X,
  Send,
  LoaderCircle,
} from "lucide-react";

import {
  getMySchedules,
  getAvailableSlots,
  getRescheduleRequests,
} from "../data/AuthAPI";

const API_BASE_URL = "http://localhost:3000/api";

function formatDate(date) {
  if (!date) return "-";

  return new Date(`${String(date).slice(0, 10)}T00:00:00`)
    .toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
}

function formatTime(time) {
  return time ? String(time).slice(0, 5) : "-";
}

function getStatusStyle(status) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "bg-red-50 text-red-700";
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "RESCHEDULED":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function CustomerDashboard({ user, onLogout }) {
  const [schedules, setSchedules] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [scheduleData, slotData, requestData] = await Promise.all([
        getMySchedules(),
        getAvailableSlots(),
        getRescheduleRequests(),
      ]);

      setSchedules(scheduleData || []);
      setAvailableSlots(slotData || []);
      setRequests(requestData || []);
    } catch (error) {
      setErrorMessage(
        error.message || "Gagal mengambil data dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function openRequestForm(schedule) {
    setSelectedSchedule(schedule);
    setSelectedSlot("");
    setReason("");
    setFormError("");
    setSuccessMessage("");
  }

  function closeRequestForm() {
    if (submitting) return;

    setSelectedSchedule(null);
    setSelectedSlot("");
    setReason("");
    setFormError("");
  }

  async function handleSubmitRequest(event) {
    event.preventDefault();

    if (!selectedSchedule || !selectedSlot || !reason.trim()) {
      setFormError("Lengkapi pilihan slot dan alasan reschedule.");
      return;
    }

    if (reason.trim().length < 5) {
      setFormError("Alasan reschedule minimal 5 karakter.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
      }

      const response = await fetch(
        `${API_BASE_URL}/reschedule-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            schedule_id: selectedSchedule.id,
            available_slot_id: Number(selectedSlot),
            reason: reason.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal mengirim reschedule request."
        );
      }

      setSuccessMessage("Reschedule request berhasil dikirim.");

      setSelectedSchedule(null);
      setSelectedSlot("");
      setReason("");

      await loadDashboard();
    } catch (error) {
      setFormError(error.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  const availableScheduleSlots = availableSlots.filter(
    (slot) => !slot.is_booked
  );

  const pendingScheduleIds = requests
    .filter((request) => request.status === "PENDING")
    .map((request) => String(request.schedule_id));

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-10">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Gymnasyum
          </h1>
          <p className="mt-1 text-xs text-muted">
            Smart Reschedule Assistant
          </p>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} />
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-10">
        <section className="rounded-3xl bg-gradient-to-br from-sky-100 via-white to-emerald-100 p-7 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
            <UserRound size={23} />
          </div>

          <p className="mt-6 text-sm font-medium text-slate-500">
            Welcome back,
          </p>

          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
            {user?.name || "Customer"}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Manage your gym schedules and reschedule requests here.
          </p>
        </section>

        {successMessage && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {successMessage}
            <button
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
            <button
              onClick={loadDashboard}
              className="ml-2 font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink">
                My Schedules
              </h3>
              <p className="mt-1 text-sm text-muted">
                Your registered gym schedules.
              </p>
            </div>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
              {schedules.length} schedules
            </span>
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-6 text-sm text-muted">
              <LoaderCircle size={17} className="animate-spin" />
              Loading your schedules...
            </div>
          )}

          {!loading && !errorMessage && schedules.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
              <CalendarDays
                className="mx-auto text-slate-300"
                size={32}
              />
              <p className="mt-3 font-semibold text-ink">
                No schedules found
              </p>
              <p className="mt-1 text-sm text-muted">
                You don't have any registered schedules yet.
              </p>
            </div>
          )}

          {!loading && schedules.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {schedules.map((schedule) => {
                const hasPendingRequest = pendingScheduleIds.includes(
                  String(schedule.id)
                );

                const canRequest =
                  schedule.status === "SCHEDULED" &&
                  !hasPendingRequest;

                return (
                  <article
                    key={schedule.id}
                    className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-ink">
                          {schedule.class_name}
                        </h4>
                        <p className="mt-1 text-xs text-muted">
                          Schedule #{schedule.id}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(schedule.status)}`}
                      >
                        {schedule.status}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        {formatDate(schedule.schedule_date)}
                      </p>

                      <p className="flex items-center gap-2">
                        <Clock size={16} />
                        {formatTime(schedule.start_time)} –{" "}
                        {formatTime(schedule.end_time)}
                      </p>
                    </div>

                    {canRequest ? (
                      <button
                        onClick={() => openRequestForm(schedule)}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                      >
                        <RefreshCw size={16} />
                        Request Reschedule
                      </button>
                    ) : hasPendingRequest ? (
                      <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-700">
                        Your reschedule request is awaiting admin approval.
                      </div>
                    ) : (
                      <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs font-medium text-slate-500">
                        Reschedule request is unavailable for this schedule.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-emerald-700" size={21} />
            <div>
              <h3 className="font-bold text-ink">
                Reschedule Requests
              </h3>
              <p className="mt-1 text-sm text-muted">
                Track the status of your reschedule requests.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {!loading && requests.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-muted">
                You haven't submitted any reschedule requests.
              </p>
            )}

            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {request.class_name || `Schedule #${request.schedule_id}`}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Requested date:{" "}
                      {formatDate(request.requested_schedule_date)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Reason: {request.reason}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(request.status)}`}
                  >
                    {request.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200/70 pt-5 text-[10px] text-slate-400">
          © 2026 Gymnasyum · Smart Reschedule Assistant
        </footer>
      </main>

      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Request Reschedule
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {selectedSchedule.class_name} · Schedule #{selectedSchedule.id}
                </p>
              </div>

              <button
                onClick={closeRequestForm}
                disabled={submitting}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">
                  Current schedule
                </label>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p>{formatDate(selectedSchedule.schedule_date)}</p>
                  <p className="mt-1">
                    {formatTime(selectedSchedule.start_time)} –{" "}
                    {formatTime(selectedSchedule.end_time)}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="available-slot"
                  className="mb-2 block text-sm font-semibold text-ink"
                >
                  Choose available slot
                </label>

                <select
                  id="available-slot"
                  value={selectedSlot}
                  onChange={(event) => setSelectedSlot(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">Select a schedule slot</option>

                  {availableScheduleSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDate(slot.slot_date)} ·{" "}
                      {formatTime(slot.start_time)} –{" "}
                      {formatTime(slot.end_time)}
                    </option>
                  ))}
                </select>

                {availableScheduleSlots.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No available slots at the moment.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reschedule-reason"
                  className="mb-2 block text-sm font-semibold text-ink"
                >
                  Reason for rescheduling
                </label>

                <textarea
                  id="reschedule-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder="Tell us why you need to reschedule..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
                />

                <p className="mt-1 text-right text-xs text-muted">
                  {reason.length}/500
                </p>
              </div>

              {formError && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeRequestForm}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || availableScheduleSlots.length === 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

