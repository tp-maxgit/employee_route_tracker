const API_BASE = "http://localhost:8000";

/**
 * Generic fetch wrapper with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Network error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ---- Auth ----

export function login(email, password) {
  return request("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(name, email, password, role = "employee") {
  return request("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

// ---- Users ----

export function getUsers() {
  return request("/api/users");
}

// ---- Sessions ----

export function getUserSessions(userId, date) {
  return request(`/api/users/${userId}/sessions?date=${date}`);
}

export function getSessionRoute(sessionId) {
  return request(`/api/sessions/${sessionId}/route`);
}

export function getRouteHistory(sessionId) {
  return request(`/api/history/${sessionId}`);
}

// ---- Reports ----

export function getMonthlyReport(userId, month) {
  return request(`/api/users/${userId}/monthly-report?month=${month}`);
}

// ---- Audit ----

export function runAudit(sessionId) {
  return request(`/api/audit/${sessionId}`, { method: "POST" });
}

// ---- Employee Specific ----

export function getEmployeeDashboard(userId) {
  return request(`/api/employee/dashboard?user_id=${userId}`);
}

export function startSessionLegacy(employeeId, status, latitude = null, longitude = null) {
  return request("/start-session", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, status, latitude, longitude }),
  });
}

export function stopSession(sessionId) {
  return request(`/api/stop/${sessionId}`, {
    method: "POST",
  });
}

export function logLocation(sessionId, latitude, longitude) {
  return request("/api/location", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    }),
  });
}
