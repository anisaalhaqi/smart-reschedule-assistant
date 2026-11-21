import { useState } from "react";
import { Check, X } from "lucide-react";

import { initialRequests } from "./data/mockData";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";

import OverviewPage from "./pages/OverviewPage";
import RequestsPage from "./pages/RequestPage";
import SchedulePage from "./pages/SchedulePage";
import PlaceholderPage from "./pages/PlaceHolderPage";

export default function App() {
  const [page, setPage] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState("RS-0251");
  const [toast, setToast] = useState("");

  const selectedPage = {
    overview: ["Overview", "A quick overview of your reschedule operations."],
    requests: ["Reschedule requests", "Review messages and approve the right schedule."],
    schedule: ["Schedule & slots", "Manage sessions and review availability."],
    team: ["Team & members", "Member management"],
    settings: ["Settings", "Workspace preferences"],
  }[page] || ["Overview", ""];

  function showToast(message) {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2800);
  }

  function updateStatus(id, status) {
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));

    showToast(`Request ${id} marked as ${status.toLowerCase()}. (Demo only)`);
  }

  function updateDraft(id, draft) {
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, draft } : request)));
  }

  function approveSlot(id, slot) {
    if (!slot) return;

    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              status: "APPROVED",
              approvedSlot: slot,
            }
          : request,
      ),
    );

    showToast(`Slot ${slot.day} ${slot.time} selected. Demo state updated.`);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <Sidebar page={page} setPage={setPage} open={mobileNavOpen} setOpen={setMobileNavOpen} />

        <div className="min-w-0 flex-1">
          <Topbar title={selectedPage[0]} subtitle={selectedPage[1]} setOpen={setMobileNavOpen} />

          <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
            {page === "overview" && <OverviewPage requests={requests} selectRequest={setSelectedId} setPage={setPage} />}

            {page === "requests" && <RequestsPage requests={requests} selectedId={selectedId} selectRequest={setSelectedId} onStatusChange={updateStatus} onDraftChange={updateDraft} onApproveSlot={approveSlot} />}

            {page === "schedule" && <SchedulePage requests={requests} />}

            {["team", "settings"].includes(page) && <PlaceholderPage title={selectedPage[0]} />}

            <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200/70 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center">
              <p>© 2026 Gymnasyum · Smart Reschedule Assistant</p>
            </footer>
          </main>
        </div>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-xl">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Check size={16} />
          </div>

          <div>
            <p className="text-xs font-bold text-ink">Action completed</p>

            <p className="mt-1 text-[10px] leading-4 text-muted">{toast}</p>
          </div>

          <button aria-label="Dismiss" onClick={() => setToast("")} className="ml-1 text-slate-400">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
