export async function api(path, { token, method = "GET", body, signal } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    signal,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.data) {
    throw new Error(json?.message || "Backend tidak bisa dihubungi. Coba lagi.");
  }
  return json.data;
}

export function slotLabel(slot) {
  return `${slot.date} · ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
}

export function mapRequest(row) {
  return {
    id: row.id,
    name: row.customer_name,
    initials: row.customer_name.split(/\s+/).slice(0, 2).map((word) => word[0]).join(""),
    currentClass: row.class_name,
    currentDate: row.current_schedule_date,
    currentTime: row.current_start_time.slice(0, 5),
    requestedDate: row.requested_schedule_date,
    requestedTime: row.requested_start_time.slice(0, 5),
    message: row.reason,
    status: row.status,
    cancellationReview: row.ai_cancellation_review === true,
    created: new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
    }).format(new Date(row.created_at)),
  };
}
