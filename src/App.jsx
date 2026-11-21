import { useEffect, useState } from "react";
import { api, mapRequest } from "./data/rescheduleApi";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import PlaceHolderPage from "./pages/PlaceHolderPage";
import OverviewPage from "./pages/OverviewPage";
import SchedulePage from "./pages/SchedulePage";
import RequestsPage from "./pages/RequestPage";
import CustomerReschedulePage from "./pages/CustomerReschedulePage";

export default function App() {
  const [session, setSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState("requests");
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = session?.token;

  async function loadRequests(signal) {
    const data = await api("/reschedule-requests", { token, signal });
    setRequests(data.reschedule_requests.map(mapRequest));
  }

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    loadRequests(controller.signal).catch((issue) => {
      if (!controller.signal.aborted) setError(issue.message);
    });
    return () => controller.abort();
  }, [token]);

  async function authenticate(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError("");
    setLoading(true);
    try {
      const email = values.get("email");
      const password = values.get("password");
      if (registering) {
        await api("/auth/register", {
          method: "POST",
          body: { name: values.get("name"), email, password },
        });
        setRegistering(false);
      }
      setSession(await api("/auth/login", {
        method: "POST",
        body: { email, password },
      }));
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setSession(null);
    setPage("requests");
    setMobileNavOpen(false);
    setRequests([]);
    setSelectedId(null);
    setError("");
  }

  async function updateStatus(id, status, slotId) {
    await api(`/reschedule-requests/${id}`, {
      token,
      method: "PATCH",
      body: { status, available_slot_id: slotId },
    });
    await loadRequests();
  }

  async function refreshRequests() {
    setError("");
    try {
      await loadRequests();
    } catch (issue) {
      setError(issue.message);
    }
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-4">
        <form onSubmit={authenticate} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-soft">
          <h1 className="text-xl font-extrabold">{registering ? "Daftar akun Gymnasyum" : "Gymnasyum"}</h1>
          {registering && (
            <label className="block">Nama
              <input required name="name" autoComplete="name" maxLength={120} className="block w-full rounded-lg border p-2" />
            </label>
          )}
          <label className="block">Email
            <input required name="email" type="email" autoComplete="username" className="block w-full rounded-lg border p-2" />
          </label>
          <label className="block">Password
            <input required name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 12 : undefined} maxLength={72} className="block w-full rounded-lg border p-2" />
          </label>
          {error && <p role="alert" className="text-rose-700">{error}</p>}
          <button disabled={loading} className="rounded-lg bg-ink px-4 py-2 text-white disabled:opacity-40">{loading ? "Memproses…" : registering ? "Buat akun" : "Masuk"}</button>
          <button type="button" disabled={loading} onClick={() => {
            setRegistering(!registering);
            setError("");
          }} className="ml-3 text-sm font-semibold text-emerald-800">
            {registering ? "Kembali ke login" : "Daftar sebagai customer"}
          </button>
        </form>
      </main>
    );
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <Topbar title="Gymnasyum" name={session.user.name} onLogout={logout} />
        <main className="space-y-4 p-5 sm:p-8">
          {error && <p role="alert" className="text-rose-700">{error}</p>}
          <CustomerReschedulePage token={token} requests={requests} onCreated={loadRequests} />
        </main>
      </div>
    );
  }

  const title = {
    overview: "Ringkasan",
    requests: "Permintaan perubahan jadwal",
    schedule: "Jadwal & slot",
    team: "Team & members",
    settings: "Settings",
  }[page];

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <Sidebar
        page={page}
        setPage={setPage}
        open={mobileNavOpen}
        setOpen={setMobileNavOpen}
        pendingCount={requests.filter((request) => request.status === "PENDING").length}
        name={session.user.name}
      />
      <div className="min-w-0 flex-1">
        <Topbar title={title} name={session.user.name} onLogout={logout} setOpen={setMobileNavOpen} />
        <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-7 xl:px-10">
          {error && <p role="alert" className="text-rose-700">{error}</p>}
          {page === "overview" && <OverviewPage requests={requests} selectRequest={setSelectedId} setPage={setPage} />}
          {page === "schedule" && <SchedulePage token={token} />}
          {page === "requests" && (
            <>
              <button onClick={refreshRequests} className="rounded-lg border bg-white px-3 py-2 text-xs">Muat ulang permintaan</button>
              <RequestsPage
                requests={requests}
                selectedId={selectedId}
                selectRequest={setSelectedId}
                onStatusChange={updateStatus}
                onAnalyze={(id) => api(`/reschedule-requests/${id}/ai-review`, { token, method: "POST" })}
              />
            </>
          )}
          {["team", "settings"].includes(page) && <PlaceHolderPage title={title} />}
        </main>
      </div>
    </div>
  );
}
