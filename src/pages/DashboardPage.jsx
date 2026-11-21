import { useEffect, useState } from "react";
import { Check, X, LoaderCircle } from "lucide-react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import OverviewPage from "./OverviewPage";
import RequestsPage from "./RequestPage";
import SchedulePage from "./SchedulePage";
import MemberPage from "./MemberPage";
import PlaceholderPage from "./PlaceHolderPage";

import {
  getRescheduleRequests,
  getMySchedules,
  getAvailableSlots,
  updateRescheduleRequest,
} from "../data/AuthAPI";

export default function DashboardPage({ user, onLogout }) {
  const [page, setPage] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [requests, setRequests] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [requestError, setRequestError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [slotError, setSlotError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState("");
  const [processing, setProcessing] = useState(false);

  const pendingCount = requests.filter(
    (request) => request.status === "PENDING"
  ).length;

  const selectedPage = {
    overview: [
      "Overview",
      "A quick overview of your reschedule operations.",
    ],
    requests: [
      "Reschedule requests",
      "Review messages and approve the right schedule.",
    ],
    schedule: [
      "Schedule & slots",
      "Manage sessions and review availability.",
    ],
    team: [
      "Team & members",
      "Manage registered Customer accounts.",
    ],
    settings: [
      "Settings",
      "Workspace preferences.",
    ],
  }[page] || ["Overview", ""];

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function formatDate(date) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  async function loadRequests() {
    setLoadingRequests(true);
    setRequestError("");

    try {
      const data = await getRescheduleRequests();

      const mappedRequests = data.map((item) => {
        const currentStart = String(item.current_start_time).slice(0, 5);
        const currentEnd = String(item.current_end_time).slice(0, 5);
        const requestedStart = String(item.requested_start_time).slice(0, 5);
        const requestedEnd = String(item.requested_end_time).slice(0, 5);

        return {
          id: String(item.id),
          scheduleId: item.schedule_id,
          availableSlotId: item.available_slot_id,
          name: item.customer_name,
          initials: item.customer_name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          color: "blue",
          membership: "Customer",
          message: item.reason,
          reason: item.reason,
          currentClass: item.class_name,
          currentDate: formatDate(item.current_schedule_date),
          currentTime: `${currentStart}–${currentEnd}`,
          preferredDay: formatDate(item.requested_schedule_date),
          preferredTime: `${requestedStart}–${requestedEnd}`,
          created: formatDate(item.created_at.slice(0, 10)),
          status: item.status,
          slots: [
            {
              id: item.available_slot_id,
              day: formatDate(item.requested_schedule_date),
              date: item.requested_schedule_date,
              time: `${requestedStart}–${requestedEnd}`,
              coach: "Gymnasium",
              available: true,
            },
          ],
        };
      });

      setRequests(mappedRequests);

      setSelectedId((current) => {
        if (current && mappedRequests.some((item) => item.id === current)) {
          return current;
        }

        return mappedRequests[0]?.id ?? null;
      });
    } catch (error) {
      setRequestError(
        error.message || "Gagal mengambil reschedule requests."
      );
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadSchedules() {
    setLoadingSchedules(true);
    setScheduleError("");

    try {
      const data = await getMySchedules();
      setSchedules(data);
    } catch (error) {
      setScheduleError(error.message || "Gagal mengambil jadwal.");
    } finally {
      setLoadingSchedules(false);
    }
  }

  async function loadAvailableSlots() {
    setLoadingSlots(true);
    setSlotError("");

    try {
      const data = await getAvailableSlots();
      setAvailableSlots(data);
    } catch (error) {
      setSlotError(
        error.message || "Gagal mengambil available slots."
      );
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    loadRequests();
    loadSchedules();
    loadAvailableSlots();
  }, []);

  async function updateStatus(id, status) {
    if (processing) return;

    setProcessing(true);
    setRequestError("");

    try {
      await updateRescheduleRequest(Number(id), status);

      showToast(
        status === "APPROVED"
          ? "Reschedule request berhasil disetujui."
          : "Reschedule request berhasil ditolak."
      );

      await Promise.all([
        loadRequests(),
        loadSchedules(),
        loadAvailableSlots(),
      ]);
    } catch (error) {
      setRequestError(
        error.message || "Gagal memproses reschedule request."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <Sidebar
          page={page}
          setPage={setPage}
          open={mobileNavOpen}
          setOpen={setMobileNavOpen}
          user={user}
          onLogout={onLogout}
          pendingCount={pendingCount}
        />

        <div className="min-w-0 flex-1">
          <Topbar
            title={selectedPage[0]}
            subtitle={selectedPage[1]}
            setOpen={setMobileNavOpen}
            user={user}
          />

          <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
            {page === "overview" && (
              <OverviewPage
                requests={requests}
                selectRequest={(id) => {
                  setSelectedId(id);
                  setPage("requests");
                }}
                setPage={setPage}
              />
            )}

            {page === "requests" && (
              <>
                {loadingRequests ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-sm text-muted">
                    <LoaderCircle size={18} className="animate-spin" />
                    Loading reschedule requests...
                  </div>
                ) : requestError && requests.length === 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    {requestError}
                    <button
                      onClick={loadRequests}
                      className="ml-2 font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    {requestError && (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {requestError}
                      </div>
                    )}

                    <RequestsPage
                      requests={requests}
                      selectedId={selectedId}
                      selectRequest={setSelectedId}
                      onStatusChange={updateStatus}
                      processing={processing}
                    />
                  </>
                )}
              </>
            )}

            {page === "schedule" && (
              <>
                {loadingSchedules ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-sm text-muted">
                    <LoaderCircle size={18} className="animate-spin" />
                    Loading schedules...
                  </div>
                ) : scheduleError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    {scheduleError}
                    <button
                      onClick={loadSchedules}
                      className="ml-2 font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    {slotError && (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {slotError}
                        <button
                          onClick={loadAvailableSlots}
                          className="ml-2 font-bold underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    <SchedulePage
                      schedules={schedules}
                      requests={requests}
                      availableSlots={availableSlots}
                      loadingSlots={loadingSlots}
                      slotError={slotError}
                      onRetrySlots={loadAvailableSlots}
                    />
                  </>
                )}
              </>
            )}

            {page === "team" && <MemberPage />}

            {page === "settings" && (
              <PlaceholderPage title={selectedPage[0]} />
            )}

            <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200/70 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center">
              <p>© 2026 Gymnasyum · Smart Reschedule Assistant</p>
            </footer>
          </main>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-xl"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Check size={16} />
          </div>

          <div>
            <p className="text-xs font-bold text-ink">
              Action completed
            </p>

            <p className="mt-1 text-[10px] leading-4 text-muted">
              {toast}
            </p>
          </div>

          <button
            aria-label="Dismiss"
            onClick={() => setToast("")}
            className="ml-1 text-slate-400"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

