const API_BASE_URL = "http://localhost:3000/api";

export async function register(user) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: result.message,
        data: null,
      };
    }

    return {
      error: false,
      message: result.message,
      data: result.data.user,
    };
  } catch (error) {
    return {
      error: true,
      message: "Tidak dapat terhubung ke server",
      data: null,
    };
  }
}

export async function login({ email, password }) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: result.message,
        data: null,
      };
    }

    const { token, user } = result.data;
    localStorage.setItem("token", token);

    return {
      error: false,
      message: result.message,
      data: { token, user },
    };
  } catch (error) {
    return {
      error: true,
      message: "Tidak dapat terhubung ke server",
      data: null,
    };
  }
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

// Helper untuk request API yang membutuhkan JWT.
async function authenticatedRequest(endpoint, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Permintaan API gagal");
  }

  return result.data;
}

// Mengambil jadwal milik Customer yang sedang login.
export async function getMySchedules() {
  const data = await authenticatedRequest("/schedules");
  return data.schedules;
}

// Mengambil seluruh daftar Customer (khusus Admin).
export async function getMembers() {
  const data = await authenticatedRequest("/users");
  return data.users;
}

// Membuat akun Customer baru (khusus Admin).
export async function createMember({ name, email, password }) {
  const data = await authenticatedRequest("/users", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  return data.user;
}


// Mengambil seluruh reschedule requests sesuai hak akses Admin.
export async function getRescheduleRequests() {
  const data = await authenticatedRequest("/reschedule-requests");
  return data.reschedule_requests;
}

// Mengambil available slots.
export async function getAvailableSlots(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`${API_BASE_URL}/available-slots${query}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Gagal mengambil available slots");
  }

  return result.data.available_slots;
}

// Admin menyetujui atau menolak reschedule request.
export async function updateRescheduleRequest(id, status) {
  const data = await authenticatedRequest(`/reschedule-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  return data;
}

